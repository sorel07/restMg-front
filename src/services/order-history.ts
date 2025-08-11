import type { KitchenOrder } from '../types/kitchen';
import { apiClient } from './api';

export interface OrderHistoryItem extends KitchenOrder {
  completedAt: string;
  preparationTime: number; // en minutos
  totalItems: number;
}

export interface DayStatistics {
  completedOrders: number;
  averagePreparationTime: number;
  totalItemsPrepared: number;
  peakHours: { hour: number; orders: number }[];
}

// Interfaz para la respuesta del endpoint de historial
interface HistoryResponse {
  orders: OrderHistoryItem[];
  totalCompletedOrders: number;
  averagePreparationTimeMinutes: number;
}

class OrderHistoryService {
  /**
   * Obtiene el historial de pedidos completados del día actual
   */
  async getTodayHistory(): Promise<OrderHistoryItem[]> {
    try {
      const response = await apiClient.get<HistoryResponse>('/kitchen/history/today');
      // El endpoint devuelve un objeto con orders, no directamente el array
      return response.data.orders || [];
    } catch (error) {
      console.error('Error obteniendo historial del día:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del día actual (calculadas localmente desde el historial)
   */
  async getTodayStatistics(): Promise<DayStatistics> {
    try {
      // Obtener respuesta completa que incluye estadísticas del servidor
      const response = await apiClient.get<HistoryResponse>('/kitchen/history/today');
      const orders = response.data.orders || [];
      
      // Si el servidor ya provee estadísticas, las usamos como base
      const serverStats = {
        completedOrders: response.data.totalCompletedOrders || 0,
        averagePreparationTime: response.data.averagePreparationTimeMinutes || 0
      };
      
      // Calculamos estadísticas adicionales localmente
      const localStats = this.calculateLocalStatistics(orders);
      
      // Combinamos estadísticas del servidor con las calculadas localmente
      return {
        completedOrders: serverStats.completedOrders,
        averagePreparationTime: serverStats.averagePreparationTime,
        totalItemsPrepared: localStats.totalItemsPrepared,
        peakHours: localStats.peakHours
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas del día:', error);
      throw error;
    }
  }

  /**
   * Formatea el tiempo de preparación en texto legible
   */
  formatPreparationTime(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return `${hours}h ${remainingMinutes}min`;
    }
  }

  /**
   * Formatea la fecha de completado
   */
  formatCompletedTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * Calcula estadísticas locales desde una lista de pedidos
   */
  calculateLocalStatistics(orders: OrderHistoryItem[]): DayStatistics {
    // Validar que orders sea un array válido
    if (!Array.isArray(orders) || orders.length === 0) {
      return {
        completedOrders: 0,
        averagePreparationTime: 0,
        totalItemsPrepared: 0,
        peakHours: []
      };
    }

    // Calcular tiempo promedio de preparación
    const totalTime = orders.reduce((sum, order) => sum + order.preparationTime, 0);
    const averageTime = totalTime / orders.length;

    // Calcular total de items preparados
    const totalItems = orders.reduce((sum, order) => sum + order.totalItems, 0);

    // Calcular horas pico (agrupar por hora)
    const hourlyOrders: { [hour: number]: number } = {};
    orders.forEach(order => {
      const hour = new Date(order.completedAt).getHours();
      hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourlyOrders)
      .map(([hour, count]) => ({ hour: parseInt(hour), orders: count }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 3);

    return {
      completedOrders: orders.length,
      averagePreparationTime: averageTime,
      totalItemsPrepared: totalItems,
      peakHours
    };
  }

  /**
   * Genera una tarjeta HTML para un pedido del historial
   */
  createHistoryOrderCard(order: OrderHistoryItem): string {
    const completedTime = this.formatCompletedTime(order.completedAt);
    const prepTime = this.formatPreparationTime(order.preparationTime);
    
    // Determinar color según tiempo de preparación
    let timeClass = 'text-green-400';
    if (order.preparationTime > 30) timeClass = 'text-yellow-400';
    if (order.preparationTime > 45) timeClass = 'text-red-400';

    return `
      <div class="bg-background rounded-lg p-4 border border-white/10">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-bold text-text-primary">${order.tableCode}</span>
              <span class="text-text-secondary text-sm">#${order.orderCode}</span>
            </div>
            <div class="text-text-secondary text-sm">
              Completado: ${completedTime}
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm ${timeClass} font-medium">⏱️ ${prepTime}</div>
            <div class="text-xs text-text-secondary">${order.totalItems} items</div>
          </div>
        </div>
        
        <!-- Lista de items -->
        <div class="space-y-1">
          ${order.items.map(item => `
            <div class="flex justify-between items-center text-sm">
              <span class="text-text-primary">${item.name}</span>
              <span class="text-text-secondary font-medium">×${item.quantity}</span>
            </div>
          `).join('')}
        </div>
        
        <!-- Badge de estado -->
        <div class="mt-3 flex justify-end">
          <span class="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded-full">
            ✅ Completado
          </span>
        </div>
      </div>
    `;
  }
}

export default new OrderHistoryService();
