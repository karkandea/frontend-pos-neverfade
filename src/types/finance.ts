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
