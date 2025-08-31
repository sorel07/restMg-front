// Tipos para la Vista de Cocina
export interface KitchenOrderItem {
  name: string;
  quantity: number;
}

export interface KitchenOrder {
  id: string;
  orderCode: string;
  tableCode: string;
  status: 'Pending' | 'InPreparation' | 'Ready' | 'Delivered';
  createdAt: string;
  items: KitchenOrderItem[];
}

export interface OrderStatusUpdatePayload {
  orderId: string;
  newStatus: 'Pending' | 'InPreparation' | 'Ready' | 'Delivered';
}

// Estados de las columnas del Kanban
export type KanbanColumnId = 'pending' | 'inPreparation' | 'ready';

export interface KanbanColumn {
  id: KanbanColumnId;
  title: string;
  status: KitchenOrder['status'];
  orders: KitchenOrder[];
}

// Configuración de SignalR
export interface SignalRConnection {
  connectionId?: string;
  isConnected: boolean;
  reconnectAttempts: number;
}

// Tipos para el historial
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
