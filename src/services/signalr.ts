import * as signalR from '@microsoft/signalr';
import { getToken } from './auth';

export interface SignalRConnectionState {
  connection: signalR.HubConnection | null;
  isConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export interface SignalREventHandlers {
  onNewOrder?: (order: any) => void;
  onTableStateUpdated?: (update: { tableId: string; newState: string }) => void;
  onOrderStatusUpdated?: (update: { orderId: string; newStatus: string }) => void;
  onConnectionStateChanged?: (connected: boolean) => void;
}

class SignalRService {
  private state: SignalRConnectionState = {
    connection: null,
    isConnected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  };

  private eventHandlers: SignalREventHandlers = {};

  /**
   * Obtener la URL base del Hub de SignalR
   */
  private getHubBaseUrl(): string {
    // Usar la variable de entorno directamente (sin /api al final)
    const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'https://restmg.runasp.net/api';
    const HUB_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
    
    console.log('🌐 SignalR: Hub Base URL configurada:', HUB_BASE_URL);
    return HUB_BASE_URL;
  }

  /**
   * Construir la URL absoluta del Hub de SignalR
   */
  private buildHubUrl(hubPath: string = 'kitchenHub'): string {
    // Obtener la URL base del servidor (sin /api)
    const hubBaseUrl = this.getHubBaseUrl(); // ej: https://localhost:7140
    
    // Construir la URL completa del Hub
    const hubUrl = `${hubBaseUrl}/${hubPath}`; // ej: https://localhost:7140/kitchenHub
    
    console.log('🌐 SignalR: URL del Hub construida:', hubUrl);
    
    return hubUrl;
  }

  /**
   * Crear una conexión autenticada al Hub de SignalR
   */
  async createConnection(hubPath: string = 'kitchenHub'): Promise<signalR.HubConnection> {
    console.log('🔌 Creando conexión SignalR...');

    if (this.state.connection) {
      console.log('⚠️ Conexión existente encontrada, cerrando...');
      await this.disconnect();
    }

    try {
      // Construir la URL absoluta del Hub
      const hubUrl = this.buildHubUrl(hubPath);
      
      // Obtener token de autenticación
      const token = this.getAuthToken();
      
      console.log('🔐 Token de autenticación:', token ? 'Presente' : 'No encontrado');
      
      // Crear nueva conexión
      this.state.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          transport: signalR.HttpTransportType.WebSockets,
          accessTokenFactory: () => token,
          withCredentials: true
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Configurar event handlers de conexión
      this.setupConnectionHandlers();
      
      return this.state.connection;
      
    } catch (error) {
      console.error('❌ Error creando conexión SignalR:', error);
      throw error;
    }
  }

  /**
   * Conectar al Hub
   */
  async connect(hubPath: string = 'kitchenHub'): Promise<void> {
    if (!this.state.connection) {
      await this.createConnection(hubPath);
    }

    if (!this.state.connection) {
      throw new Error('No se pudo crear la conexión SignalR');
    }

    try {
      console.log('🔌 Conectando a SignalR...');
      
      await this.state.connection.start();
      
      this.state.isConnected = true;
      this.state.reconnectAttempts = 0;
      
      console.log('✅ Conectado a SignalR:', this.state.connection.connectionId);
      
      // Notificar cambio de estado
      this.eventHandlers.onConnectionStateChanged?.(true);
      
    } catch (error) {
      console.error('❌ Error conectando a SignalR:', error);
      this.state.isConnected = false;
      this.eventHandlers.onConnectionStateChanged?.(false);
      throw error;
    }
  }

  /**
   * Desconectar del Hub
   */
  async disconnect(): Promise<void> {
    if (!this.state.connection) return;

    try {
      console.log('🔌 Desconectando SignalR...');
      
      await this.state.connection.stop();
      this.state.connection = null;
      this.state.isConnected = false;
      
      console.log('✅ SignalR desconectado');
      
      // Notificar cambio de estado
      this.eventHandlers.onConnectionStateChanged?.(false);
      
    } catch (error) {
      console.error('❌ Error desconectando SignalR:', error);
    }
  }

  /**
   * Configurar manejadores de eventos
   */
  setEventHandlers(handlers: SignalREventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
    
    if (this.state.connection) {
      this.setupEventHandlers();
    }
  }

  /**
   * Obtener estado de la conexión
   */
  getConnectionState(): SignalRConnectionState {
    return { ...this.state };
  }

  /**
   * Verificar si está conectado
   */
  isConnected(): boolean {
    return this.state.isConnected && this.state.connection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Enviar mensaje al Hub
   */
  async invoke(methodName: string, ...args: any[]): Promise<any> {
    if (!this.state.connection || !this.isConnected()) {
      throw new Error('SignalR no está conectado');
    }

    try {
      return await this.state.connection.invoke(methodName, ...args);
    } catch (error) {
      console.error(`❌ Error invocando ${methodName}:`, error);
      throw error;
    }
  }

  /**
   * Configurar manejadores de conexión
   */
  private setupConnectionHandlers(): void {
    if (!this.state.connection) return;

    // Evento de reconexión
    this.state.connection.onreconnecting((error) => {
      console.log('🔄 SignalR reconectando...', error);
      this.state.isConnected = false;
      this.state.reconnectAttempts++;
      this.eventHandlers.onConnectionStateChanged?.(false);
    });

    // Evento de reconectado
    this.state.connection.onreconnected((connectionId) => {
      console.log('✅ SignalR reconectado:', connectionId);
      this.state.isConnected = true;
      this.state.reconnectAttempts = 0;
      this.eventHandlers.onConnectionStateChanged?.(true);
    });

    // Evento de cierre
    this.state.connection.onclose((error) => {
      console.log('❌ SignalR cerrado:', error);
      this.state.isConnected = false;
      this.eventHandlers.onConnectionStateChanged?.(false);
      
      // Intentar reconectar si no se ha alcanzado el límite
      if (this.state.reconnectAttempts < this.state.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });
  }

  /**
   * Configurar manejadores de eventos del dominio
   */
  private setupEventHandlers(): void {
    if (!this.state.connection) return;

    // Evento: Nuevo pedido
    this.state.connection.on('NewOrder', (order: any) => {
      console.log('🆕 Nuevo pedido recibido:', order);
      this.eventHandlers.onNewOrder?.(order);
    });

    // Evento: Estado de mesa actualizado
    this.state.connection.on('TableStateUpdated', (update: { tableId: string; newState: string }) => {
      console.log('🏓 Estado de mesa actualizado:', update);
      this.eventHandlers.onTableStateUpdated?.(update);
    });

    // Evento: Estado de pedido actualizado
    this.state.connection.on('OrderStatusUpdated', (update: { orderId: string; newStatus: string }) => {
      console.log('📋 Estado de pedido actualizado:', update);
      this.eventHandlers.onOrderStatusUpdated?.(update);
    });
  }

  /**
   * Programar reconexión
   */
  private scheduleReconnect(): void {
    const delay = Math.min(30000, 1000 * Math.pow(2, this.state.reconnectAttempts));
    console.log(`⏰ Programando reconexión en ${delay}ms (intento ${this.state.reconnectAttempts + 1}/${this.state.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      if (!this.isConnected() && this.state.reconnectAttempts < this.state.maxReconnectAttempts) {
        try {
          await this.connect();
        } catch (error) {
          console.error('❌ Error en reconexión programada:', error);
        }
      }
    }, delay);
  }

  /**
   * Obtener token de autenticación
   */
  private getAuthToken(): string {
    // Intentar obtener el token desde diferentes fuentes
    const token = localStorage.getItem('auth_token') || 
                  sessionStorage.getItem('auth_token') || 
                  getToken() ||
                  '';
    
    if (!token) {
      console.warn('⚠️ No se encontró token de autenticación para SignalR');
    }
    
    return token;
  }
}

// Exportar instancia singleton
export const signalRService = new SignalRService();

/**
 * Función de conveniencia para crear y conectar a SignalR
 */
export const createSignalRConnection = async (
  hubPath: string = 'kitchenHub', 
  eventHandlers?: SignalREventHandlers
): Promise<signalR.HubConnection> => {
  console.log('🚀 Creando nueva conexión SignalR...');
  
  try {
    // Configurar manejadores de eventos si se proporcionan
    if (eventHandlers) {
      signalRService.setEventHandlers(eventHandlers);
    }
    
    // Crear y conectar
    const connection = await signalRService.createConnection(hubPath);
    await signalRService.connect(hubPath);
    
    console.log('✅ Conexión SignalR establecida');
    return connection;
    
  } catch (error) {
    console.error('❌ Error creando conexión SignalR:', error);
    throw error;
  }
};

/**
 * Función para obtener la instancia actual de conexión SignalR
 */
export const getSignalRConnection = (): signalR.HubConnection | null => {
  return signalRService.getConnectionState().connection;
};

/**
 * Función para verificar si SignalR está conectado
 */
export const isSignalRConnected = (): boolean => {
  return signalRService.isConnected();
};

export default signalRService;
