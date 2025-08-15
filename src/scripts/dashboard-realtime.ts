import { apiClient } from '../services/api';
import notificationManager from '../services/notifications';
import { createSignalRConnection, signalRService } from '../services/signalr';
import type {
    DashboardState,
    DashboardSummary,
    DashboardTable,
    NewOrderEvent,
    RecentOrder,
    TopDishToday
} from '../types/dashboard';

class RealTimeDashboardManager {
  private state: DashboardState = {
    summary: { revenueToday: 0, ordersToday: 0, averageTicketToday: 0 },
    topDishes: [],
    recentOrders: [],
    tables: new Map(),
    isLoaded: false,
    lastUpdated: new Date()
  };

  private isSignalRConnected: boolean = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log('🚀 Inicializando Real-Time Dashboard Manager...');
    
    try {
      // Paso 1: Cargar datos iniciales
      await this.loadInitialData();
      
      // Paso 2: Configurar SignalR
      await this.setupSignalR();
      
      // Paso 3: Configurar event listeners
      this.setupEventListeners();
      
      console.log('✅ Real-Time Dashboard Manager inicializado');
      
    } catch (error) {
      console.error('❌ Error inicializando dashboard:', error);
      notificationManager.show('Error al inicializar el dashboard', 'error');
    }
  }

  /**
   * PASO 1: Cargar datos iniciales una sola vez
   */
  private async loadInitialData(): Promise<void> {
    console.log('📥 Cargando datos iniciales del dashboard...');
    
    this.showLoadingStates();
    
    try {
      // Hacer todas las llamadas en paralelo
      const [summaryResponse, topDishesResponse, tablesResponse, recentOrdersResponse] = await Promise.all([
        apiClient.get<DashboardSummary>('/dashboard/summary'),
        apiClient.get<TopDishToday[]>('/dashboard/top-dishes-today'),
        apiClient.get<DashboardTable[]>('/tables'),
        apiClient.get<RecentOrder[]>('/kitchen/orders?status=pending&limit=5')
      ]);

      // Actualizar estado
      this.state.summary = summaryResponse.data;
      this.state.topDishes = topDishesResponse.data;
      this.state.recentOrders = recentOrdersResponse.data;
      
      // Convertir arrays de tablas a Map para búsquedas O(1)
      this.state.tables.clear();
      tablesResponse.data.forEach(table => {
        this.state.tables.set(table.id, table);
      });

      this.state.isLoaded = true;
      this.state.lastUpdated = new Date();

      // Renderizar todos los widgets
      this.renderAllWidgets();
      this.updateLastUpdatedTimestamp();
      
      console.log('✅ Datos iniciales cargados');
      
    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
      this.showErrorStates();
      throw error;
    }
  }

  /**
   * PASO 2: Configurar SignalR para tiempo real
   */
  private async setupSignalR(): Promise<void> {
    console.log('🔌 Configurando SignalR para tiempo real...');
    
    try {
      // Crear conexión con manejadores de eventos
      await createSignalRConnection('kitchenHub', {
        onNewOrder: (order: NewOrderEvent) => this.handleNewOrder(order),
        onTableStateUpdated: (update: { tableId: string; newState: string }) => this.handleTableStateUpdate(update),
        onConnectionStateChanged: (connected: boolean) => this.handleConnectionStateChange(connected)
      });
      
      console.log('✅ SignalR configurado y conectado');
      
    } catch (error) {
      console.error('❌ Error configurando SignalR:', error);
      // No lanzar error - el dashboard puede funcionar sin tiempo real
      this.updateConnectionIndicator(false, 'Error de conexión');
    }
  }

  /**
   * PASO 3: Configurar event listeners del DOM
   */
  private setupEventListeners(): void {
    // Botón de añadir mesa
    const addTableBtn = document.getElementById('add-table-btn');
    if (addTableBtn) {
      addTableBtn.addEventListener('click', () => this.handleAddTable());
    }

    // Botones de reintento
    const retryElements = document.querySelectorAll('[data-retry]');
    retryElements.forEach(element => {
      element.addEventListener('click', () => this.retryLoadData());
    });
  }

  /**
   * MANEJADORES DE EVENTOS SIGNALR
   */
  private handleNewOrder(order: NewOrderEvent): void {
    console.log('🆕 Procesando nuevo pedido en tiempo real:', order);
    
    try {
      // Actualizar KPIs
      this.updateKPIsForNewOrder(order);
      
      // Actualizar comandas recientes
      this.updateRecentOrdersForNewOrder(order);
      
      // Mostrar notificación
      this.showNewOrderNotification(order);
      
      // Actualizar timestamp
      this.updateLastUpdatedTimestamp();
      
      console.log('✅ Nuevo pedido procesado');
      
    } catch (error) {
      console.error('❌ Error procesando nuevo pedido:', error);
    }
  }

  private handleTableStateUpdate(update: { tableId: string; newState: string }): void {
    console.log('🏓 Procesando actualización de mesa en tiempo real:', update);
    
    try {
      // Actualizar estado en memoria
      const table = this.state.tables.get(update.tableId);
      if (table) {
        table.status = update.newState as any; // Cast temporal hasta que se ajusten los tipos del backend
        this.state.tables.set(update.tableId, table);
      }
      
      // Actualizar indicador visual
      this.updateTableStatusIndicator(update.tableId, update.newState);
      
      // Actualizar timestamp
      this.updateLastUpdatedTimestamp();
      
      console.log('✅ Estado de mesa actualizado');
      
    } catch (error) {
      console.error('❌ Error actualizando estado de mesa:', error);
    }
  }

  private handleConnectionStateChange(connected: boolean): void {
    this.isSignalRConnected = connected;
    this.updateConnectionIndicator(connected, connected ? 'Tiempo real activo' : 'Desconectado');
  }

  /**
   * ACTUALIZACIÓN DE KPIS EN TIEMPO REAL
   */
  private updateKPIsForNewOrder(order: NewOrderEvent): void {
    // Incrementar pedidos del día
    this.state.summary.ordersToday += 1;
    
    // Agregar al revenue del día
    this.state.summary.revenueToday += order.total;
    
    // Recalcular ticket promedio
    this.state.summary.averageTicketToday = this.state.summary.revenueToday / this.state.summary.ordersToday;
    
    // Actualizar widgets de KPI
    this.updateKPIWidgets();
  }

  private updateKPIWidgets(): void {
    // Actualizar ingresos
    const revenueElement = document.getElementById('revenue-amount');
    if (revenueElement) {
      revenueElement.textContent = this.formatCurrency(this.state.summary.revenueToday);
      this.animateValueUpdate(revenueElement);
    }

    // Actualizar pedidos
    const ordersElement = document.getElementById('orders-count');
    if (ordersElement) {
      ordersElement.textContent = this.state.summary.ordersToday.toString();
      this.animateValueUpdate(ordersElement);
    }

    // Actualizar ticket promedio
    const averageElement = document.getElementById('average-ticket');
    if (averageElement) {
      averageElement.textContent = this.formatCurrency(this.state.summary.averageTicketToday);
      this.animateValueUpdate(averageElement);
    }
  }

  /**
   * ACTUALIZACIÓN DE COMANDAS RECIENTES
   */
  private updateRecentOrdersForNewOrder(order: NewOrderEvent): void {
    const newRecentOrder: RecentOrder = {
      id: order.orderId,
      orderCode: order.orderCode,
      tableCode: order.tableCode,
      status: 'pending',
      createdAt: order.createdAt,
      items: order.items,
      total: order.total
    };

    // Agregar al principio y limitar a 5
    this.state.recentOrders.unshift(newRecentOrder);
    if (this.state.recentOrders.length > 5) {
      this.state.recentOrders = this.state.recentOrders.slice(0, 5);
    }

    // Re-renderizar comandas recientes
    this.renderRecentOrders();
  }

  /**
   * RENDERIZADO DE WIDGETS
   */
  private renderAllWidgets(): void {
    console.log('🎨 Renderizando todos los widgets...');
    
    this.renderKPIWidgets();
    this.renderTopDishes();
    this.renderTables();
    this.renderRecentOrders();
    
    this.hideLoadingStates();
  }

  private renderKPIWidgets(): void {
    // Ocultar loading y mostrar datos
    const revenueLoading = document.getElementById('revenue-loading');
    const revenueAmount = document.getElementById('revenue-amount');
    const ordersLoading = document.getElementById('orders-loading');
    const ordersCount = document.getElementById('orders-count');
    const averageLoading = document.getElementById('average-loading');
    const averageTicket = document.getElementById('average-ticket');

    if (revenueLoading && revenueAmount) {
      revenueLoading.classList.add('hidden');
      revenueAmount.classList.remove('hidden');
      revenueAmount.textContent = this.formatCurrency(this.state.summary.revenueToday);
    }

    if (ordersLoading && ordersCount) {
      ordersLoading.classList.add('hidden');
      ordersCount.classList.remove('hidden');
      ordersCount.textContent = this.state.summary.ordersToday.toString();
    }

    if (averageLoading && averageTicket) {
      averageLoading.classList.add('hidden');
      averageTicket.classList.remove('hidden');
      averageTicket.textContent = this.formatCurrency(this.state.summary.averageTicketToday);
    }
  }

  private renderTopDishes(): void {
    const loading = document.getElementById('top-dishes-loading');
    const list = document.getElementById('top-dishes-list');
    const empty = document.getElementById('top-dishes-empty');

    if (loading) loading.classList.add('hidden');

    if (this.state.topDishes.length === 0) {
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (list) {
      const topThree = this.state.topDishes.slice(0, 3);
      list.innerHTML = topThree.map((dish, index) => `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 bg-yellow-600/20 text-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">
              ${index + 1}
            </span>
            <span class="text-text-primary text-sm font-medium truncate">${dish.name}</span>
          </div>
          <span class="text-text-secondary text-xs">${dish.totalSold}</span>
        </div>
      `).join('');

      list.classList.remove('hidden');
    }
  }

  private renderTables(): void {
    const loading = document.getElementById('tables-loading');
    const error = document.getElementById('tables-error');
    const empty = document.getElementById('tables-empty');
    const grid = document.getElementById('tables-grid');
    const gridInner = document.getElementById('tables-grid-inner');

    if (loading) loading.classList.add('hidden');
    if (error) error.classList.add('hidden');

    if (this.state.tables.size === 0) {
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');

    if (gridInner) {
      const tablesArray = Array.from(this.state.tables.values());
      gridInner.innerHTML = tablesArray.map(table => `
        <div class="bg-background p-4 rounded-lg relative border border-white/5 hover:border-accent/30 transition-colors group" data-table-id="${table.id}">
          <!-- Status indicator -->
          <div class="absolute top-3 right-3 w-3 h-3 rounded-full ${this.getStatusColor(table.status)}" data-status-indicator="${table.id}"></div>
          
          <!-- Table info -->
          <div class="mb-4">
            <h3 class="font-bold text-lg text-text-primary">${table.code}</h3>
            <p class="text-xs text-text-secondary">
              Estado: <span class="${this.getStatusTextColor(table.status)}" data-status-text="${table.id}">${this.getStatusText(table.status)}</span>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button 
              class="flex-1 bg-accent/20 text-accent hover:bg-accent/30 py-2 px-3 rounded-md text-xs font-medium transition-colors"
              onclick="realTimeDashboard.generateQR('${table.id}', '${table.code}')"
            >
              QR
            </button>
            <button 
              class="flex-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 py-2 px-3 rounded-md text-xs font-medium transition-colors"
              onclick="realTimeDashboard.editTable('${table.id}')"
            >
              Editar
            </button>
          </div>
        </div>
      `).join('');

      if (grid) grid.classList.remove('hidden');
    }
  }

  private renderRecentOrders(): void {
    const loading = document.getElementById('recent-orders-loading');
    const error = document.getElementById('recent-orders-error');
    const empty = document.getElementById('recent-orders-empty');
    const list = document.getElementById('recent-orders-list');

    if (loading) loading.classList.add('hidden');
    if (error) error.classList.add('hidden');

    if (this.state.recentOrders.length === 0) {
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');

    if (list) {
      list.innerHTML = this.state.recentOrders.map(order => `
        <div class="bg-background p-4 rounded-lg border border-white/5 hover:border-orange-400/30 transition-colors cursor-pointer"
             onclick="window.location.href='/admin/kitchen'">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center space-x-2">
              <span class="font-semibold text-text-primary">#${order.id.toString().padStart(3, '0')}</span>
              <span class="text-xs px-2 py-1 rounded-full ${this.getOrderStatusStyle(order.status)}">
                ${this.getOrderStatusText(order.status)}
              </span>
            </div>
            <span class="text-text-secondary text-xs">${this.formatCurrency(order.total)}</span>
          </div>
          
          <p class="text-text-secondary text-xs mb-2">Mesa: ${order.tableCode}</p>
          
          <div class="text-xs text-text-secondary">
            <span>${this.formatOrderTime(order.createdAt)}</span>
            <span class="ml-2">• ${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}</span>
          </div>
        </div>
      `).join('');

      list.classList.remove('hidden');
    }
  }

  /**
   * MÉTODOS PÚBLICOS PARA INTERACCIÓN
   */
  async generateQR(tableId: string, tableCode: string): Promise<void> {
    try {
      // Para descargas directas, necesitamos la URL completa del backend
      const qrUrl = `${import.meta.env.PUBLIC_API_URL}/tables/${tableId}/qr`;
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `QR-Mesa-${tableCode}.png`;
      link.target = '_blank';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notificationManager.show(`Código QR de la mesa ${tableCode} generado`, 'success');
    } catch (error) {
      console.error('❌ Error generating QR:', error);
      notificationManager.show('Error al generar el código QR', 'error');
    }
  }

  editTable(tableId: string): void {
    window.location.href = '/admin/tables';
  }

  private handleAddTable(): void {
    window.location.href = '/admin/tables';
  }

  private async retryLoadData(): Promise<void> {
    try {
      await this.loadInitialData();
      notificationManager.show('Datos actualizados correctamente', 'success');
    } catch (error) {
      notificationManager.show('Error al actualizar los datos', 'error');
    }
  }

  /**
   * MÉTODOS DE UTILIDAD Y HELPERS
   */
  private updateTableStatusIndicator(tableId: string, newStatus: string): void {
    const statusIndicator = document.querySelector(`[data-status-indicator="${tableId}"]`);
    const statusText = document.querySelector(`[data-status-text="${tableId}"]`);
    
    if (statusIndicator) {
      statusIndicator.className = `absolute top-3 right-3 w-3 h-3 rounded-full ${this.getStatusColor(newStatus)}`;
      this.animateStatusChange(statusIndicator as HTMLElement);
    }
    
    if (statusText) {
      statusText.textContent = this.getStatusText(newStatus);
      statusText.className = this.getStatusTextColor(newStatus);
    }
  }

  private updateConnectionIndicator(connected: boolean, message: string): void {
    const indicator = document.getElementById('connection-indicator');
    const status = document.getElementById('connection-status');
    
    if (indicator) {
      indicator.className = `w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`;
    }
    
    if (status) {
      status.textContent = message;
    }
  }

  private updateLastUpdatedTimestamp(): void {
    const element = document.getElementById('last-updated');
    if (element) {
      const now = new Date();
      element.textContent = now.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  }

  private showNewOrderNotification(order: NewOrderEvent): void {
    notificationManager.show(
      `¡Nuevo pedido! #${order.orderCode} - Mesa ${order.tableCode} (${this.formatCurrency(order.total)})`, 
      'info', 
      5000
    );
  }

  private animateValueUpdate(element: HTMLElement): void {
    element.classList.add('animate-pulse');
    element.style.color = '#10b981'; // Green highlight
    
    setTimeout(() => {
      element.classList.remove('animate-pulse');
      element.style.color = '';
    }, 1000);
  }

  private animateStatusChange(element: HTMLElement): void {
    element.style.transform = 'scale(1.5)';
    element.style.transition = 'transform 0.3s ease-in-out';
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 300);
  }

  private showLoadingStates(): void {
    const loadingElements = [
      'revenue-loading', 'orders-loading', 'average-loading',
      'top-dishes-loading', 'tables-loading', 'recent-orders-loading'
    ];
    
    loadingElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.classList.remove('hidden');
    });
  }

  private hideLoadingStates(): void {
    const loadingElements = [
      'revenue-loading', 'orders-loading', 'average-loading',
      'top-dishes-loading', 'tables-loading', 'recent-orders-loading'
    ];
    
    loadingElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.classList.add('hidden');
    });
  }

  private showErrorStates(): void {
    const errorElements = ['tables-error', 'recent-orders-error'];
    errorElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.classList.remove('hidden');
    });
  }

  // Métodos de formateo (reutilizados del código anterior)
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  private formatOrderTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-yellow-500';
      case 'reserved': return 'bg-blue-500';
      case 'maintenance': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  private getStatusTextColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'available': return 'text-green-400';
      case 'occupied': return 'text-yellow-400';
      case 'reserved': return 'text-blue-400';
      case 'maintenance': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  private getStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'available': return 'Disponible';
      case 'occupied': return 'Ocupada';
      case 'reserved': return 'Reservada';
      case 'maintenance': return 'Mantenimiento';
      default: return status;
    }
  }

  private getOrderStatusStyle(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-600/20 text-yellow-400';
      case 'preparing': return 'bg-blue-600/20 text-blue-400';
      case 'ready': return 'bg-green-600/20 text-green-400';
      case 'delivered': return 'bg-gray-600/20 text-gray-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  }

  private getOrderStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pendiente';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Listo';
      case 'delivered': return 'Entregado';
      default: return status;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    console.log('🧹 Limpiando Real-Time Dashboard Manager...');
    
    signalRService.disconnect();
    
    console.log('✅ Real-Time Dashboard Manager limpio');
  }
}

// Inicializar el dashboard manager
const realTimeDashboard = new RealTimeDashboardManager();

// Exponer globalmente para uso en el HTML
(window as any).realTimeDashboard = realTimeDashboard;

// Cleanup cuando se navega fuera de la página
window.addEventListener('beforeunload', () => {
  realTimeDashboard.destroy();
});

export { RealTimeDashboardManager };
