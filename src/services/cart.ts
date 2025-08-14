// Servicio del carrito de compras con persistencia en localStorage
import type { MenuItem } from '../types/menu';

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  image?: string;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
}

export interface OrderRequest {
  restaurantId: string;
  tableId: string;
  items: { menuItemId: string; quantity: number }[];
}

export interface OrderResponse {
  orderId: string;
  orderCode: string;
}

const CART_STORAGE_KEY = 'restaurant_cart';

class CartService {
  private items: CartItem[] = [];
  private listeners: Array<(cart: CartSummary) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Cargar carrito desde localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        this.items = JSON.parse(stored);
        console.log('🛒 Carrito cargado desde localStorage:', this.items.length, 'items');
      }
    } catch (error) {
      console.error('❌ Error al cargar carrito desde localStorage:', error);
      this.items = [];
    }
  }

  /**
   * Guardar carrito en localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
      console.log('💾 Carrito guardado en localStorage');
    } catch (error) {
      console.error('❌ Error al guardar carrito:', error);
    }
  }

  /**
   * Notificar a todos los listeners sobre cambios en el carrito
   */
  private notifyListeners(): void {
    const summary = this.getSummary();
    this.listeners.forEach(listener => listener(summary));
  }

  /**
   * Añadir listener para cambios del carrito
   */
  public addListener(listener: (cart: CartSummary) => void): void {
    this.listeners.push(listener);
    // Notificar inmediatamente el estado actual
    listener(this.getSummary());
  }

  /**
   * Remover listener
   */
  public removeListener(listener: (cart: CartSummary) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Añadir item al carrito
   */
  public addItem(menuItem: MenuItem, quantity: number = 1): void {
    const existingIndex = this.items.findIndex(item => item.menuItemId === menuItem.id);
    
    if (existingIndex >= 0) {
      // Si ya existe, incrementar cantidad
      this.items[existingIndex].quantity += quantity;
      console.log(`➕ Cantidad actualizada para "${menuItem.name}": ${this.items[existingIndex].quantity}`);
    } else {
      // Si no existe, añadir nuevo item
      const newItem: CartItem = {
        id: `${menuItem.id}_${Date.now()}`, // ID único para el carrito
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: quantity,
        category: '', // Se puede pasar como parámetro adicional si es necesario
        image: menuItem.imageUrl
      };
      
      this.items.push(newItem);
      console.log(`🛒 Item añadido al carrito: "${menuItem.name}"`);
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Actualizar cantidad de un item
   */
  public updateQuantity(cartItemId: string, quantity: number): void {
    const index = this.items.findIndex(item => item.id === cartItemId);
    
    if (index >= 0) {
      if (quantity <= 0) {
        this.removeItem(cartItemId);
      } else {
        this.items[index].quantity = quantity;
        console.log(`🔄 Cantidad actualizada: "${this.items[index].name}" = ${quantity}`);
        this.saveToStorage();
        this.notifyListeners();
      }
    }
  }

  /**
   * Remover item del carrito
   */
  public removeItem(cartItemId: string): void {
    const index = this.items.findIndex(item => item.id === cartItemId);
    
    if (index >= 0) {
      const removedItem = this.items.splice(index, 1)[0];
      console.log(`🗑️ Item removido del carrito: "${removedItem.name}"`);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Limpiar todo el carrito
   */
  public clearCart(): void {
    this.items = [];
    localStorage.removeItem(CART_STORAGE_KEY);
    console.log('🧹 Carrito limpiado');
    this.notifyListeners();
  }

  /**
   * Obtener resumen del carrito
   */
  public getSummary(): CartSummary {
    const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return {
      items: [...this.items], // Copia para evitar mutaciones
      totalItems,
      subtotal
    };
  }

  /**
   * Obtener datos para crear pedido
   */
  public getOrderData(restaurantId: string, tableId: string): OrderRequest {
    return {
      restaurantId,
      tableId,
      items: this.items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity
      }))
    };
  }

  /**
   * Verificar si el carrito está vacío
   */
  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Obtener cantidad de un item específico
   */
  public getItemQuantity(menuItemId: string): number {
    const item = this.items.find(item => item.menuItemId === menuItemId);
    return item ? item.quantity : 0;
  }
}

// Instancia singleton del servicio de carrito
export const cartService = new CartService();

// Exportar tipos para uso en otros archivos
export type { CartService };
