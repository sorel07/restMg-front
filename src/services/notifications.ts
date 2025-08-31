// Sistema global de notificaciones
class NotificationManager {
  private container: HTMLElement | null = null;
  private notificationId = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeContainer();
    }
  }

  private initializeContainer() {
    // Esperar a que el DOM esté cargado
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.container = document.getElementById('notifications-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notifications-container';
            this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(this.container);
        }
      });
    } else {
      this.container = document.getElementById('notifications-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'notifications-container';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(this.container);
      }
    }
  }

  public show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) {
    if (!this.container) {
      this.container = document.getElementById('notifications-container');
      if (!this.container) {
        console.warn('Notifications container not found, creating one.');
        this.container = document.createElement('div');
        this.container.id = 'notifications-container';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(this.container);
      }
    }

    const id = `notification-${++this.notificationId}`;
    const notification = this.createNotification(id, message, type);

    // Insertar la notificación
    this.container.appendChild(notification);

    // Animación de entrada
    requestAnimationFrame(() => {
      notification.classList.remove('translate-x-full', 'opacity-0');
      notification.classList.add('translate-x-0', 'opacity-100');
    });

    // Auto eliminar después del tiempo especificado
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  public remove(id: string) {
    const notification = document.getElementById(id);
    if (!notification) return;

    // Animación de salida
    notification.classList.remove('translate-x-0', 'opacity-100');
    notification.classList.add('translate-x-full', 'opacity-0');

    // Eliminar del DOM después de la animación
    setTimeout(() => {
      notification.remove();
    }, 300);
  }

  private createNotification(id: string, message: string, type: 'success' | 'error' | 'warning' | 'info'): HTMLElement {
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `
      pointer-events-auto
      max-w-sm w-full
      bg-surface border border-white/10
      rounded-lg shadow-2xl
      p-4
      transform transition-all duration-300 ease-out
      translate-x-full opacity-0
      backdrop-blur-sm
    `;

    const colors = {
      success: { bg: 'bg-green-600/20', border: 'border-green-500/30', text: 'text-green-400', icon: this.getSuccessIcon() },
      error: { bg: 'bg-red-600/20', border: 'border-red-500/30', text: 'text-red-400', icon: this.getErrorIcon() },
      warning: { bg: 'bg-yellow-600/20', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: this.getWarningIcon() },
      info: { bg: 'bg-blue-600/20', border: 'border-blue-500/30', text: 'text-blue-400', icon: this.getInfoIcon() }
    };

    const colorScheme = colors[type];
    notification.classList.add(colorScheme.bg, colorScheme.border);

    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 ${colorScheme.text}">
          ${colorScheme.icon}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-text-primary break-words">
            ${message}
          </p>
        </div>
        <button
          type="button"
          onclick="window.notificationManager.remove('${id}')"
          class="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-white/10 transition-colors text-text-secondary hover:text-text-primary"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    return notification;
  }

  private getSuccessIcon(): string {
    return `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
  }

  private getErrorIcon(): string {
    return `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
  }

  private getWarningIcon(): string {
    return `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L3.098 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>
    `;
  }

  private getInfoIcon(): string {
    return `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
  }

  // Métodos de conveniencia
  public success(message: string, duration?: number) {
    return this.show(message, 'success', duration);
  }

  public error(message: string, duration?: number) {
    return this.show(message, 'error', duration);
  }

  public warning(message: string, duration?: number) {
    return this.show(message, 'warning', duration);
  }

  public info(message: string, duration?: number) {
    return this.show(message, 'info', duration);
  }
}

let instance: NotificationManager | null = null;

function getNotificationManager(): NotificationManager {
  if (typeof window !== 'undefined') {
    if (!instance) {
      instance = new NotificationManager();
      (window as any).notificationManager = instance;
    }
    return instance;
  }
  // Devuelve un objeto mock para el renderizado del lado del servidor
  return {
    show: () => {},
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {},
    remove: () => {},
  } as any;
}

const notificationManager = getNotificationManager();

export default notificationManager;