import type { LaundryWorkOrder } from "../types/laundry";

export const LAUNDRY_CHECKOUT_KEY =
  "nfpos_laundry_checkout";

const RESTAURANT_CHECKOUT_KEY =
  "nfpos_restaurant_checkout";

export type LaundryCheckoutContext = {
  workOrderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  transactionId: string | null;
  paymentMethod: "tunai" | "qris" | "xendit" | null;
};

export function getLaundryCheckout() {
  const raw = localStorage.getItem(LAUNDRY_CHECKOUT_KEY);
  if (!raw) return null;

  try {
    const value =
      JSON.parse(raw) as LaundryCheckoutContext;

    if (
      !value.workOrderId ||
      !value.orderNumber ||
      !value.customerId
    ) {
      throw new Error("invalid laundry checkout");
    }

    return value;
  } catch {
    localStorage.removeItem(LAUNDRY_CHECKOUT_KEY);
    return null;
  }
}

export function saveLaundryCheckout(
  context: LaundryCheckoutContext
) {
  localStorage.setItem(
    LAUNDRY_CHECKOUT_KEY,
    JSON.stringify(context)
  );

  return context;
}

export function startLaundryCheckout(
  order: LaundryWorkOrder
) {
  localStorage.removeItem(RESTAURANT_CHECKOUT_KEY);

  return saveLaundryCheckout({
    workOrderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    transactionId: null,
    paymentMethod: null,
  });
}

export function markLaundryCheckoutTransaction(
  transactionId: string,
  paymentMethod: "tunai" | "qris" | "xendit"
) {
  const current = getLaundryCheckout();
  if (!current) return null;

  return saveLaundryCheckout({
    ...current,
    transactionId,
    paymentMethod,
  });
}

export function resetLaundryCheckoutTransaction() {
  const current = getLaundryCheckout();
  if (!current) return null;

  return saveLaundryCheckout({
    ...current,
    transactionId: null,
    paymentMethod: null,
  });
}

export function clearLaundryCheckout() {
  localStorage.removeItem(LAUNDRY_CHECKOUT_KEY);
}
