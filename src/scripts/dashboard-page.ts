import { apiClient } from '../services/api';
import notificationManager from '../services/notifications';
import type {
    DashboardSummary,
    DashboardTable,
    RecentOrder,
    TopDishToday
} from '../types/dashboard';

interface TableModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  table?: DashboardTable;
}

class DashboardPageManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private tableModalState: TableModalState = { isOpen: false, mode: 'create' };

  constructor() {
    this.init();
  }

  private init(): void {
    console.log('🚀 Inicializando Dashboard Manager...');
    
    // Cargar datos iniciales
    this.loadDashboardData();
    
    // Configurar botones de acción
    this.setupEventListeners();
    
    // Configurar auto-refresh cada 30 segundos
    this.startAutoRefresh();
    
    // Actualizar timestamp inicial
    this.updateLastUpdated();
  }

  private setupEventListeners(): void {
    // Botón para añadir mesa
    const addTableBtn = document.getElementById('add-table-btn');
    if (addTableBtn) {
      addTableBtn.addEventListener('click', () => this.openAddTableModal());
    }

    // Botón para reintentar cargar mesas
    const retryTablesBtn = document.getElementById('retry-tables-btn');
    if (retryTablesBtn) {
      retryTablesBtn.addEventListener('click', () => this.loadTables());
    }

    // Botón para reintentar cargar pedidos
    const retryOrdersBtn = document.getElementById('retry-orders-btn');
    if (retryOrdersBtn) {
      retryOrdersBtn.addEventListener('click', () => this.loadRecentOrders());
    }
  }

  private startAutoRefresh(): void {
    // Refrescar datos cada 30 segundos
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData(false); // Sin mostrar loading
    }, 30000);
  }

  private updateLastUpdated(): void {
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
      const now = new Date();
      lastUpdatedElement.textContent = now.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  }

  private async loadDashboardData(showLoading: boolean = true): Promise<void> {
    try {
      // Cargar todos los datos en paralelo
      await Promise.all([
        this.loadSummaryKPIs(showLoading),
        this.loadTopDishesToday(showLoading),
        this.loadTables(showLoading),
        this.loadRecentOrders(showLoading)
      ]);

      this.updateLastUpdated();
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      notificationManager.show('Error al cargar los datos del dashboard', 'error');
    }
  }

  private async loadSummaryKPIs(showLoading: boolean = true): Promise<void> {
    const revenueLoading = document.getElementById('revenue-loading');
    const revenueAmount = document.getElementById('revenue-amount');
    const ordersLoading = document.getElementById('orders-loading');
    const ordersCount = document.getElementById('orders-count');
    const averageLoading = document.getElementById('average-loading');
    const averageTicket = document.getElementById('average-ticket');

    if (showLoading) {
      // Mostrar loading states
      if (revenueLoading) revenueLoading.classList.remove('hidden');
      if (revenueAmount) revenueAmount.classList.add('hidden');
      if (ordersLoading) ordersLoading.classList.remove('hidden');
      if (ordersCount) ordersCount.classList.add('hidden');
      if (averageLoading) averageLoading.classList.remove('hidden');
      if (averageTicket) averageTicket.classList.add('hidden');
    }

    try {
      const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
      const summary = response.data;

      // Actualizar KPIs con animación
      if (revenueAmount) {
        revenueAmount.textContent = this.formatCurrency(summary.revenueToday);
        revenueLoading?.classList.add('hidden');
        revenueAmount.classList.remove('hidden');
        revenueAmount.classList.add('fade-in');
      }

      if (ordersCount) {
        ordersCount.textContent = summary.ordersToday.toString();
        ordersLoading?.classList.add('hidden');
        ordersCount.classList.remove('hidden');
        ordersCount.classList.add('fade-in');
      }

      if (averageTicket) {
        averageTicket.textContent = this.formatCurrency(summary.averageTicketToday);
        averageLoading?.classList.add('hidden');
        averageTicket.classList.remove('hidden');
        averageTicket.classList.add('fade-in');
      }

    } catch (error) {
      console.error('❌ Error loading summary KPIs:', error);
      
      // Mostrar error states
      if (revenueAmount) {
        revenueAmount.textContent = 'Error';
        revenueLoading?.classList.add('hidden');
        revenueAmount.classList.remove('hidden');
      }
      if (ordersCount) {
        ordersCount.textContent = 'Error';
        ordersLoading?.classList.add('hidden');
        ordersCount.classList.remove('hidden');
      }
      if (averageTicket) {
        averageTicket.textContent = 'Error';
        averageLoading?.classList.add('hidden');
        averageTicket.classList.remove('hidden');
      }
    }
  }

  private async loadTopDishesToday(showLoading: boolean = true): Promise<void> {
    const loading = document.getElementById('top-dishes-loading');
    const list = document.getElementById('top-dishes-list');
    const empty = document.getElementById('top-dishes-empty');

    if (showLoading) {
      loading?.classList.remove('hidden');
      list?.classList.add('hidden');
      empty?.classList.add('hidden');
    }

    try {
      const response = await apiClient.get<TopDishToday[]>('/dashboard/top-dishes-today');
      const topDishes = response.data;

      loading?.classList.add('hidden');

      if (topDishes.length === 0) {
        empty?.classList.remove('hidden');
        return;
      }

      if (list) {
        // Mostrar solo los top 3 platos
        const topThree = topDishes.slice(0, 3);
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
        list.classList.add('fade-in');
      }

    } catch (error) {
      console.error('❌ Error loading top dishes:', error);
      loading?.classList.add('hidden');
      empty?.classList.remove('hidden');
    }
  }

  private async loadTables(showLoading: boolean = true): Promise<void> {
    const loading = document.getElementById('tables-loading');
    const error = document.getElementById('tables-error');
    const empty = document.getElementById('tables-empty');
    const grid = document.getElementById('tables-grid');
    const gridInner = document.getElementById('tables-grid-inner');

    if (showLoading) {
      loading?.classList.remove('hidden');
      error?.classList.add('hidden');
      empty?.classList.add('hidden');
      grid?.classList.add('hidden');
    }

    try {
      const response = await apiClient.get<DashboardTable[]>('/tables');
      const tables = response.data;

      loading?.classList.add('hidden');

      if (tables.length === 0) {
        empty?.classList.remove('hidden');
        return;
      }

      if (gridInner) {
        gridInner.innerHTML = tables.map(table => `
          <div class="bg-background p-4 rounded-lg relative border border-white/5 hover:border-accent/30 transition-colors group">
            <!-- Status indicator -->
            <div class="absolute top-3 right-3 w-3 h-3 rounded-full ${this.getStatusColor(table.status)}"></div>
            
            <!-- Table info -->
            <div class="mb-4">
              <h3 class="font-bold text-lg text-text-primary">${table.code}</h3>
              <p class="text-xs text-text-secondary">
                Estado: <span class="${this.getStatusTextColor(table.status)}">${this.getStatusText(table.status)}</span>
              </p>
              <p class="text-xs text-text-secondary mt-1">Capacidad: ${table.seats || 4} personas</p>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
              <button 
                class="flex-1 bg-accent/20 text-accent hover:bg-accent/30 py-2 px-3 rounded-md text-xs font-medium transition-colors"
                onclick="dashboardManager.generateQR('${table.id}', '${table.code}')"
              >
                QR
              </button>
              <button 
                class="flex-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 py-2 px-3 rounded-md text-xs font-medium transition-colors"
                onclick="dashboardManager.editTable('${table.id}')"
              >
                Editar
              </button>
            </div>
          </div>
        `).join('');

        grid?.classList.remove('hidden');
        gridInner.classList.add('fade-in');
      }

    } catch (err) {
      console.error('❌ Error loading tables:', err);
      loading?.classList.add('hidden');
      error?.classList.remove('hidden');
    }
  }

  private async loadRecentOrders(showLoading: boolean = true): Promise<void> {
    const loading = document.getElementById('recent-orders-loading');
    const error = document.getElementById('recent-orders-error');
    const empty = document.getElementById('recent-orders-empty');
    const list = document.getElementById('recent-orders-list');

    if (showLoading) {
      loading?.classList.remove('hidden');
      error?.classList.add('hidden');
      empty?.classList.add('hidden');
      list?.classList.add('hidden');
    }

    try {
      const response = await apiClient.get<RecentOrder[]>('/kitchen?limit=5&status=recent');
      const orders = response.data;

      loading?.classList.add('hidden');

      if (orders.length === 0) {
        empty?.classList.remove('hidden');
        return;
      }

      if (list) {
        list.innerHTML = orders.map(order => `
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
        list.classList.add('fade-in');
      }

    } catch (err) {
      console.error('❌ Error loading recent orders:', err);
      loading?.classList.add('hidden');
      error?.classList.remove('hidden');
    }
  }

  // Métodos públicos para ser llamados desde el HTML
  async generateQR(tableId: string, tableCode: string): Promise<void> {
    try {
      // Crear un enlace temporal para descargar el QR
      const qrUrl = `/tables/${tableId}/qr`;
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `QR-Mesa-${tableCode}.png`;
      link.target = '_blank';
      
      // Simular click para iniciar descarga
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
    // Por ahora, redirigir a la página de mesas
    window.location.href = '/admin/tables';
  }

  private openAddTableModal(): void {
    // Por ahora, redirigir a la página de mesas
    window.location.href = '/admin/tables';
  }

  // Métodos de formateo y utilidad
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
      case 'available':
        return 'bg-green-500';
      case 'occupied':
        return 'bg-yellow-500';
      case 'reserved':
        return 'bg-blue-500';
      case 'maintenance':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  private getStatusTextColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'available':
        return 'text-green-400';
      case 'occupied':
        return 'text-yellow-400';
      case 'reserved':
        return 'text-blue-400';
      case 'maintenance':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }

  private getStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'available':
        return 'Disponible';
      case 'occupied':
        return 'Ocupada';
      case 'reserved':
        return 'Reservada';
      case 'maintenance':
        return 'Mantenimiento';
      default:
        return status;
    }
  }

  private getOrderStatusStyle(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400';
      case 'preparing':
        return 'bg-blue-600/20 text-blue-400';
      case 'ready':
        return 'bg-green-600/20 text-green-400';
      case 'delivered':
        return 'bg-gray-600/20 text-gray-400';
      default:
        return 'bg-gray-600/20 text-gray-400';
    }
  }

  private getOrderStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pendiente';
      case 'preparing':
        return 'Preparando';
      case 'ready':
        return 'Listo';
      case 'delivered':
        return 'Entregado';
      default:
        return status;
    }
  }

  // Cleanup
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Inicializar el dashboard manager
const dashboardManager = new DashboardPageManager();

// Exponer globalmente para uso en el HTML
(window as any).dashboardManager = dashboardManager;

// Cleanup cuando se navega fuera de la página
window.addEventListener('beforeunload', () => {
  dashboardManager.destroy();
});

export { DashboardPageManager };

