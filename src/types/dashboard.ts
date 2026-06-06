// src/types/dashboard.ts

export interface DashboardUser {
  id: string;
  name: string;
  phone: string;
  office: string; // '*' si owner
  owner: boolean;
  role: string;
  promoted_by: string;
}

// ── Filtres ──────────────────────────────────────────────────────

export type Period = 'today' | 'week' | 'month' | 'custom';
export type IssueFilter = 'valid' | 'pending' | 'canceled';

export interface DashboardFilters {
  period: Period;
  date_start?: string;
  date_end?: string;
  offices?: string[];
  seller?: string;
  product?: string;
  payment_mode?: string;
  clientKind?: string;
  client?: string;
  issue?: IssueFilter; // défaut: 'valid'
}

// ── Référentiels ─────────────────────────────────────────────────

export interface Office {
  id: number;
  name: string;
}

export interface Seller {
  id: string;
  name: string;
  phone: string;
  office: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  office: string;
  tag?: string;
  level?: string;
}

export interface Product {
  nom: string;
  type: 'prod' | 'serv';
  pv: number;
  pr_stock: number;
  pr_distr: number;
  pr_clt: number;
}

export interface MetaData {
  offices: Office[];
  sellers: Seller[];
  clients: Client[];
  products: Product[];
}

// ── KPI Overview ─────────────────────────────────────────────────

export interface KpiValue {
  value: number;
  variation: number | null; // % vs période précédente
}

export interface OverviewData {
  ca: KpiValue;
  benefice_net: KpiValue;
  commission: KpiValue;
  nb_ventes: KpiValue;
  pv: KpiValue;
  total_charges: KpiValue;           // NOUVEAU
  benefice_apres_charges: KpiValue;  // NOUVEAU
  dateRange: { start: string; end: string };
}

// ── Financier ────────────────────────────────────────────────────

export interface TimelinePoint {
  date: string;
  ca: number;
  benefice_net: number;
  commission: number;
}

export interface OfficeFinancial {
  office: string;
  ca: number;
  benefice_net: number;
}

export interface SellerFinancial {
  seller: string;
  name: string;
  ca: number;
  benefice_net: number;
  commission: number;
  pv: number;
}

export interface ClientFinancial {
  client: string;
  name: string;
  ca: number;
  nb_commandes: number;
}

// ── Sales ────────────────────────────────────────────────────────

export interface SalesTimelinePoint {
  date: string;
  nb_ventes: number;
}

export interface SalesMixItem {
  type: string;
  value: number;
}

export interface SalesMix {
  ca: SalesMixItem[];
  benefice: SalesMixItem[];
}

export interface TopProduct {
  name: string;
  ca: number;
  qty: number;
  benefice: number;
  commission: number;
  pv: number;
}

// ── Métriques issue (pending / canceled) ─────────────────────────

export interface IssueStats {
  pending_count: number;
  pending_amount: number;
  canceled_count: number;
  canceled_rate: number;
}

// ── MLM ──────────────────────────────────────────────────────────

export interface MlmSellerEntry {
  seller: string;
  name: string;
  pv: number;
  is_distributor_purchase?: boolean;
}

export interface MlmStats {
  total_pv: number;
  timeline: { date: string; pv: number }[];
  by_seller: MlmSellerEntry[];
  by_product: { name: string; pv: number }[];
}

// ── Clients ──────────────────────────────────────────────────────

export interface ClientsStats {
  nouveaux_clients: number;
  clients_actifs: number;
  timeline: { date: string; nouveaux: number }[];
  top_clients: ClientFinancial[];
}

// ── Stock ────────────────────────────────────────────────────────

export interface StockTimelinePoint {
  date: string;
  in: number;
  out: number;
}

export interface StockActuel {
  name: string;
  office: string;
  qte: number;
  pr_stock?: number;
  pr_distr?: number;
}

export interface StockStats {
  total_in: number;
  total_out: number;
  variation: number;
  valeur_stock_stockiste: number;
  valeur_stock_distributeur: number;
  timeline: StockTimelinePoint[];
  stock_actuel: StockActuel[];
}

// ── Cashout / Charges ────────────────────────────────────────────  NOUVEAU

export interface CashoutEntry {
  id: number;
  motif: string;
  montant: number;
  created_at: string;
  office: string;
  manager: string;
  is_paid: boolean;
}

export interface CashoutByMotif {
  motif: string;
  total: number;
  count: number;
}

export interface CashoutStats {
  total_charges: number;
  nb_charges: number;
  timeline: { date: string; total: number }[];
  timeline_by_motif: Record<string, number>[];   // [{ date, motif1: n, motif2: n, ... }]
  motifs: string[];
  by_motif: CashoutByMotif[];
  list: CashoutEntry[];
}

// ── Section active ───────────────────────────────────────────────

export type DashboardSection =
  | 'overview'
  | 'financial'
  | 'sales'
  | 'mlm'
  | 'products'
  | 'clients'
  | 'sellers'
  | 'offices'
  | 'stock'
  | 'charges'; // NOUVEAU

// ── État global du dashboard ─────────────────────────────────────

export interface DashboardState {
  meta: MetaData | null;
  overview: OverviewData | null;
  financialTimeline: TimelinePoint[] | null;
  financialByOffice: OfficeFinancial[] | null;
  financialBySeller: SellerFinancial[] | null;
  financialByClient: ClientFinancial[] | null;
  salesTimeline: SalesTimelinePoint[] | null;
  salesMix: SalesMix | null;
  issueStats: IssueStats | null;
  topSellers: SellerFinancial[] | null;
  topProducts: TopProduct[] | null;
  topClients: ClientFinancial[] | null;
  mlm: MlmStats | null;
  clients: ClientsStats | null;
  stock: StockStats | null;
  cashout: CashoutStats | null;  // NOUVEAU
}

export interface LoadingState {
  meta: boolean;
  overview: boolean;
  financial: boolean;
  sales: boolean;
  mlm: boolean;
  clients: boolean;
  stock: boolean;
  cashout: boolean;  // NOUVEAU
}

export interface ErrorState {
  meta: string | null;
  overview: string | null;
  financial: string | null;
  sales: string | null;
  mlm: string | null;
  clients: string | null;
  stock: string | null;
  cashout: string | null;  // NOUVEAU
}

// ── Thème ────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';