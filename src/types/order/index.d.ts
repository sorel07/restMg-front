export interface Order {
  id: string;
  orderCode: string;
  tableCode: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus = 'AwaitingPayment' | 'Pending' | 'InPreparation' | 'Ready' | 'Delivered' | 'Cancelled';