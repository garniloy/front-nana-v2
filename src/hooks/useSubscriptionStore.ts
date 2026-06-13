// src/hooks/useSubscriptionStore.ts
// ------------------------------------------------------------
// Store Zustand — état global d'abonnement
// À importer partout avec : import { useSubscriptionStore } from '../hooks/useSubscriptionStore'
// ------------------------------------------------------------
import { create } from 'zustand';

const API_BASE = 'http://localhost:3000';
//const API_BASE = 'https://backend-nana-v2-production.up.railway.app';

export type SubscriptionPlan = 'trial' | 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'expired' | 'trial' | 'pending';
export type PaymentMethod = 'mtn' | 'orange' | 'virement';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed';

export interface Subscription {
  id: string;
  owner_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string;
  days_remaining: number;
  is_active: boolean;
  is_expiring_soon: boolean;
  plan_details: {
    label: string;
    duration_days: number;
    price: number;
  };
}

export interface PaymentRecord {
  id: string;
  owner_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  phone_number: string | null;
  reference: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PlanInfo {
  label: string;
  duration_days: number;
  price: number;
}

interface SubscriptionStore {
  // State
  subscription: Subscription | null;
  paymentHistory: PaymentRecord[];
  plans: Record<SubscriptionPlan, PlanInfo>;
  isLoading: boolean;
  isHistoryLoading: boolean;
  error: string | null;

  // Actions
  fetchSubscription: (owner_id: string) => Promise<void>;
  fetchHistory: (owner_id: string) => Promise<void>;
  fetchPlans: () => Promise<void>;
  initiatePayment: (params: {
    owner_id: string;
    plan: SubscriptionPlan;
    method: PaymentMethod;
    phone_number?: string;
    notes?: string;
  }) => Promise<{ payment_id: string; reference: string; amount: number; plan: string } | null>;
  simulateConfirm: (owner_id: string, payment_id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  subscription: null,
  paymentHistory: [],
  plans: {} as Record<SubscriptionPlan, PlanInfo>,
  isLoading: false,
  isHistoryLoading: false,
  error: null,

  // --------------------------------------------------------
  // Charge l'état d'abonnement depuis le backend
  // --------------------------------------------------------
  fetchSubscription: async (owner_id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/subscription/status?owner_id=${owner_id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      set({ subscription: json.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  // --------------------------------------------------------
  // Charge l'historique des paiements
  // --------------------------------------------------------
  fetchHistory: async (owner_id: string) => {
    set({ isHistoryLoading: true });
    try {
      const res = await fetch(`${API_BASE}/api/subscription/history?owner_id=${owner_id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      set({ paymentHistory: json.data, isHistoryLoading: false });
    } catch (err: any) {
      set({ error: err.message, isHistoryLoading: false });
    }
  },

  // --------------------------------------------------------
  // Charge les plans disponibles (prix, durée)
  // --------------------------------------------------------
  fetchPlans: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription/plans`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      set({ plans: json.data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // --------------------------------------------------------
  // Initie un paiement — retourne les infos du paiement créé
  // --------------------------------------------------------
  initiatePayment: async (params) => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  // --------------------------------------------------------
  // SIMULATEUR — confirme le paiement et recharge l'abonnement
  // --------------------------------------------------------
  simulateConfirm: async (owner_id: string, payment_id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/subscription/simulate-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id, payment_id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      // Recharge l'abonnement après confirmation
      await get().fetchSubscription(owner_id);
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
