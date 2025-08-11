import { apiClient } from '../services/api';
import notificationManager from '../services/notifications';
import type { BestsellerReport, DateFilters, OrderReport } from '../types/reports';

declare global {
  interface Window {
    Chart: any;
  }
}

class ReportsPageManager {
  private currentFilters: DateFilters = {};
  private ordersChart: any = null;

  constructor() {
    this.initializeEventListeners();
    this.loadInitialData();
  }

  private initializeEventListeners() {
    // Filtros de fecha
    document.getElementById('apply-filters-btn')?.addEventListener('click', () => this.applyFilters());
    document.getElementById('clear-filters-btn')?.addEventListener('click', () => this.clearFilters());

    // Botones de retry
    document.getElementById('retry-orders-btn')?.addEventListener('click', () => this.loadOrders());
    document.getElementById('retry-bestsellers-btn')?.addEventListener('click', () => this.loadBestsellers());

    // Enter key en los inputs de fecha
    document.getElementById('date-from')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.applyFilters();
    });
    document.getElementById('date-to')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.applyFilters();
    });
  }

  private async loadInitialData() {
    await Promise.all([
      this.loadOrders(),
      this.loadBestsellers()
    ]);
  }

  private applyFilters() {
    const fromInput = document.getElementById('date-from') as HTMLInputElement;
    const toInput = document.getElementById('date-to') as HTMLInputElement;

    // Validar que las fechas sean coherentes
    if (fromInput.value && toInput.value) {
      const fromDate = new Date(fromInput.value);
      const toDate = new Date(toInput.value);
      
      if (fromDate > toDate) {
        notificationManager.error('La fecha de inicio debe ser anterior a la fecha de fin');
        return;
      }
    }

    this.currentFilters = {
      from: fromInput.value || undefined,
      to: toInput.value || undefined
    };

    // Recargar ambos reportes con filtros
    this.loadOrders();
    this.loadBestsellers();

    notificationManager.info('Filtros aplicados correctamente');
  }

  private clearFilters() {
    // Limpiar inputs
    const fromInput = document.getElementById('date-from') as HTMLInputElement;
    const toInput = document.getElementById('date-to') as HTMLInputElement;
    
    fromInput.value = '';
    toInput.value = '';
    
    // Limpiar filtros internos
    this.currentFilters = {};
    
    // Recargar datos sin filtros
    this.loadOrders();
    this.loadBestsellers();

    notificationManager.info('Filtros eliminados');
  }

  private buildQueryParams(filters: DateFilters): string {
    const params = new URLSearchParams();
    
    if (filters.from) {
      params.append('from', filters.from);
    }
    if (filters.to) {
      params.append('to', filters.to);
    }
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  private async loadOrders() {
    this.showOrdersLoading();
    
    try {
      const queryParams = this.buildQueryParams(this.currentFilters);
      const response = await apiClient.get(`/reports/orders${queryParams}`);
      const orders: OrderReport[] = response.data;
      
      this.renderOrders(orders);
      this.updateOrdersCount(orders.length);
      
    } catch (error) {
      console.error('Error loading orders:', error);
      this.showOrdersError();
      notificationManager.error('Error al cargar el historial de pedidos');
    }
  }

  private async loadBestsellers() {
    this.showBestsellersLoading();
    
    try {
      const queryParams = this.buildQueryParams(this.currentFilters);
      const response = await apiClient.get(`/reports/bestsellers${queryParams}`);
      const bestsellers: BestsellerReport[] = response.data;
      
      this.renderBestsellers(bestsellers);
      this.updateBestsellersRevenue(bestsellers);
      this.renderBestsellersChart(bestsellers);
      
    } catch (error) {
      console.error('Error loading bestsellers:', error);
      this.showBestsellersError();
      notificationManager.error('Error al cargar los platos más vendidos');
    }
  }

  // === Orders UI Management ===
  private showOrdersLoading() {
    this.setOrdersState('loading');
  }

  private showOrdersError() {
    this.setOrdersState('error');
  }

  private setOrdersState(state: 'loading' | 'error' | 'empty' | 'table') {
    const loadingEl = document.getElementById('orders-loading');
    const errorEl = document.getElementById('orders-error');
    const emptyEl = document.getElementById('orders-empty');
    const tableEl = document.getElementById('orders-table');

    // Hide all
    loadingEl?.classList.add('hidden');
    errorEl?.classList.add('hidden');
    emptyEl?.classList.add('hidden');
    tableEl?.classList.add('hidden');

    // Show current state
    switch (state) {
      case 'loading':
        loadingEl?.classList.remove('hidden');
        break;
      case 'error':
        errorEl?.classList.remove('hidden');
        break;
      case 'empty':
        emptyEl?.classList.remove('hidden');
        break;
      case 'table':
        tableEl?.classList.remove('hidden');
        break;
    }
  }

  private updateOrdersCount(count: number) {
    const countEl = document.getElementById('orders-count');
    if (countEl) {
      countEl.textContent = `${count} pedido${count !== 1 ? 's' : ''}`;
    }
  }

  private renderOrders(orders: OrderReport[]) {
    if (orders.length === 0) {
      this.setOrdersState('empty');
      return;
    }

    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(order => this.renderOrderRow(order)).join('');
    this.setOrdersState('table');

    // Add fade-in animation
    setTimeout(() => {
      tbody.classList.add('fade-in');
    }, 10);
  }

  private renderOrderRow(order: OrderReport): string {
    const statusConfig = this.getOrderStatusConfig(order.status);
    const formattedDate = this.formatDate(order.createdAt);
    const formattedTotal = this.formatCurrency(order.total);

    return `
      <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
        <td class="py-3 px-2 text-text-primary font-medium text-sm">${order.orderCode}</td>
        <td class="py-3 px-2 text-text-primary text-sm">${order.tableCode}</td>
        <td class="py-3 px-2 text-right text-accent font-semibold text-sm">${formattedTotal}</td>
        <td class="py-3 px-2 text-center">
          <span class="px-2 py-1 text-xs font-medium rounded-full ${statusConfig.classes}">
            ${statusConfig.text}
          </span>
        </td>
        <td class="py-3 px-2 text-right text-text-secondary text-sm">${formattedDate}</td>
      </tr>
    `;
  }

  private getOrderStatusConfig(status: string) {
    const statusMap: Record<string, { text: string; classes: string }> = {
      'Delivered': {
        text: 'Entregado',
        classes: 'bg-green-900/30 text-green-400 border border-green-800'
      },
      'Cancelled': {
        text: 'Cancelado',
        classes: 'bg-red-900/30 text-red-400 border border-red-800'
      },
      'Pending': {
        text: 'Pendiente',
        classes: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
      },
      'InProgress': {
        text: 'En Progreso',
        classes: 'bg-blue-900/30 text-blue-400 border border-blue-800'
      }
    };

    return statusMap[status] || {
      text: status,
      classes: 'bg-gray-900/30 text-gray-400 border border-gray-800'
    };
  }

  // === Bestsellers UI Management ===
  private showBestsellersLoading() {
    this.setBestsellersState('loading');
  }

  private showBestsellersError() {
    this.setBestsellersState('error');
  }

  private setBestsellersState(state: 'loading' | 'error' | 'empty' | 'content') {
    const loadingEl = document.getElementById('bestsellers-loading');
    const errorEl = document.getElementById('bestsellers-error');
    const emptyEl = document.getElementById('bestsellers-empty');
    const chartEl = document.getElementById('bestsellers-chart');
    const listEl = document.getElementById('bestsellers-list');

    // Hide all
    loadingEl?.classList.add('hidden');
    errorEl?.classList.add('hidden');
    emptyEl?.classList.add('hidden');
    chartEl?.classList.add('hidden');
    listEl?.classList.add('hidden');

    // Show current state
    switch (state) {
      case 'loading':
        loadingEl?.classList.remove('hidden');
        break;
      case 'error':
        errorEl?.classList.remove('hidden');
        break;
      case 'empty':
        emptyEl?.classList.remove('hidden');
        break;
      case 'content':
        chartEl?.classList.remove('hidden');
        listEl?.classList.remove('hidden');
        break;
    }
  }

  private updateBestsellersRevenue(bestsellers: BestsellerReport[]) {
    const totalRevenue = bestsellers.reduce((sum, item) => sum + item.totalRevenue, 0);
    const revenueEl = document.getElementById('bestsellers-revenue');
    
    if (revenueEl) {
      revenueEl.textContent = `${this.formatCurrency(totalRevenue)} ingresos`;
    }
  }

  private renderBestsellers(bestsellers: BestsellerReport[]) {
    if (bestsellers.length === 0) {
      this.setBestsellersState('empty');
      return;
    }

    const listEl = document.getElementById('bestsellers-list');
    if (!listEl) return;

    listEl.innerHTML = bestsellers.map((item, index) => 
      this.renderBestsellerItem(item, index + 1, bestsellers)
    ).join('');

    this.setBestsellersState('content');

    // Add fade-in animation
    setTimeout(() => {
      listEl.classList.add('fade-in');
    }, 10);
  }

  private renderBestsellerItem(item: BestsellerReport, position: number, allItems: BestsellerReport[]): string {
    const positionConfig = this.getPositionConfig(position);
    const formattedRevenue = this.formatCurrency(item.totalRevenue);

    return `
      <div class="bg-background rounded-lg p-4 border border-white/10 hover:border-accent/30 transition-colors">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-8 h-8 rounded-full ${positionConfig.classes}">
              <span class="font-bold text-sm">${position}</span>
            </div>
            <div>
              <h3 class="font-semibold text-text-primary text-sm">${item.name}</h3>
              <div class="flex gap-4 mt-1">
                <span class="text-text-secondary text-xs">
                  ${item.totalSold} vendido${item.totalSold !== 1 ? 's' : ''}
                </span>
                <span class="text-accent font-medium text-xs">
                  ${formattedRevenue}
                </span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="w-24 bg-gray-700 rounded-full h-2">
              <div 
                class="bg-accent h-2 rounded-full transition-all duration-1000"
                style="width: ${this.calculatePercentage(item.totalSold, allItems[0]?.totalSold || 1)}%"
              ></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getPositionConfig(position: number) {
    if (position === 1) {
      return { classes: 'bg-yellow-600 text-yellow-100' }; // Gold
    } else if (position === 2) {
      return { classes: 'bg-gray-400 text-gray-900' }; // Silver
    } else if (position === 3) {
      return { classes: 'bg-orange-600 text-orange-100' }; // Bronze
    } else {
      return { classes: 'bg-background border border-white/20 text-text-primary' };
    }
  }

  private renderBestsellersChart(bestsellers: BestsellerReport[]) {
    const canvas = document.getElementById('bestsellers-canvas') as HTMLCanvasElement;
    if (!canvas || !window.Chart || bestsellers.length === 0) return;

    // Destruir gráfico existente si existe
    if (this.ordersChart) {
      this.ordersChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Tomar solo los top 5 para el gráfico
    const topItems = bestsellers.slice(0, 5);

    this.ordersChart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: topItems.map(item => this.truncateText(item.name, 15)),
        datasets: [{
          label: 'Cantidad Vendida',
          data: topItems.map(item => item.totalSold),
          backgroundColor: 'rgba(245, 158, 11, 0.8)', // accent color
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#9CA3AF',
              font: { size: 11 }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#9CA3AF',
              font: { size: 11 }
            }
          }
        }
      }
    });
  }

  // === Utility Methods ===
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateOnly.getTime() === today.getTime()) {
      return `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  private calculatePercentage(value: number, max: number): number {
    return max === 0 ? 0 : Math.round((value / max) * 100);
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

// Initialize the reports manager when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ReportsPageManager();
});
