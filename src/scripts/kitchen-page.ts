import { apiClient } from '../services/api';
import AudioNotificationManager from '../services/audio-notifications';
import notificationManager from '../services/notifications';
import orderHistoryService from '../services/order-history';
import type { SignalREventHandlers } from '../services/signalr';
import { createSignalRConnection, signalRService } from '../services/signalr';
import type {
    KanbanColumn,
    KanbanColumnId,
    KitchenOrder,
    OrderStatusUpdatePayload,
    SignalRConnection
} from '../types/kitchen';

class KitchenPageManager {
  private signalRConnection: any = null;
  private connectionState: SignalRConnection = {
    isConnected: false,
    reconnectAttempts: 0
  };
  private orders: Map<string, KitchenOrder> = new Map();
  private reconnectInterval: NodeJS.Timeout | null = null;
  private timeUpdateInterval: NodeJS.Timeout | null = null;
  private audioManager: AudioNotificationManager;
  private completedOrdersToday: number = 0;

  constructor() {
    this.audioManager = new AudioNotificationManager();
    this.init();
  }

  private async init(): Promise<void> {
    console.log('🍳 Inicializando Kitchen Manager...');
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Cargar pedidos iniciales
    await this.loadInitialOrders();
    
    // Cargar estadísticas del día
    await this.loadTodayStatistics();
    
    // Inicializar SignalR
    await this.initializeSignalR();
    
    // Iniciar actualizador de tiempo
    this.startTimeUpdater();
    
    console.log('✅ Kitchen Manager inicializado');
  }

  private setupEventListeners(): void {
    // Botón de refresh manual
    const refreshBtn = document.getElementById('refresh-orders-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshOrders());
    }

    // Botón de historial
    const historyBtn = document.getElementById('history-btn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => this.showHistoryModal());
    }

    // Cerrar modal de historial
    const closeHistoryBtn = document.getElementById('close-history-btn');
    if (closeHistoryBtn) {
      closeHistoryBtn.addEventListener('click', () => this.hideHistoryModal());
    }

    // Click fuera del modal para cerrarlo
    const historyModal = document.getElementById('history-modal');
    if (historyModal) {
      historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) {
          this.hideHistoryModal();
        }
      });
    }

    // Toggle de audio
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    if (audioToggleBtn) {
      audioToggleBtn.addEventListener('click', () => this.toggleAudio());
    }

    // Detectar pérdida de foco para reconectar SignalR si es necesario
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.connectionState.isConnected) {
        // El servicio SignalR maneja automáticamente la reconexión
        console.log('🔄 Página visible, verificando conexión...');
      }
    });

    // Configurar audio inicial
    this.updateAudioButtonState();
  }

  private async loadInitialOrders(): Promise<void> {
    console.log('📥 Cargando pedidos iniciales...');
    
    try {
      const response = await apiClient.get<KitchenOrder[]>('/kitchen/orders');
      const orders = response.data;
      
      // Limpiar órdenes existentes
      this.orders.clear();
      
      // Procesar cada orden
      orders.forEach(order => {
        this.orders.set(order.id, order);
      });
      
      // Renderizar todas las columnas
      this.renderAllColumns();
      this.updateCounters();
      
      console.log(`✅ ${orders.length} pedidos cargados`);
      
    } catch (error) {
      console.error('❌ Error cargando pedidos:', error);
      notificationManager.show('Error al cargar los pedidos iniciales', 'error');
      this.showErrorState();
    }
  }

  private async refreshOrders(): Promise<void> {
    console.log('🔄 Refrescando pedidos manualmente...');
    
    const refreshBtn = document.getElementById('refresh-orders-btn');
    if (refreshBtn) {
      refreshBtn.classList.add('animate-spin');
    }
    
    try {
      await this.loadInitialOrders();
      notificationManager.show('Pedidos actualizados', 'success', 2000);
    } catch (error) {
      console.error('❌ Error al refrescar:', error);
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove('animate-spin');
      }
    }
  }

  private async initializeSignalR(): Promise<void> {
    console.log('🔌 Inicializando SignalR...');

    try {
      // Configurar event handlers
      const eventHandlers: SignalREventHandlers = {
        onNewOrder: (order: KitchenOrder) => this.handleNewOrder(order),
        onOrderStatusUpdated: (update: { orderId: string; newStatus: string }) => 
          this.handleOrderStatusUpdate({ 
            orderId: update.orderId, 
            newStatus: update.newStatus as 'Pending' | 'InPreparation' | 'Ready'
          }),
        onConnectionStateChanged: (connected: boolean) => {
          this.connectionState.isConnected = connected;
          this.updateConnectionStatus(
            connected ? 'connected' : 'disconnected',
            connected ? 'Conectado' : 'Desconectado'
          );
        }
      };

      // Crear conexión usando el servicio centralizado
      this.signalRConnection = await createSignalRConnection('kitchenHub', eventHandlers);
      
      // Actualizar estado de conexión
      this.connectionState.isConnected = true;
      this.connectionState.reconnectAttempts = 0;
      this.updateConnectionStatus('connected', 'Conectado');
      
      console.log('✅ SignalR conectado');
      
    } catch (error) {
      console.error('❌ Error inicializando SignalR:', error);
      this.connectionState.isConnected = false;
      this.updateConnectionStatus('disconnected', 'Error de conexión');
    }
  }

  private updateConnectionStatus(status: 'connected' | 'connecting' | 'disconnected', message: string): void {
    const indicator = document.getElementById('connection-indicator');
    const statusText = document.getElementById('connection-status');
    
    if (indicator) {
      indicator.className = `w-3 h-3 rounded-full ${status}`;
    }
    
    if (statusText) {
      statusText.textContent = message;
    }
  }

  // === MÉTODOS DE AUDIO ===

  private toggleAudio(): void {
    const isEnabled = this.audioManager.toggleAudio();
    this.updateAudioButtonState();
    
    // Mostrar feedback visual
    const message = isEnabled ? '🔊 Sonidos activados' : '🔇 Sonidos desactivados';
    notificationManager.show(message, 'info');
  }

  private updateAudioButtonState(): void {
    const audioBtn = document.getElementById('audio-toggle-btn');
    const onIcon = document.getElementById('audio-on-icon');
    const offIcon = document.getElementById('audio-off-icon');
    
    if (!audioBtn || !onIcon || !offIcon) return;

    const isEnabled = this.audioManager.isAudioEnabled();
    
    if (isEnabled) {
      onIcon.classList.remove('hidden');
      offIcon.classList.add('hidden');
      audioBtn.classList.remove('text-red-400');
      audioBtn.classList.add('text-text-primary');
    } else {
      onIcon.classList.add('hidden');
      offIcon.classList.remove('hidden');
      audioBtn.classList.add('text-red-400');
      audioBtn.classList.remove('text-text-primary');
    }
  }

  // === MÉTODOS DE HISTORIAL ===

  private async showHistoryModal(): Promise<void> {
    const modal = document.getElementById('history-modal');
    if (!modal) return;

    // Mostrar modal
    modal.classList.remove('hidden');
    
    // Mostrar loading
    this.showHistoryLoading();
    
    try {
      // Cargar historial y estadísticas
      const history = await orderHistoryService.getTodayHistory();
      const stats = await orderHistoryService.getTodayStatistics();
      
      // Actualizar estadísticas
      this.updateHistoryStatistics(stats);
      
      // Mostrar pedidos
      this.renderHistoryOrders(history);
      
    } catch (error) {
      console.error('Error cargando historial:', error);
      this.showHistoryError();
    }
  }

  private hideHistoryModal(): void {
    const modal = document.getElementById('history-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  private showHistoryLoading(): void {
    const loading = document.getElementById('history-loading');
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    
    if (loading) loading.classList.remove('hidden');
    if (list) list.classList.add('hidden');
    if (empty) empty.classList.add('hidden');
  }

  private showHistoryError(): void {
    const loading = document.getElementById('history-loading');
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    
    if (loading) loading.classList.add('hidden');
    if (list) list.classList.add('hidden');
    if (empty) {
      empty.classList.remove('hidden');
      
      // Actualizar el ícono por uno de error
      const emptyIcon = empty.querySelector('#history-empty-icon');
      if (emptyIcon) {
        emptyIcon.innerHTML = `
          <!-- Icono de error: Exclamation Triangle -->
          <svg class="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"></path>
          </svg>
        `;
      }
      
      // Actualizar el texto
      const emptyText = empty.querySelector('#history-empty-text');
      if (emptyText) {
        emptyText.textContent = 'Error cargando el historial';
      }
    }
  }

  private resetHistoryEmptyState(): void {
    const empty = document.getElementById('history-empty');
    if (!empty) return;
    
    // Resetear al ícono de estado vacío normal
    const emptyIcon = empty.querySelector('#history-empty-icon');
    if (emptyIcon) {
      emptyIcon.innerHTML = `
        <!-- Icono por defecto: Empty state (sin pedidos) -->
        <svg class="w-16 h-16 text-text-secondary mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>
      `;
    }
    
    // Resetear al texto de estado vacío normal
    const emptyText = empty.querySelector('#history-empty-text');
    if (emptyText) {
      emptyText.textContent = 'No hay pedidos completados hoy';
    }
  }

  private updateHistoryStatistics(stats: any): void {
    const completedCount = document.getElementById('history-completed-count');
    const avgTime = document.getElementById('history-avg-time');
    const totalItems = document.getElementById('history-total-items');
    
    if (completedCount) {
      completedCount.textContent = stats.completedOrders?.toString() || '0';
    }
    
    if (avgTime) {
      const time = orderHistoryService.formatPreparationTime(stats.averagePreparationTime || 0);
      avgTime.textContent = time;
    }
    
    if (totalItems) {
      totalItems.textContent = stats.totalItemsPrepared?.toString() || '0';
    }
  }

  private renderHistoryOrders(orders: any[]): void {
    const loading = document.getElementById('history-loading');
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    
    if (loading) loading.classList.add('hidden');
    
    if (orders.length === 0) {
      if (empty) {
        empty.classList.remove('hidden');
        // Resetear al estado vacío normal (sin error)
        this.resetHistoryEmptyState();
      }
      if (list) list.classList.add('hidden');
      return;
    }
    
    if (list) {
      list.classList.remove('hidden');
      list.innerHTML = orders
        .map(order => orderHistoryService.createHistoryOrderCard(order))
        .join('');
    }
    
    if (empty) empty.classList.add('hidden');
  }

  private async loadTodayStatistics(): Promise<void> {
    try {
      const stats = await orderHistoryService.getTodayStatistics();
      this.completedOrdersToday = stats.completedOrders;
      this.updateCompletedTodayCounter();
    } catch (error) {
      console.error('Error cargando estadísticas del día:', error);
      // No es crítico, continuamos sin estadísticas
    }
  }

  private updateCompletedTodayCounter(): void {
    const counter = document.getElementById('completed-today-count');
    if (counter) {
      counter.textContent = this.completedOrdersToday.toString();
    }
  }

  private handleNewOrder(order: KitchenOrder): void {
    console.log('🆕 Procesando nuevo pedido:', order.orderCode);
    
    // Reproducir sonido de nuevo pedido
    this.audioManager.notifyNewOrder();
    
    // Agregar a nuestro mapa de órdenes
    this.orders.set(order.id, order);
    
    // Crear y renderizar la nueva tarjeta con animación
    const orderCard = this.createOrderCard(order);
    const pendingContainer = document.getElementById('pending-orders');
    
    if (pendingContainer) {
      // Ocultar empty state si existe
      const emptyState = document.getElementById('pending-empty');
      if (emptyState) emptyState.classList.add('hidden');
      
      // Insertar al principio de la columna
      pendingContainer.insertBefore(orderCard, pendingContainer.firstChild);
      
      // Aplicar animación de nuevo pedido
      orderCard.classList.add('new-order-animation');
      
      // Quitar animación después de que termine
      setTimeout(() => {
        orderCard.classList.remove('new-order-animation');
      }, 6000);
    }
    
    // Actualizar contadores
    this.updateCounters();
    
    // Mostrar notificación toast personalizada
    this.showNewOrderNotification(order);
  }

  private handleOrderStatusUpdate(payload: OrderStatusUpdatePayload): void {
    console.log('🔄 Procesando actualización de estado:', payload);
    
    const order = this.orders.get(payload.orderId);
    if (!order) {
      console.warn('⚠️ Orden no encontrada para actualizar:', payload.orderId);
      return;
    }
    
    // Actualizar el estado en memoria
    order.status = payload.newStatus;
    this.orders.set(order.id, order);
    
    // Mover la tarjeta visualmente
    this.moveOrderToColumn(order);
    
    // Actualizar contadores
    this.updateCounters();
  }

  private moveOrderToColumn(order: KitchenOrder): void {
    const orderCard = document.getElementById(`order-${order.id}`);
    if (!orderCard) {
      console.warn('⚠️ Tarjeta de orden no encontrada:', order.id);
      return;
    }
    
    const targetColumnId = this.getColumnIdFromStatus(order.status);
    const targetContainer = document.getElementById(`${targetColumnId}-orders`);
    
    if (!targetContainer) {
      console.error('❌ Contenedor de columna no encontrado:', targetColumnId);
      return;
    }
    
    // Aplicar animación de movimiento
    orderCard.classList.add('order-moving');
    
    setTimeout(() => {
      // Actualizar la tarjeta con el nuevo estado
      this.updateOrderCard(orderCard, order);
      
      // Mover al nuevo contenedor
      targetContainer.appendChild(orderCard);
      
      // Ocultar empty states
      const emptyState = document.getElementById(`${targetColumnId}-empty`);
      if (emptyState) emptyState.classList.add('hidden');
      
      // Quitar animación
      orderCard.classList.remove('order-moving');
      
      console.log(`✅ Orden ${order.orderCode} movida a ${targetColumnId}`);
    }, 150);
  }

  private renderAllColumns(): void {
    console.log('🎨 Renderizando todas las columnas...');
    
    const columns: KanbanColumn[] = [
      { id: 'pending', title: 'Pendiente', status: 'Pending', orders: [] },
      { id: 'inPreparation', title: 'En Preparación', status: 'InPreparation', orders: [] },
      { id: 'ready', title: 'Listo', status: 'Ready', orders: [] }
    ];
    
    // Clasificar órdenes por columna
    this.orders.forEach(order => {
      const column = columns.find(col => col.status === order.status);
      if (column) {
        column.orders.push(order);
      }
    });
    
    // Renderizar cada columna
    columns.forEach(column => {
      this.renderColumn(column);
    });
  }

  private renderColumn(column: KanbanColumn): void {
    const container = document.getElementById(`${column.id}-orders`);
    const loadingElement = document.getElementById(`${column.id}-loading`);
    const emptyElement = document.getElementById(`${column.id}-empty`);
    
    if (!container) return;
    
    // Ocultar loading
    if (loadingElement) loadingElement.classList.add('hidden');
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    if (column.orders.length === 0) {
      // Mostrar empty state
      if (emptyElement) emptyElement.classList.remove('hidden');
      return;
    }
    
    // Ocultar empty state
    if (emptyElement) emptyElement.classList.add('hidden');
    
    // Ordenar por fecha de creación (más recientes primero)
    const sortedOrders = [...column.orders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Renderizar cada orden
    sortedOrders.forEach(order => {
      const orderCard = this.createOrderCard(order);
      container.appendChild(orderCard);
    });
  }

  private createOrderCard(order: KitchenOrder): HTMLElement {
    const card = document.createElement('div');
    card.id = `order-${order.id}`;
    card.className = 'bg-background border border-white/10 rounded-lg p-4 hover:border-accent/50 transition-all cursor-pointer';
    
    // Calcular tiempo transcurrido
    const timeAgo = this.getTimeAgo(order.createdAt);
    
    card.innerHTML = `
      <!-- Header de la tarjeta -->
      <div class="flex justify-between items-start mb-3">
        <div>
          <h3 class="font-bold text-lg text-text-primary">#${order.orderCode} - Mesa ${order.tableCode}</h3>
          <p class="text-text-secondary text-sm" data-created-at="${order.createdAt}">hace ${timeAgo}</p>
        </div>
        <div class="w-2 h-2 ${this.getStatusDotColor(order.status)} rounded-full"></div>
      </div>
      
      <!-- Lista de platos -->
      <div class="mb-4 space-y-1">
        ${order.items.map(item => `
          <div class="flex justify-between items-center text-sm">
            <span class="text-text-primary">${item.quantity}x ${item.name}</span>
          </div>
        `).join('')}
      </div>
      
      <!-- Botón de acción -->
      <div class="mt-4">
        ${this.createActionButton(order)}
      </div>
    `;
    
    return card;
  }

  private createActionButton(order: KitchenOrder): string {
    switch (order.status) {
      case 'Pending':
        return `
          <button 
            onclick="kitchenManager.startOrder('${order.id}')"
            class="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 py-2 px-4 rounded-lg transition-colors font-medium text-sm"
          >
            🍳 Empezar a Cocinar
          </button>
        `;
      case 'InPreparation':
        return `
          <button 
            onclick="kitchenManager.markOrderReady('${order.id}')"
            class="w-full bg-green-600/20 text-green-400 hover:bg-green-600/30 py-2 px-4 rounded-lg transition-colors font-medium text-sm"
          >
            ✅ Pedido Listo
          </button>
        `;
      case 'Ready':
        return `
          <div class="text-center py-2 text-green-400 text-sm font-medium">
            🎉 Listo para entregar
          </div>
        `;
      default:
        return '';
    }
  }

  private updateOrderCard(cardElement: HTMLElement, order: KitchenOrder): void {
    // Actualizar solo el botón de acción
    const actionContainer = cardElement.querySelector('.mt-4');
    if (actionContainer) {
      actionContainer.innerHTML = this.createActionButton(order);
    }
    
    // Actualizar indicador de estado
    const statusDot = cardElement.querySelector('.w-2.h-2');
    if (statusDot) {
      statusDot.className = `w-2 h-2 ${this.getStatusDotColor(order.status)} rounded-full`;
    }
  }

  // Métodos públicos para ser llamados desde los botones
  async startOrder(orderId: string): Promise<void> {
    console.log('🍳 Iniciando preparación de orden:', orderId);
    
    const order = this.orders.get(orderId);
    if (!order) {
      console.error('❌ Orden no encontrada:', orderId);
      return;
    }
    
    try {
      // Llamar a la API de forma optimista
      await apiClient.put(`/kitchen/orders/${orderId}/start`);
      
      // Actualizar estado local (SignalR enviará la actualización también)
      order.status = 'InPreparation';
      this.orders.set(orderId, order);
      
      // Mover tarjeta inmediatamente (UX optimista)
      this.moveOrderToColumn(order);
      this.updateCounters();
      
      notificationManager.show(`Pedido #${order.orderCode} iniciado`, 'success', 3000);
      
    } catch (error) {
      console.error('❌ Error iniciando orden:', error);
      notificationManager.show('Error al iniciar el pedido', 'error');
    }
  }

  async markOrderReady(orderId: string): Promise<void> {
    console.log('✅ Marcando orden como lista:', orderId);
    
    const order = this.orders.get(orderId);
    if (!order) {
      console.error('❌ Orden no encontrada:', orderId);
      return;
    }
    
    try {
      // Llamar a la API de forma optimista
      await apiClient.put(`/kitchen/orders/${orderId}/ready`);
      
      // Reproducir sonido de pedido listo
      this.audioManager.notifyOrderReady();
      
      // Actualizar estado local (SignalR enviará la actualización también)
      order.status = 'Ready';
      this.orders.set(orderId, order);
      
      // Mover tarjeta inmediatamente (UX optimista)
      this.moveOrderToColumn(order);
      this.updateCounters();
      
      // Incrementar contador de completados si es la primera vez que se marca como listo
      this.completedOrdersToday++;
      this.updateCompletedTodayCounter();
      
      notificationManager.show(`¡Pedido #${order.orderCode} está listo!`, 'success', 3000);
      
    } catch (error) {
      console.error('❌ Error marcando orden como lista:', error);
      notificationManager.show('Error al marcar pedido como listo', 'error');
    }
  }

  private updateCounters(): void {
    const pendingCount = Array.from(this.orders.values()).filter(o => o.status === 'Pending').length;
    const inPreparationCount = Array.from(this.orders.values()).filter(o => o.status === 'InPreparation').length;
    const readyCount = Array.from(this.orders.values()).filter(o => o.status === 'Ready').length;
    const totalCount = this.orders.size;
    
    // Actualizar contadores de columnas
    const pendingCountEl = document.getElementById('pending-count');
    const inPreparationCountEl = document.getElementById('inPreparation-count');
    const readyCountEl = document.getElementById('ready-count');
    const totalCountEl = document.getElementById('total-orders-count');
    
    if (pendingCountEl) pendingCountEl.textContent = pendingCount.toString();
    if (inPreparationCountEl) inPreparationCountEl.textContent = inPreparationCount.toString();
    if (readyCountEl) readyCountEl.textContent = readyCount.toString();
    if (totalCountEl) totalCountEl.textContent = totalCount.toString();
  }

  private startTimeUpdater(): void {
    // Actualizar tiempos cada minuto
    this.timeUpdateInterval = setInterval(() => {
      this.updateAllTimestamps();
    }, 60000);
  }

  private updateAllTimestamps(): void {
    const timestampElements = document.querySelectorAll('[data-created-at]');
    
    timestampElements.forEach(element => {
      const createdAt = element.getAttribute('data-created-at');
      if (createdAt) {
        const timeAgo = this.getTimeAgo(createdAt);
        element.textContent = `hace ${timeAgo}`;
      }
    });
  }

  private showNewOrderNotification(order: KitchenOrder): void {
    const container = document.getElementById('kitchen-notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = 'kitchen-toast bg-yellow-600 text-white p-4 rounded-lg shadow-lg pointer-events-auto';
    
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5V7h-5l5-5 5 5h-5v10z"></path>
          </svg>
        </div>
        <div>
          <p class="font-medium">¡Nuevo Pedido!</p>
          <p class="text-sm opacity-90">#${order.orderCode} - Mesa ${order.tableCode}</p>
        </div>
      </div>
    `;
    
    container.appendChild(notification);
    
    // Remover automáticamente
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  private showErrorState(): void {
    ['pending', 'inPreparation', 'ready'].forEach(columnId => {
      const loading = document.getElementById(`${columnId}-loading`);
      const container = document.getElementById(`${columnId}-orders`);
      
      if (loading) loading.classList.add('hidden');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-12">
            <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-red-400 mb-2">Error al cargar pedidos</p>
            <button onclick="kitchenManager.refreshOrders()" class="text-accent hover:text-accent/80 text-sm">
              Reintentar
            </button>
          </div>
        `;
      }
    });
  }

  // Métodos de utilidad
  private getTimeAgo(dateString: string): string {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'menos de 1 min';
    if (diffMins === 1) return '1 min';
    if (diffMins < 60) return `${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hora';
    if (diffHours < 24) return `${diffHours} horas`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }

  private getStatusDotColor(status: string): string {
    switch (status) {
      case 'Pending': return 'bg-yellow-500';
      case 'InPreparation': return 'bg-blue-500';
      case 'Ready': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }

  private getColumnIdFromStatus(status: string): KanbanColumnId {
    switch (status) {
      case 'Pending': return 'pending';
      case 'InPreparation': return 'inPreparation';
      case 'Ready': return 'ready';
      default: return 'pending';
    }
  }

  // Cleanup
  destroy(): void {
    console.log('🧹 Limpiando Kitchen Manager...');
    
    // Desconectar SignalR usando el servicio centralizado
    signalRService.disconnect();
    
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
    
    this.orders.clear();
    console.log('✅ Kitchen Manager limpio');
  }
}

// Inicializar el kitchen manager
const kitchenManager = new KitchenPageManager();

// Exponer globalmente para uso en el HTML
(window as any).kitchenManager = kitchenManager;

// Cleanup cuando se navega fuera de la página
window.addEventListener('beforeunload', () => {
  kitchenManager.destroy();
});

export { KitchenPageManager };

