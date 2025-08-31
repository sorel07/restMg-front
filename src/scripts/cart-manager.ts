import { createOrder } from "../services/api";
import { CartService, type CartItem, type CartSummary } from "../services/cart";
import type { MenuItem } from "../types/menu";
import { formatCOP } from "./utils/formatting";

interface MenuPageData {
  restaurantId: string;
  tableId: string;
  tableCode: string;
}

class CartManager {
  private menuData: MenuPageData | null = null;
  private allMenuItems: Map<string, MenuItem> = new Map();
  private cartService: CartService | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    this.menuData = this.extractMenuData();

    if (!this.menuData || !this.menuData.restaurantId) {
      console.error(
        "❌ No se pudieron obtener los datos del menú o falta el ID del restaurante."
      );
      return;
    }

    this.cartService = new CartService(this.menuData.restaurantId);

    this.buildMenuItemsMap();
    this.setupEventListeners();
    this.createFloatingCartButton();
    this.cartService.addListener((cart) => this.updateCartUI(cart));
    this.setupCartModal();
  }

  private extractMenuData(): MenuPageData | null {
    try {
      const dataElement = document.querySelector(
        "[data-menu-info]"
      ) as HTMLElement;
      if (dataElement && dataElement.dataset.menuInfo) {
        return JSON.parse(dataElement.dataset.menuInfo);
      }
      return null;
    } catch (error) {
      console.error("Error al extraer datos del menú:", error);
      return null;
    }
  }

  private buildMenuItemsMap() {
    const menuItemElements = document.querySelectorAll("[data-menu-item]");
    menuItemElements.forEach((element) => {
      try {
        const itemData = JSON.parse(
          (element as HTMLElement).dataset.menuItem || "{}"
        );
        if (itemData.id) {
          this.allMenuItems.set(itemData.id, itemData);
        }
      } catch (error) {
        console.error("Error al parsear item del menú:", error);
      }
    });
  }

  private setupEventListeners() {
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const addButton = target.closest("[data-add-to-cart]") as HTMLElement;
      if (addButton) {
        e.preventDefault();
        const menuItemId = addButton.dataset.addToCart;
        if (menuItemId) {
          this.addToCart(menuItemId);
        }
      }
    });
  }

  private addToCart(menuItemId: string) {
    const menuItem = this.allMenuItems.get(menuItemId);
    if (!menuItem) {
      console.error("❌ Item del menú no encontrado:", menuItemId);
      return;
    }
    this.cartService?.addItem(menuItem, 1);
    this.showAddToCartFeedback(menuItem.name);
  }

  private showAddToCartFeedback(itemName: string) {
    const toast = document.createElement("div");
    toast.className =
      "fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300";
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span class="text-sm font-medium">Añadido: ${itemName}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove("translate-x-full");
      toast.classList.add("translate-x-0");
    }, 100);
    setTimeout(() => {
      toast.classList.remove("translate-x-0");
      toast.classList.add("translate-x-full");
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  private createFloatingCartButton() {
    const button = document.createElement("div");
    button.id = "floating-cart-button";
    button.className =
      "fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg cursor-pointer transition-all duration-300 z-40";
    button.style.display = "none";
    button.innerHTML = `
      <div class="flex items-center space-x-3 px-4 py-3">
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
          <span id="floating-cart-count" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">0</span>
        </div>
        <div class="hidden sm:block">
          <div class="text-sm font-medium">Mi Pedido</div>
          <div class="text-xs opacity-90">$<span id="floating-cart-total">0</span></div>
        </div>
      </div>
    `;
    button.addEventListener("click", () => this.showCartModal());
    document.body.appendChild(button);
  }

  private updateCartUI(cart: CartSummary) {
    const floatingButton = document.getElementById("floating-cart-button");
    const countElement = document.getElementById("floating-cart-count");
    const totalElement = document.getElementById("floating-cart-total");

    if (floatingButton && countElement && totalElement) {
      if (cart.totalItems > 0) {
        floatingButton.style.display = "block";
        countElement.textContent = cart.totalItems.toString();
        totalElement.textContent = formatCOP(cart.subtotal);
      } else {
        floatingButton.style.display = "none";
      }
    }
    this.updateCartModal(cart);
  }

  private setupCartModal() {
    const modal = document.getElementById("cart-modal");
    const closeBtn = document.getElementById("close-cart-modal");
    const placeOrderBtn = document.getElementById("place-order-btn");
    const clearCartBtn = document.getElementById("clear-cart-btn");

    closeBtn?.addEventListener("click", () => this.hideCartModal());
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) this.hideCartModal();
    });

    placeOrderBtn?.addEventListener("click", () => this.placeOrder());

    clearCartBtn?.addEventListener("click", () => {
      if (confirm("¿Estás seguro de que quieres limpiar tu carrito?")) {
        this.cartService?.clearCart();
      }
    });

    const cartItemsContainer = document.getElementById("cart-items");
    cartItemsContainer?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const decreaseBtn = target.closest("[data-decrease-quantity]");
      const increaseBtn = target.closest("[data-increase-quantity]");
      const removeBtn = target.closest("[data-remove-item]");

      if (decreaseBtn) {
        const itemId = (decreaseBtn as HTMLElement).dataset.decreaseQuantity!;
        const item = this.cartService
          ?.getSummary()
          .items.find((i) => i.id === itemId);
        if (item) {
          this.cartService?.updateQuantity(itemId, item.quantity - 1);
        }
      } else if (increaseBtn) {
        const itemId = (increaseBtn as HTMLElement).dataset.increaseQuantity!;
        const item = this.cartService
          ?.getSummary()
          .items.find((i) => i.id === itemId);
        if (item) {
          this.cartService?.updateQuantity(itemId, item.quantity + 1);
        }
      } else if (removeBtn) {
        const itemId = (removeBtn as HTMLElement).dataset.removeItem!;
        this.cartService?.removeItem(itemId);
      }
    });
  }

  private showCartModal() {
    const modal = document.getElementById("cart-modal");
    if (modal) {
      modal.style.display = "flex";
      requestAnimationFrame(() => {
        modal.classList.remove("opacity-0");
        modal
          .querySelector("#cart-modal-content")
          ?.classList.remove("scale-95");
      });
    }
  }

  private hideCartModal() {
    const modal = document.getElementById("cart-modal");
    if (modal) {
      modal.classList.add("opacity-0");
      modal.querySelector("#cart-modal-content")?.classList.add("scale-95");
      setTimeout(() => {
        modal.style.display = "none";
      }, 300);
    }
  }

  private updateCartModal(cart: CartSummary) {
    const emptyState = document.getElementById("cart-empty");
    const itemsList = document.getElementById("cart-items");
    const footer = document.getElementById("cart-footer");
    const badge = document.getElementById("cart-badge");
    const totalItems = document.getElementById("total-items");
    const subtotal = document.getElementById("subtotal");

    if (
      !emptyState ||
      !itemsList ||
      !footer ||
      !badge ||
      !totalItems ||
      !subtotal
    )
      return;

    badge.textContent = cart.totalItems.toString();

    if (cart.items.length === 0) {
      emptyState.classList.remove("hidden");
      footer.classList.add("hidden");
      itemsList.innerHTML = "";
    } else {
      emptyState.classList.add("hidden");
      footer.classList.remove("hidden");
      totalItems.textContent = cart.totalItems.toString();
      subtotal.textContent = formatCOP(cart.subtotal);
      itemsList.innerHTML = cart.items
        .map((item) => this.renderCartItem(item))
        .join("");
    }
  }

  private renderCartItem(item: CartItem): string {
    const itemTotal = item.price * item.quantity;
    return `
      <div class="flex flex-wrap items-center gap-y-2 bg-zinc-800 p-3 rounded-lg" data-cart-item="${
        item.id
      }">
        
        <!-- Left Side: Image and Name -->
        <div class="flex items-center space-x-3 flex-grow min-w-[150px]">
          <img src="${item.image || "/profile_placeholder-image.jpg"}" alt="${
      item.name
    }" class="w-12 h-12 object-cover rounded-md flex-shrink-0">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-white truncate">${
              item.name
            }</p>
            <p class="text-xs text-zinc-400">${formatCOP(item.price)}</p>
          </div>
        </div>

        <!-- Right Side: Controls, Total, Remove -->
        <div class="flex items-center space-x-3 flex-shrink-0 ml-auto">
          <!-- Quantity -->
          <div class="flex items-center space-x-1">
            <button data-decrease-quantity="${
              item.id
            }" class="w-6 h-6 bg-zinc-700 hover:bg-zinc-600 rounded-full flex items-center justify-center text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <span class="text-sm font-bold text-white w-5 text-center">${
              item.quantity
            }</span>
            <button data-increase-quantity="${
              item.id
            }" class="w-6 h-6 bg-zinc-700 hover:bg-zinc-600 rounded-full flex items-center justify-center text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
          <!-- Total -->
          <p class="text-sm font-semibold text-white w-14 text-right">${formatCOP(
            itemTotal
          )}</p>
          <!-- Remove -->
          <button data-remove-item="${
            item.id
          }" class="w-6 h-6 bg-red-600/80 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>
    `;
  }

  private async placeOrder() {
    console.log("[cart-manager.ts] Iniciando placeOrder...");
    const placeOrderBtn = document.getElementById(
      "place-order-btn"
    ) as HTMLButtonElement;

    if (!this.menuData || !this.cartService || placeOrderBtn.disabled) {
      console.warn(
        "[cart-manager.ts] placeOrder abortado: Faltan datos, servicio o el botón está deshabilitado."
      );
      return;
    }

    const cart = this.cartService.getSummary();
    if (cart.items.length === 0) {
      this.showErrorToast("Tu carrito está vacío");
      return;
    }

    placeOrderBtn.disabled = true;
    this.showOrderLoading();

    try {
      const orderData = this.cartService.getOrderData(
        this.menuData.restaurantId,
        this.menuData.tableId
      );
      const orderResponse = await createOrder(orderData);

      this.cartService.clearCart();
      this.hideCartModal();

      // ✅ Usar el subdomain de la URL actual
      const currentPath = window.location.pathname;
      const subdomain = currentPath.split("/")[2];

      const statusUrl = `/r/${subdomain}/order/status/${orderResponse.orderCode}`;
      window.location.href = statusUrl;
    } catch (error: any) {
      console.error(
        "[cart-manager.ts] Error en el bloque try/catch de placeOrder:",
        error
      );
      const errorMessage =
        error.response?.data?.message ||
        "Error al procesar tu pedido. Por favor intenta de nuevo.";
      this.showErrorToast(errorMessage);
    } finally {
      console.log(
        "[cart-manager.ts] Bloque finally: Ocultando spinner y rehabilitando botón."
      );
      this.hideOrderLoading();
      placeOrderBtn.disabled = false;
    }
  }

  private showOrderLoading() {
    const loadingModal = document.getElementById("order-loading-modal");
    if (loadingModal) loadingModal.style.display = "flex";
  }

  private hideOrderLoading() {
    const loadingModal = document.getElementById("order-loading-modal");
    if (loadingModal) loadingModal.style.display = "none";
  }

  private showErrorToast(message: string) {
    const toast = document.createElement("div");
    toast.className =
      "fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300";
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        <span class="text-sm font-medium">${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove("translate-x-full");
      toast.classList.add("translate-x-0");
    }, 100);
    setTimeout(() => {
      toast.classList.remove("translate-x-0");
      toast.classList.add("translate-x-full");
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    new CartManager();
  });
}
