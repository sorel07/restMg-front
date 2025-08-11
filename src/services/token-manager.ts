import { refreshToken } from './api';
import { getToken, isTokenExpired, isTokenNearExpiry } from './auth';

/**
 * Servicio para manejar la renovación proactiva de tokens
 * Mejora la UX al renovar tokens antes de que expiren
 */
class TokenManagerService {
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 2 * 60 * 1000; // Revisar cada 2 minutos

  /**
   * Inicia el monitoreo automático del token
   */
  startTokenMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Limpiar cualquier intervalo existente
    this.stopTokenMonitoring();

    console.log('🔍 Iniciando monitoreo automático de token...');

    // Verificar inmediatamente al iniciar
    this.checkAndRefreshToken();

    // Configurar verificación periódica
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshToken();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Detiene el monitoreo automático del token
   */
  stopTokenMonitoring(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('⏹️ Monitoreo de token detenido');
    }
  }

  /**
   * Verifica si el token necesita renovación y lo renueva si es necesario
   */
  private async checkAndRefreshToken(): Promise<void> {
    const token = getToken();
    
    if (!token) {
      // No hay token, detener monitoreo
      this.stopTokenMonitoring();
      return;
    }

    try {
      if (isTokenExpired()) {
        console.log('⚠️ Token expirado detectado durante monitoreo');
        // El token está completamente expirado
        // El interceptor se encargará cuando se haga la próxima petición
        return;
      }

      if (isTokenNearExpiry()) {
        console.log('⏰ Token cerca de expirar, renovando proactivamente...');
        
        // Renovar el token proactivamente
        await refreshToken();
        
        console.log('✅ Token renovado proactivamente');
        
        // Opcional: Mostrar una notificación sutil al usuario
        this.showTokenRenewedNotification();
      }
    } catch (error) {
      console.error('❌ Error durante el monitoreo de token:', error);
      // No hacer nada aquí, el interceptor manejará el error cuando sea necesario
    }
  }

  /**
   * Muestra una notificación discreta al usuario sobre la renovación del token
   */
  private showTokenRenewedNotification(): void {
    // Solo mostrar en desarrollo para depuración
    if (import.meta.env.DEV) {
      console.log('🔐 Sesión renovada automáticamente');
      
      // Opcional: Mostrar notificación visual muy discreta
      // Solo en desarrollo para no molestar al usuario final
      try {
        import('./notifications').then(({ default: notificationManager }) => {
          notificationManager.show(
            'Sesión renovada automáticamente', 
            'info', 
            2000 // Solo 2 segundos
          );
        });
      } catch (error) {
        // No hacer nada si no hay sistema de notificaciones
      }
    }

    // En producción, solo log discreto para debugging
    console.log('🔐 Sesión renovada automáticamente');
  }

  /**
   * Fuerza una renovación inmediata del token (útil para pruebas)
   */
  async forceTokenRefresh(): Promise<boolean> {
    try {
      await refreshToken();
      console.log('✅ Renovación forzada del token exitosa');
      return true;
    } catch (error) {
      console.error('❌ Error en renovación forzada del token:', error);
      return false;
    }
  }
}

// Crear una instancia singleton
const tokenManager = new TokenManagerService();

// Auto-iniciar el monitoreo cuando el usuario esté logueado
if (typeof window !== 'undefined') {
  // Verificar si hay token al cargar la página
  document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (token && !isTokenExpired()) {
      tokenManager.startTokenMonitoring();
    }
  });

  // Escuchar eventos de visibilidad para pausar/reanudar monitoreo
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const token = getToken();
      if (token && !isTokenExpired()) {
        tokenManager.startTokenMonitoring();
      }
    } else {
      tokenManager.stopTokenMonitoring();
    }
  });
}

export default tokenManager;
