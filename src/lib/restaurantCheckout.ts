export const RESTAURANT_CHECKOUT_KEY =
  "nfpos_restaurant_checkout";

export type RestaurantCheckoutContext = {
  orderId: string;
  orderNumber: string;
  tableName: string;
  transactionId: string | null;
  paymentMethod: "tunai" | "qris" | null;
};

export function getRestaurantCheckout() {
  const raw = localStorage.getItem(RESTAURANT_CHECKOUT_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as RestaurantCheckoutContext;

    if (
      !value.orderId ||
      !value.orderNumber ||
      !value.tableName
    ) {
      throw new Error("invalid restaurant checkout");
    }

    return value;
  } catch {
    localStorage.removeItem(RESTAURANT_CHECKOUT_KEY);
    return null;
  }
}

export function saveRestaurantCheckout(
  context: RestaurantCheckoutContext
) {
  localStorage.setItem(
    RESTAURANT_CHECKOUT_KEY,
    JSON.stringify(context)
  );

  return context;
}

export function startRestaurantCheckout(
  orderId: string,
  orderNumber: string,
  tableName: string
) {
  return saveRestaurantCheckout({
    orderId,
    orderNumber,
    tableName,
    transactionId: null,
    paymentMethod: null,
  });
}

export function markRestaurantCheckoutTransaction(
  transactionId: string,
  paymentMethod: "tunai" | "qris"
) {
  const current = getRestaurantCheckout();
  if (!current) return null;

  return saveRestaurantCheckout({
    ...current,
    transactionId,
    paymentMethod,
  });
}

export function resetRestaurantCheckoutTransaction() {
  const current = getRestaurantCheckout();
  if (!current) return null;

  return saveRestaurantCheckout({
    ...current,
    transactionId: null,
    paymentMethod: null,
  });
}

export function clearRestaurantCheckout() {
  localStorage.removeItem(RESTAURANT_CHECKOUT_KEY);
}
