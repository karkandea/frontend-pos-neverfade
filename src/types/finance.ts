export type WithdrawalStatus = "requested" | "paid" | "rejected";

export type FinanceSummary = {
  availableBalance: number;
  totalSuccessfulNonCashIncome: number;
  totalWithdrawn: number;
  pendingWithdrawalAmount: number;
};

export type Withdrawal = {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt: string | null;
};

export type PlatformWithdrawal = Withdrawal & {
  tenantId: string;
  tenantName: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedByUsername: string;
};

export type FinanceMovement = {
  id: string;
  type: "qris_credit" | "withdrawal";
  status: "paid" | "requested" | "rejected";
  amount: number;
  timestamp: string;
  reference: string;
  paymentId: string | null;
  transactionId: string | null;
  withdrawalId: string | null;
};
