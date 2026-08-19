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

export type PaymentStatus = {
  id: string;
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  providerPaymentRequestId: string;
  providerReferenceId: string;
  qrString: string | null;
  expiresAt: string | null;
  failureCode: string | null;
  updatedAt: string;
};

export type PaymentCapabilities = {
  qrisEnabled: boolean;
  mode: "disabled" | "sandbox" | "live";
  isSandbox: boolean;
};
