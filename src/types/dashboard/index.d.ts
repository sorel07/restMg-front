export interface DashboardSummary {
  revenueToday: number;
  ordersToday: number;
  averageTicketToday: number;
}

export interface TopDishToday {
  name: string;
  totalSold: number;
}

export interface RecentOrder {
  id: string;
  orderCode: string;
  tableCode: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  total: number;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface DashboardTable {
  id: string;
  code: string;
  status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
  seats?: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  topDishes: TopDishToday[];
  recentOrders: RecentOrder[];
  tables: DashboardTable[];
}

// Eventos de SignalR para el Dashboard
export interface NewOrderEvent {
  orderId: string;
  orderCode: string;
  tableCode: string;
  total: number;
  items: OrderItem[];
  createdAt: string;
}

export interface TableStateUpdateEvent {
  tableId: string;
  newState: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
}

export interface DashboardState {
  summary: DashboardSummary;
  topDishes: TopDishToday[];
  recentOrders: RecentOrder[];
  tables: Map<string, DashboardTable>;
  isLoaded: boolean;
  lastUpdated: Date;
}
