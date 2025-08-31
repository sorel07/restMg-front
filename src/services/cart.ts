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

export class CartService {
  private items: CartItem[] = [];
  private listeners: Array<(cart: CartSummary) => void> = [];
  private storageKey: string;

  constructor(restaurantId: string) {
    if (!restaurantId) {
      throw new Error("El ID del restaurante es obligatorio para inicializar el carrito.");
    }
    this.storageKey = `restaurant_cart_${restaurantId}`;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.items = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error al cargar carrito desde localStorage:', error);
      this.items = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (error) {
      console.error('Error al guardar carrito:', error);
    }
  }

  private notifyListeners(): void {
    const summary = this.getSummary();
    this.listeners.forEach(listener => listener(summary));
  }

  public addListener(listener: (cart: CartSummary) => void): void {
    this.listeners.push(listener);
    listener(this.getSummary());
  }

  public removeListener(listener: (cart: CartSummary) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public addItem(menuItem: MenuItem, quantity: number = 1): void {
    const existingIndex = this.items.findIndex(item => item.menuItemId === menuItem.id);
    if (existingIndex >= 0) {
      this.items[existingIndex].quantity += quantity;
    } else {
      const newItem: CartItem = {
        id: `${menuItem.id}_${Date.now()}`,
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: quantity,
        image: menuItem.imageUrl
      };
      this.items.push(newItem);
    }
    this.saveToStorage();
    this.notifyListeners();
  }

  public updateQuantity(cartItemId: string, quantity: number): void {
    const index = this.items.findIndex(item => item.id === cartItemId);
    if (index >= 0) {
      if (quantity <= 0) {
        this.removeItem(cartItemId);
      } else {
        this.items[index].quantity = quantity;
        this.saveToStorage();
        this.notifyListeners();
      }
    }
  }

  public removeItem(cartItemId: string): void {
    const index = this.items.findIndex(item => item.id === cartItemId);
    if (index >= 0) {
      this.items.splice(index, 1);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  public clearCart(): void {
    this.items = [];
    localStorage.removeItem(this.storageKey);
    this.notifyListeners();
  }

  public getSummary(): CartSummary {
    const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return {
      items: [...this.items],
      totalItems,
      subtotal
    };
  }

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
}