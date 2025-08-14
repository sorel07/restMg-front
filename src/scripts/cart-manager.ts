// Script para manejar el carrito de compras en la vista del cliente
import { createOrder } from '../services/api';
import { cartService, type CartSummary } from '../services/cart';
import type { MenuItem } from '../types/menu';

interface MenuPageData {
  subdomain: string;
  restaurantId: string;
  tableId: string;
  tableCode: string;
}

class CartManager {
  private menuData: MenuPageData | null = null;
  private allMenuItems: Map<string, MenuItem> = new Map();

  constructor() {
    this.init();
  }

  private async init() {
    // Obtener datos de la página desde meta tags o data attributes
    this.menuData = this.extractMenuData();
    
    if (!this.menuData) {
      console.error('❌ No se pudieron obtener los datos del menú');
      return;
    }

    console.log('🍽️ CartManager inicializado para:', this.menuData);

    // Construir mapa de items del menú
    this.buildMenuItemsMap();
    
    // Configurar event listeners
    this.setupEventListeners();
    
    // Configurar listener del carrito
    cartService.addListener((cart) => this.updateCartUI(cart));

    // Mostrar botón flotante del carrito
    this.createFloatingCartButton();

    // Configurar modal del carrito
    this.setupCartModal();
  }

  private extractMenuData(): MenuPageData | null {
    try {
      // Intentar obtener desde data attributes del body o un elemento específico
      const dataElement = document.querySelector('[data-menu-info]') as HTMLElement;
      if (dataElement && dataElement.dataset.menuInfo) {
        return JSON.parse(dataElement.dataset.menuInfo);
      }

      // Fallback: intentar extraer desde la URL
      const pathParts = window.location.pathname.split('/');
      if (pathParts[1] === 'r' && pathParts.length >= 5) {
        return {
          subdomain: pathParts[2],
          restaurantId: '', // Se necesitará obtener esto del backend
          tableId: '', // Se necesitará obtener esto del backend  
          tableCode: pathParts[4]
        };
      }

      return null;
    } catch (error) {
      console.error('Error al extraer datos del menú:', error);
      return null;
    }
  }

  private buildMenuItemsMap() {
    // Buscar todos los elementos de menú en la página y construir el mapa
    const menuItemElements = document.querySelectorAll('[data-menu-item]');
    
    menuItemElements.forEach((element) => {
      try {
        const itemData = JSON.parse((element as HTMLElement).dataset.menuItem || '{}');
        if (itemData.id) {
          this.allMenuItems.set(itemData.id, itemData);
        }
      } catch (error) {
        console.error('Error al parsear item del menú:', error);
      }
    });

    console.log(`📋 ${this.allMenuItems.size} items del menú cargados`);
  }

  private setupEventListeners() {
    // Event listener para botones "Añadir al carrito"
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Buscar el botón de añadir al carrito más cercano
      const addButton = target.closest('[data-add-to-cart]') as HTMLElement;
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
      console.error('❌ Item del menú no encontrado:', menuItemId);
      return;
    }

    cartService.addItem(menuItem, 1);
    
    // Mostrar feedback visual
    this.showAddToCartFeedback(menuItem.name);
  }

  private showAddToCartFeedback(itemName: string) {
    // Crear un toast de confirmación
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="text-sm font-medium">Añadido: ${itemName}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Animar entrada
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
      toast.classList.add('translate-x-0');
    }, 100);

    // Remover después de 3 segundos
    setTimeout(() => {
      toast.classList.remove('translate-x-0');
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  private createFloatingCartButton() {
    const button = document.createElement('div');
    button.id = 'floating-cart-button';
    button.className = 'fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg cursor-pointer transition-all duration-300 z-40';
    button.style.display = 'none'; // Oculto inicialmente
    
    button.innerHTML = `
      <div class="flex items-center space-x-3 px-4 py-3">
        <div class="relative">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6"></path>
          </svg>
          <span id="floating-cart-count" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">0</span>
        </div>
        <div class="hidden sm:block">
          <div class="text-sm font-medium">Mi Pedido</div>
          <div class="text-xs opacity-90">$<span id="floating-cart-total">0.00</span></div>
        </div>
      </div>
    `;

    button.addEventListener('click', () => this.showCartModal());
    document.body.appendChild(button);
  }

  private updateCartUI(cart: CartSummary) {
    // Actualizar botón flotante
    const floatingButton = document.getElementById('floating-cart-button');
    const countElement = document.getElementById('floating-cart-count');
    const totalElement = document.getElementById('floating-cart-total');

    if (floatingButton && countElement && totalElement) {
      if (cart.totalItems > 0) {
        floatingButton.style.display = 'block';
        countElement.textContent = cart.totalItems.toString();
        totalElement.textContent = cart.subtotal.toFixed(2);
      } else {
        floatingButton.style.display = 'none';
      }
    }

    // Actualizar modal del carrito si está abierto
    this.updateCartModal(cart);
  }

  private setupCartModal() {
    const modal = document.getElementById('cart-modal');
    const closeBtn = document.getElementById('close-cart-modal');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');

    // Cerrar modal
    closeBtn?.addEventListener('click', () => this.hideCartModal());
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.hideCartModal();
    });

    // Realizar pedido
    placeOrderBtn?.addEventListener('click', () => this.placeOrder());

    // Limpiar carrito
    clearCartBtn?.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que quieres limpiar tu carrito?')) {
        cartService.clearCart();
      }
    });
  }

  private showCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      
      requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        const content = modal.querySelector('#cart-modal-content');
        content?.classList.remove('scale-95');
        content?.classList.add('scale-100');
      });
    }
  }

  private hideCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
      modal.classList.add('opacity-0');
      const content = modal.querySelector('#cart-modal-content');
      content?.classList.remove('scale-100');
      content?.classList.add('scale-95');
      
      setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }, 300);
    }
  }

  private updateCartModal(cart: CartSummary) {
    const emptyState = document.getElementById('cart-empty');
    const itemsList = document.getElementById('cart-items');
    const footer = document.getElementById('cart-footer');
    const badge = document.getElementById('cart-badge');
    const totalItems = document.getElementById('total-items');
    const subtotal = document.getElementById('subtotal');

    if (!emptyState || !itemsList || !footer) return;

    // Actualizar badge
    if (badge) badge.textContent = cart.totalItems.toString();

    if (cart.items.length === 0) {
      // Mostrar estado vacío
      emptyState.classList.remove('hidden');
      footer.classList.add('hidden');
      itemsList.innerHTML = '';
    } else {
      // Mostrar items y footer
      emptyState.classList.add('hidden');
      footer.classList.remove('hidden');

      // Actualizar totales
      if (totalItems) totalItems.textContent = cart.totalItems.toString();
      if (subtotal) subtotal.textContent = cart.subtotal.toFixed(2);

      // Renderizar items
      itemsList.innerHTML = cart.items.map(item => this.renderCartItem(item)).join('');

      // Añadir event listeners a botones de cantidad
      this.setupQuantityButtons();
    }
  }

  private renderCartItem(item: any): string {
    return `
      <div class="flex items-center space-x-3 bg-gray-800 rounded-lg p-3" data-cart-item="${item.id}">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-lg">` : ''}
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-medium text-white truncate">${item.name}</h4>
          <p class="text-xs text-gray-400">$${item.price.toFixed(2)} c/u</p>
        </div>
        <div class="flex items-center space-x-2">
          <button 
            data-decrease-quantity="${item.id}" 
            class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
          </button>
          <span class="text-sm font-medium text-white min-w-[2rem] text-center">${item.quantity}</span>
          <button 
            data-increase-quantity="${item.id}" 
            class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
          <button 
            data-remove-item="${item.id}" 
            class="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors ml-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
        <div class="text-sm font-medium text-white">
          $${(item.price * item.quantity).toFixed(2)}
        </div>
      </div>
    `;
  }

  private setupQuantityButtons() {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Manejar botones de cantidad
      const decreaseBtn = target.closest('[data-decrease-quantity]') as HTMLElement;
      const increaseBtn = target.closest('[data-increase-quantity]') as HTMLElement;
      const removeBtn = target.closest('[data-remove-item]') as HTMLElement;

      if (decreaseBtn) {
        const itemId = decreaseBtn.dataset.decreaseQuantity!;
        const currentCart = cartService.getSummary();
        const item = currentCart.items.find(i => i.id === itemId);
        if (item) {
          cartService.updateQuantity(itemId, Math.max(0, item.quantity - 1));
        }
      } else if (increaseBtn) {
        const itemId = increaseBtn.dataset.increaseQuantity!;
        const currentCart = cartService.getSummary();
        const item = currentCart.items.find(i => i.id === itemId);
        if (item) {
          cartService.updateQuantity(itemId, item.quantity + 1);
        }
      } else if (removeBtn) {
        const itemId = removeBtn.dataset.removeItem!;
        cartService.removeItem(itemId);
      }
    });
  }

  private async placeOrder() {
    if (!this.menuData) {
      alert('Error: No se pudieron obtener los datos del menú');
      return;
    }

    const cart = cartService.getSummary();
    if (cart.items.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }

    // Mostrar loading
    this.showOrderLoading();

    try {
      const orderData = cartService.getOrderData(this.menuData.restaurantId, this.menuData.tableId);
      const response = await createOrder(orderData);

      // Limpiar carrito
      cartService.clearCart();

      // Ocultar modales
      this.hideCartModal();
      this.hideOrderLoading();

      // Redirigir a página de estado del pedido
      const statusUrl = `/order/status?code=${response.orderCode}&restaurantId=${this.menuData.restaurantId}`;
      window.location.href = statusUrl;

    } catch (error) {
      console.error('❌ Error al crear pedido:', error);
      this.hideOrderLoading();
      alert('Error al procesar tu pedido. Por favor intenta de nuevo.');
    }
  }

  private showOrderLoading() {
    const loadingModal = document.getElementById('order-loading-modal');
    if (loadingModal) {
      loadingModal.style.display = 'flex';
    }
  }

  private hideOrderLoading() {
    const loadingModal = document.getElementById('order-loading-modal');
    if (loadingModal) {
      loadingModal.style.display = 'none';
    }
  }
}

// Inicializar cuando el DOM esté listo
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    new CartManager();
  });
}
