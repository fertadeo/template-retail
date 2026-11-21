export type CashSession = {
  id: string;
  openedBy: string;
  openedByName: string;
  closedBy: string | null;
  closedByName: string | null;
  openingAmount: number;
  currency: string;
  openedAt: string;
  closedAt: string | null;
  countedAmount: number | null;
  cashSales: number;
  transferSales: number;
  expectedAmount: number;
  difference: number | null;
  tickets: number;
  note: string;
  version: number;
};
export type CashState = {
  session: CashSession | null;
  today: string;
  utcOffsetMinutes: number;
};
export type CashHistory = {
  items: CashSession[];
  page: number;
  hasMore: boolean;
};
export type DailySales = {
  from: string;
  to: string;
  today: string;
  utcOffsetMinutes: number;
  rows: Array<{
    day: string;
    currency: string;
    tickets: number;
    total: number;
    cash: number;
    transfer: number;
    unclassified: number;
  }>;
};
