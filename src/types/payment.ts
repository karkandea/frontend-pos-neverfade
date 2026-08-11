export type QrisPayment = {
  id: string;
  transactionId: string;
  providerPaymentRequestId: string;
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
};
