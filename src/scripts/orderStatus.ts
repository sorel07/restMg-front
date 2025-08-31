import { getOrderByCode } from "../services/api";
import type { Order, OrderItem, OrderStatus } from "../types/order";
import { formatCOP } from "../scripts/utils/formatting";

export class OrderStatusHandler {
  private container: HTMLElement;
  private orderCode: string;
  private restaurantId: string;

  constructor(containerId: string, orderCode: string, restaurantId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Contenedor con ID '${containerId}' no encontrado`);
    }
    this.container = element;
    this.orderCode = orderCode;
    this.restaurantId = restaurantId;
  }

  public async init(): Promise<void> {
    try {
      const order = await getOrderByCode(this.orderCode, this.restaurantId);
      this.renderOrder(order);
    } catch (error: any) {
      console.error("Error fetching order data:", error);
      if (error.response?.status === 404) {
        this.renderNotFound();
      } else {
        this.renderError();
      }
    }
  }

  private getStatusClass(status: OrderStatus): string {
    switch (status) {
      case "AwaitingPayment":
        return "bg-yellow-100 text-yellow-800";
      case "Pending":
        return "bg-blue-100 text-blue-800";
      case "InPreparation":
        return "bg-orange-100 text-orange-800";
      case "Ready":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  private getStatusText(status: OrderStatus): string {
    switch (status) {
      case "AwaitingPayment":
        return "💰 Esperando Pago";
      case "Pending":
        return "⏳ Pendiente";
      case "InPreparation":
        return "👨‍🍳 En Preparación";
      case "Ready":
        return "✅ Listo";
      default:
        return status;
    }
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private renderOrderItems(items: OrderItem[]): string {
    return items
      .map(
        (item) => `
      <div class="flex justify-between items-center">
        <div class="flex-1">
          <p class="font-medium text-gray-900">${item.name}</p>
          <p class="text-sm text-gray-600">
            ${item.quantity} × $${item.unitPrice.toFixed(2)}
          </p>
        </div>
        <p class="font-medium text-gray-900">
          ${formatCOP(item.quantity * item.unitPrice)}
        </p>
      </div>
    `
      )
      .join("");
  }

  private renderOrder(order: Order): void {
    const formattedDate = this.formatDate(order.createdAt);
    const itemsHtml = this.renderOrderItems(order.items);
    const statusClass = this.getStatusClass(order.status);
    const statusText = this.getStatusText(order.status);

    this.container.innerHTML = `
      <div class="bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none">
        <!-- Header -->
        <div class="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6 text-white">
          <div class="text-center">
            <div class="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 class="text-3xl font-bold mb-1">¡Pedido Realizado!</h1>
            <p class="text-green-100">Tu pedido ha sido creado exitosamente</p>
          </div>
        </div>

        <!-- Código del Pedido -->
        <div class="px-8 py-6 bg-gray-50 border-b border-gray-200">
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600 mb-2">Número de Pedido</p>
            <div class="inline-flex items-center bg-gray-900 text-white px-6 py-3 rounded-xl">
              <span class="text-3xl font-bold tracking-wider">#${
                order.orderCode
              }</span>
            </div>
            <p class="text-sm text-gray-500 mt-3">
              Muestra este código al personal para realizar el pago
            </p>
          </div>
        </div>

        <!-- Estado del Pedido -->
        <div class="px-8 py-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-1">Estado del Pedido</h3>
              <p class="text-sm text-gray-600">
                Creado el ${formattedDate}
              </p>
            </div>
            <div class="text-right">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClass}">
                ${statusText}
              </span>
            </div>
          </div>
        </div>

        <!-- Detalles del Pedido -->
        <div class="px-8 py-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Detalles del Pedido</h3>
          <div class="space-y-3">
            ${itemsHtml}
          </div>
        </div>

        <!-- Total -->
        <div class="px-8 py-6 bg-gray-50">
          <div class="flex justify-between items-center">
            <p class="text-lg font-semibold text-gray-900">Total a Pagar</p>
            <p class="text-2xl font-bold text-green-600">${formatCOP(
              order.total
            )}</p>
          </div>
        </div>

        <!-- Instrucciones -->
        <div class="px-8 py-6">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="text-sm">
                <p class="font-medium text-blue-900 mb-1">Instrucciones para el Pago</p>
                <ul class="text-blue-800 space-y-1 list-disc list-inside">
                  <li>Muestra el código <strong>#${
                    order.orderCode
                  }</strong> al personal del restaurante</li>
                  <li>Realiza el pago del total mostrado</li>
                  <li>Una vez confirmado el pago, tu pedido pasará a la cocina</li>
                  <li>Te notificaremos cuando esté listo para recoger</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="px-8 py-6 bg-gray-50 flex space-x-3 print:hidden">
          <button
            onclick="window.print()"
            class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    `;
  }

  private renderError(): void {
    this.container.innerHTML = `
      <div class="bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h1 class="text-2xl font-bold text-white mb-2">Error</h1>
        <p class="text-gray-400 mb-6">No se encontró información del pedido. Es posible que necesites crear el pedido primero.</p>
        <a href="/" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
          Volver al inicio
        </a>
      </div>
    `;
  }

  private renderNotFound(): void {
    this.container.innerHTML = `
      <div class="bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h1 class="text-2xl font-bold text-white mb-2">Pedido no encontrado</h1>
        <p class="text-gray-400 mb-6">El código de pedido "${this.orderCode}" no existe o ha expirado.</p>
        <a href="/" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
          Volver al inicio
        </a>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const orderDataEl = document.getElementById("order-data");
  const orderCode = orderDataEl?.dataset.orderCode;
  const restaurantId = orderDataEl?.dataset.restaurantId; // ✅ Leer restaurantId

  if (orderCode && restaurantId) {
    try {
      const handler = new OrderStatusHandler(
        "order-container",
        orderCode,
        restaurantId
      );
      await handler.init();
    } catch (error) {
      console.error(
        "Error fatal: El contenedor del pedido no se encontró en el DOM.",
        error
      );
    }
  } else {
    console.error("Faltan orderCode o restaurantId en los data attributes");
  }
});
