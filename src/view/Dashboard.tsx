// src/pages/Dashboard.tsx
import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { useDashboard } from '../hooks/useDashboard';
import type {
  DashboardSection, SellerFinancial, TopProduct,
  ClientFinancial, StockActuel,
} from '../types/dashboard';

// ─────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtNum = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n));

const fmtPct = (n: number | null) => {
  if (n === null) return null;
  return (n >= 0 ? '+' : '') + n + '%';
};

const CHART_COLORS = {
  brand: '#0d65f2',
  accent: '#0df261',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  neutral: '#52525b',
};

const PIE_COLORS = ['#0d65f2', '#0df261', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS RÉUTILISABLES
// ─────────────────────────────────────────────────────────────────

// ── Spinner ───────────────────────────────────────────────────────
const Spinner = () => (
  <div className="dash-spinner">
    <div className="dash-spinner__ring" />
  </div>
);

// ── Error Banner ───────────────────────────────────────────────────
const ErrorBanner = ({ message }: { message: string }) => (
  <div className="dash-error">
    <span className="dash-error__icon">⚠</span>
    <span>{message}</span>
  </div>
);

// ── KPI Card ───────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  variation?: number | null;
  icon: string;
  accent?: string;
}

const KpiCard = ({ label, value, variation, icon, accent = '#0d65f2' }: KpiCardProps) => {
  const isPositive = variation !== null && variation !== undefined && variation >= 0;
  const pct = fmtPct(variation ?? null);

  return (
    <div className="kpi-card" style={{ '--accent': accent } as React.CSSProperties}>
      <div className="kpi-card__header">
        <span className="kpi-card__icon">{icon}</span>
        {pct && (
          <span className={`kpi-card__badge ${isPositive ? 'kpi-card__badge--up' : 'kpi-card__badge--down'}`}>
            {isPositive ? '↑' : '↓'} {pct}
          </span>
        )}
      </div>
      <div className="kpi-card__value">{value}</div>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__bar" />
    </div>
  );
};

// ── Section Card ───────────────────────────────────────────────────
const SectionCard = ({ title, children, className = '' }: {
  title: string; children: React.ReactNode; className?: string;
}) => (
  <div className={`section-card ${className}`}>
    <div className="section-card__title">{title}</div>
    {children}
  </div>
);

// ── Custom Tooltip Recharts ────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, currency = true }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; currency?: boolean;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{currency ? fmt(p.value) : fmtNum(p.value)}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Rank Table ─────────────────────────────────────────────────────
const RankTable = ({ headers, rows }: {
  headers: string[];
  rows: (string | number)[][];
}) => (
  <div className="rank-table-wrap">
    <table className="rank-table">
      <thead>
        <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ '--rank-delay': `${i * 40}ms` } as React.CSSProperties}>
            <td className="rank-table__rank">#{i + 1}</td>
            {row.map((cell, j) => <td key={j}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────────────────────────────

// ── Overview ──────────────────────────────────────────────────────
const OverviewSection = ({ data, loading, error }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
}) => {
  const ov = data.overview;
  if (error) return <ErrorBanner message={error} />;
  if (loading.overview || !ov) return <div className="section-loading"><Spinner /></div>;

  const kpis = [
    { label: "Chiffre d'Affaires", value: fmt(ov.ca.value), variation: ov.ca.variation, icon: '💰', accent: '#0d65f2' },
    { label: 'Bénéfice Total', value: fmt(ov.benefice.value), variation: ov.benefice.variation, icon: '📈', accent: '#0df261' },
    { label: 'Commission Totale', value: fmt(ov.commission.value), variation: ov.commission.variation, icon: '🤝', accent: '#f59e0b' },
    { label: 'Profit Net', value: fmt(ov.profit_net.value), variation: ov.profit_net.variation, icon: '✨', accent: '#8b5cf6' },
    { label: 'Nombre de Ventes', value: fmtNum(ov.nb_ventes.value), variation: ov.nb_ventes.variation, icon: '🛒', accent: '#06b6d4' },
    { label: 'PV Total', value: fmtNum(ov.pv.value) + ' PV', variation: ov.pv.variation, icon: '⭐', accent: '#ef4444' },
  ];

  return (
    <div className="overview-grid">
      {kpis.map((k, i) => (
        <KpiCard key={i} {...k} />
      ))}
    </div>
  );
};

// ── Financial ─────────────────────────────────────────────────────
const FinancialSection = ({ data, loading, error }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.financial) return <div className="section-loading"><Spinner /></div>;

  const tl = data.financialTimeline ?? [];
  const byOffice = data.financialByOffice ?? [];
  const byClient = data.financialByClient ?? [];

  return (
    <div className="section-col">
      <SectionCard title="Évolution CA · Bénéfice · Profit Net">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={tl}>
            <defs>
              <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.brand} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gBen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={v => fmtNum(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="ca" name="CA" stroke={CHART_COLORS.brand} fill="url(#gCA)" strokeWidth={2} dot={false} animationDuration={800} />
            <Area type="monotone" dataKey="benefice" name="Bénéfice" stroke={CHART_COLORS.accent} fill="url(#gBen)" strokeWidth={2} dot={false} animationDuration={1000} />
            <Area type="monotone" dataKey="profit_net" name="Profit Net" stroke={CHART_COLORS.purple} fill="url(#gProfit)" strokeWidth={2} dot={false} animationDuration={1200} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="section-row-2">
        <SectionCard title="CA par Bureau">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byOffice} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={v => fmtNum(v)} />
              <YAxis type="category" dataKey="office" tick={{ fontSize: 11, fill: '#71717a' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ca" name="CA" fill={CHART_COLORS.brand} radius={[0, 6, 6, 0]} animationDuration={800} />
              <Bar dataKey="benefice" name="Bénéfice" fill={CHART_COLORS.accent} radius={[0, 6, 6, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top Clients (CA)">
          <RankTable
            headers={['Client', 'CA', 'Commandes']}
            rows={byClient.slice(0, 8).map(c => [c.name || c.client, fmt(c.ca), c.nb_commandes])}
          />
        </SectionCard>
      </div>
    </div>
  );
};

// ── Sales ─────────────────────────────────────────────────────────
const SalesSection = ({ data, loading, error }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.sales) return <div className="section-loading"><Spinner /></div>;

  const tl = data.salesTimeline ?? [];
  const mix = data.salesMix;
  const topSellers = (data.topSellers ?? []) as SellerFinancial[];
  const topProducts = (data.topProducts ?? []) as TopProduct[];

  return (
    <div className="section-col">
      <div className="section-row-2">
        <SectionCard title="Ventes par Période">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={tl}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.cyan} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
              <Tooltip content={<CustomTooltip currency={false} />} />
              <Area type="monotone" dataKey="nb_ventes" name="Ventes" stroke={CHART_COLORS.cyan} fill="url(#gSales)" strokeWidth={2} dot={false} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {mix && (
          <SectionCard title="Mix Produits vs Services (CA)">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={mix.ca}
                  dataKey="value"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={4}
                  animationDuration={800}
                >
                  {mix.ca.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>

      <div className="section-row-2">
        <SectionCard title="Top Sellers">
          <RankTable
            headers={['Nom', 'CA', 'Bénéfice', 'PV']}
            rows={topSellers.slice(0, 8).map(s => [s.name || s.seller, fmt(s.ca), fmt(s.benefice), fmtNum(s.pv)])}
          />
        </SectionCard>
        <SectionCard title="Top Produits">
          <RankTable
            headers={['Produit', 'CA', 'Qté', 'Bénéfice']}
            rows={topProducts.slice(0, 8).map(p => [p.name, fmt(p.ca), fmtNum(p.qty), fmt(p.benefice)])}
          />
        </SectionCard>
      </div>
    </div>
  );
};

// ── MLM ───────────────────────────────────────────────────────────
const MlmSection = ({ data, loading, error }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.mlm) return <div className="section-loading"><Spinner /></div>;

  const mlm = data.mlm;
  if (!mlm) return null;

  return (
    <div className="section-col">
      <div className="kpi-single">
        <KpiCard label="PV Total" value={fmtNum(mlm.total_pv) + ' PV'} icon="⭐" accent="#f59e0b" />
      </div>

      <SectionCard title="Évolution PV">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={mlm.timeline}>
            <defs>
              <linearGradient id="gPV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.warning} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART_COLORS.warning} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip content={<CustomTooltip currency={false} />} />
            <Area type="monotone" dataKey="pv" name="PV" stroke={CHART_COLORS.warning} fill="url(#gPV)" strokeWidth={2} dot={false} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="section-row-2">
        <SectionCard title="PV par Seller">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mlm.by_seller.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} width={90} />
              <Tooltip content={<CustomTooltip currency={false} />} />
              <Bar dataKey="pv" name="PV" fill={CHART_COLORS.warning} radius={[0, 6, 6, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="PV par Produit">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mlm.by_product.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} width={90} />
              <Tooltip content={<CustomTooltip currency={false} />} />
              <Bar dataKey="pv" name="PV" fill={CHART_COLORS.purple} radius={[0, 6, 6, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </div>
  );
};

// ── Clients ───────────────────────────────────────────────────────
const ClientsSection = ({ data, loading, error }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.clients) return <div className="section-loading"><Spinner /></div>;

  const clients = data.clients;
  if (!clients) return null;

  return (
    <div className="section-col">
      <div className="overview-grid overview-grid--2">
        <KpiCard label="Nouveaux Clients" value={fmtNum(clients.nouveaux_clients)} icon="🆕" accent="#06b6d4" />
        <KpiCard label="Clients Actifs" value={fmtNum(clients.clients_actifs)} icon="🔥" accent="#0df261" />
      </div>

      <SectionCard title="Acquisition Clients (période)">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={clients.timeline}>
            <defs>
              <linearGradient id="gClt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.cyan} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.cyan} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip content={<CustomTooltip currency={false} />} />
            <Area type="monotone" dataKey="nouveaux" name="Nouveaux clients" stroke={CHART_COLORS.cyan} fill="url(#gClt)" strokeWidth={2} dot={false} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Top Clients par CA">
        <RankTable
          headers={['Client', 'CA Total', 'Commandes']}
          rows={(clients.top_clients as ClientFinancial[]).slice(0, 10).map(c => [c.name || c.client, fmt(c.ca), c.nb_commandes])}
        />
      </SectionCard>
    </div>
  );
};

// ── Stock ─────────────────────────────────────────────────────────
const StockSection = ({ data, loading, error }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.stock) return <div className="section-loading"><Spinner /></div>;

  const stock = data.stock;
  if (!stock) return null;

  const varColor = stock.variation >= 0 ? CHART_COLORS.accent : CHART_COLORS.danger;

  return (
    <div className="section-col">
      <div className="overview-grid overview-grid--3">
        <KpiCard label="Total Entrées" value={fmtNum(stock.total_in) + ' u.'} icon="📦" accent="#0df261" />
        <KpiCard label="Total Sorties" value={fmtNum(stock.total_out) + ' u.'} icon="📤" accent="#ef4444" />
        <KpiCard label="Variation Nette" value={(stock.variation >= 0 ? '+' : '') + fmtNum(stock.variation) + ' u.'} icon="↔" accent={varColor} />
      </div>

      <SectionCard title="Flux Stock (Entrées vs Sorties)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={stock.timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip content={<CustomTooltip currency={false} />} />
            <Legend />
            <Line type="monotone" dataKey="in" name="Entrées" stroke={CHART_COLORS.accent} strokeWidth={2} dot={false} animationDuration={800} />
            <Line type="monotone" dataKey="out" name="Sorties" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} animationDuration={1000} />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Stock Actuel">
        <div className="rank-table-wrap">
          <table className="rank-table">
            <thead>
              <tr><th>#</th><th>Produit</th><th>Bureau</th><th>Qté</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {(stock.stock_actuel as StockActuel[]).map((s, i) => (
                <tr key={i} style={{ '--rank-delay': `${i * 40}ms` } as React.CSSProperties}>
                  <td className="rank-table__rank">#{i + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.office}</td>
                  <td><strong>{fmtNum(s.qte)}</strong></td>
                  <td>
                    <span className={`stock-badge ${s.qte <= 0 ? 'stock-badge--empty' : s.qte < 5 ? 'stock-badge--low' : 'stock-badge--ok'}`}>
                      {s.qte <= 0 ? 'Épuisé' : s.qte < 5 ? 'Faible' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// FILTRE BAR
// ─────────────────────────────────────────────────────────────────

const FilterBar = ({
  filters, meta, isOwner,
  onPeriod, onCustom, onOffices, onSeller, onProduct, onPayment, onClientKind, onReset,
}: {
  filters: ReturnType<typeof useDashboard>['filters'];
  meta: ReturnType<typeof useDashboard>['data']['meta'];
  isOwner: boolean;
  onPeriod: (p: 'today' | 'week' | 'month' | 'custom') => void;
  onCustom: (s: string, e: string) => void;
  onOffices: (offices: string[]) => void;
  onSeller: (s: string) => void;
  onProduct: (p: string) => void;
  onPayment: (p: string) => void;
  onClientKind: (k: string) => void;
  onReset: () => void;
}) => {
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  return (
    <div className="filter-bar">
      <div className="filter-bar__group">
        <span className="filter-bar__label">Période</span>
        <div className="filter-bar__periods">
          {(['today', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              className={`filter-bar__period-btn ${filters.period === p ? 'active' : ''}`}
              onClick={() => onPeriod(p)}
            >
              {p === 'today' ? "Aujourd'hui" : p === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-bar__group">
        <span className="filter-bar__label">Custom</span>
        <div className="filter-bar__row">
          <input
            type="date"
            className="filter-bar__input"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
          />
          <span className="filter-bar__sep">→</span>
          <input
            type="date"
            className="filter-bar__input"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
          />
          <button
            className="filter-bar__apply-btn"
            onClick={() => customStart && customEnd && onCustom(customStart, customEnd)}
          >
            Appliquer
          </button>
        </div>
      </div>

      {isOwner && meta?.offices && (
        <div className="filter-bar__group">
          <span className="filter-bar__label">Bureau</span>
          <select
            className="filter-bar__select"
            value={filters.offices?.[0] ?? ''}
            onChange={e => onOffices(e.target.value ? [e.target.value] : [])}
          >
            <option value="">Tous les bureaux</option>
            {meta.offices.map(o => (
              <option key={o.id} value={o.name}>{o.name}</option>
            ))}
          </select>
        </div>
      )}

      {meta?.sellers && (
        <div className="filter-bar__group">
          <span className="filter-bar__label">Seller</span>
          <select
            className="filter-bar__select"
            value={filters.seller ?? ''}
            onChange={e => onSeller(e.target.value)}
          >
            <option value="">Tous</option>
            {meta.sellers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {meta?.products && (
        <div className="filter-bar__group">
          <span className="filter-bar__label">Produit</span>
          <select
            className="filter-bar__select"
            value={filters.product ?? ''}
            onChange={e => onProduct(e.target.value)}
          >
            <option value="">Tous</option>
            {meta.products.map(p => (
              <option key={p.nom} value={p.nom}>{p.nom}</option>
            ))}
          </select>
        </div>
      )}

      <div className="filter-bar__group">
        <span className="filter-bar__label">Paiement</span>
        <select
          className="filter-bar__select"
          value={filters.payment_mode ?? ''}
          onChange={e => onPayment(e.target.value)}
        >
          <option value="">Tous</option>
          <option value="Cash">Cash</option>
          <option value="Mobile Money">Mobile Money</option>
          <option value="Virement">Virement</option>
          <option value="Crédit">Crédit</option>
        </select>
      </div>

      <div className="filter-bar__group">
        <span className="filter-bar__label">Type client</span>
        <select
          className="filter-bar__select"
          value={filters.client_kind ?? ''}
          onChange={e => onClientKind(e.target.value)}
        >
          <option value="">Tous</option>
          <option value="distributor">Distributeur</option>
          <option value="final">Client Final</option>
        </select>
      </div>

      <button className="filter-bar__reset-btn" onClick={onReset}>
        ↺ Reset
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// NAVIGATION TABS
// ─────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: DashboardSection; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Vue Globale',  icon: '◉' },
  { id: 'financial', label: 'Financier',    icon: '📊' },
  { id: 'sales',     label: 'Ventes',       icon: '🛒' },
  { id: 'mlm',       label: 'MLM / PV',     icon: '⭐' },
  { id: 'clients',   label: 'Clients',      icon: '👥' },
  { id: 'sellers',   label: 'Sellers',      icon: '🏆' },
  { id: 'offices',   label: 'Bureaux',      icon: '🏢' },
  { id: 'stock',     label: 'Stock',        icon: '📦' },
];

// ─────────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const {
    user, filters, activeSection, data, loading, errors,
    updateFilter, setPeriod, setCustomDates, resetFilters, navigateTo, refresh,
  } = useDashboard();

  const isOwner = user?.owner === true || user?.office === '*';

  if (!user) {
    return (
      <div className="dash-no-user">
        <div className="dash-no-user__card">
          <span className="dash-no-user__icon">🔐</span>
          <h2>Session introuvable</h2>
          <p>Aucun utilisateur connecté. Veuillez vous reconnecter.</p>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection data={data} loading={loading} error={errors.overview} />;
      case 'financial':
        return <FinancialSection data={data} loading={loading} error={errors.financial} />;
      case 'sales':
        return <SalesSection data={data} loading={loading} error={errors.sales} />;
      case 'mlm':
        return <MlmSection data={data} loading={loading} error={errors.mlm} />;
      case 'clients':
        return <ClientsSection data={data} loading={loading} error={errors.clients} />;
      case 'sellers':
        // Réutilise financial/bySeller avec un rendu dédié
        return (
          <div className="section-col">
            {errors.financial && <ErrorBanner message={errors.financial} />}
            {loading.financial && <div className="section-loading"><Spinner /></div>}
            {data.financialBySeller && (
              <>
                <SectionCard title="Performance Sellers">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.financialBySeller.slice(0, 12)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={v => fmtNum(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="ca" name="CA" fill={CHART_COLORS.brand} radius={[6,6,0,0]} animationDuration={800} />
                      <Bar dataKey="benefice" name="Bénéfice" fill={CHART_COLORS.accent} radius={[6,6,0,0]} animationDuration={1000} />
                      <Bar dataKey="commission" name="Commission" fill={CHART_COLORS.warning} radius={[6,6,0,0]} animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>
                <SectionCard title="Classement Complet">
                  <RankTable
                    headers={['Nom', 'CA', 'Bénéfice', 'Commission', 'PV']}
                    rows={data.financialBySeller.map(s => [s.name || s.seller, fmt(s.ca), fmt(s.benefice), fmt(s.commission), fmtNum(s.pv)])}
                  />
                </SectionCard>
              </>
            )}
          </div>
        );
      case 'offices':
        return (
          <div className="section-col">
            {errors.financial && <ErrorBanner message={errors.financial} />}
            {loading.financial && <div className="section-loading"><Spinner /></div>}
            {data.financialByOffice && (
              <>
                <SectionCard title="Performance par Bureau">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.financialByOffice}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="office" tick={{ fontSize: 11, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={v => fmtNum(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="ca" name="CA" fill={CHART_COLORS.brand} radius={[6,6,0,0]} animationDuration={800} />
                      <Bar dataKey="benefice" name="Bénéfice" fill={CHART_COLORS.accent} radius={[6,6,0,0]} animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>
                <SectionCard title="Tableau Bureaux">
                  <RankTable
                    headers={['Bureau', 'CA', 'Bénéfice']}
                    rows={data.financialByOffice.map(o => [o.office, fmt(o.ca), fmt(o.benefice)])}
                  />
                </SectionCard>
              </>
            )}
          </div>
        );
      case 'stock':
        return <StockSection data={data} loading={loading} error={errors.stock} />;
      default:
        return null;
    }
  };

  return (
    <>
      <style>{DASHBOARD_CSS}</style>
      <div className="dash-root" data-style="neuro" data-mode="dark">

        {/* ── SIDEBAR ─────────────────────────────────────── */}
        <aside className="dash-sidebar">
          <div className="dash-sidebar__brand">
            <div className="dash-sidebar__logo">◈</div>
            <div>
              <div className="dash-sidebar__app-name">Analytics</div>
              <div className="dash-sidebar__user-name">{user.name}</div>
            </div>
          </div>

          <div className="dash-sidebar__role-badge">
            {isOwner ? '👑 Owner' : '🏢 Manager'}
            {!isOwner && <span className="dash-sidebar__office">{user.office}</span>}
          </div>

          <nav className="dash-sidebar__nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`dash-nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => navigateTo(item.id)}
              >
                <span className="dash-nav-item__icon">{item.icon}</span>
                <span className="dash-nav-item__label">{item.label}</span>
                {activeSection === item.id && <span className="dash-nav-item__indicator" />}
              </button>
            ))}
          </nav>

          <button className="dash-sidebar__refresh" onClick={refresh}>
            ↺ Rafraîchir
          </button>
        </aside>

        {/* ── MAIN ────────────────────────────────────────── */}
        <main className="dash-main">

          {/* ── TOPBAR ── */}
          <div className="dash-topbar">
            <div className="dash-topbar__title">
              {NAV_ITEMS.find(n => n.id === activeSection)?.icon}{' '}
              {NAV_ITEMS.find(n => n.id === activeSection)?.label}
            </div>
            <FilterBar
              filters={filters}
              meta={data.meta}
              isOwner={isOwner}
              onPeriod={setPeriod}
              onCustom={setCustomDates}
              onOffices={offices => updateFilter('offices', offices.length ? offices : undefined)}
              onSeller={s => updateFilter('seller', s || undefined)}
              onProduct={p => updateFilter('product', p || undefined)}
              onPayment={p => updateFilter('payment_mode', p || undefined)}
              onClientKind={k => updateFilter('client_kind', k || undefined)}
              onReset={resetFilters}
            />
          </div>

          {/* ── KPIs OVERVIEW (always visible) ── */}
          <div className="dash-overview-strip">
            <OverviewSection data={data} loading={loading} error={errors.overview} />
          </div>

          {/* ── SECTION CONTENT ── */}
          <div className="dash-content">
            {renderSection()}
          </div>
        </main>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────
// CSS INTÉGRÉ
// ─────────────────────────────────────────────────────────────────

const DASHBOARD_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

/* ── ROOT ── */
.dash-root {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: #09090b;
  color: #fafafa;
  font-family: 'Manrope', sans-serif;
}

/* ── SIDEBAR ── */
.dash-sidebar {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: #111113;
  border-right: 1px solid rgba(255,255,255,0.06);
  padding: 1.5rem 0;
  overflow-y: auto;
}

.dash-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.dash-sidebar__logo {
  font-size: 1.75rem;
  color: #0d65f2;
  line-height: 1;
}

.dash-sidebar__app-name {
  font-family: 'Plus Jakarta Sans', serif;
  font-weight: 700;
  font-size: 0.9rem;
  color: #fafafa;
  letter-spacing: -0.02em;
}

.dash-sidebar__user-name {
  font-size: 0.72rem;
  color: #71717a;
  font-weight: 500;
}

.dash-sidebar__role-badge {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 1rem 1.25rem 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(13,101,242,0.12);
  border: 1px solid rgba(13,101,242,0.25);
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #518cec;
}

.dash-sidebar__office {
  font-size: 0.7rem;
  color: #71717a;
  font-weight: 400;
}

.dash-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.5rem 0.75rem;
  flex: 1;
}

.dash-nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: #71717a;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
  position: relative;
}

.dash-nav-item:hover {
  background: rgba(255,255,255,0.05);
  color: #e4e4e7;
}

.dash-nav-item.active {
  background: rgba(13,101,242,0.15);
  color: #518cec;
  font-weight: 600;
}

.dash-nav-item__icon { font-size: 1rem; }

.dash-nav-item__indicator {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: #0d65f2;
  border-radius: 3px 0 0 3px;
}

.dash-sidebar__refresh {
  margin: 0.75rem 1.25rem 0;
  padding: 0.55rem;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #71717a;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.18s;
}

.dash-sidebar__refresh:hover {
  background: rgba(255,255,255,0.08);
  color: #e4e4e7;
}

/* ── MAIN ── */
.dash-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ── TOPBAR ── */
.dash-topbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: #111113;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  min-height: 60px;
  overflow-x: auto;
  flex-shrink: 0;
}

.dash-topbar__title {
  font-family: 'Plus Jakarta Sans', serif;
  font-weight: 700;
  font-size: 1rem;
  color: #fafafa;
  white-space: nowrap;
  min-width: max-content;
}

/* ── FILTER BAR ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.filter-bar__group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.filter-bar__label {
  font-size: 0.68rem;
  font-weight: 600;
  color: #52525b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.filter-bar__periods {
  display: flex;
  gap: 2px;
}

.filter-bar__period-btn {
  padding: 0.3rem 0.65rem;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  color: #71717a;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.filter-bar__period-btn.active,
.filter-bar__period-btn:hover {
  background: rgba(13,101,242,0.15);
  border-color: rgba(13,101,242,0.4);
  color: #518cec;
}

.filter-bar__row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.filter-bar__input,
.filter-bar__select {
  padding: 0.3rem 0.5rem;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: #e4e4e7;
  font-size: 0.75rem;
  font-family: 'Manrope', sans-serif;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}

.filter-bar__input:focus,
.filter-bar__select:focus {
  border-color: rgba(13,101,242,0.5);
}

.filter-bar__select option {
  background: #18181b;
  color: #e4e4e7;
}

.filter-bar__sep {
  color: #52525b;
  font-size: 0.75rem;
}

.filter-bar__apply-btn {
  padding: 0.3rem 0.65rem;
  border-radius: 7px;
  background: #0d65f2;
  border: none;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.filter-bar__apply-btn:hover { background: #0b55cb; }

.filter-bar__reset-btn {
  padding: 0.3rem 0.65rem;
  border-radius: 7px;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.25);
  color: #f87171;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-bar__reset-btn:hover {
  background: rgba(239,68,68,0.2);
}

/* ── OVERVIEW STRIP ── */
.dash-overview-strip {
  padding: 1rem 1.5rem 0.25rem;
  flex-shrink: 0;
}

/* ── CONTENT AREA ── */
.dash-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem 2rem;
}

.dash-content::-webkit-scrollbar { width: 5px; }
.dash-content::-webkit-scrollbar-track { background: transparent; }
.dash-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 9999px; }

/* ── KPI CARDS GRID ── */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
}

.overview-grid--2 { grid-template-columns: repeat(2, 1fr); }
.overview-grid--3 { grid-template-columns: repeat(3, 1fr); }

@media (max-width: 1200px) { .overview-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 800px) { .overview-grid { grid-template-columns: repeat(2, 1fr); } }

.kpi-single { max-width: 220px; }

/* ── KPI CARD ── */
.kpi-card {
  background: #18181b;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 1rem 1.1rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease, border-color 0.22s;
  cursor: default;
  position: relative;
  overflow: hidden;
}

.kpi-card::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent, #0d65f2);
  opacity: 0;
  transition: opacity 0.22s;
}

.kpi-card:hover {
  transform: translateY(-3px) scale(1.015);
  box-shadow: 0 12px 32px rgba(0,0,0,0.35);
  border-color: rgba(255,255,255,0.12);
}

.kpi-card:hover::before { opacity: 1; }

.kpi-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-card__icon { font-size: 1.1rem; }

.kpi-card__badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.kpi-card__badge--up { background: rgba(13,242,97,0.12); color: #0df261; }
.kpi-card__badge--down { background: rgba(239,68,68,0.12); color: #f87171; }

.kpi-card__value {
  font-family: 'Plus Jakarta Sans', serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: #fafafa;
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin-top: 0.25rem;
}

.kpi-card__label {
  font-size: 0.7rem;
  font-weight: 500;
  color: #52525b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-card__bar {
  height: 2px;
  background: var(--accent, #0d65f2);
  width: 30%;
  border-radius: 2px;
  margin-top: 0.5rem;
  opacity: 0.6;
  transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1);
}

.kpi-card:hover .kpi-card__bar { width: 60%; opacity: 1; }

/* ── SECTION LAYOUT ── */
.section-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 900px) {
  .section-row-2 { grid-template-columns: 1fr; }
}

/* ── SECTION CARD ── */
.section-card {
  background: #18181b;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 1.25rem;
  animation: fadeUp 0.4s ease both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-card__title {
  font-family: 'Plus Jakarta Sans', serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: #71717a;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 1rem;
}

/* ── CHART TOOLTIP ── */
.chart-tooltip {
  background: #1f1f23;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-size: 0.78rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.chart-tooltip__label {
  color: #71717a;
  font-size: 0.72rem;
  margin-bottom: 0.35rem;
  font-weight: 600;
}

/* ── RANK TABLE ── */
.rank-table-wrap {
  overflow-x: auto;
  border-radius: 10px;
}

.rank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.rank-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  color: #52525b;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.rank-table td {
  padding: 0.55rem 0.75rem;
  color: #d4d4d8;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}

.rank-table tbody tr {
  animation: rowFadeIn 0.3s ease both;
  animation-delay: var(--rank-delay, 0ms);
}

@keyframes rowFadeIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

.rank-table tbody tr:hover td {
  background: rgba(255,255,255,0.03);
}

.rank-table__rank {
  color: #52525b !important;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem !important;
  width: 36px;
}

/* ── STOCK BADGE ── */
.stock-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 700;
}

.stock-badge--ok { background: rgba(13,242,97,0.12); color: #0df261; }
.stock-badge--low { background: rgba(245,158,11,0.12); color: #fbbf24; }
.stock-badge--empty { background: rgba(239,68,68,0.12); color: #f87171; }

/* ── SPINNER ── */
.dash-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.dash-spinner__ring {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.08);
  border-top-color: #0d65f2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.section-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

/* ── ERROR ── */
.dash-error {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.1rem;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px;
  color: #f87171;
  font-size: 0.82rem;
  animation: fadeUp 0.3s ease;
}

.dash-error__icon { font-size: 1rem; }

/* ── NO USER ── */
.dash-no-user {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #09090b;
}

.dash-no-user__card {
  background: #18181b;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 2.5rem 3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dash-no-user__icon { font-size: 3rem; }
.dash-no-user__card h2 { font-family: 'Plus Jakarta Sans', serif; font-weight: 700; color: #fafafa; }
.dash-no-user__card p { color: #71717a; font-size: 0.88rem; }
`;

export default Dashboard;