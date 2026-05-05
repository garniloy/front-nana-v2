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
} from '../types/dashboard';

// ─────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Récupère l'utilisateur connecté depuis le localStorage.
 * Retourne null si absent ou invalide.
 */
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

/**
 * Appel API générique avec gestion d'erreur explicite.
 */
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
    client_kind: filters.client_kind,
    client: filters.client,
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
  topSellers: null,
  topProducts: null,
  topClients: null,
  mlm: null,
  clients: null,
  stock: null,
};

const INITIAL_LOADING: LoadingState = {
  meta: false,
  overview: false,
  financial: false,
  sales: false,
  mlm: false,
  clients: false,
  stock: false,
};

const INITIAL_ERRORS: ErrorState = {
  meta: null,
  overview: null,
  financial: null,
  sales: null,
  mlm: null,
  clients: null,
  stock: null,
};

const DEFAULT_FILTERS: DashboardFilters = {
  period: 'month',
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

  // Ref pour annuler les requêtes obsolètes si les filtres changent
  //const abortRef = useRef<AbortController | null>(null);

  // ── Mise à jour d'un champ de filtre ──────────────────────────
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

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // ── Helper pour setter loading/error proprement ────────────────
  const setLoadingKey = useCallback((key: keyof LoadingState, val: boolean) => {
    setLoading(prev => ({ ...prev, [key]: val }));
  }, []);

  const setErrorKey = useCallback((key: keyof ErrorState, val: string | null) => {
    setErrors(prev => ({ ...prev, [key]: val }));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // LOADERS
  // ─────────────────────────────────────────────────────────────

  /**
   * Charge les référentiels (offices, sellers, clients, produits).
   * Appelé une fois à l'entrée dans le dashboard.
   */
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
      console.error('[useDashboard] loadMeta :', msg);
    } finally {
      setLoadingKey('meta', false);
    }
  }, [user?.id, filters.offices]);

  /**
   * Charge les KPIs overview.
   */
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
      console.error('[useDashboard] loadOverview :', msg);
    } finally {
      setLoadingKey('overview', false);
    }
  }, [user?.id, JSON.stringify(filters)]);

  /**
   * Charge toutes les données de la section financière.
   */
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
      console.error('[useDashboard] loadFinancial :', msg);
    } finally {
      setLoadingKey('financial', false);
    }
  }, [user?.id, JSON.stringify(filters)]);

  /**
   * Charge toutes les données de la section Sales.
   */
  const loadSales = useCallback(async () => {
    if (!user) return;
    setLoadingKey('sales', true);
    setErrorKey('sales', null);
    try {
      const [salesTimeline, salesMix, topSellers, topProducts, topClients] = await Promise.all([
        apiPost<DashboardState['salesTimeline']>('sales/timeline', user, filters),
        apiPost<DashboardState['salesMix']>('sales/mix', user, filters),
        apiPost<DashboardState['topSellers']>('sales/top-sellers', user, filters),
        apiPost<DashboardState['topProducts']>('sales/top-products', user, filters),
        apiPost<DashboardState['topClients']>('sales/top-clients', user, filters),
      ]);
      setData(prev => ({
        ...prev,
        salesTimeline,
        salesMix,
        topSellers,
        topProducts,
        topClients,
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue (sales)';
      setErrorKey('sales', msg);
      console.error('[useDashboard] loadSales :', msg);
    } finally {
      setLoadingKey('sales', false);
    }
  }, [user?.id, JSON.stringify(filters)]);

  /**
   * Charge la section MLM / PV.
   */
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
      console.error('[useDashboard] loadMlm :', msg);
    } finally {
      setLoadingKey('mlm', false);
    }
  }, [user?.id, JSON.stringify(filters)]);

  /**
   * Charge la section Clients.
   */
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
      console.error('[useDashboard] loadClients :', msg);
    } finally {
      setLoadingKey('clients', false);
    }
  }, [user?.id, JSON.stringify(filters)]);

  /**
   * Charge la section Stock.
   */
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
      console.error('[useDashboard] loadStock :', msg);
    } finally {
      setLoadingKey('stock', false);
    }
  }, [user?.id, JSON.stringify(filters)]);

  /**
   * Charge les données de la section active + overview systématiquement.
   */
  const loadSectionData = useCallback(async (section: DashboardSection) => {
    await loadOverview();

    switch (section) {
      case 'overview':
        break;
      case 'financial':
        await loadFinancial();
        break;
      case 'sales':
        await loadSales();
        break;
      case 'mlm':
        await loadMlm();
        break;
      case 'clients':
        await loadClients();
        break;
      case 'stock':
        await loadStock();
        break;
      case 'sellers':
        await loadFinancial(); // bySeller réutilisé
        break;
      case 'offices':
        await loadFinancial(); // byOffice réutilisé
        break;
      case 'products':
        await loadSales(); // topProducts réutilisé
        break;
    }
  }, [loadOverview, loadFinancial, loadSales, loadMlm, loadClients, loadStock]);

  // ── Navigation entre sections ─────────────────────────────────
  const navigateTo = useCallback((section: DashboardSection) => {
    setActiveSection(section);
    loadSectionData(section);
  }, [loadSectionData]);

  // ── Chargement initial ────────────────────────────────────────
  useEffect(() => {
    loadMeta();
    loadSectionData('overview');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rechargement automatique quand les filtres changent ───────
  // (uniquement si des données existent déjà pour cette section)
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
    // Actions filtres
    updateFilter,
    setPeriod,
    setCustomDates,
    resetFilters,
    // Navigation
    navigateTo,
    // Loaders manuels (si refresh voulu)
    refresh: () => loadSectionData(activeSection),
  };
}