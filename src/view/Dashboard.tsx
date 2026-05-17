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
  ClientFinancial, StockActuel, ThemeMode,
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

// ─────────────────────────────────────────────────────────────────
// THÈME — variables CSS selon mode
// ─────────────────────────────────────────────────────────────────

const THEME_VARS: Record<ThemeMode, Record<string, string>> = {
  dark: {
    '--bg-root':       '#09090b',
    '--bg-sidebar':    '#111113',
    '--bg-card':       '#18181b',
    '--bg-hover':      'rgba(255,255,255,0.03)',
    '--border':        'rgba(255,255,255,0.07)',
    '--border-subtle': 'rgba(255,255,255,0.04)',
    '--text-primary':  '#fafafa',
    '--text-secondary':'#71717a',
    '--text-muted':    '#52525b',
    '--grid-stroke':   'rgba(255,255,255,0.06)',
    '--input-bg':      'rgba(255,255,255,0.04)',
    '--input-color':   '#e4e4e7',
    '--select-bg':     '#18181b',
    '--tooltip-bg':    '#1f1f23',
    '--brand':         '#0d65f2',
    '--brand-soft':    'rgba(13,101,242,0.15)',
    '--brand-border':  'rgba(13,101,242,0.4)',
    '--brand-text':    '#518cec',
    '--accent':        '#0df261',
    '--warning':       '#f59e0b',
    '--danger':        '#ef4444',
    '--purple':        '#8b5cf6',
    '--cyan':          '#06b6d4',
  },
  light: {
    '--bg-root':       '#f0f4ff',
    '--bg-sidebar':    '#ffffff',
    '--bg-card':       '#ffffff',
    '--bg-hover':      'rgba(13,101,242,0.04)',
    '--border':        '#e2e8f0',
    '--border-subtle': '#f1f5f9',
    '--text-primary':  '#0f172a',
    '--text-secondary':'#475569',
    '--text-muted':    '#94a3b8',
    '--grid-stroke':   'rgba(0,0,0,0.06)',
    '--input-bg':      '#f8fafc',
    '--input-color':   '#0f172a',
    '--select-bg':     '#ffffff',
    '--tooltip-bg':    '#ffffff',
    '--brand':         '#1a56db',
    '--brand-soft':    'rgba(26,86,219,0.08)',
    '--brand-border':  'rgba(26,86,219,0.3)',
    '--brand-text':    '#1a56db',
    '--accent':        '#059669',
    '--warning':       '#d97706',
    '--danger':        '#dc2626',
    '--purple':        '#7c3aed',
    '--cyan':          '#0891b2',
  },
};

const CHART_COLORS_DARK = {
  brand: '#0d65f2', accent: '#0df261', warning: '#f59e0b',
  danger: '#ef4444', purple: '#8b5cf6', cyan: '#06b6d4',
};

const CHART_COLORS_LIGHT = {
  brand: '#1a56db', accent: '#059669', warning: '#d97706',
  danger: '#dc2626', purple: '#7c3aed', cyan: '#0891b2',
};

const PIE_COLORS_DARK  = ['#0d65f2','#0df261','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
const PIE_COLORS_LIGHT = ['#1a56db','#059669','#d97706','#dc2626','#7c3aed','#0891b2'];

// ─────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS RÉUTILISABLES
// ─────────────────────────────────────────────────────────────────

const Spinner = () => (
  <div className="dash-spinner"><div className="dash-spinner__ring" /></div>
);

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="dash-error">
    <span className="dash-error__icon">⚠</span>
    <span>{message}</span>
  </div>
);

// ── KPI Card ───────────────────────────────────────────────────────MTN money
interface KpiCardProps {
  label: string;
  value: string;
  variation?: number | null;
  icon: string;
  accentVar?: string;
}

const KpiCard = ({ label, value, variation, icon, accentVar = '--brand' }: KpiCardProps) => {
  const isPositive = variation !== null && variation !== undefined && variation >= 0;
  const pct = fmtPct(variation ?? null);

  return (
    <div className="kpi-card" style={{ '--kpi-accent': `var(${accentVar})` } as React.CSSProperties}>
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
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  currency?: boolean;
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

// ── Rank Table — correctif colonnes ────────────────────────────────
// Le #N est maintenant une vraie première colonne dans headers+rows
interface RankTableProps {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  onDownload?: (rowIdx: number) => void;
  downloadLabel?: string;
}

const RankTable = ({ headers, rows, onDownload, downloadLabel = 'PDF' }: RankTableProps) => (
  <div className="rank-table-wrap">
    <table className="rank-table">
      <thead>
        <tr>
          <th className="rank-table__rank-th">#</th>
          {headers.map((h, i) => <th key={i}>{h}</th>)}
          {onDownload && <th>Rapport</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ '--rank-delay': `${i * 40}ms` } as React.CSSProperties}>
            <td className="rank-table__rank">#{i + 1}</td>
            {row.map((cell, j) => <td key={j}>{cell}</td>)}
            {onDownload && (
              <td>
                <button
                  className="rank-table__dl-btn"
                  onClick={() => onDownload(i)}
                  title={`Télécharger rapport ${downloadLabel}`}
                >
                  ⬇ PDF
                </button>
              </td>
            )}
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
  console.log()
  const ov = data.overview;
  if (error) return <ErrorBanner message={error} />;
  if (loading.overview || !ov) return <div className="section-loading"><Spinner /></div>;

  const kpis = [
    { label: "Chiffre d'Affaires",  value: fmt(ov.ca.value),           variation: ov.ca.variation,           icon: '💰', accentVar: '--brand'   },
    { label: 'Bénéfice Net',        value: fmt(ov.benefice_net.value),  variation: ov.benefice_net.variation, icon: '📈', accentVar: '--accent'  },
    { label: 'Commission Totale',   value: fmt(ov.commission.value),    variation: ov.commission.variation,   icon: '🤝', accentVar: '--warning' },
    { label: 'Nombre de Ventes',    value: fmtNum(ov.nb_ventes.value),  variation: ov.nb_ventes.variation,    icon: '🛒', accentVar: '--cyan'    },
    { label: 'PV Total',            value: fmtNum(ov.pv.value) + ' PV',variation: ov.pv.variation,           icon: '⭐', accentVar: '--purple'  },
  ];

  return (
    <div className="overview-grid">
      {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
    </div>
  );
};

// ── Financial ─────────────────────────────────────────────────────
const FinancialSection = ({ data, loading, error, theme }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
  theme: ThemeMode;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.financial) return <div className="section-loading"><Spinner /></div>;

  const C  = theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
  const tl = data.financialTimeline ?? [];
  const byOffice = data.financialByOffice ?? [];
  const byClient = data.financialByClient ?? [];

  return (
    <div className="section-col">
      <SectionCard title="Évolution CA · Bénéfice Net">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={tl}>
            <defs>
              <linearGradient id="gCA"  x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.brand}  stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.brand}  stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gBen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.accent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => fmtNum(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="ca"          name="CA"           stroke={C.brand}  fill="url(#gCA)"  strokeWidth={2} dot={false} animationDuration={800} />
            <Area type="monotone" dataKey="benefice_net" name="Bénéfice Net" stroke={C.accent} fill="url(#gBen)" strokeWidth={2} dot={false} animationDuration={1000} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="section-row-2">
        <SectionCard title="CA par Bureau">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byOffice} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => fmtNum(v)} />
              <YAxis type="category" dataKey="office" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="ca"          name="CA"           fill={C.brand}  radius={[0,6,6,0]} animationDuration={800} />
              <Bar dataKey="benefice_net" name="Bénéfice Net" fill={C.accent} radius={[0,6,6,0]} animationDuration={1000} />
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
const SalesSection = ({ data, loading, error, theme }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
  theme: ThemeMode;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.sales) return <div className="section-loading"><Spinner /></div>;

  const C          = theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
  const PIE_COLORS = theme === 'dark' ? PIE_COLORS_DARK   : PIE_COLORS_LIGHT;
  const tl         = data.salesTimeline ?? [];
  const mix        = data.salesMix;
  const topSellers = (data.topSellers  ?? []) as SellerFinancial[];
  const topProducts= (data.topProducts ?? []) as TopProduct[];
  const issue      = data.issueStats;

  return (
    <div className="section-col">
      {/* ── Métriques pending / canceled ── */}
      {issue && (
        <div className="overview-grid overview-grid--3">
          <KpiCard
            label="Ventes en attente"
            value={fmtNum(issue.pending_count)}
            icon="⏳"
            accentVar="--warning"
          />
          <KpiCard
            label="Montant en attente"
            value={fmt(issue.pending_amount)}
            icon="💸"
            accentVar="--warning"
          />
          <KpiCard
            label="Taux d'annulation"
            value={issue.canceled_count + ' (' + issue.canceled_rate + '%)'}
            icon="❌"
            accentVar="--danger"
          />
        </div>
      )}

      <div className="section-row-2">
        <SectionCard title="Ventes Validées par Période">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={tl}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.cyan} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip content={<CustomTooltip currency={false} />} />
              <Area type="monotone" dataKey="nb_ventes" name="Ventes" stroke={C.cyan} fill="url(#gSales)" strokeWidth={2} dot={false} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {mix && (
          <SectionCard title="Mix Produits vs Services (CA)">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={mix.ca} dataKey="value" nameKey="type" cx="50%" cy="50%"
                  outerRadius={80} innerRadius={50} paddingAngle={4} animationDuration={800}>
                  {mix.ca.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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
            headers={['Nom', 'CA', 'Bénéfice Net', 'PV']}
            rows={topSellers.slice(0, 8).map(s => [s.name || s.seller, fmt(s.ca), fmt(s.benefice_net), fmtNum(s.pv)])}
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
const MlmSection = ({ data, loading, error, theme }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
  theme: ThemeMode;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.mlm) return <div className="section-loading"><Spinner /></div>;

  const mlm = data.mlm;
  if (!mlm) return null;

  const C = theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  return (
    <div className="section-col">
      <div className="kpi-single">
        <KpiCard label="PV Total" value={fmtNum(mlm.total_pv) + ' PV'} icon="⭐" accentVar="--warning" />
      </div>

      <SectionCard title="Évolution PV">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={mlm.timeline}>
            <defs>
              <linearGradient id="gPV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.warning} stopOpacity={0.35} />
                <stop offset="95%" stopColor={C.warning} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip content={<CustomTooltip currency={false} />} />
            <Area type="monotone" dataKey="pv" name="PV" stroke={C.warning} fill="url(#gPV)" strokeWidth={2} dot={false} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="section-row-2">
        <SectionCard title="PV par Seller / Distributeur">
          <RankTable
            headers={['Nom', 'PV']}
            rows={mlm.by_seller.slice(0, 10).map(s => [s.name, fmtNum(s.pv)])}
          />
        </SectionCard>
        <SectionCard title="PV par Produit">
          <RankTable
            headers={['Produit', 'PV']}
            rows={mlm.by_product.slice(0, 10).map(p => [p.name, fmtNum(p.pv)])}
          />
        </SectionCard>
      </div>
    </div>
  );
};

// ── Clients ───────────────────────────────────────────────────────
const ClientsSection = ({ data, loading, error, theme }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
  theme: ThemeMode;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.clients) return <div className="section-loading"><Spinner /></div>;

  const clients = data.clients;
  if (!clients) return null;

  const C = theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  return (
    <div className="section-col">
      <div className="overview-grid overview-grid--2">
        <KpiCard label="Nouveaux Clients" value={fmtNum(clients.nouveaux_clients)} icon="🆕" accentVar="--cyan" />
        <KpiCard label="Clients Actifs"   value={fmtNum(clients.clients_actifs)}   icon="🔥" accentVar="--accent" />
      </div>

      <SectionCard title="Acquisition Clients (période)">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={clients.timeline}>
            <defs>
              <linearGradient id="gClt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.cyan} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip content={<CustomTooltip currency={false} />} />
            <Area type="monotone" dataKey="nouveaux" name="Nouveaux clients" stroke={C.cyan} fill="url(#gClt)" strokeWidth={2} dot={false} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Top Clients par CA">
        <RankTable
          headers={['Client', 'CA Total', 'Commandes']}
          rows={(clients.top_clients as ClientFinancial[]).slice(0, 10).map(c => [
            c.name || c.client, fmt(c.ca), c.nb_commandes,
          ])}
        />
      </SectionCard>
    </div>
  );
};

// ── Stock ─────────────────────────────────────────────────────────
const StockSection = ({ data, loading, error, theme }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
  theme: ThemeMode;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.stock) return <div className="section-loading"><Spinner /></div>;

  const stock = data.stock;
  if (!stock) return null;

  const C = theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
  //const varColor = stock.variation >= 0 ? C.accent : C.danger;

  return (
    <div className="section-col">
      {/* ── Valeurs stock en temps réel ── */}
      <div className="overview-grid overview-grid--2">
        <KpiCard
          label="Valeur Stock (Prix Stockiste)"
          value={fmt(stock.valeur_stock_stockiste)}
          icon="🏭"
          accentVar="--brand"
        />
        <KpiCard
          label="Valeur Stock (Prix Distributeur)"
          value={fmt(stock.valeur_stock_distributeur)}
          icon="🤝"
          accentVar="--purple"
        />
      </div>

      <div className="overview-grid overview-grid--3">
        <KpiCard label="Total Entrées"   value={fmtNum(stock.total_in)  + ' u.'} icon="📦" accentVar="--accent" />
        <KpiCard label="Total Sorties"   value={fmtNum(stock.total_out) + ' u.'} icon="📤" accentVar="--danger" />
        <KpiCard
          label="Variation Nette"
          value={(stock.variation >= 0 ? '+' : '') + fmtNum(stock.variation) + ' u.'}
          icon="↔"
          accentVar={stock.variation >= 0 ? '--accent' : '--danger'}
        />
      </div>

      <SectionCard title="Flux Stock (Entrées vs Sorties)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={stock.timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip content={<CustomTooltip currency={false} />} />
            <Legend />
            <Line type="monotone" dataKey="in"  name="Entrées" stroke={C.accent} strokeWidth={2} dot={false} animationDuration={800} />
            <Line type="monotone" dataKey="out" name="Sorties" stroke={C.danger} strokeWidth={2} dot={false} animationDuration={1000} />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Stock Actuel">
        <div className="rank-table-wrap">
          <table className="rank-table">
            <thead>
              <tr>
                <th className="rank-table__rank-th">#</th>
                <th>Produit</th><th>Bureau</th><th>Qté</th>
                <th>Pr. Stockiste</th><th>Pr. Distributeur</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {(stock.stock_actuel as StockActuel[]).map((s, i) => (
                <tr key={i} style={{ '--rank-delay': `${i * 40}ms` } as React.CSSProperties}>
                  <td className="rank-table__rank">#{i + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.office}</td>
                  <td><strong>{fmtNum(s.qte)}</strong></td>
                  <td>{s.pr_stock != null ? fmt(s.pr_stock) : '—'}</td>
                  <td>{s.pr_distr != null ? fmt(s.pr_distr) : '—'}</td>
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
// FILTER BAR
// ─────────────────────────────────────────────────────────────────

const FilterBar = ({
  filters, meta, isOwner,
  onPeriod, onCustom, onOffices, onSeller, onProduct, onPayment, onClientKind, onIssue, onReset,
}: {
  filters:      ReturnType<typeof useDashboard>['filters'];
  meta:         ReturnType<typeof useDashboard>['data']['meta'];
  isOwner:      boolean;
  onPeriod:     (p: 'today' | 'week' | 'month' | 'custom') => void;
  onCustom:     (s: string, e: string) => void;
  onOffices:    (offices: string[]) => void;
  onSeller:     (s: string) => void;
  onProduct:    (p: string) => void;
  onPayment:    (p: string) => void;
  onClientKind: (k: string) => void;
  onIssue:      (i: 'valid' | 'pending' | 'canceled') => void;
  onReset:      () => void;
}) => {
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');

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
          <input type="date" className="filter-bar__input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
          <span className="filter-bar__sep">→</span>
          <input type="date" className="filter-bar__input" value={customEnd}   onChange={e => setCustomEnd(e.target.value)} />
          <button className="filter-bar__apply-btn" onClick={() => customStart && customEnd && onCustom(customStart, customEnd)}>
            Appliquer
          </button>
        </div>
      </div>

      {isOwner && meta?.offices && (
        <div className="filter-bar__group">
          <span className="filter-bar__label">Bureau</span>
          <select className="filter-bar__select" value={filters.offices?.[0] ?? ''}
            onChange={e => onOffices(e.target.value ? [e.target.value] : [])}>
            <option value="">Tous les bureaux</option>
            {meta.offices.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
          </select>
        </div>
      )}

      {meta?.sellers && (
        <div className="filter-bar__group">
          <span className="filter-bar__label">Seller</span>
          <select className="filter-bar__select" value={filters.seller ?? ''}
            onChange={e => onSeller(e.target.value)}>
            <option value="">Tous</option>
            {meta.sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {meta?.products && (
        <div className="filter-bar__group">
          <span className="filter-bar__label">Produit</span>
          <select className="filter-bar__select" value={filters.product ?? ''}
            onChange={e => onProduct(e.target.value)}>
            <option value="">Tous</option>
            {meta.products.map(p => <option key={p.nom} value={p.nom}>{p.nom}</option>)}
          </select>
        </div>
      )}

      <div className="filter-bar__group">
        <span className="filter-bar__label">Paiement</span>
        <select className="filter-bar__select" value={filters.payment_mode ?? ''}
          onChange={e => onPayment(e.target.value)}>
          <option value="">Tous</option>
          <option value="Cash">Cash</option>
          <option value="MTN Money">MTN Money</option>
          <option value="Orange Money">Orange Money</option>
          <option value="attente_paiement">Payé par Crédit</option>
        </select>
      </div>

      <div className="filter-bar__group">
        <span className="filter-bar__label">Type client</span>
        <select className="filter-bar__select" value={filters.clientKind ?? ''}
          onChange={e => onClientKind(e.target.value)}>
          <option value="">Tous</option>
          <option value="distributor">Distributeur</option>
          <option value="client">Client Final</option>
        </select>
      </div>

      {/* Filtre issue — défaut 'valid' */}
      <div className="filter-bar__group">
        <span className="filter-bar__label">Statut vente</span>
        <select className="filter-bar__select" value={filters.issue ?? 'valid'}
          onChange={e => onIssue(e.target.value as 'valid' | 'pending' | 'canceled')}>
          <option value="valid">Validées</option>
          <option value="pending">En attente</option>
          <option value="canceled">Annulées</option>
        </select>
      </div>

      <button className="filter-bar__reset-btn" onClick={onReset}>↺ Reset</button>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────── canceled
// NAV
// ─────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: DashboardSection; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Vue Globale', icon: '◉' },
  { id: 'financial', label: 'Financier',   icon: '📊' },
  { id: 'sales',     label: 'Ventes',      icon: '🛒' },
  { id: 'mlm',       label: 'MLM / PV',    icon: '⭐' },
  { id: 'clients',   label: 'Clients',     icon: '👥' },
  { id: 'sellers',   label: 'Sellers',     icon: '🏆' },
  { id: 'offices',   label: 'Bureaux',     icon: '🏢' },
  { id: 'stock',     label: 'Stock',       icon: '📦' },
];

// ─────────────────────────────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const {
    user, filters, activeSection, data, loading, errors,
    updateFilter, setPeriod, setCustomDates, setIssueFilter, resetFilters,
    navigateTo, refresh, theme, toggleTheme, downloadReport,
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

  const C = theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  const renderSection = () => {
    const commonProps = { data, loading, theme };

    switch (activeSection) {
      case 'overview':
        return <OverviewSection {...commonProps} error={errors.overview} />;
      case 'financial':
        return <FinancialSection {...commonProps} error={errors.financial} />;
      case 'sales':
        return <SalesSection {...commonProps} error={errors.sales} />;
      case 'mlm':
        return <MlmSection {...commonProps} error={errors.mlm} />;
      case 'clients':
        return <ClientsSection {...commonProps} error={errors.clients} />;

      case 'sellers':
        return (
          <div className="section-col">
            {errors.financial && <ErrorBanner message={errors.financial} />}
            {loading.financial && <div className="section-loading"><Spinner /></div>}
            {data.financialBySeller && (
              <>
                <SectionCard title="Performance Sellers">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.financialBySeller.slice(0, 12)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => fmtNum(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="ca"          name="CA"           fill={C.brand}   radius={[6,6,0,0]} animationDuration={800} />
                      <Bar dataKey="benefice_net" name="Bénéfice Net" fill={C.accent}  radius={[6,6,0,0]} animationDuration={1000} />
                      <Bar dataKey="commission"  name="Commission"   fill={C.warning} radius={[6,6,0,0]} animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>

                <SectionCard title="Classement Complet">
                  <RankTable
                    headers={['Nom', 'CA', 'Bénéfice Net', 'Commission', 'PV']}
                    rows={data.financialBySeller.map(s => [
                      s.name || s.seller,
                      fmt(s.ca),
                      fmt(s.benefice_net),
                      fmt(s.commission),
                      fmtNum(s.pv),
                    ])}
                    onDownload={(i) => {
                      const s = data.financialBySeller![i];
                      downloadReport('seller', s.seller, s.name || s.seller);
                    }}
                    downloadLabel="seller"
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
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
                      <XAxis dataKey="office" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => fmtNum(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="ca"          name="CA"           fill={C.brand}  radius={[6,6,0,0]} animationDuration={800} />
                      <Bar dataKey="benefice_net" name="Bénéfice Net" fill={C.accent} radius={[6,6,0,0]} animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>

                <SectionCard title="Tableau Bureaux">
                  <RankTable
                    headers={['Bureau', 'CA', 'Bénéfice Net']}
                    rows={data.financialByOffice.map(o => [o.office, fmt(o.ca), fmt(o.benefice_net)])}
                    onDownload={(i) => {
                      const o = data.financialByOffice![i];
                      downloadReport('office', o.office, o.office);
                    }}
                    downloadLabel="bureau"
                  />
                </SectionCard>

                {/* Bouton de téléchargement global pour le manager */}
                {!isOwner && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      className="dl-global-btn"
                      onClick={() => downloadReport('office', user.office, user.office)}
                    >
                      ⬇ Télécharger mon rapport bureau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'stock':
        return <StockSection {...commonProps} error={errors.stock} />;
      default:
        return null;
    }
  };

  // Injecter les variables CSS du thème
  const cssVars = THEME_VARS[theme];

  return (
    <>
      <style>{getDashboardCSS(theme)}</style>
      <div
        className="dash-root"
        style={cssVars as React.CSSProperties}
      >
        {/* ── SIDEBAR ── */}
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

          <div className="dash-sidebar__bottom">
            <button className="dash-sidebar__refresh" onClick={refresh}>
              ↺ Rafraîchir
            </button>

            {/* Switch thème */}
            <button className="dash-sidebar__theme-btn" onClick={toggleTheme}>
              {theme === 'dark' ? '☀ Mode Clair' : '🌙 Mode Sombre'}
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="dash-main">
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
              onClientKind={k => updateFilter('clientKind', k || undefined)}
              onIssue={setIssueFilter}
              onReset={resetFilters}
            />
          </div>

          <div className="dash-overview-strip">
            <OverviewSection data={data} loading={loading} error={errors.overview}  />
          </div>

          <div className="dash-content">
            {renderSection()}
          </div>
        </main>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────
// CSS — génération dynamique selon le thème
// ─────────────────────────────────────────────────────────────────

function getDashboardCSS(theme: ThemeMode): string {
  const isLight = theme === 'light';

  return `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

/* ── ROOT ── */
.dash-root {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--bg-root);
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  transition: background 0.3s ease, color 0.3s ease;
}

/* ── SIDEBAR ── */
.dash-sidebar {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  padding: 1.5rem 0 1rem;
  overflow-y: auto;
  transition: background 0.3s ease;
  ${isLight ? 'box-shadow: 2px 0 12px rgba(0,0,0,0.06);' : ''}
}

.dash-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.dash-sidebar__logo {
  font-size: 1.75rem;
  color: var(--brand);
  line-height: 1;
}

.dash-sidebar__app-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.dash-sidebar__user-name {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.dash-sidebar__role-badge {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 1rem 1.25rem 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--brand-soft);
  border: 1px solid var(--brand-border);
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--brand-text);
}

.dash-sidebar__office {
  font-size: 0.7rem;
  color: var(--text-secondary);
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
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
  position: relative;
  font-family: 'Manrope', sans-serif;
}

.dash-nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dash-nav-item.active {
  background: var(--brand-soft);
  color: var(--brand-text);
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
  background: var(--brand);
  border-radius: 3px 0 0 3px;
}

.dash-sidebar__bottom {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem 0;
  border-top: 1px solid var(--border);
  margin-top: 0.5rem;
}

.dash-sidebar__refresh,
.dash-sidebar__theme-btn {
  padding: 0.55rem;
  border-radius: 10px;
  background: ${isLight ? 'var(--bg-root)' : 'rgba(255,255,255,0.04)'};
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.18s;
  font-family: 'Manrope', sans-serif;
  font-weight: 500;
}

.dash-sidebar__refresh:hover,
.dash-sidebar__theme-btn:hover {
  background: var(--brand-soft);
  color: var(--brand-text);
  border-color: var(--brand-border);
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
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  min-height: 60px;
  overflow-x: auto;
  flex-shrink: 0;
  ${isLight ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.04);' : ''}
}

.dash-topbar__title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
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
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.filter-bar__periods { display: flex; gap: 2px; }

.filter-bar__period-btn {
  padding: 0.3rem 0.65rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  font-family: 'Manrope', sans-serif;
}

.filter-bar__period-btn.active,
.filter-bar__period-btn:hover {
  background: var(--brand-soft);
  border-color: var(--brand-border);
  color: var(--brand-text);
}

.filter-bar__row { display: flex; align-items: center; gap: 0.35rem; }

.filter-bar__input,
.filter-bar__select {
  padding: 0.3rem 0.5rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--input-color);
  font-size: 0.75rem;
  font-family: 'Manrope', sans-serif;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}

.filter-bar__input:focus,
.filter-bar__select:focus { border-color: var(--brand-border); }

.filter-bar__select option {
  background: var(--select-bg);
  color: var(--input-color);
}

.filter-bar__sep { color: var(--text-muted); font-size: 0.75rem; }

.filter-bar__apply-btn {
  padding: 0.3rem 0.65rem;
  border-radius: 7px;
  background: var(--brand);
  border: none;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
  font-family: 'Manrope', sans-serif;
}
.filter-bar__apply-btn:hover { opacity: 0.88; }

.filter-bar__reset-btn {
  padding: 0.3rem 0.65rem;
  border-radius: 7px;
  background: ${isLight ? 'rgba(220,38,38,0.06)' : 'rgba(239,68,68,0.12)'};
  border: 1px solid ${isLight ? 'rgba(220,38,38,0.2)' : 'rgba(239,68,68,0.25)'};
  color: var(--danger);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: 'Manrope', sans-serif;
}
.filter-bar__reset-btn:hover { opacity: 0.8; }

/* ── OVERVIEW STRIP ── */
.dash-overview-strip { padding: 1rem 1.5rem 0.25rem; flex-shrink: 0; }

/* ── CONTENT AREA ── */
.dash-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem 2rem;
}
.dash-content::-webkit-scrollbar { width: 5px; }
.dash-content::-webkit-scrollbar-track { background: transparent; }
.dash-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 9999px; }

/* ── KPI CARDS GRID ── */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}
.overview-grid--2 { grid-template-columns: repeat(2, 1fr); }
.overview-grid--3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 1200px) { .overview-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 800px)  { .overview-grid { grid-template-columns: repeat(2, 1fr); } }
.kpi-single { max-width: 220px; }

/* ── KPI CARD ── */
.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem 1.1rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease, border-color 0.22s;
  cursor: default;
  position: relative;
  overflow: hidden;
  ${isLight ? 'box-shadow: 0 1px 4px rgba(0,0,0,0.06);' : ''}
}

.kpi-card::before {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--kpi-accent, var(--brand));
  opacity: 0;
  transition: opacity 0.22s;
}

.kpi-card:hover {
  transform: translateY(-3px) scale(1.015);
  box-shadow: 0 12px 32px rgba(0,0,0,${isLight ? '0.1' : '0.35'});
  border-color: var(--kpi-accent, var(--brand));
}
.kpi-card:hover::before { opacity: 1; }

.kpi-card__header { display: flex; align-items: center; justify-content: space-between; }
.kpi-card__icon { font-size: 1.1rem; }

.kpi-card__badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}
.kpi-card__badge--up   { background: ${isLight ? 'rgba(5,150,105,0.1)' : 'rgba(13,242,97,0.12)'}; color: var(--accent); }
.kpi-card__badge--down { background: ${isLight ? 'rgba(220,38,38,0.08)' : 'rgba(239,68,68,0.12)'}; color: var(--danger); }

.kpi-card__value {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin-top: 0.25rem;
}

.kpi-card__label {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-card__bar {
  height: 2px;
  background: var(--kpi-accent, var(--brand));
  width: 30%;
  border-radius: 2px;
  margin-top: 0.5rem;
  opacity: 0.6;
  transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1);
}
.kpi-card:hover .kpi-card__bar { width: 60%; opacity: 1; }

/* ── SECTION LAYOUT ── */
.section-col { display: flex; flex-direction: column; gap: 1rem; }
.section-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 900px) { .section-row-2 { grid-template-columns: 1fr; } }

/* ── SECTION CARD ── */
.section-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem;
  animation: fadeUp 0.4s ease both;
  transition: background 0.3s ease;
  ${isLight ? 'box-shadow: 0 1px 4px rgba(0,0,0,0.06);' : ''}
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.section-card__title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 1rem;
}

/* ── CHART TOOLTIP ── */
.chart-tooltip {
  background: var(--tooltip-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-size: 0.78rem;
  box-shadow: 0 8px 24px rgba(0,0,0,${isLight ? '0.12' : '0.4'});
  color: var(--text-primary);
}
.chart-tooltip__label {
  color: var(--text-secondary);
  font-size: 0.72rem;
  margin-bottom: 0.35rem;
  font-weight: 600;
}

/* ── RANK TABLE ── */
.rank-table-wrap { overflow-x: auto; border-radius: 10px; }

.rank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.rank-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
  background: ${isLight ? 'var(--bg-root)' : 'transparent'};
}

.rank-table__rank-th {
  width: 36px;
  text-align: center !important;
}

.rank-table td {
  padding: 0.55rem 0.75rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.15s;
}

.rank-table tbody tr {
  animation: rowFadeIn 0.3s ease both;
  animation-delay: var(--rank-delay, 0ms);
}

@keyframes rowFadeIn {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}

.rank-table tbody tr:hover td {
  background: var(--bg-hover);
}

.rank-table__rank {
  color: var(--text-muted) !important;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem !important;
  width: 36px;
  text-align: center;
}

/* ── DOWNLOAD BUTTON in table ── */
.rank-table__dl-btn {
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  background: var(--brand-soft);
  border: 1px solid var(--brand-border);
  color: var(--brand-text);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Manrope', sans-serif;
  white-space: nowrap;
}
.rank-table__dl-btn:hover { opacity: 0.8; }

/* ── GLOBAL DOWNLOAD BTN ── */
.dl-global-btn {
  padding: 0.45rem 1rem;
  border-radius: 9px;
  background: var(--brand);
  border: none;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: 'Manrope', sans-serif;
}
.dl-global-btn:hover { opacity: 0.88; }

/* ── STOCK BADGE ── */
.stock-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 700;
}
.stock-badge--ok    { background: ${isLight ? 'rgba(5,150,105,0.1)' : 'rgba(13,242,97,0.12)'}; color: var(--accent); }
.stock-badge--low   { background: ${isLight ? 'rgba(217,119,6,0.1)' : 'rgba(245,158,11,0.12)'}; color: var(--warning); }
.stock-badge--empty { background: ${isLight ? 'rgba(220,38,38,0.08)' : 'rgba(239,68,68,0.12)'}; color: var(--danger); }

/* ── SPINNER ── */
.dash-spinner { display: flex; align-items: center; justify-content: center; padding: 2rem; }
.dash-spinner__ring {
  width: 36px; height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.section-loading { display: flex; align-items: center; justify-content: center; min-height: 200px; }

/* ── ERROR ── */
.dash-error {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 1.1rem;
  background: ${isLight ? 'rgba(220,38,38,0.06)' : 'rgba(239,68,68,0.08)'};
  border: 1px solid ${isLight ? 'rgba(220,38,38,0.2)' : 'rgba(239,68,68,0.2)'};
  border-radius: 10px;
  color: var(--danger);
  font-size: 0.82rem;
  animation: fadeUp 0.3s ease;
}
.dash-error__icon { font-size: 1rem; }

/* ── NO USER ── */
.dash-no-user { display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg-root); }
.dash-no-user__card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2.5rem 3rem;
  text-align: center;
  display: flex; flex-direction: column; gap: 0.75rem;
}
.dash-no-user__icon { font-size: 3rem; }
.dash-no-user__card h2 { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; color: var(--text-primary); }
.dash-no-user__card p  { color: var(--text-secondary); font-size: 0.88rem; }
`;
}

export default Dashboard;