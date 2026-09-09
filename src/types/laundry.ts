export type LaundryStatus =
  | "received"
  | "in_progress"
  | "ready"
  | "completed"
  | "cancelled";

export type LaundryPaymentStatus = "unpaid" | "paid";

export type LaundryWorkOrderItem = {
  id: string;
  productId: string;
  nama: string;
  productType: "goods" | "service";
  unit: string;
  quantity: number;
  quantityPrecision: number;
  unitPrice: number;
  subtotal: number;
};

export type LaundryStatusHistory = {
  id: string;
  fromStatus: string;
  toStatus: LaundryStatus;
  actorName: string;
  reason: string;
  at: string;
};

export type LaundryWorkOrder = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: LaundryStatus;
  paymentStatus: LaundryPaymentStatus;
  transactionId: string | null;
  total: number;
  notes: string;
  cancellationReason: string | null;
  receivedAt: string;
  promisedAt: string;
  updatedAt: string;
  paidAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: LaundryWorkOrderItem[];
  statusHistory: LaundryStatusHistory[];
};
