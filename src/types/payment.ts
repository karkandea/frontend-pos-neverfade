export type QrisPayment = {
  id: string;
  transactionId: string;
  providerPaymentRequestId: string;
  providerReferenceId: string;
  amount: number;
  currency: string;
  status: string;
  qrString: string | null;
  expiresAt: string | null;
};

export type HostedPayment = {
  id: string;
  transactionId: string;
  providerSessionId: string;
  providerReferenceId: string;
  amount: number;
  currency: string;
  status: string;
  checkoutUrl: string;
  expiresAt: string | null;
};

export type PaymentStatus = {
  id: string;
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  method: string;
  providerPaymentRequestId: string;
  providerReferenceId: string;
  providerSessionId: string | null;
  qrString: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
  failureCode: string | null;
  updatedAt: string;
};

export type PaymentCapabilities = {
  qrisEnabled: boolean;
  hostedCheckoutEnabled: boolean;
  mode: "disabled" | "sandbox" | "live";
  isSandbox: boolean;
};
