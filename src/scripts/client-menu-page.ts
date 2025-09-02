/**
 * Script para manejar la funcionalidad de la página del menú del cliente
 * Incluye navegación por pestañas, scroll suave y integración con el carrito
 */

interface MenuItemData {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  quantity: number;
}

class ClientMenuPageManager {
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.isInitialized) return;
    
    document.addEventListener('DOMContentLoaded', () => {
      this.setupTabFunctionality();
      this.setupScrollIndicator();
      this.setupAddToCartButtons();
      this.preventHorizontalScroll();
    });
    
    this.isInitialized = true;
  }

  /**
   * Configura la funcionalidad de las pestañas de categorías
   */
  private setupTabFunctionality(): void {
    const tabs = document.querySelectorAll('[role="tab"][data-tab-target]');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const htmlTab = tab as HTMLElement;
        this.switchTab(htmlTab);
      });
    });
  }

  /**
   * Cambia a la pestaña seleccionada
   */
  private switchTab(selectedTab: HTMLElement): void {
    const targetSelector = selectedTab.getAttribute('data-tab-target');
    if (!targetSelector) return;

    // Ocultar todos los paneles
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.add('hidden');
    });

    // Resetear todas las pestañas
    document.querySelectorAll('[role="tab"]').forEach(tab => {
      this.resetTabStyle(tab as HTMLElement);
    });

    // Activar la pestaña seleccionada
    this.activateTabStyle(selectedTab);

    // Mostrar el panel correspondiente
    const targetPanel = document.querySelector(targetSelector);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
    }
  }

  /**
   * Resetea el estilo de una pestaña
   */
  private resetTabStyle(tab: HTMLElement): void {
    tab.className = tab.className
      .replace(/bg-\[var\(--branding-color\)\]/g, '')
      .replace(/text-white/g, '')
      .replace(/shadow-lg/g, '')
      .replace(/shadow-\[var\(--branding-color\)\]\/30/g, '');
    
    if (!tab.className.includes('text-text-secondary')) {
      tab.className += ' text-text-secondary hover:text-text hover:bg-[var(--branding-color)]/10';
    }
    
    // Limpiar espacios duplicados
    tab.className = tab.className.replace(/\s+/g, ' ').trim();
  }

  /**
   * Activa el estilo de una pestaña
   */
  private activateTabStyle(tab: HTMLElement): void {
    tab.className = tab.className
      .replace(/text-text-secondary/g, '')
      .replace(/hover:text-text/g, '')
      .replace(/hover:bg-\[var\(--branding-color\)\]\/10/g, '');
    
    tab.className += ' bg-[var(--branding-color)] text-white shadow-lg shadow-[var(--branding-color)]/30';
    tab.className = tab.className.replace(/\s+/g, ' ').trim();
  }

  /**
   * Configura el indicador de scroll suave
   */
  private setupScrollIndicator(): void {
    const scrollIndicator = document.querySelector('.animate-bounce');
    if (scrollIndicator) {
      scrollIndicator.addEventListener('click', () => {
        const menuSection = document.getElementById('menu-container');
        if (menuSection) {
          menuSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  /**
   * Configura los botones de agregar al carrito
   */
  private setupAddToCartButtons(): void {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    
    addToCartButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleAddToCart(e.currentTarget as HTMLElement);
      });
    });
  }

  /**
   * Maneja el evento de agregar al carrito
   */
  private handleAddToCart(button: HTMLElement): void {
    const itemData = this.extractItemData(button);
    if (!itemData) {
      console.error('No se pudieron extraer los datos del item');
      return;
    }

    // Buscar si existe el cart manager global
    if (window.cartManager && typeof window.cartManager.addItem === 'function') {
      window.cartManager.addItem(itemData.id);
    } else {
      // Fallback - disparar evento personalizado
      const event = new CustomEvent('addToCart', { 
        detail: itemData 
      });
      window.dispatchEvent(event);
    }

    this.showAddToCartFeedback(button, itemData.name);
  }

  /**
   * Extrae los datos del item desde el botón
   */
  private extractItemData(button: HTMLElement): MenuItemData | null {
    try {
      return {
        id: button.getAttribute('data-menu-item-id') || '',
        name: button.getAttribute('data-item-name') || '',
        price: parseFloat(button.getAttribute('data-item-price') || '0'),
        description: button.getAttribute('data-item-description') || '',
        imageUrl: button.getAttribute('data-item-image') || '',
        quantity: 1
      };
    } catch (error) {
      console.error('Error al extraer datos del item:', error);
      return null;
    }
  }

  /**
   * Muestra feedback visual cuando se agrega un item
   */
  private showAddToCartFeedback(button: HTMLElement, itemName: string): void {
    const originalContent = button.innerHTML;
    const buttonElement = button as HTMLButtonElement;
    
    // Mostrar estado de carga
    button.innerHTML = `
      <svg class="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      <span class="hidden xs:inline">Agregando...</span>
      <span class="xs:hidden">...</span>
    `;
    buttonElement.disabled = true;

    // Mostrar confirmación
    setTimeout(() => {
      button.innerHTML = `
        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="hidden xs:inline">¡Agregado!</span>
        <span class="xs:hidden">¡Listo!</span>
      `;

      // Mostrar toast de confirmación
      this.showToast(`${itemName} agregado al carrito`);
      
      // Restaurar estado original
      setTimeout(() => {
        button.innerHTML = originalContent;
        buttonElement.disabled = false;
      }, 1500);
    }, 800);
  }

  /**
   * Muestra un toast de confirmación
   */
  private showToast(message: string): void {
    // Remover toast anterior si existe
    const existingToast = document.querySelector('.menu-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'menu-toast fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });

    // Remover después de 3 segundos
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Previene el scroll horizontal en toda la página
   */
  private preventHorizontalScroll(): void {
    // Aplicar overflow-x hidden al body y html
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';

    // Verificar elementos que pueden causar overflow
    const checkOverflow = () => {
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        const element = el as HTMLElement;
        if (element.scrollWidth > element.clientWidth) {
          // Solo aplicar a elementos que no necesitan scroll horizontal
          if (!element.classList.contains('overflow-x-auto') && 
              !element.classList.contains('scrollbar-hide') &&
              !element.closest('.overflow-x-auto')) {
            element.style.overflowX = 'hidden';
          }
        }
      });
    };

    // Verificar inmediatamente y después de que las imágenes se carguen
    checkOverflow();
    window.addEventListener('load', checkOverflow);
    
    // También verificar cuando se redimensiona la ventana
    let resizeTimeout: NodeJS.Timeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkOverflow, 250);
    });
  }
}

// Declaraciones globales para TypeScript
declare global {
  interface Window {
    cartManager: any;
    clientMenuPageManager: ClientMenuPageManager;
  }
}

// Inicializar el manager del menú
if (typeof window !== 'undefined') {
  window.clientMenuPageManager = new ClientMenuPageManager();
}

export default ClientMenuPageManager;
