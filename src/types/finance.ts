export type WithdrawalStatus =
  | "requested"
  | "processing"
  | "paid"
  | "rejected"
  | "cancelled";

export type BankVerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export type FinanceSummary = {
  availableBalance: number;
  totalSuccessfulNonCashIncome: number;
  totalWithdrawn: number;
  pendingWithdrawalAmount: number;
};

export type WithdrawalSettings = {
  minimumAmount: number;
  processingEstimate: string;
};

export type WithdrawalBankAccount = {
  bankName: string;
  maskedAccountNumber: string;
  accountHolderName: string;
  verificationStatus: BankVerificationStatus;
  verificationNote: string | null;
  updatedAt: string;
  verifiedAt: string | null;
};

export type PlatformWithdrawalBankAccount =
  WithdrawalBankAccount & {
    tenantId: string;
    tenantName: string;
    accountNumber: string;
  };

export type Withdrawal = {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  destinationBankName: string;
  destinationAccountMask: string;
  destinationAccountHolderName: string;
  transferReference: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  processingStartedAt: string | null;
  processedAt: string | null;
  cancelledAt: string | null;
};

export type PlatformWithdrawal = Withdrawal & {
  tenantId: string;
  tenantName: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedByUsername: string;
  destinationAccountNumber: string;
  evidenceMetadata: string | null;
};

export type FinanceMovement = {
  id: string;
  type: "qris_credit" | "withdrawal";
  status: "paid" | WithdrawalStatus;
  amount: number;
  timestamp: string;
  reference: string;
  paymentId: string | null;
  transactionId: string | null;
  withdrawalId: string | null;
};
