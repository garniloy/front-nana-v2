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
  ClientFinancial, StockActuel, ThemeMode, CashoutEntry,
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
// THÈME
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

const MOTIF_COLORS_DARK  = ['#f59e0b','#ef4444','#8b5cf6','#06b6d4','#0df261','#0d65f2','#f97316','#ec4899'];
const MOTIF_COLORS_LIGHT = ['#d97706','#dc2626','#7c3aed','#0891b2','#059669','#1a56db','#ea580c','#db2777'];

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

const SectionCard = ({ title, children, className = '' }: {
  title: string; children: React.ReactNode; className?: string;
}) => (
  <div className={`section-card ${className}`}>
    <div className="section-card__title">{title}</div>
    {children}
  </div>
);

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

const OverviewSection = ({ data, loading, error }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
}) => {
  const ov = data.overview;
  if (error) return <ErrorBanner message={error} />;
  if (loading.overview || !ov) return <div className="section-loading"><Spinner /></div>;

  const kpis = [
    { label: "Chiffre d'Affaires",      value: fmt(ov.ca.value),                        variation: ov.ca.variation,                        icon: '💰', accentVar: '--brand'   },
    { label: 'Bénéfice Brut',           value: fmt(ov.benefice_net.value),              variation: ov.benefice_net.variation,              icon: '📈', accentVar: '--accent'  },
    { label: 'Total Charges',           value: fmt(ov.total_charges?.value ?? 0),       variation: null,                                   icon: '📉', accentVar: '--danger'  },
    { label: 'Bénéfice Net (- charges)',value: fmt(ov.benefice_apres_charges?.value ?? 0), variation: null,                               icon: '✅', accentVar: '--purple'  },
    { label: 'Commission Totale',       value: fmt(ov.commission.value),                variation: ov.commission.variation,                icon: '🤝', accentVar: '--warning' },
    { label: 'Nombre de Ventes',        value: fmtNum(ov.nb_ventes.value),              variation: ov.nb_ventes.variation,                 icon: '🛒', accentVar: '--cyan'    },
    { label: 'PV Total',                value: fmtNum(ov.pv.value) + ' PV',            variation: ov.pv.variation,                        icon: '⭐', accentVar: '--brand'   },
  ];

  return (
    <div className="overview-grid overview-grid--7">
      {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
    </div>
  );
};

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
      <SectionCard title="Évolution CA · Bénéfice Brut">
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
            <Area type="monotone" dataKey="ca"           name="CA"           stroke={C.brand}  fill="url(#gCA)"  strokeWidth={2} dot={false} animationDuration={800} />
            <Area type="monotone" dataKey="benefice_net" name="Bénéfice Brut" stroke={C.accent} fill="url(#gBen)" strokeWidth={2} dot={false} animationDuration={1000} />
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
              <Bar dataKey="ca"           name="CA"           fill={C.brand}  radius={[0,6,6,0]} animationDuration={800} />
              <Bar dataKey="benefice_net" name="Bénéfice Brut" fill={C.accent} radius={[0,6,6,0]} animationDuration={1000} />
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
      {issue && (
        <div className="overview-grid overview-grid--3">
          <KpiCard label="Ventes en attente"  value={fmtNum(issue.pending_count)}  icon="⏳" accentVar="--warning" />
          <KpiCard label="Montant en attente" value={fmt(issue.pending_amount)}    icon="💸" accentVar="--warning" />
          <KpiCard label="Taux d'annulation"  value={issue.canceled_count + ' (' + issue.canceled_rate + '%)'}  icon="❌" accentVar="--danger" />
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
            headers={['Nom', 'CA', 'Bénéfice Brut', 'PV']}
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

  return (
    <div className="section-col">
      <div className="overview-grid overview-grid--2">
        <KpiCard label="Valeur Stock (Prix Stockiste)"     value={fmt(stock.valeur_stock_stockiste)}    icon="🏭" accentVar="--brand"  />
        <KpiCard label="Valeur Stock (Prix Distributeur)"  value={fmt(stock.valeur_stock_distributeur)} icon="🤝" accentVar="--purple" />
      </div>

      <div className="overview-grid overview-grid--3">
        <KpiCard label="Total Entrées" value={fmtNum(stock.total_in)  + ' u.'} icon="📦" accentVar="--accent" />
        <KpiCard label="Total Sorties" value={fmtNum(stock.total_out) + ' u.'} icon="📤" accentVar="--danger" />
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
// Analytics
const ChargesSection = ({ data, loading, error, theme }: {
  data: ReturnType<typeof useDashboard>['data'];
  loading: ReturnType<typeof useDashboard>['loading'];
  error: string | null;
  theme: ThemeMode;
}) => {
  if (error) return <ErrorBanner message={error} />;
  if (loading.cashout) return <div className="section-loading"><Spinner /></div>;

  const cashout = data.cashout;
  if (!cashout) return null;

  const C           = theme === 'dark' ? CHART_COLORS_DARK  : CHART_COLORS_LIGHT;
  const MOTIF_COLS  = theme === 'dark' ? MOTIF_COLORS_DARK  : MOTIF_COLORS_LIGHT;

  const pieData = cashout.by_motif.map(m => ({ name: m.motif, value: m.total }));

  return (
    <div className="section-col">
      <div className="overview-grid overview-grid--3">
        <KpiCard
          label="Total Charges"
          value={fmt(cashout.total_charges)}
          icon="📉"
          accentVar="--danger"
        />
        <KpiCard
          label="Nombre d'entrées"
          value={fmtNum(cashout.nb_charges)}
          icon="📋"
          accentVar="--warning"
        />
        <KpiCard
          label="Charge moyenne / entrée"
          value={cashout.nb_charges > 0 ? fmt(cashout.total_charges / cashout.nb_charges) : '—'}
          icon="⚖️"
          accentVar="--purple"
        />
      </div>

      <SectionCard title="Évolution Globale des Charges">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={cashout.timeline}>
            <defs>
              <linearGradient id="gCharges" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={C.danger} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.danger} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => fmtNum(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              name="Charges totales"
              stroke={C.danger}
              fill="url(#gCharges)"
              strokeWidth={2}
              dot={false}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="section-row-2">
        <SectionCard title="Évolution par Motif de Charge">
          {cashout.timeline_by_motif.length > 0 && cashout.motifs.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={cashout.timeline_by_motif}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={v => fmtNum(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                {cashout.motifs.map((motif, i) => (
                  <Line
                    key={motif}
                    type="monotone"
                    dataKey={motif}
                    name={motif}
                    stroke={MOTIF_COLS[i % MOTIF_COLS.length]}
                    strokeWidth={2}
                    dot={false}
                    animationDuration={800 + i * 150}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="charges-empty">Aucune donnée pour la période</div>
          )}
        </SectionCard>

        <SectionCard title="Répartition par Motif">
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={75} innerRadius={42}
                    paddingAngle={4}
                    animationDuration={800}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={MOTIF_COLS[i % MOTIF_COLS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="charges-motif-list">
                {cashout.by_motif.map((m, i) => (
                  <div key={m.motif} className="charges-motif-row">
                    <span
                      className="charges-motif-dot"
                      style={{ background: MOTIF_COLS[i % MOTIF_COLS.length] }}
                    />
                    <span className="charges-motif-name">{m.motif}</span>
                    <span className="charges-motif-count">{m.count}×</span>
                    <span className="charges-motif-total">{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="charges-empty">Aucune charge pour la période</div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Détail des Charges">
        <div className="rank-table-wrap">
          <table className="rank-table">
            <thead>
              <tr>
                <th className="rank-table__rank-th">#</th>
                <th>Date</th>
                <th>Motif</th>
                <th>Bureau</th>
                <th>Manager</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {(cashout.list as CashoutEntry[]).map((c, i) => (
                <tr key={c.id} style={{ '--rank-delay': `${i * 30}ms` } as React.CSSProperties}>
                  <td className="rank-table__rank">#{i + 1}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                  <td><strong>{c.motif || '—'}</strong></td>
                  <td>{c.office || '—'}</td>
                  <td>{c.manager || '—'}</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    {fmt(c.montant)}
                  </td>
                  <td>
                    <span className={`stock-badge ${c.is_paid ? 'stock-badge--ok' : 'stock-badge--low'}`}>
                      {c.is_paid ? 'Payé' : 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
              {cashout.list.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                    Aucune charge enregistrée pour la période
                  </td>
                </tr>
              )}
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="filter-bar">
      {/* Mobile: toggle button */}
      <button
        className="filter-bar__mobile-toggle"
        onClick={() => setFiltersOpen(v => !v)}
        aria-label="Filtres"
      >
        ⚙ Filtres {filtersOpen ? '▲' : '▼'}
      </button>

      <div className={`filter-bar__inner ${filtersOpen ? 'filter-bar__inner--open' : ''}`}>
        <div className="filter-bar__group">
          <span className="filter-bar__label">Période</span>
          <div className="filter-bar__periods">
            {(['today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                className={`filter-bar__period-btn ${filters.period === p ? 'active' : ''}`}
                onClick={() => onPeriod(p)}
              >
                {p === 'today' ? "Auj." : p === 'week' ? 'Sem.' : 'Mois'}
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
              OK
            </button>
          </div>
        </div>

        {isOwner && meta?.offices && (
          <div className="filter-bar__group">
            <span className="filter-bar__label">Bureau</span>
            <select className="filter-bar__select" value={filters.offices?.[0] ?? ''}
              onChange={e => onOffices(e.target.value ? [e.target.value] : [])}>
              <option value="">Tous</option>
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
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: DashboardSection; label: string; icon: string; ownerOnly?: boolean }[] = [
  { id: 'overview',  label: 'Vue Globale', icon: '◉' },
  { id: 'financial', label: 'Financier',   icon: '📊' },
  { id: 'sales',     label: 'Ventes',      icon: '🛒' },
  { id: 'mlm',       label: 'MLM / PV',    icon: '⭐' },
  { id: 'clients',   label: 'Clients',     icon: '👥' },
  { id: 'sellers',   label: 'Sellers',     icon: '🏆' },
  { id: 'offices',   label: 'Bureaux',     icon: '🏢' },
  { id: 'stock',     label: 'Stock',       icon: '📦' },
  { id: 'charges',   label: 'Charges',     icon: '📉' },
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

  // ── Sidebar collapse state ──
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // ── Mobile drawer state ──
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const handleNavItem = (id: DashboardSection) => {
    navigateTo(id);
    setMobileNavOpen(false); // close drawer on mobile after selection
  };

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
      case 'charges':
        return <ChargesSection {...commonProps} error={errors.cashout} />;

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
                      <Bar dataKey="ca"           name="CA"           fill={C.brand}   radius={[6,6,0,0]} animationDuration={800} />
                      <Bar dataKey="benefice_net" name="Bénéfice Brut" fill={C.accent}  radius={[6,6,0,0]} animationDuration={1000} />
                      <Bar dataKey="commission"   name="Commission"   fill={C.warning} radius={[6,6,0,0]} animationDuration={1200} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>

                <SectionCard title="Classement Complet">
                  <RankTable
                    headers={['Nom', 'CA', 'Bénéfice Brut', 'Commission', 'PV']}
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
                      <Bar dataKey="ca"           name="CA"           fill={C.brand}  radius={[6,6,0,0]} animationDuration={800} />
                      <Bar dataKey="benefice_net" name="Bénéfice Brut" fill={C.accent} radius={[6,6,0,0]} animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>

                <SectionCard title="Tableau Bureaux">
                  <RankTable
                    headers={['Bureau', 'CA', 'Bénéfice Brut']}
                    rows={data.financialByOffice.map(o => [o.office, fmt(o.ca), fmt(o.benefice_net)])}
                    onDownload={(i) => {
                      const o = data.financialByOffice![i];
                      downloadReport('office', o.office, o.office);
                    }}
                    downloadLabel="bureau"
                  />
                </SectionCard>

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

  const cssVars = THEME_VARS[theme];

  return (
    <>
      <style>{getDashboardCSS(theme)}</style>
      <div
        className={`dash-root ${sidebarCollapsed ? 'dash-root--collapsed' : ''} ${mobileNavOpen ? 'dash-root--nav-open' : ''}`}
        style={cssVars as React.CSSProperties}
      >
        {/* ── MOBILE OVERLAY ── */}
        {mobileNavOpen && (
          <div
            className="dash-mobile-overlay"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside className={`dash-sidebar ${sidebarCollapsed ? 'dash-sidebar--collapsed' : ''} ${mobileNavOpen ? 'dash-sidebar--mobile-open' : ''}`}>
          <div className="dash-sidebar__brand">
            {!sidebarCollapsed && (
              <div className="dash-sidebar__logo" onClick={() => window.history.back()}
              >◈</div>
            )}
            {!sidebarCollapsed && (
              <div>
                <div className="dash-sidebar__app-name">Analytics</div>
                <div className="dash-sidebar__user-name">{user.name}</div>
              </div>
            )}
            {/* Collapse toggle button */}
            <button
              className="dash-sidebar__collapse-btn"
              onClick={() => setSidebarCollapsed(v => !v)}
              aria-label={sidebarCollapsed ? 'Déployer le menu' : 'Réduire le menu'}
              title={sidebarCollapsed ? 'Déployer' : 'Réduire'}
            >
              {sidebarCollapsed ? '›' : '‹'}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="dash-sidebar__role-badge">
              {isOwner ? '👑 Owner' : '🏢 Manager'}
              {!isOwner && <span className="dash-sidebar__office">{user.office}</span>}
            </div>
          )}

          <nav className="dash-sidebar__nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`dash-nav-item ${activeSection === item.id ? 'active' : ''} ${item.id === 'charges' ? 'dash-nav-item--charges' : ''}`}
                onClick={() => handleNavItem(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="dash-nav-item__icon">{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="dash-nav-item__label">{item.label}</span>
                )}
                {activeSection === item.id && <span className="dash-nav-item__indicator" />}
              </button>
            ))}
          </nav>

          <div className="dash-sidebar__bottom">
            <button
              className="dash-sidebar__refresh"
              onClick={refresh}
              title={sidebarCollapsed ? 'Rafraîchir' : undefined}
            >
              {sidebarCollapsed ? '↺' : '↺ Rafraîchir'}
            </button>
            <button
              className="dash-sidebar__theme-btn"
              onClick={toggleTheme}
              title={sidebarCollapsed ? (theme === 'dark' ? 'Mode Clair' : 'Mode Sombre') : undefined}
            >
              {sidebarCollapsed
                ? (theme === 'dark' ? '☀' : '🌙')
                : (theme === 'dark' ? '☀ Mode Clair' : '🌙 Mode Sombre')
              }
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="dash-main">
          {/* ── MOBILE TOPBAR ── */}
          <div className="dash-mobile-topbar">
            <div className="dash-mobile-topbar__row1">
              <button
                className="dash-mobile-topbar__menu-btn"
                onClick={() => setMobileNavOpen(v => !v)}
                aria-label="Menu"
              >
                ☰
              </button>
              <div className="dash-mobile-topbar__title">
                {NAV_ITEMS.find(n => n.id === activeSection)?.icon}{' '}
                {NAV_ITEMS.find(n => n.id === activeSection)?.label}
              </div>
              <button
                className="dash-mobile-topbar__theme-btn"
                onClick={toggleTheme}
                aria-label="Thème"
              >
                {theme === 'dark' ? '☀' : '🌙'}
              </button>
            </div>
            <div className="dash-mobile-topbar__filters">
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
          </div>

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
            <OverviewSection data={data} loading={loading} error={errors.overview} />
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
// CSS
// ─────────────────────────────────────────────────────────────────

function getDashboardCSS(theme: ThemeMode): string {
  const isLight = theme === 'light';

  return `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Manrope:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

/* ── ROOT ── */
.dash-root {
  display: flex;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
  background: var(--bg-root);
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  transition: background 0.3s ease, color 0.3s ease;
  position: relative;
}

/* ── SIDEBAR BASE ── */
.dash-sidebar {
  width: 220px;
  min-width: 220px;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  padding: 1.25rem 0 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1), background 0.3s ease;
  flex-shrink: 0;
  ${isLight ? 'box-shadow: 2px 0 12px rgba(0,0,0,0.06);' : ''}
  scrollbar-width: none;
}
.dash-sidebar::-webkit-scrollbar { display: none; }

/* ── SIDEBAR COLLAPSED (desktop) ── */
.dash-sidebar--collapsed {
  width: 60px;
  min-width: 60px;
}

/* ── SIDEBAR BRAND ── */
.dash-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0 0.85rem 1.25rem;
  border-bottom: 1px solid var(--border);
  position: relative;
  min-height: 52px;
}

.dash-sidebar--collapsed .dash-sidebar__brand {
  padding: 0 0 1rem;
  justify-content: center;
  flex-direction: column;
  gap: 0.5rem;
}

.dash-sidebar__logo {
  font-size: 2Srem;
  color: var(--brand);
  line-height: 1;
  flex-shrink: 0;
}
.dash-sidebar__logo:hover {
  cursor: pointer;
  opacity: 0.85;
  transform: scale(1.05);
}

.dash-sidebar__app-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.dash-sidebar__user-name {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

/* ── COLLAPSE BUTTON ── */
.dash-sidebar__collapse-btn {
  margin-left: auto;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: ${isLight ? 'var(--bg-root)' : 'rgba(255,255,255,0.06)'};
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
  font-family: monospace;
}
.dash-sidebar__collapse-btn:hover {
  background: var(--brand-soft);
  color: var(--brand-text);
  border-color: var(--brand-border);
}
.dash-sidebar--collapsed .dash-sidebar__collapse-btn {
  margin-left: 0;
}

/* ── ROLE BADGE ── */
.dash-sidebar__role-badge {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0.85rem 0.85rem 0.65rem;
  padding: 0.5rem 0.75rem;
  background: var(--brand-soft);
  border: 1px solid var(--brand-border);
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--brand-text);
  white-space: normal;
  word-break: break-word;
}

.dash-sidebar__office {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 400;
  word-break: break-all;
}

/* ── NAV ── */
.dash-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.4rem 0.5rem;
  flex: 1;
}

.dash-nav-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.6rem 0.65rem;
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
  white-space: nowrap;
  overflow: hidden;
}

.dash-sidebar--collapsed .dash-nav-item {
  justify-content: center;
  padding: 0.65rem;
  gap: 0;
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

.dash-nav-item--charges:hover,
.dash-nav-item--charges.active {
  background: ${isLight ? 'rgba(220,38,38,0.06)' : 'rgba(239,68,68,0.1)'};
  color: var(--danger);
}
.dash-nav-item--charges.active .dash-nav-item__indicator {
  background: var(--danger);
}

.dash-nav-item__icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.dash-nav-item__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

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

/* ── SIDEBAR BOTTOM ── */
.dash-sidebar__bottom {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.65rem 0.5rem 0;
  border-top: 1px solid var(--border);
  margin-top: 0.5rem;
}

.dash-sidebar__refresh,
.dash-sidebar__theme-btn {
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  background: ${isLight ? 'var(--bg-root)' : 'rgba(255,255,255,0.04)'};
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.18s;
  font-family: 'Manrope', sans-serif;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dash-sidebar--collapsed .dash-sidebar__refresh,
.dash-sidebar--collapsed .dash-sidebar__theme-btn {
  text-align: center;
  font-size: 1rem;
  padding: 0.5rem;
}

.dash-sidebar__refresh:hover,
.dash-sidebar__theme-btn:hover {
  background: var(--brand-soft);
  color: var(--brand-text);
  border-color: var(--brand-border);
}

/* ── MOBILE OVERLAY ── */
.dash-mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 99;
  backdrop-filter: blur(2px);
}

/* ── MOBILE TOP BAR ── */
.dash-mobile-topbar {
  display: none;
  flex-direction: column;
  gap: 0;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 10;
  ${isLight ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.06);' : ''}
}

.dash-mobile-topbar__row1 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
}

.dash-mobile-topbar__filters {
  padding: 0 1rem 0.65rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.55rem;
}

.dash-mobile-topbar__menu-btn,
.dash-mobile-topbar__theme-btn {
  padding: 0.45rem 0.65rem;
  border-radius: 9px;
  background: ${isLight ? 'var(--bg-root)' : 'rgba(255,255,255,0.06)'};
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  flex-shrink: 0;
  line-height: 1;
}

.dash-mobile-topbar__title {
  flex: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── MAIN ── */
.dash-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ── DESKTOP TOPBAR ── */
.dash-topbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem 1.25rem;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  min-height: 56px;
  overflow-x: auto;
  flex-shrink: 0;
  ${isLight ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.04);' : ''}
  scrollbar-width: none;
}
.dash-topbar::-webkit-scrollbar { display: none; }

.dash-topbar__title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
  white-space: nowrap;
  min-width: max-content;
}

/* ── FILTER BAR ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: nowrap;
  overflow-x: auto;
  flex: 1;
  scrollbar-width: none;
}
.filter-bar::-webkit-scrollbar { display: none; }

/* Mobile toggle hidden on desktop */
.filter-bar__mobile-toggle {
  display: none;
}

.filter-bar__inner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: nowrap;
}

.filter-bar__group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.filter-bar__label {
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.filter-bar__periods { display: flex; gap: 2px; }

.filter-bar__period-btn {
  padding: 0.28rem 0.55rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.72rem;
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

.filter-bar__row { display: flex; align-items: center; gap: 0.3rem; }

.filter-bar__input,
.filter-bar__select {
  padding: 0.28rem 0.45rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--input-color);
  font-size: 0.72rem;
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

.filter-bar__sep { color: var(--text-muted); font-size: 0.72rem; }

.filter-bar__apply-btn {
  padding: 0.28rem 0.55rem;
  border-radius: 7px;
  background: var(--brand);
  border: none;
  color: white;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
  font-family: 'Manrope', sans-serif;
}
.filter-bar__apply-btn:hover { opacity: 0.88; }

.filter-bar__reset-btn {
  padding: 0.28rem 0.55rem;
  border-radius: 7px;
  background: ${isLight ? 'rgba(220,38,38,0.06)' : 'rgba(239,68,68,0.12)'};
  border: 1px solid ${isLight ? 'rgba(220,38,38,0.2)' : 'rgba(239,68,68,0.25)'};
  color: var(--danger);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: 'Manrope', sans-serif;
}
.filter-bar__reset-btn:hover { opacity: 0.8; }

/* ── OVERVIEW STRIP ── */
.dash-overview-strip {
  padding: 0.85rem 1.25rem 0.2rem;
  flex-shrink: 0;
}

/* ── CONTENT AREA ── */
.dash-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem 1.25rem 2rem;
  -webkit-overflow-scrolling: touch;
}
.dash-content::-webkit-scrollbar { width: 4px; }
.dash-content::-webkit-scrollbar-track { background: transparent; }
.dash-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 9999px; }

/* ── KPI GRIDS ── */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.65rem;
}
.overview-grid--2 { grid-template-columns: repeat(2, 1fr); }
.overview-grid--3 { grid-template-columns: repeat(3, 1fr); }
.overview-grid--7 { grid-template-columns: repeat(7, 1fr); }

/* ── KPI CARD ── */
.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.85rem 0.95rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
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
.kpi-card__icon { font-size: 1rem; }

.kpi-card__badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.12rem 0.4rem;
  border-radius: 6px;
}
.kpi-card__badge--up   { background: ${isLight ? 'rgba(5,150,105,0.1)' : 'rgba(13,242,97,0.12)'}; color: var(--accent); }
.kpi-card__badge--down { background: ${isLight ? 'rgba(220,38,38,0.08)' : 'rgba(239,68,68,0.12)'}; color: var(--danger); }

.kpi-card__value {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin-top: 0.2rem;
}

.kpi-card__label {
  font-size: 0.67rem;
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
  margin-top: 0.4rem;
  opacity: 0.6;
  transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1);
}
.kpi-card:hover .kpi-card__bar { width: 60%; opacity: 1; }
.kpi-single { max-width: 220px; }

/* ── SECTION LAYOUT ── */
.section-col { display: flex; flex-direction: column; gap: 0.85rem; }
.section-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }

/* ── SECTION CARD ── */
.section-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.1rem;
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
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 0.9rem;
}

/* ── CHART TOOLTIP ── */
.chart-tooltip {
  background: var(--tooltip-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 0.85rem;
  font-size: 0.76rem;
  box-shadow: 0 8px 24px rgba(0,0,0,${isLight ? '0.12' : '0.4'});
  color: var(--text-primary);
}
.chart-tooltip__label {
  color: var(--text-secondary);
  font-size: 0.7rem;
  margin-bottom: 0.3rem;
  font-weight: 600;
}

/* ── RANK TABLE ── */
.rank-table-wrap { overflow-x: auto; border-radius: 10px; -webkit-overflow-scrolling: touch; }

.rank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.rank-table th {
  text-align: left;
  padding: 0.45rem 0.65rem;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.67rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
  background: ${isLight ? 'var(--bg-root)' : 'transparent'};
  white-space: nowrap;
}

.rank-table__rank-th {
  width: 32px;
  text-align: center !important;
}

.rank-table td {
  padding: 0.5rem 0.65rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.15s;
  white-space: nowrap;
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
  font-size: 0.68rem !important;
  width: 32px;
  text-align: center;
}

/* ── DOWNLOAD BUTTON ── */
.rank-table__dl-btn {
  padding: 0.18rem 0.5rem;
  border-radius: 6px;
  background: var(--brand-soft);
  border: 1px solid var(--brand-border);
  color: var(--brand-text);
  font-size: 0.68rem;
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
  padding: 0.13rem 0.45rem;
  border-radius: 6px;
  font-size: 0.66rem;
  font-weight: 700;
  white-space: nowrap;
}
.stock-badge--ok    { background: ${isLight ? 'rgba(5,150,105,0.1)' : 'rgba(13,242,97,0.12)'}; color: var(--accent); }
.stock-badge--low   { background: ${isLight ? 'rgba(217,119,6,0.1)' : 'rgba(245,158,11,0.12)'}; color: var(--warning); }
.stock-badge--empty { background: ${isLight ? 'rgba(220,38,38,0.08)' : 'rgba(239,68,68,0.12)'}; color: var(--danger); }

/* ── CHARGES SECTION ── */
.charges-motif-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-subtle);
}
.charges-motif-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.76rem;
}
.charges-motif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.charges-motif-name {
  flex: 1;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.charges-motif-count {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-family: 'IBM Plex Mono', monospace;
  flex-shrink: 0;
}
.charges-motif-total {
  color: var(--danger);
  font-weight: 700;
  font-size: 0.76rem;
  flex-shrink: 0;
  font-family: 'IBM Plex Mono', monospace;
}
.charges-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: var(--text-muted);
  font-size: 0.82rem;
}

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
.section-loading { display: flex; align-items: center; justify-content: center; min-height: 180px; }

/* ── ERROR ── */
.dash-error {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1rem;
  background: ${isLight ? 'rgba(220,38,38,0.06)' : 'rgba(239,68,68,0.08)'};
  border: 1px solid ${isLight ? 'rgba(220,38,38,0.2)' : 'rgba(239,68,68,0.2)'};
  border-radius: 10px;
  color: var(--danger);
  font-size: 0.82rem;
  animation: fadeUp 0.3s ease;
}
.dash-error__icon { font-size: 1rem; }

/* ── NO USER ── */
.dash-no-user {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  background: var(--bg-root);
  padding: 1rem;
}
.dash-no-user__card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2rem 2.5rem;
  text-align: center;
  display: flex; flex-direction: column; gap: 0.75rem;
  max-width: 380px;
  width: 100%;
}
.dash-no-user__icon { font-size: 3rem; }
.dash-no-user__card h2 { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; color: var(--text-primary); }
.dash-no-user__card p  { color: var(--text-secondary); font-size: 0.88rem; }

/* ════════════════════════════════════════════════════════════════
   RESPONSIVE BREAKPOINTS
   ════════════════════════════════════════════════════════════════ */

/* ── Large desktop: sidebar collapsed ── */
.dash-root--collapsed .dash-sidebar { width: 60px; min-width: 60px; }

/* ── Tablet landscape & small desktop (900–1199px) ── */
@media (max-width: 1199px) {
  .overview-grid--7 { grid-template-columns: repeat(4, 1fr); }
  .kpi-card__value  { font-size: 0.95rem; }
}

/* ── Tablet portrait (600–899px) ── */
@media (max-width: 899px) {
  .overview-grid     { grid-template-columns: repeat(3, 1fr); }
  .overview-grid--7  { grid-template-columns: repeat(3, 1fr); }
  .overview-grid--2  { grid-template-columns: repeat(2, 1fr); }
  .overview-grid--3  { grid-template-columns: repeat(3, 1fr); }
  .section-row-2     { grid-template-columns: 1fr; }

  .dash-topbar       { display: none; }
  .dash-mobile-topbar { display: flex; }
  .dash-mobile-overlay { display: block; }

  /* Sidebar becomes a fixed drawer on tablet/mobile */
  .dash-sidebar {
    position: fixed;
    left: 0; top: 0;
    height: 100dvh;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1), background 0.3s ease;
    width: 240px !important;
    min-width: 240px !important;
    box-shadow: ${isLight ? '4px 0 24px rgba(0,0,0,0.12)' : '4px 0 32px rgba(0,0,0,0.5)'};
  }

  .dash-sidebar--mobile-open {
    transform: translateX(0);
  }

  /* Hide desktop collapse button on mobile, we use the mobile topbar button */
  .dash-sidebar__collapse-btn { display: none; }

  /* Always show brand + labels in drawer */
  .dash-sidebar__brand { padding: 1rem 1rem 1.1rem; }
  .dash-sidebar__logo  { display: block !important; }
  .dash-sidebar__app-name,
  .dash-sidebar__user-name { display: block !important; }
  .dash-sidebar__role-badge {
    display: flex !important;
    white-space: normal !important;
    overflow: visible !important;
    margin: 0.85rem 0.85rem 0.65rem !important;
  }
  .dash-sidebar__office {
    white-space: normal !important;
    word-break: break-all !important;
  }
  .dash-nav-item__label { display: inline !important; }
  .dash-nav-item { justify-content: flex-start !important; gap: 0.55rem !important; }
  .dash-sidebar--collapsed .dash-nav-item { justify-content: flex-start !important; gap: 0.55rem !important; }

  .dash-sidebar__refresh,
  .dash-sidebar__theme-btn {
    font-size: 0.78rem !important;
    text-align: left !important;
  }

  .dash-overview-strip { padding: 0.75rem 0.85rem 0.15rem; }
  .dash-content        { padding: 0.75rem 0.85rem 2rem; }

  /* Filter bar in mobile topbar: always show toggle button */
  .filter-bar__mobile-toggle { display: flex; }
  .filter-bar__inner { display: none; }
  .filter-bar__inner--open { display: flex; }
}

/* ── Mobile portrait (≤599px) ── */
@media (max-width: 599px) {
  .overview-grid     { grid-template-columns: repeat(2, 1fr); }
  .overview-grid--7  { grid-template-columns: repeat(2, 1fr); }
  .overview-grid--3  { grid-template-columns: repeat(2, 1fr); }
  .overview-grid--2  { grid-template-columns: repeat(2, 1fr); }

  .kpi-card          { padding: 0.7rem 0.8rem; border-radius: 12px; }
  .kpi-card__value   { font-size: 0.88rem; }
  .kpi-card__label   { font-size: 0.62rem; }

  .section-card      { padding: 0.9rem; border-radius: 12px; }
  .section-card__title { font-size: 0.72rem; margin-bottom: 0.75rem; }

  .dash-overview-strip { padding: 0.6rem 0.75rem 0.1rem; }
  .dash-content        { padding: 0.6rem 0.75rem 2rem; }

  .kpi-single { max-width: none; }

  /* Mobile topbar row1 */
  .dash-mobile-topbar__row1 { padding: 0.6rem 0.75rem; }
  .dash-mobile-topbar__filters { padding: 0 0.75rem 0.6rem; padding-top: 0.5rem; }
  .dash-mobile-topbar__title { font-size: 0.88rem; }

  /* Filter bar: always use toggle+panel on mobile */
  .filter-bar { flex-direction: column; align-items: stretch; gap: 0; width: 100%; }

  .filter-bar__mobile-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.65rem;
    border-radius: 8px;
    background: var(--brand-soft);
    border: 1px solid var(--brand-border);
    color: var(--brand-text);
    font-size: 0.76rem;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Manrope', sans-serif;
    white-space: nowrap;
    align-self: flex-start;
  }

  .filter-bar__inner {
    display: none;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.65rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    margin-top: 0.35rem;
    width: 100%;
    box-sizing: border-box;
  }

  .filter-bar__inner--open { display: flex; }

  .filter-bar__group { flex-wrap: wrap; }
  .filter-bar__row   { flex-wrap: wrap; gap: 0.4rem; }

  .filter-bar__input,
  .filter-bar__select {
    font-size: 0.8rem;
    padding: 0.35rem 0.5rem;
    max-width: 100%;
  }

  .filter-bar__period-btn { padding: 0.3rem 0.55rem; font-size: 0.75rem; }
}

/* ── Mobile landscape (short height) ── */
@media (max-height: 500px) and (orientation: landscape) {
  .dash-sidebar { overflow-y: auto; }
  .dash-sidebar__brand { padding: 0.6rem 0.85rem 0.7rem; }
  .dash-sidebar__role-badge { margin: 0.4rem 0.85rem 0.4rem; padding: 0.3rem 0.55rem; }
  .dash-nav-item { padding: 0.42rem 0.65rem; }
  .dash-overview-strip { display: none; }
  .kpi-card { padding: 0.6rem 0.75rem; }
}
`;
}

export default Dashboard;