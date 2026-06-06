// src/hooks/useDashboard.ts

import { useState, useCallback, useEffect } from 'react';
import type {
  DashboardUser,
  DashboardFilters,
  DashboardState,
  LoadingState,
  ErrorState,
  DashboardSection,
  Period,
  IssueFilter,
  ThemeMode,
} from '../types/dashboard';

// ─────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────

//const API_BASE = 'https://backend-nana-v2-production.up.railway.app/api';
const API_BASE = 'http://localhost:3000/api';

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

export function getUserFromStorage(): DashboardUser | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardUser;
    if (!parsed?.id || typeof parsed.owner === 'undefined') {
      console.warn('[useDashboard] Objet user invalide dans localStorage :', parsed);
      return null;
    }
    return parsed;
  } catch (e) {
    console.error('[useDashboard] Erreur parsing user localStorage :', e);
    return null;
  }
}

export function getThemeFromStorage(): ThemeMode {
  try {
    const raw = localStorage.getItem('dashboard_theme');
    if (raw === 'dark' || raw === 'light') return raw;
  } catch (_) { /* ignore */ }
  return 'light';
}

async function apiPost<T>(
  endpoint: string,
  user: DashboardUser,
  filters: DashboardFilters,
  extra?: Record<string, unknown>
): Promise<T> {
  const body = {
    user,
    period: filters.period,
    date_start: filters.date_start,
    date_end: filters.date_end,
    offices: filters.offices,
    seller: filters.seller,
    product: filters.product,
    payment_mode: filters.payment_mode,
    client_kind: filters.clientKind,
    client: filters.client,
    issue: filters.issue ?? 'valid',
    ...extra,
  };

  const res = await fetch(`${API_BASE}/stats/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const msg = json.message ?? `Erreur HTTP ${res.status} sur /stats/${endpoint}`;
    const detail = json.details ? ` | details: ${json.details}` : '';
    const hint = json.hint ? ` | hint: ${json.hint}` : '';
    throw new Error(`[${endpoint}] ${msg}${detail}${hint}`);
  }

  return json.data as T;
}

// ─────────────────────────────────────────────────────────────────
// ÉTAT INITIAL
// ─────────────────────────────────────────────────────────────────

const INITIAL_STATE: DashboardState = {
  meta: null,
  overview: null,
  financialTimeline: null,
  financialByOffice: null,
  financialBySeller: null,
  financialByClient: null,
  salesTimeline: null,
  salesMix: null,
  issueStats: null,
  topSellers: null,
  topProducts: null,
  topClients: null,
  mlm: null,
  clients: null,
  stock: null,
  cashout: null,   // NOUVEAU
};

const INITIAL_LOADING: LoadingState = {
  meta: false,
  overview: false,
  financial: false,
  sales: false,
  mlm: false,
  clients: false,
  stock: false,
  cashout: false,  // NOUVEAU
};

const INITIAL_ERRORS: ErrorState = {
  meta: null,
  overview: null,
  financial: null,
  sales: null,
  mlm: null,
  clients: null,
  stock: null,
  cashout: null,   // NOUVEAU
};

const DEFAULT_FILTERS: DashboardFilters = {
  period: 'month',
  issue: 'valid',
};

// ─────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────

export function useDashboard() {
  const user = getUserFromStorage();

  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [data, setData] = useState<DashboardState>(INITIAL_STATE);
  const [loading, setLoading] = useState<LoadingState>(INITIAL_LOADING);
  const [errors, setErrors] = useState<ErrorState>(INITIAL_ERRORS);
  const [theme, setThemeState] = useState<ThemeMode>(getThemeFromStorage);

  // ── Thème ─────────────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('dashboard_theme', next); } catch (_) { /* ignore */ }
      return next;
    });
  }, []);

  // ── Filtres ───────────────────────────────────────────────────
  const updateFilter = useCallback(<K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const setPeriod = useCallback((period: Period) => {
    setFilters(prev => ({ ...prev, period, date_start: undefined, date_end: undefined }));
  }, []);

  const setCustomDates = useCallback((start: string, end: string) => {
    setFilters(prev => ({ ...prev, period: 'custom', date_start: start, date_end: end }));
  }, []);

  const setIssueFilter = useCallback((issue: IssueFilter) => {
    setFilters(prev => ({ ...prev, issue }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // ── Helpers loading/error ─────────────────────────────────────
  const setLoadingKey = useCallback((key: keyof LoadingState, val: boolean) => {
    setLoading(prev => ({ ...prev, [key]: val }));
  }, []);

  const setErrorKey = useCallback((key: keyof ErrorState, val: string | null) => {
    setErrors(prev => ({ ...prev, [key]: val }));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // LOADERS
  // ─────────────────────────────────────────────────────────────

  const loadMeta = useCallback(async () => {
    if (!user) return;
    setLoadingKey('meta', true);
    setErrorKey('meta', null);
    try {
      const meta = await apiPost<DashboardState['meta']>('meta', user, filters);
      setData(prev => ({ ...prev, meta }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue (meta)';
      setErrorKey('meta', msg);
    } finally {
      setLoadingKey('meta', false);
    }
  }, [user?.id, filters.offices]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOverview = useCallback(async () => {
    if (!user) return;
    setLoadingKey('overview', true);
    setErrorKey('overview', null);
    try {
      const overview = await apiPost<DashboardState['overview']>('overview', user, filters);
      setData(prev => ({ ...prev, overview }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue (overview)';
      setErrorKey('overview', msg);
    } finally {
      setLoadingKey('overview', false);
    }
  }, [user?.id, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFinancial = useCallback(async () => {
    if (!user) return;
    setLoadingKey('financial', true);
    setErrorKey('financial', null);
    try {
      const [timeline, byOffice, bySeller, byClient] = await Promise.all([
        apiPost<DashboardState['financialTimeline']>('financial/timeline', user, filters),
        apiPost<DashboardState['financialByOffice']>('financial/by-office', user, filters),
        apiPost<DashboardState['financialBySeller']>('financial/by-seller', user, filters),
        apiPost<DashboardState['financialByClient']>('financial/by-client', user, filters),
      ]);
      setData(prev => ({
        ...prev,
        financialTimeline: timeline,
        financialByOffice: byOffice,
        financialBySeller: bySeller,
        financialByClient: byClient,
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue (financial)';
      setErrorKey('financial', msg);
    } finally {
      setLoadingKey('financial', false);
    }
  }, [user?.id, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSales = useCallback(async () => {
    if (!user) return;
    setLoadingKey('sales', true);
    setErrorKey('sales', null);
    try {
      const [salesTimeline, salesMix, topSellers, topProducts, topClients, issueStats] = await Promise.all([
        apiPost<DashboardState['salesTimeline']>('sales/timeline', user, filters),
        apiPost<DashboardState['salesMix']>('sales/mix', user, filters),
        apiPost<DashboardState['topSellers']>('sales/top-sellers', user, filters),
        apiPost<DashboardState['topProducts']>('sales/top-products', user, filters),
        apiPost<DashboardState['topClients']>('sales/top-clients', user, filters),
        apiPost<DashboardState['issueStats']>('sales/issue-stats', user, { ...filters, issue: undefined }),
      ]);
      setData(prev => ({
        ...prev,
        salesTimeline,
        salesMix,
        topSellers,
        topProducts,
        topClients,
        issueStats,
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue (sales)';
      setErrorKey('sales', msg);
    } finally {
      setLoadingKey('sales', false);
    }
  }, [user?.id, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMlm = useCallback(async () => {
    if (!user) return;
    setLoadingKey('mlm', true);
    setErrorKey('mlm', null);
    try {
      const mlm = await apiPost<DashboardState['mlm']>('mlm', user, filters);
      setData(prev => ({ ...prev, mlm }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue (mlm)';
      setErrorKey('mlm', msg);
    } finally {
      setLoadingKey('mlm', false);
    }
  }, [user?.id, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClients = useCallback(async () => {
    if (!user) return;
    setLoadingKey('clients', true);
    setErrorKey('clients', null);
    try {
      const clients = await apiPost<DashboardState['clients']>('clients', user, filters);
      setData(prev => ({ ...prev, clients }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue (clients)';
      setErrorKey('clients', msg);
    } finally {
      setLoadingKey('clients', false);
    }
  }, [user?.id, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStock = useCallback(async () => {
    if (!user) return;
    setLoadingKey('stock', true);
    setErrorKey('stock', null);
    try {
      const stock = await apiPost<DashboardState['stock']>('stock', user, filters);
      setData(prev => ({ ...prev, stock }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue (stock)';
      setErrorKey('stock', msg);
    } finally {
      setLoadingKey('stock', false);
    }
  }, [user?.id, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── NOUVEAU : loadCashout ──────────────────────────────────────
  const loadCashout = useCallback(async () => {
    if (!user) return;
    setLoadingKey('cashout', true);
    setErrorKey('cashout', null);
    try {
      const cashout = await apiPost<DashboardState['cashout']>('cashout', user, filters);
      setData(prev => ({ ...prev, cashout }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue (cashout)';
      setErrorKey('cashout', msg);
    } finally {
      setLoadingKey('cashout', false);
    }
  }, [user?.id, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSectionData = useCallback(async (section: DashboardSection) => {
    await loadOverview();
    switch (section) {
      case 'overview':  break;
      case 'financial': await loadFinancial(); break;
      case 'sales':     await loadSales(); break;
      case 'mlm':       await loadMlm(); break;
      case 'clients':   await loadClients(); break;
      case 'stock':     await loadStock(); break;
      case 'sellers':   await loadFinancial(); break;
      case 'offices':   await loadFinancial(); break;
      case 'products':  await loadSales(); break;
      case 'charges':   await loadCashout(); break;  // NOUVEAU
    }
  }, [loadOverview, loadFinancial, loadSales, loadMlm, loadClients, loadStock, loadCashout]);

  const navigateTo = useCallback((section: DashboardSection) => {
    setActiveSection(section);
    loadSectionData(section);
  }, [loadSectionData]);

  // ── Téléchargement PDF ────────────────────────────────────────
  const downloadReport = useCallback(async (
    type: 'seller' | 'office',
    targetId: string,
    targetName: string
  ) => {
    if (!user) return;
    try {
      const body = {
        user,
        type,
        targetId,
        period: filters.period,
        date_start: filters.date_start,
        date_end: filters.date_end,
        offices: filters.offices,
        issue: filters.issue ?? 'valid',
      };

      const res = await fetch(`${API_BASE}/stats/report/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Erreur lors du téléchargement');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${type}_${targetName.replace(/\s+/g, '_')}_${filters.period}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[useDashboard] downloadReport :', e);
      alert('Erreur lors du téléchargement du rapport. Veuillez réessayer.');
    }
  }, [user, filters]);

  // ── Effets ────────────────────────────────────────────────────
  useEffect(() => {
    loadMeta();
    loadSectionData('overview');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (data.overview !== null) {
      loadSectionData(activeSection);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user,
    filters,
    activeSection,
    data,
    loading,
    errors,
    theme,
    // Actions filtres
    updateFilter,
    setPeriod,
    setCustomDates,
    setIssueFilter,
    resetFilters,
    // Navigation
    navigateTo,
    // Thème
    toggleTheme,
    // Téléchargement
    downloadReport,
    // Refresh
    refresh: () => loadSectionData(activeSection),
  };
}