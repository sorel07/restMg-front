// Tipos específicos para el sistema de pagos y confirmación
export interface PendingPaymentOrder {
  id: string;
  orderCode: string;
  tableCode: string;
  status: 'AwaitingPayment';
  createdAt: string;
  total?: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice?: number;
  }>;
}

export interface PaymentConfirmationResponse {
  success: boolean;
  message?: string;
}

// Enum para las pestañas de la vista de cocina
export enum KitchenTab {
  ACTIVE_ORDERS = 'active-orders',
  PENDING_PAYMENTS = 'pending-payments'
}
