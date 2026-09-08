export type KitchenStatus =
  | "draft"
  | "queued"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export type RestaurantTable = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  active: boolean;
  sortOrder: number;
  status: "available" | "occupied";
  openOrderId: string | null;
  openOrderNumber: string | null;
  openOrderSubtotal: number;
  kitchenPendingItems: number;
};

export type RestaurantOrderItem = {
  id: string;
  productId: string;
  nama: string;
  hargaJual: number;
  qty: number;
  subtotal: number;
  note: string;
  kitchenStatus: KitchenStatus;
  createdAt: string;
  queuedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
};

export type RestaurantOrder = {
  id: string;
  orderNumber: string;
  tableId: string;
  tableCode: string;
  tableName: string;
  status: "open" | "closed" | "cancelled";
  transactionId: string | null;
  cancellationReason: string | null;
  openedAt: string;
  updatedAt: string;
  closedAt: string | null;
  cancelledAt: string | null;
  subtotal: number;
  items: RestaurantOrderItem[];
};

export type KitchenQueueOrder = {
  orderId: string;
  orderNumber: string;
  tableId: string;
  tableCode: string;
  tableName: string;
  openedAt: string;
  items: RestaurantOrderItem[];
};

export type RestaurantProduct = {
  id: string;
  kode: string;
  barcode?: string;
  nama: string;
  kategori: string;
  hargaJual: number;
  stok: number;
};
