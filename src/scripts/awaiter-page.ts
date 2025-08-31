import { apiClient, getTables, markOrderAsDelivered, updateTable } from '../services/api';
import { getCurrentUser } from '../services/role-guard';
import notificationManager from '../services/notifications';
import { signalRService } from '../services/signalr'; // Existing kitchen hub service
import { notificationSignalRService } from '../services/notification-signalr'; // New notification hub service
import AudioNotificationManager from '../services/audio-notifications';
import type { OrderReport } from '../types/reports';
import type { OrderStatusUpdatePayload } from '../types/kitchen';
import type { Table } from '../types/table';

// --- TYPES ---
interface PaginatedResponse<T> {
  items: T[];
}

// --- CONSTANTS ---
const ICONS = {
  approve: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`,
  reject: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`,
  deliver: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>`,
  freeTable: `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-10.707a1 1 0 00-1.414-1.414L10 8.586 7.707 6.293a1 1 0 00-1.414 1.414L8.586 10l-2.293 2.293a1 1 0 001.414 1.414L10 11.414l2.293 2.293a1 1 0 001.414-1.414L11.414 10l2.293-2.293z" clip-rule="evenodd" /></svg>`
};
const DELIVERED_ORDERS_TO_SHOW = 5;
const TABLE_STATUS_MAP: { [key: string]: number } = { Available: 1, Occupied: 2, Reserved: 3 };

// --- CLASS DEFINITION ---
class AwaiterPageManager {
  private orders: Map<string, OrderReport> = new Map();
  private tables: Map<string, Table> = new Map();
  private restaurantId: string | null = null;
  private audioNotifier: AudioNotificationManager;

  constructor() {
    const user = getCurrentUser();
    if (user) this.restaurantId = user.restaurantId;
    this.audioNotifier = new AudioNotificationManager();
    this.init();
  }

  private init() {
    this.loadInitialData();
    this.setupKitchenSignalR(); // Renamed from setupSignalR
    this.setupNotificationSignalR(); // New notification hub setup
    this.setupModalListeners();
  }

  private async loadInitialData() {
    await Promise.all([this.loadOrders(), this.loadTables()]);
  }

  // --- SIGNALR (Kitchen Hub) --- //
  private async setupKitchenSignalR() {
    if (!this.restaurantId) return;
    try {
      await signalRService.connect('kitchenHub');
      signalRService.setEventHandlers({
        onNewOrder: (order) => this.handleNewOrder(order),
        onOrderStatusUpdated: (update) => this.handleOrderStatusUpdate(update),
        onTableStateUpdated: (update) => this.handleTableStateUpdate(update),
      });
    } catch (error) {
      notificationManager.error('No se pudo conectar a las notificaciones de cocina en tiempo real.');
    }
  }

  // --- SIGNALR (Notifications Hub) --- //
  private async setupNotificationSignalR() {
    if (!this.restaurantId) return;
    try {
      await notificationSignalRService.connect();
      notificationSignalRService.setEventHandlers({
        onNewOrderReceived: (orderPayload: OrderReport) => {
          console.log(">>> Evento NewOrderReceived recibido en el listener del NotificationsHub <<<");
          console.log("Nueva Orden:", orderPayload);
          // Add the new order to the awaiting-payment column
          if (!this.orders.has(orderPayload.id)) {
            console.log(`Orden ${orderPayload.id} no encontrada en el mapa. Agregando y renderizando.`);
            this.orders.set(orderPayload.id, orderPayload);
            this.renderOrders();
            this.audioNotifier.notifyNewOrder();
            notificationManager.success(`Nuevo pedido #${orderPayload.orderCode} en la mesa ${orderPayload.tableCode} esperando aprobación.`);
          } else {
            console.log(`Orden ${orderPayload.id} ya existe en el mapa. No se agregará de nuevo.`);
          }
        }
      });
    } catch (error) {
      notificationManager.error('No se pudo conectar al hub de notificaciones.');
    }
  }

  private handleNewOrder(newOrder: OrderReport) {
    // This handler is for the kitchen hub, which might send different types of new orders
    // For now, we assume NewOrderForApproval from notification hub is the primary source for awaiting payment
    // If kitchen hub also sends new orders for approval, this logic might need adjustment.
    if (this.orders.has(newOrder.id)) return;
    this.orders.set(newOrder.id, newOrder);
    this.renderOrders();
    this.audioNotifier.notifyNewOrder();
    notificationManager.success(`Nuevo pedido #${newOrder.orderCode}`);
  }

  private handleOrderStatusUpdate(update: OrderStatusUpdatePayload) {
    if (this.orders.has(update.orderId)) {
      const order = this.orders.get(update.orderId)!;
      order.status = update.newStatus as OrderReport['status'];
      this.orders.set(order.id, order);
      this.renderOrders();
    }
  }

  private handleTableStateUpdate(update: { tableId: string, newState: string }) {
    this.updateTableStatus(update.tableId, update.newState);
  }

  // --- DATA LOADING --- //
  private async loadOrders() {
    if (!this.restaurantId) {
        this.showError('orders-section');
        return;
    };
    this.setInitialColumnState();

    try {
      const response = await apiClient.get<PaginatedResponse<OrderReport>>(`/orders/restaurant/${this.restaurantId}?pageSize=100`);
      const orderItems = response.data.items;
      this.orders.clear();
      orderItems.filter(o => o.status !== 'Cancelled').forEach(order => this.orders.set(order.id, order));
      this.renderOrders();
    } catch (error) {
      console.error("Error loading orders:", error);
      this.showError('orders-section');
    }
  }

  private async loadTables() {
    this.showLoading('tables');
    try {
      const tableData = await getTables();
      this.tables.clear();
      tableData.forEach(table => this.tables.set(table.id, table));
      this.renderTables();
    } catch (error) {
      this.showError('tables');
    }
  }

  // --- RENDERING --- //
  private renderOrders() {
    const allOrders = [...this.orders.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const awaitingPayment = allOrders.filter(o => o.status === 'AwaitingPayment');
    const readyToDeliver = allOrders.filter(o => o.status === 'Ready');
    const delivered = allOrders.filter(o => o.status === 'Delivered');

    this.renderColumn('awaiting-payment', awaitingPayment, this.renderAwaitingPaymentCard);
    this.renderColumn('ready-to-deliver', readyToDeliver, this.renderReadyToDeliverCard);
    this.renderDeliveredColumn(delivered);
    this.assignActionButtons();
  }

  private renderDeliveredColumn(deliveredOrders: OrderReport[]) {
    this.renderColumn('delivered', deliveredOrders.slice(0, DELIVERED_ORDERS_TO_SHOW), this.renderDeliveredCard);
    const footer = document.getElementById('delivered-footer');
    if (footer) {
      if (deliveredOrders.length > DELIVERED_ORDERS_TO_SHOW) {
        footer.innerHTML = `<button id="show-history-btn" class="text-accent hover:underline text-sm font-medium">Ver todos (${deliveredOrders.length})</button>`;
        document.getElementById('show-history-btn')?.addEventListener('click', () => this.showHistoryModal(deliveredOrders));
      } else {
        footer.innerHTML = '';
      }
    }
  }

  private renderTables() {
    this.hideLoading('tables');
    const grid = document.getElementById('tables-grid');
    const emptyEl = document.getElementById('tables-empty');
    if (!grid || !emptyEl) return;

    const tableArray = [...this.tables.values()].sort((a, b) => a.code.localeCompare(b.code));
    if (tableArray.length === 0) {
      emptyEl.classList.remove('hidden');
      grid.classList.add('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = tableArray.map(table => this.renderTableCard(table)).join('');
    this.assignTableActionButtons();
  }

  private renderColumn(columnId: string, orders: OrderReport[], cardRenderer: (order: OrderReport) => string) {
    const cardsContainer = document.getElementById(`${columnId}-cards`);
    const loadingEl = document.getElementById(`${columnId}-loading`);
    const emptyEl = document.getElementById(`${columnId}-empty`);

    if (!cardsContainer || !loadingEl || !emptyEl) return;

    loadingEl.classList.add('hidden');
    cardsContainer.innerHTML = '';

    if (orders.length === 0) {
      emptyEl.classList.remove('hidden');
    } else {
      emptyEl.classList.add('hidden');
      cardsContainer.innerHTML = orders.map(cardRenderer.bind(this)).join('');
    }
  }

  private renderAwaitingPaymentCard = (order: OrderReport) => `
    <div id="order-${order.id}" class="bg-surface rounded-lg p-4 border border-yellow-500/30 shadow-lg">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-lg text-white">#${order.orderCode}</h3>
        <p class="text-sm text-text-secondary">Mesa: ${order.tableCode}</p>
      </div>
      <p class="font-bold text-2xl text-yellow-400 mb-4">${this.formatCurrency(order.total)}</p>
      <div class="grid grid-cols-2 gap-2">
        <button data-order-id="${order.id}" class="reject-btn flex items-center justify-center w-full bg-red-600/80 text-white py-2 rounded hover:bg-red-700 transition-colors">${ICONS.reject} Rechazar</button>
        <button data-order-id="${order.id}" class="approve-btn flex items-center justify-center w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors">${ICONS.approve} Aprobar</button>
      </div>
    </div>
  `;

  private renderReadyToDeliverCard = (order: OrderReport) => `
    <div id="order-${order.id}" class="bg-surface rounded-lg p-4 border border-green-500/30 shadow-lg">
      <div class="flex justify-between items-start mb-3">
        <div>
          <h3 class="font-bold text-2xl text-white">Mesa ${order.tableCode}</h3>
          <p class="text-sm text-text-secondary">Pedido #${order.orderCode}</p>
        </div>
        <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-900/30 text-green-400">Listo</span>
      </div>
      <button data-order-id="${order.id}" class="deliver-btn flex items-center justify-center w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold">${ICONS.deliver} Marcar como Entregado</button>
    </div>
  `;

  private renderDeliveredCard = (order: OrderReport) => `
    <div id="order-${order.id}" class="bg-surface-variant rounded-lg p-3 border border-transparent opacity-70">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="font-semibold text-md text-text-primary">#${order.orderCode}</h3>
          <p class="text-xs text-text-secondary">Mesa: ${order.tableCode}</p>
        </div>
        <span class="text-sm text-gray-400">${this.formatCurrency(order.total)}</span>
      </div>
    </div>
  `;

  private renderTableCard(table: Table): string {
    const isOccupied = table.status === 'Occupied';
    const statusColor = isOccupied ? 'text-red-400' : 'text-green-400';
    const statusBg = isOccupied ? 'bg-red-500/10' : 'bg-green-500/10';
    const borderColor = isOccupied ? 'border-red-500/20' : 'border-green-500/20';

    return `
      <div id="table-${table.id}" class="bg-surface rounded-lg p-3 border ${borderColor} ${statusBg} transition-all">
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-bold text-white">${table.code}</h4>
          <span class="text-xs font-medium ${statusColor}">${table.status}</span>
        </div>
        ${isOccupied ? 
          `<button data-table-id="${table.id}" data-table-code="${table.code}" class="free-table-btn w-full text-sm bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 py-1.5 rounded transition-colors flex items-center justify-center">${ICONS.freeTable} Liberar</button>` : 
          '<div class="h-[30px]"></div>'
        }
      </div>
    `;
  }

  // --- MODAL --- //
  private setupModalListeners() {
    document.getElementById('close-history-modal-btn')?.addEventListener('click', () => this.hideHistoryModal());
    document.getElementById('delivered-history-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.hideHistoryModal();
    });
  }

  private showHistoryModal(orders: OrderReport[]) {
    const modal = document.getElementById('delivered-history-modal');
    const list = document.getElementById('delivered-history-list');
    if (!modal || !list) return;

    if (orders.length === 0) {
        list.innerHTML = `<p class="text-text-secondary text-center">No hay pedidos en el historial de hoy.</p>`;
    } else {
        list.innerHTML = orders.map(order => this.renderHistoryItem(order)).join('');
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  private hideHistoryModal() {
    const modal = document.getElementById('delivered-history-modal');
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  }

  private renderHistoryItem(order: OrderReport): string {
    return `
      <div class="bg-surface p-3 rounded-lg flex justify-between items-center">
        <div>
          <p class="font-semibold text-white">#${order.orderCode} (Mesa ${order.tableCode})</p>
          <p class="text-xs text-text-secondary">${new Date(order.createdAt).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <p class="font-bold text-text-primary">${this.formatCurrency(order.total)}</p>
      </div>
    `;
  }

  // --- ACTIONS & EVENT HANDLERS --- //
  private assignActionButtons() {
    document.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', e => this.handleAction(e, this.approveOrder)));
    document.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', e => this.handleAction(e, this.rejectOrder)));
    document.querySelectorAll('.deliver-btn').forEach(b => b.addEventListener('click', e => this.handleAction(e, this.markAsDelivered)));
  }

  private assignTableActionButtons() {
    document.querySelectorAll('.free-table-btn').forEach(button => {
      button.addEventListener('click', e => this.handleTableAction(e, this.freeUpTable));
    });
  }

  private async handleAction(event: Event, action: (id: string) => Promise<void>) {
    const button = event.currentTarget as HTMLButtonElement;
    const orderId = button.dataset.orderId;
    if (orderId) {
      button.disabled = true;
      button.classList.add('opacity-50');
      await action.call(this, orderId);
    }
  }
  
  private async handleTableAction(event: Event, action: (id: string, code: string) => Promise<void>) {
    const button = event.currentTarget as HTMLButtonElement;
    const tableId = button.dataset.tableId;
    const tableCode = button.dataset.tableCode;
    if (tableId && tableCode) {
      button.disabled = true;
      button.classList.add('opacity-50');
      await action.call(this, tableId, tableCode);
      button.disabled = false;
    }
  }

  private async approveOrder(orderId: string) {
    console.log(`>>> Intentando aprobar pedido ${orderId}...`);
    try {
      await apiClient.post(`/orders/${orderId}/approve`);
      notificationManager.success('Pago aprobado con éxito');
      this.updateOrderStatus(orderId, 'Pending');
      console.log(`Pedido ${orderId} aprobado con éxito.`);
    } catch (error: any) {
      console.error(`Error al aprobar el pedido ${orderId}:`, error);
      notificationManager.error(error.response?.data?.message || 'Error al aprobar el pago');
    }
  }

  private async rejectOrder(orderId: string) {
    try {
      await apiClient.post(`/orders/${orderId}/reject`);
      notificationManager.info('Pedido rechazado.');
      this.orders.delete(orderId);
      this.renderOrders();
    } catch (error: any) {
      notificationManager.error(error.response?.data?.message || 'Error al rechazar el pedido');
    }
  }

  private async markAsDelivered(orderId: string) {
    try {
      await markOrderAsDelivered(orderId);
      notificationManager.success('Pedido marcado como entregado.');
      this.updateOrderStatus(orderId, 'Delivered');
    } catch (error: any) {
      notificationManager.error(error.response?.data?.message || 'Error al marcar como entregado');
    }
  }

  private async freeUpTable(tableId: string, tableCode: string) {
    try {
      await updateTable(tableId, { code: tableCode, status: TABLE_STATUS_MAP.Available });
      notificationManager.success(`Mesa ${tableCode} ha sido liberada.`);
      this.updateTableStatus(tableId, 'Available');
    } catch (error) {
      notificationManager.error('Error al liberar la mesa.');
    }
  }

  // --- UI & STATE UPDATES --- //
  private updateOrderStatus(orderId: string, newStatus: OrderReport['status']) {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = newStatus;
      this.orders.set(orderId, order);
      this.renderOrders();
    }
  }

  private updateTableStatus(tableId: string, newStatus: string) {
    const table = this.tables.get(tableId);
    if (table) {
      table.status = newStatus;
      this.tables.set(tableId, table);
      this.renderTables();
    }
  }

  private setInitialColumnState() {
    ['awaiting-payment', 'ready-to-deliver', 'delivered'].forEach(id => {
        document.getElementById(`${id}-loading`)?.classList.remove('hidden');
        document.getElementById(`${id}-empty`)?.classList.add('hidden');
        const cardsContainer = document.getElementById(`${id}-cards`);
        if(cardsContainer) cardsContainer.innerHTML = '';
    });
  }

  private showLoading(section: string) { 
      document.getElementById(`${section}-loading`)?.classList.remove('hidden');
      document.getElementById(`${section}-grid`)?.classList.add('hidden');
      document.getElementById(`${section}-empty`)?.classList.add('hidden');
  }
  private hideLoading(section: string) { 
      document.getElementById(`${section}-loading`)?.classList.add('hidden');
      document.getElementById(`${section}-grid`)?.classList.remove('hidden');
  }
  private showError(section: string) {
    const errorEl = document.getElementById(`${section}-error`);
    const sectionEl = document.getElementById(section);
    if(errorEl && sectionEl) {
        errorEl.classList.remove('hidden');
        sectionEl.classList.add('hidden');
    }
    if (section === 'orders-section') {
        ['awaiting-payment', 'ready-to-deliver', 'delivered'].forEach(id => this.hideColumnLoading(id));
    }
  }

  private hideColumnLoading(id: string) {
      document.getElementById(`${id}-loading`)?.classList.add('hidden');
  }

  private formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

new AwaiterPageManager();