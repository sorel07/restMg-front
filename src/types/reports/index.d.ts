export interface OrderReport {
  id: string;
  orderCode: string;
  tableCode: string;
  total: number;
  status: 'Pending' | 'InPreparation' | 'Ready' | 'Delivered' | 'Cancelled' | 'AwaitingPayment';
  createdAt: string;
}

export interface BestsellerReport {
  menuItemId: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
}

export interface DateFilters {
  from?: string;
  to?: string;
}

export interface ReportsData {
  orders: OrderReport[];
  bestsellers: BestsellerReport[];
  isLoading: boolean;
  error?: string;
}
