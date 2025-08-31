import { apiClient } from "../services/api";
import AudioNotificationManager from "../services/audio-notifications";
import notificationManager from "../services/notifications";
import orderHistoryService from "../services/order-history";
import type { SignalREventHandlers } from "../services/signalr";
import { createSignalRConnection } from "../services/signalr";
import type {
  KanbanColumn,
  KanbanColumnId,
  KitchenOrder,
  OrderStatusUpdatePayload,
} from "../types/kitchen";

class KitchenPageManager {
  private orders: Map<string, KitchenOrder> = new Map();
  private audioManager: AudioNotificationManager;
  private completedOrdersToday: number = 0;
  private timeUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.audioManager = new AudioNotificationManager();
    this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.loadInitialOrders();
    await this.loadTodayStatistics();
    await this.initializeSignalR();
    this.startTimeUpdater();
  }

  private setupEventListeners(): void {
    document
      .getElementById("refresh-orders-btn")
      ?.addEventListener("click", () => this.refreshOrders());
    document
      .getElementById("history-btn")
      ?.addEventListener("click", () => this.showHistoryModal());
    document
      .getElementById("close-history-btn")
      ?.addEventListener("click", () => this.hideHistoryModal());
    document.getElementById("history-modal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("history-modal")) {
        this.hideHistoryModal();
      }
    });
    document
      .getElementById("audio-toggle-btn")
      ?.addEventListener("click", () => this.toggleAudio());
    this.updateAudioButtonState();
  }

  private async loadInitialOrders(): Promise<void> {
    this.showLoadingState();
    try {
      const response = await apiClient.get<KitchenOrder[]>("/kitchen/orders");
      this.orders.clear();
      response.data.forEach((order) => this.orders.set(order.id, order));
      this.renderAllColumns();
      this.updateCounters();
    } catch (error) {
      this.showErrorState();
    }
  }

  private async refreshOrders(): Promise<void> {
    const refreshBtn = document.getElementById("refresh-orders-btn");
    refreshBtn?.classList.add("animate-spin");
    await this.loadInitialOrders();
    setTimeout(() => refreshBtn?.classList.remove("animate-spin"), 500);
  }

  private renderAllColumns(): void {
    const columns: KanbanColumn[] = [
      { id: "pending", title: "Pendiente", status: "Pending", orders: [] },
      {
        id: "inPreparation",
        title: "En Preparación",
        status: "InPreparation",
        orders: [],
      },
      { id: "ready", title: "Listo", status: "Ready", orders: [] },
    ];

    this.orders.forEach((order) => {
      const column = columns.find((col) => col.status === order.status);
      if (column) column.orders.push(order);
    });

    columns.forEach((column) => this.renderColumn(column));
  }

  private renderColumn(column: KanbanColumn): void {
    const container = document.getElementById(`${column.id}-orders`);
    const loadingElement = document.getElementById(`${column.id}-loading`);
    const emptyElement = document.getElementById(`${column.id}-empty`);

    loadingElement?.classList.add("hidden");
    if (!container || !emptyElement) return;

    // Limpiar el contenedor antes de renderizar
    container.innerHTML = "";

    if (column.orders.length === 0) {
      // Clonar el nodo de estado vacío para evitar moverlo del DOM
      const emptyElementClone = emptyElement.cloneNode(true) as HTMLElement;
      emptyElementClone.classList.remove("hidden");
      container.appendChild(emptyElementClone);
      container.classList.add("items-center", "justify-center");
    } else {
      container.classList.remove("items-center", "justify-center");
      container.innerHTML = column.orders
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .map((order) => this.createOrderCard(order))
        .join("");
    }
  }

  private createOrderCard(order: KitchenOrder): string {
    const timeAgo = this.getTimeAgo(order.createdAt);
    return `
      <div id="order-${
        order.id
      }" class="bg-background border border-white/10 rounded-lg p-4 hover:border-accent/50 transition-all cursor-pointer">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-bold text-lg text-text-primary">#${
              order.orderCode
            } ${order.tableCode}</h3>
            <p class="text-text-secondary text-sm" data-created-at="${
              order.createdAt
            }">hace ${timeAgo}</p>
          </div>
          <div class="w-2 h-2 ${this.getStatusDotColor(
            order.status
          )} rounded-full"></div>
        </div>
        <div class="mb-4 space-y-1">
          ${order.items
            .map(
              (item) =>
                `<div class="flex justify-between items-center text-sm"><span class="text-text-primary">${item.quantity}x ${item.name}</span></div>`
            )
            .join("")}
        </div>
        <div class="mt-4">${this.createActionButton(order)}</div>
      </div>
    `;
  }

  private createActionButton(order: KitchenOrder): string {
    switch (order.status) {
      case "Pending":
        return `<button onclick="kitchenManager.startOrder('${order.id}')" class="w-full bg-blue-600/20 text-blue-400 cursor-pointer hover:bg-blue-600/30 py-2 px-4 rounded-lg transition-colors font-medium text-sm">🍳 Empezar a Cocinar</button>`;
      case "InPreparation":
        return `<button onclick="kitchenManager.markOrderReady('${order.id}')" class="w-full bg-green-600/20 text-green-400 cursor-pointer hover:bg-green-600/30 py-2 px-4 rounded-lg transition-colors font-medium text-sm">✅ Pedido Listo</button>`;
      case "Ready":
        return `<div class="text-center py-2 text-green-400 text-sm font-medium">🎉 Listo para entregar</div>`;
      default:
        return "";
    }
  }

  public async startOrder(orderId: string): Promise<void> {
    console.log(`Intentando iniciar pedido ${orderId}...`);
    const order = this.orders.get(orderId);
    if (!order) {
      console.warn(`Pedido ${orderId} no encontrado para iniciar.`);
      return;
    }
    try {
      await apiClient.put(`/kitchen/orders/${orderId}/start`);
      order.status = "InPreparation";
      this.moveOrderToColumn(order);
      this.updateCounters();
      notificationManager.success(`Pedido #${order.orderCode} iniciado`);
      console.log(`Pedido ${orderId} iniciado con éxito.`);
    } catch (error) {
      console.error(`Error al iniciar el pedido ${orderId}:`, error);
      notificationManager.error("Error al iniciar el pedido");
    }
  }

  public async markOrderReady(orderId: string): Promise<void> {
    console.log(`Intentando marcar pedido ${orderId} como listo...`);
    const order = this.orders.get(orderId);
    if (!order) {
      console.warn(`Pedido ${orderId} no encontrado para marcar como listo.`);
      return;
    }
    try {
      await apiClient.put(`/kitchen/orders/${orderId}/ready`);
      order.status = "Ready";
      this.moveOrderToColumn(order);
      this.updateCounters();
      this.audioManager.notifyOrderReady();
      this.completedOrdersToday++;
      this.updateCompletedTodayCounter();
      notificationManager.success(`¡Pedido #${order.orderCode} está listo!`);
      console.log(`Pedido ${orderId} marcado como listo con éxito.`);
    } catch (error) {
      console.error(`Error al marcar pedido ${orderId} como listo:`, error);
      notificationManager.error("Error al marcar pedido como listo");
    }
  }

  private moveOrderToColumn(order: KitchenOrder): void {
    const orderCard = document.getElementById(`order-${order.id}`);
    if (!orderCard) return;

    const targetColumnId = this.getColumnIdFromStatus(order.status);
    const targetContainer = document.getElementById(`${targetColumnId}-orders`);
    if (!targetContainer) return;

    orderCard.classList.add("order-moving");
    setTimeout(() => {
      this.updateOrderCard(orderCard, order);
      targetContainer.appendChild(orderCard);
      this.checkColumnEmpty(targetColumnId);
      orderCard.classList.remove("order-moving");
    }, 150);
  }

  private updateOrderCard(cardElement: HTMLElement, order: KitchenOrder): void {
    const actionContainer = cardElement.querySelector(".mt-4");
    if (actionContainer)
      actionContainer.innerHTML = this.createActionButton(order);
    const statusDot = cardElement.querySelector(".w-2.h-2");
    if (statusDot)
      statusDot.className = `w-2 h-2 ${this.getStatusDotColor(
        order.status
      )} rounded-full`;
  }

  private checkColumnEmpty(columnId: KanbanColumnId) {
    const container = document.getElementById(`${columnId}-orders`);
    const emptyElement = document.getElementById(`${columnId}-empty`);
    if (!container || !emptyElement) return;

    if (container.children.length === 0) {
      // Clonar y añadir el estado vacío si la columna está vacía
      const emptyElementClone = emptyElement.cloneNode(true) as HTMLElement;
      emptyElementClone.classList.remove("hidden");
      container.innerHTML = ""; // Limpiar por si acaso
      container.appendChild(emptyElementClone);
      container.classList.add("items-center", "justify-center");
    } else {
      // Asegurarse de que el estado vacío no esté presente si hay órdenes
      const existingEmptyState = container.querySelector("#" + emptyElement.id);
      if (existingEmptyState) {
        container.removeChild(existingEmptyState);
      }
      container.classList.remove("items-center", "justify-center");
    }
  }

  private updateCounters(): void {
    const pendingCount = Array.from(this.orders.values()).filter(
      (o) => o.status === "Pending"
    ).length;
    const inPreparationCount = Array.from(this.orders.values()).filter(
      (o) => o.status === "InPreparation"
    ).length;
    const readyCount = Array.from(this.orders.values()).filter(
      (o) => o.status === "Ready"
    ).length;
    document.getElementById("pending-count")!.textContent =
      pendingCount.toString();
    document.getElementById("inPreparation-count")!.textContent =
      inPreparationCount.toString();
    document.getElementById("ready-count")!.textContent = readyCount.toString();
    document.getElementById("total-orders-count")!.textContent =
      this.orders.size.toString();
  }

  private async initializeSignalR(): Promise<void> {
    const eventHandlers: SignalREventHandlers = {
      onNewOrder: (order: KitchenOrder) => this.handleNewOrder(order),
      onOrderStatusUpdated: (update: OrderStatusUpdatePayload) =>
        this.handleOrderStatusUpdate(update),
      onConnectionStateChanged: (connected: boolean) =>
        this.updateConnectionStatus(connected),
    };
    try {
      await createSignalRConnection("kitchenHub", eventHandlers);
      this.updateConnectionStatus(true);
    } catch (error) {
      this.updateConnectionStatus(false);
    }
  }

  private handleNewOrder(order: KitchenOrder): void {
    this.audioManager.notifyNewOrder();
    this.orders.set(order.id, order);
    this.renderAllColumns();
    this.updateCounters();
    notificationManager.info(`Nuevo pedido #${order.orderCode}`);
  }

  private handleOrderStatusUpdate(payload: OrderStatusUpdatePayload): void {
    const order = this.orders.get(payload.orderId);
    if (order) {
      order.status = payload.newStatus;
      this.moveOrderToColumn(order);
      this.updateCounters();
    }
  }

  private updateConnectionStatus(isConnected: boolean): void {
    const indicator = document.getElementById("connection-indicator");
    const statusText = document.getElementById("connection-status");
    if (indicator && statusText) {
      indicator.className = `w-3 h-3 rounded-full ${
        isConnected ? "bg-green-500" : "bg-red-500"
      }`;
      statusText.textContent = isConnected ? "Conectado" : "Desconectado";
    }
  }

  private startTimeUpdater(): void {
    this.timeUpdateInterval = setInterval(
      () => this.updateAllTimestamps(),
      60000
    );
  }

  private updateAllTimestamps(): void {
    document.querySelectorAll("[data-created-at]").forEach((element) => {
      const createdAt = element.getAttribute("data-created-at");
      if (createdAt) element.textContent = `hace ${this.getTimeAgo(createdAt)}`;
    });
  }

  private getTimeAgo(dateString: string): string {
    const diffMins = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / 60000
    );
    if (diffMins < 1) return "menos de 1 min";
    return `${diffMins} min`;
  }

  private getStatusDotColor = (status: string) =>
    ({
      Pending: "bg-yellow-500",
      InPreparation: "bg-blue-500",
      Ready: "bg-green-500",
    }[status] || "bg-gray-500");
  private getColumnIdFromStatus = (status: string): KanbanColumnId =>
    (({ Pending: "pending", InPreparation: "inPreparation", Ready: "ready" }[
      status
    ] as KanbanColumnId) || "pending");

  private showLoadingState = () =>
    ["pending", "inPreparation", "ready"].forEach((id) =>
      document.getElementById(`${id}-loading`)?.classList.remove("hidden")
    );
  private showErrorState = () =>
    ["pending", "inPreparation", "ready"].forEach((id) => {
      document.getElementById(`${id}-loading`)?.classList.add("hidden");
      const container = document.getElementById(`${id}-orders`);
      if (container)
        container.innerHTML = `<p class="text-red-500 p-4">Error al cargar pedidos.</p>`;
    });

  private toggleAudio = () =>
    this.audioManager.toggleAudio() && this.updateAudioButtonState();
  private updateAudioButtonState = () => {
    const onIcon = document.getElementById("audio-on-icon");
    const offIcon = document.getElementById("audio-off-icon");
    if (onIcon && offIcon) {
      onIcon.style.display = this.audioManager.isAudioEnabled()
        ? "block"
        : "none";
      offIcon.style.display = this.audioManager.isAudioEnabled()
        ? "none"
        : "block";
    }
  };

  private async showHistoryModal() {
    const modal = document.getElementById("history-modal");
    modal?.classList.remove("hidden");
    const list = document.getElementById("history-list");
    if (list) list.innerHTML = "<p>Cargando historial...</p>";
    try {
      const history = await orderHistoryService.getTodayHistory();
      this.renderHistoryOrders(history);
    } catch (error) {
      if (list)
        list.innerHTML =
          '<p class="text-red-500">Error al cargar historial.</p>';
    }
  }

  private hideHistoryModal = () =>
    document.getElementById("history-modal")?.classList.add("hidden");
  private renderHistoryOrders = (orders: any[]) => {
    const list = document.getElementById("history-list");
    if (list)
      list.innerHTML =
        orders.length > 0
          ? orders
              .map((order) => orderHistoryService.createHistoryOrderCard(order))
              .join("")
          : "<p>No hay pedidos completados hoy.</p>";
  };
  private async loadTodayStatistics() {
    try {
      const stats = await orderHistoryService.getTodayStatistics();
      this.completedOrdersToday = stats.completedOrders;
      this.updateCompletedTodayCounter();
    } catch (error) {
      /* ignore */
    }
  }
  private updateCompletedTodayCounter() {
    const counter = document.getElementById("completed-today-count");
    if (counter) counter.textContent = this.completedOrdersToday.toString();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  (window as any).kitchenManager = new KitchenPageManager();
});
