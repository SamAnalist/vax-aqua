export type Outreach = {
  sentAt: number;
  status: "sent" | "confirmed" | "declined" | "noreply";
  visitAt: number;
  confirmedAt?: number;
};

export type Seminar = {
  state: string;
  topics: string[];
  seats: number;
  note: string;
  at: number;
};

export type OrderLine = {
  id: string;
  item: string;
  spec: string;
  qty: number;
  unit: string;
  price: number;
};

export type Order = {
  id: string;
  num: string;
  at: number;
  status: string;
  due: number;
  updatedAt?: number;
  note: string;
  lines: OrderLine[];
};

export type CallNote = {
  id: string;
  text: string;
  at: number;
  by: string;
};

export type Call = {
  id: string;
  customerId: string;
  at: number;
  kind: string;
  outcome: string;
  summary: string;
  minutes: number;
  nextAction: string;
  nextAt: number;
  nextDone: boolean;
  notes: CallNote[];
};

export type Customer = {
  id: string;
  regionId: string;
  name: string;
  type: string;
  place: string;
  contactName: string;
  role: string;
  phone: string;
  phone2: string;
  email: string;
  address: string;
  products: string[];
  annualVol: number;
  tier: string;
  status: string;
  since: number;
  terms: string;
  channel: string;
  openQuote: number;
  openQuoteAt: number;
  outreach: Outreach | null;
  lastVisitAt: number;
  seminar: Seminar;
  orders: Order[];
  orderCount?: number;
  memo: string;
};

export type AppSettings = {
  silenceDays: number;
  userName: string;
  companyName: string;
  outreachTpl: string;
  visitHour: number;
};

export type Bootstrap = {
  user: { uuid: string; email: string; name: string; companyName: string; role: string };
  settings: AppSettings;
  customers: Customer[];
  calls: Call[];
  callsTruncated: boolean;
  callsTotal: number;
  queueKey: string;
};
