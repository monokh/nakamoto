export enum INVOICE_STATUS {
  ACTIVE = "ACTIVE",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED",
  EXPIRED = "EXPIRED",
}

export type Invoice = {
  id: string;
  address: string;
  amount: number;
  expiration: number;
  requiredConfirmations: number;
  data: any;
  status: INVOICE_STATUS;
  tx?: string;
};
