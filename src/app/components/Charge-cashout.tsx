// ─── Charge-Cashout Component ────────────────────────────────────────────────
//
// LOGIQUE MÉTIER :
//
// TABLE charge  → référence permanente (modèles de charges de l'entreprise)
//   - Sert uniquement de catalogue : fix ou not_fix
//   - Pas de is_paid ici — ce n'est pas un paiement, c'est un modèle
//   - CRUD complet : créer / modifier / supprimer
//
// TABLE cashout → toutes les sorties d'argent réelles, avec is_paid
//   - Cashout spontané (transport, réparation…) → is_paid: true d'emblée
//   - Cashout généré depuis une charge (saisie mensuelle) → is_paid: false
//   - Clôture du mois → UPDATE cashout SET is_paid=true WHERE office=... AND is_paid=false
//
// FLUX CHARGE → CASHOUT :
//   L'utilisateur voit ses modèles de charges chaque mois.
//   Pour chaque charge, il peut saisir le montant réel du mois et cliquer
//   "Enregistrer pour ce mois" → crée un cashout is_paid=false lié à cette charge.
//   Clôturer le mois → passe tous ces cashouts à is_paid=true.
//
// SQL requis :
//   ALTER TABLE cashout ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
//   (La table charge n'a PAS besoin de is_paid)

const backendUrl = 'https://backend-nana-v2-production.up.railway.app';

// ─── API helpers ──────────────────────────────────────────────────────────────
async function createDataToTable(table: string, fields: object) {
  const res = await fetch(`${backendUrl}/crud/create/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return res.json();
}

async function getDataFromTableWithConstraints(table: string, body: object) {
  const res = await fetch(`${backendUrl}/crud/getwith/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function updateDataToTable(table: string, fields: object) {
  const res = await fetch(`${backendUrl}/crud/update/${table}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return res.json();
}

async function deleteDataFromTable(table: string, fields: object) {
  const res = await fetch(`${backendUrl}/crud/delete/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return res.json();
}

// ─── Imports ──────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { useImmer } from 'use-immer';
import OfficeSelector from './Office-selector';

// ─── Types ────────────────────────────────────────────────────────────────────

// Modèle de charge — référence permanente, pas de is_paid
type Charge = {
  id: number;
  motif: string;
  type: 'fix' | 'not_fix';
  montant: number;      // montant de référence (modifiable chaque mois pour not_fix)
  office: string;
};

// Sortie d'argent réelle
type Cashout = {
  id: number;
  motif: string;
  montant: number;
  created_at: string;
  office: string;
  manager: string;
  is_paid: boolean;    // false = en attente de clôture | true = soldé
};

// Saisie mensuelle par charge : montant saisi par l'utilisateur pour ce mois
type MonthlySaisie = Record<number, number>; // chargeId → montant saisi

type Tab = 'charges' | 'cashouts';
type CashoutFilter = 'week' | 'month' | 'custom';
type Toast = { message: string; kind: 'success' | 'error' } | null;

// ─── Date helpers ─────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split('T')[0];
}

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChargeCashout() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isOwner: boolean = !!user?.owner || user?.role === 'superuser';

  // ── Office ──
  const [selectedOffice, setSelectedOffice] = useState<string | null>(
    isOwner ? null : (user?.office ?? null),
  );

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<Tab>('charges');

  // ── Data ──
  const [charges, setCharges] = useImmer<Charge[]>([]);
  const [cashouts, setCashouts] = useImmer<Cashout[]>([]);

  // ── Saisie mensuelle par charge (chargeId → montant en cours de saisie) ──
  const [monthlySaisie, setMonthlySaisie] = useState<MonthlySaisie>({});
  // Tracks which charge has the monthly input open
  const [openSaisieId, setOpenSaisieId] = useState<number | null>(null);

  // ── Loading / operating ──
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [loadingCashouts, setLoadingCashouts] = useState(false);
  const [operating, setOperating] = useState(false);

  // ── Toast ──
  const [toast, setToast] = useState<Toast>(null);

  // ── Forms: new charge model ──
  const [showNewCharge, setShowNewCharge] = useState(false);
  const [newCharge, setNewCharge] = useImmer({ motif: '', montant: 0, type: 'fix' as 'fix' | 'not_fix' });

  // ── Forms: spontaneous cashout ──
  const [showNewCashout, setShowNewCashout] = useState(false);
  const [newCashout, setNewCashout] = useImmer({ motif: '', montant: 0, date: '' });

  // ── Edit forms ──
  const [editChargeId, setEditChargeId] = useState<number | null>(null);
  const [editCharge, setEditCharge] = useImmer({ motif: '', montant: 0 });
  const [editCashoutId, setEditCashoutId] = useState<number | null>(null);
  const [editCashout, setEditCashout] = useImmer({ motif: '', montant: 0 });

  // ── Cashout filter ──
  const [cashoutFilter, setCashoutFilter] = useState<CashoutFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // ── Cloture modal ──
  const [showCloture, setShowCloture] = useState(false);

  // ─── Toast helper ──────────────────────────────────────────────────────────
  function showToast(message: string, kind: 'success' | 'error') {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3500);
  }

  // ─── Fetch charges (modèles) ───────────────────────────────────────────────
  const fetchCharges = useCallback(async (office: string) => {
    setLoadingCharges(true);
    try {
      const data = await getDataFromTableWithConstraints('charge', {
        fields: ['id', 'motif', 'type', 'montant', 'office'],
        constraints: { office },
        orderBy: { type: 'ASC' },
      });
      if (data.success) setCharges(() => data.list ?? []);
    } catch {
      showToast('Erreur lors du chargement des charges', 'error');
    } finally {
      setLoadingCharges(false);
    }
  }, []);

  // ─── Fetch cashouts ────────────────────────────────────────────────────────
  const fetchCashouts = useCallback(async (office: string) => {
    setLoadingCashouts(true);
    try {
      const data = await getDataFromTableWithConstraints('cashout', {
        fields: ['id', 'motif', 'montant', 'created_at', 'office', 'manager', 'is_paid'],
        constraints: { office },
        orderBy: { created_at: 'DESC' },
      });
      if (data.success) setCashouts(() => data.list ?? []);
    } catch {
      showToast('Erreur lors du chargement des cashouts', 'error');
    } finally {
      setLoadingCashouts(false);
    }
  }, []);

  // ─── Effect: fetch when office changes ────────────────────────────────────
  useEffect(() => {
    if (!selectedOffice) return;
    setCharges(() => []);
    setCashouts(() => []);
    setMonthlySaisie({});
    setOpenSaisieId(null);
    fetchCharges(selectedOffice);
    fetchCashouts(selectedOffice);
  }, [selectedOffice]);

  // ─── CRUD: Charge model ────────────────────────────────────────────────────
  async function handleCreateCharge() {
    if (!selectedOffice || operating) return;
    if (!newCharge.motif.trim()) { showToast('Le motif est requis', 'error'); return; }
    setOperating(true);
    try {
      // montant is optional for not_fix (can be 0 as placeholder)
      const body = {
        motif: newCharge.motif,
        type: newCharge.type,
        montant: newCharge.montant,
        office: selectedOffice,
      };
      const res = await createDataToTable('charge', body);
      if (res.success) {
        setCharges(d => { d.push({ id: res.id, ...body }); });
        setNewCharge(d => { d.motif = ''; d.montant = 0; d.type = 'fix'; });
        setShowNewCharge(false);
        showToast('Charge ajoutée au catalogue', 'success');
      } else {
        showToast('Erreur serveur', 'error');
      }
    } catch {
      showToast('Erreur de connexion', 'error');
    } finally {
      setOperating(false);
    }
  }

  async function handleUpdateCharge(id: number) {
    if (operating) return;
    setOperating(true);
    try {
      const set: Partial<{ motif: string; montant: number }> = {};
      if (editCharge.motif) set.motif = editCharge.motif;
      if (editCharge.montant) set.montant = editCharge.montant;

      const res = await updateDataToTable('charge', { set, where: { id } });
      if (res.success) {
        setCharges(d => {
          const t = d.find(c => c.id === id);
          if (t) {
            if (set.motif)   t.motif   = set.motif;
            if (set.montant) t.montant = set.montant;
          }
        });
        setEditChargeId(null);
        setEditCharge(d => { d.motif = ''; d.montant = 0; });
        showToast('Charge mise à jour', 'success');
      } else {
        showToast('Erreur serveur', 'error');
      }
    } catch {
      showToast('Erreur de connexion', 'error');
    } finally {
      setOperating(false);
    }
  }

  async function handleDeleteCharge(id: number) {
    if (operating) return;
    setOperating(true);
    try {
      const res = await deleteDataFromTable('charge', { contraints: { id }, returning: false });
      if (res.success) {
        setCharges(d => { const i = d.findIndex(c => c.id === id); if (i !== -1) d.splice(i, 1); });
        showToast('Charge supprimée du catalogue', 'success');
      } else {
        showToast('Erreur serveur', 'error');
      }
    } catch {
      showToast('Erreur de connexion', 'error');
    } finally {
      setOperating(false);
    }
  }

  // ─── Saisie mensuelle d'une charge → crée un cashout is_paid: false ───────
  async function handleEnregistrerChargeMois(charge: Charge) {
    if (!selectedOffice || operating) return;
    const montant = monthlySaisie[charge.id];
    if (!montant || montant <= 0) {
      showToast('Saisissez un montant valide', 'error');
      return;
    }
    setOperating(true);
    try {
      const body = {
        motif: `[Charge] ${charge.motif}`,
        montant,
        created_at: todayStr(),
        office: selectedOffice,
        manager: user?.id ?? '',
        is_paid: false,  // en attente de clôture
      };
      const res = await createDataToTable('cashout', body);
      if (res.success) {
        setCashouts(d => { d.unshift({ id: res.id, ...body }); });
        // Clear saisie for this charge
        setMonthlySaisie(prev => {
          const next = { ...prev };
          delete next[charge.id];
          return next;
        });
        setOpenSaisieId(null);
        showToast(`Charge "${charge.motif}" enregistrée pour ${currentMonthLabel()}`, 'success');
      } else {
        showToast('Erreur serveur', 'error');
      }
    } catch {
      showToast('Erreur de connexion', 'error');
    } finally {
      setOperating(false);
    }
  }

  // ─── CRUD: Cashout spontané ────────────────────────────────────────────────
  async function handleCreateCashout() {
    if (!selectedOffice || operating) return;
    if (!newCashout.motif.trim()) { showToast('Le motif est requis', 'error'); return; }
    if (newCashout.montant <= 0)  { showToast('Le montant doit être supérieur à 0', 'error'); return; }
    setOperating(true);
    try {
      const body = {
        motif: newCashout.motif,
        montant: newCashout.montant,
        created_at: newCashout.date || todayStr(),
        office: selectedOffice,
        manager: user?.id ?? '',
        is_paid: true,   // dépense spontanée = déjà soldée
      };
      const res = await createDataToTable('cashout', body);
      if (res.success) {
        setCashouts(d => { d.unshift({ id: res.id, ...body }); });
        setNewCashout(d => { d.motif = ''; d.montant = 0; d.date = ''; });
        setShowNewCashout(false);
        showToast('Dépense enregistrée', 'success');
      } else {
        showToast('Erreur serveur', 'error');
      }
    } catch {
      showToast('Erreur de connexion', 'error');
    } finally {
      setOperating(false);
    }
  }

  async function handleUpdateCashout(id: number) {
    if (operating) return;
    setOperating(true);
    try {
      const set: Partial<{ motif: string; montant: number }> = {};
      if (editCashout.motif) set.motif = editCashout.motif;
      if (editCashout.montant) set.montant = editCashout.montant;

      const res = await updateDataToTable('cashout', { set, where: { id } });
      if (res.success) {
        setCashouts(d => {
          const t = d.find(c => c.id === id);
          if (t) {
            if (set.motif)   t.motif   = set.motif;
            if (set.montant) t.montant = set.montant;
          }
        });
        setEditCashoutId(null);
        setEditCashout(d => { d.motif = ''; d.montant = 0; });
        showToast('Cashout mis à jour', 'success');
      } else {
        showToast('Erreur serveur', 'error');
      }
    } catch {
      showToast('Erreur de connexion', 'error');
    } finally {
      setOperating(false);
    }
  }

  async function handleDeleteCashout(id: number) {
    if (operating) return;
    setOperating(true);
    try {
      const res = await deleteDataFromTable('cashout', { contraints: { id }, returning: false });
      if (res.success) {
        setCashouts(d => { const i = d.findIndex(c => c.id === id); if (i !== -1) d.splice(i, 1); });
        showToast('Cashout supprimé', 'success');
      } else {
        showToast('Erreur serveur', 'error');
      }
    } catch {
      showToast('Erreur de connexion', 'error');
    } finally {
      setOperating(false);
    }
  }

  // ─── Clôture du mois ───────────────────────────────────────────────────────
  // Passe tous les cashouts is_paid=false du bureau à is_paid=true
  // Les modèles de charges restent intacts
  async function handleCloture() {
    if (!selectedOffice || operating) return;

    const pending = cashouts.filter(c => !c.is_paid);
    if (pending.length === 0) {
      showToast('Aucun cashout en attente de clôture', 'error');
      setShowCloture(false);
      return;
    }

    setOperating(true);
    try {
      await updateDataToTable('cashout', {
        set: { is_paid: true },
        where: { office: selectedOffice, is_paid: false },
      });

      setCashouts(d => { d.forEach(c => { if (!c.is_paid) c.is_paid = true; }); });
      setShowCloture(false);
      showToast(`Clôture effectuée — ${pending.length} cashout(s) soldé(s)`, 'success');
    } catch {
      showToast('Erreur lors de la clôture', 'error');
    } finally {
      setOperating(false);
    }
  }

  // ─── Filtered cashouts ─────────────────────────────────────────────────────
  const filteredCashouts = cashouts.filter(c => {
    const d = (c.created_at ?? '').split('T')[0];
    if (cashoutFilter === 'week')   return d >= startOfWeek();
    if (cashoutFilter === 'month')  return d >= startOfMonth();
    if (cashoutFilter === 'custom') {
      if (customFrom && d < customFrom) return false;
      if (customTo   && d > customTo)   return false;
      return true;
    }
    return true;
  });

  // ─── Totals ────────────────────────────────────────────────────────────────
  // Charges : montants de référence des modèles
  const totalFix      = charges.filter(c => c.type === 'fix').reduce((a, c) => a + c.montant, 0);
  const totalVariable = charges.filter(c => c.type === 'not_fix').reduce((a, c) => a + c.montant, 0);
  const totalChargesRef = totalFix + totalVariable;

  // Cashouts en attente (is_paid=false) — ce qui reste à clôturer
  const pendingCashouts = cashouts.filter(c => !c.is_paid);
  const totalPending = pendingCashouts.reduce((a, c) => a + c.montant, 0);

  // Total cashouts sur la période filtrée
  const totalCashoutsFiltered = filteredCashouts.reduce((a, c) => a + c.montant, 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');

        .cc-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          font-family: 'Syne', sans-serif;
        }

        /* ── Header ── */
        .cc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--nm-dark);
          flex-shrink: 0;
        }
        .cc-header-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--nm-text-strong);
          letter-spacing: -0.02em;
          margin: 0;
        }
        .cc-header-sub {
          font-size: 0.72rem;
          color: var(--nm-text);
          font-family: 'DM Mono', monospace;
          margin-top: 2px;
        }

        /* ── Tabs ── */
        .cc-tabs {
          display: flex;
          gap: 0.25rem;
          padding: 1rem 1.5rem 0;
          border-bottom: 1px solid var(--nm-dark);
          flex-shrink: 0;
        }
        .cc-tab {
          padding: 0.5rem 1.25rem;
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--nm-text);
          background: var(--nm-bg);
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
          position: relative;
          bottom: -1px;
        }
        .cc-tab.active {
          color: var(--nm-brand);
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light);
        }

        /* ── Body ── */
        .cc-body {
          flex: 1;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          overflow-y: auto;
        }

        /* ── Summary cards ── */
        .cc-summary {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .cc-card {
          flex: 1;
          min-width: 130px;
          padding: 1rem 1.25rem;
          border-radius: var(--radius-2xl);
          background: var(--nm-bg);
          box-shadow: 6px 6px 12px var(--nm-dark), -6px -6px 12px var(--nm-light);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .cc-card-label {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--nm-text);
          font-family: 'DM Mono', monospace;
        }
        .cc-card-val {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--nm-text-strong);
          font-family: 'DM Mono', monospace;
          letter-spacing: -0.02em;
        }
        .cc-card-val.brand  { color: var(--nm-brand); }
        .cc-card-val.danger { color: var(--clr-danger-500, #e53e3e); }
        .cc-card-val.accent { color: var(--clr-accent-600, #38a169); }
        .cc-card-val.warn   { color: #d97706; }

        /* ── Section header ── */
        .cc-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .cc-section-title {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--nm-text);
          font-family: 'DM Mono', monospace;
        }

        /* ── Buttons ── */
        .cc-btn {
          padding: 0.45rem 1rem;
          border-radius: var(--radius-xl);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          background: var(--nm-bg);
          color: var(--nm-text);
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
          transition: all 0.15s;
          font-family: 'Syne', sans-serif;
          letter-spacing: 0.02em;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .cc-btn:active {
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light);
        }
        .cc-btn.primary {
          background: var(--nm-brand, #2b6cb0);
          color: #fff;
          box-shadow: 4px 4px 10px rgba(0,0,0,0.2);
        }
        .cc-btn.cloture {
          background: #1a1a2e;
          color: #e0c46c;
          font-size: 0.72rem;
          letter-spacing: 0.05em;
        }
        .cc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Inline form ── */
        .cc-form {
          background: var(--nm-bg);
          border-radius: var(--radius-2xl);
          box-shadow: inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .cc-form-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .cc-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          flex: 1;
          min-width: 130px;
        }
        .cc-label {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--nm-text);
          font-family: 'DM Mono', monospace;
          font-weight: 500;
        }

        /* ── List ── */
        .cc-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          overflow: auto;
          heigth: 100%;
        }
        .cc-item {
          background: var(--nm-bg);
          border-radius: var(--radius-xl);
          box-shadow: 5px 5px 10px var(--nm-dark), -5px -5px 10px var(--nm-light);
          padding: 0.9rem 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          animation: cc-in 0.2s ease;
        }
        @keyframes cc-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cc-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .cc-item-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
          flex: 1;
        }
        .cc-type-badge {
          flex-shrink: 0;
          padding: 0.15rem 0.55rem;
          border-radius: var(--radius-full);
          font-size: 0.58rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: 'DM Mono', monospace;
          box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light);
        }
        .cc-type-badge.fix     { color: var(--nm-brand, #2b6cb0); }
        .cc-type-badge.not_fix { color: var(--clr-accent-600, #38a169); }

        .cc-status-badge {
          flex-shrink: 0;
          padding: 0.12rem 0.5rem;
          border-radius: var(--radius-full);
          font-size: 0.58rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: 'DM Mono', monospace;
        }
        .cc-status-badge.pending { color: #d97706; box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); }
        .cc-status-badge.paid    { color: var(--clr-accent-700, #276749); box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); }
        .cc-status-badge.auto    { color: var(--nm-brand); box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); }

        .cc-item-motif {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--nm-text-strong);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cc-item-amount {
          font-family: 'DM Mono', monospace;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--nm-text-strong);
          white-space: nowrap;
        }
        .cc-item-amount.pending { color: #d97706; }
        .cc-item-amount.danger  { color: var(--clr-danger-500, #e53e3e); }
        .cc-item-meta {
          font-size: 0.62rem;
          color: var(--nm-text);
          font-family: 'DM Mono', monospace;
        }
        .cc-item-actions {
          display: flex;
          gap: 0.35rem;
          flex-shrink: 0;
        }
        .cc-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-lg);
          border: none;
          background: var(--nm-bg);
          box-shadow: 3px 3px 6px var(--nm-dark), -3px -3px 6px var(--nm-light);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          color: var(--nm-text);
          transition: all 0.15s;
        }
        .cc-icon-btn:hover        { color: var(--nm-brand); }
        .cc-icon-btn.del:hover    { color: var(--clr-danger-500, #e53e3e); }
        .cc-icon-btn.active       { box-shadow: inset 2px 2px 5px var(--nm-dark), inset -2px -2px 5px var(--nm-light); color: var(--nm-brand); }

        /* ── Edit / saisie zone ── */
        .cc-edit-zone {
          border-top: 1px solid var(--nm-dark);
          padding-top: 0.75rem;
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .cc-saisie-zone {
          border-top: 1px solid var(--nm-dark);
          padding-top: 0.75rem;
          display: flex;
          gap: 0.6rem;
          align-items: flex-end;
          flex-wrap: wrap;
          background: rgba(0,0,0,0.01);
          border-radius: 0 0 var(--radius-xl) var(--radius-xl);
        }
        .cc-saisie-hint {
          font-size: 0.62rem;
          color: var(--nm-text);
          font-family: 'DM Mono', monospace;
          width: 100%;
        }

        /* ── Filter bar ── */
        .cc-filter-bar {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .cc-filter-chip {
          padding: 0.3rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.68rem;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
          border: none;
          background: var(--nm-bg);
          color: var(--nm-text);
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--nm-dark), -3px -3px 6px var(--nm-light);
          transition: all 0.15s;
          letter-spacing: 0.04em;
        }
        .cc-filter-chip.active {
          box-shadow: inset 2px 2px 5px var(--nm-dark), inset -2px -2px 5px var(--nm-light);
          color: var(--nm-brand);
        }
        .cc-custom-dates {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        /* ── Empty ── */
        .cc-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 0.5rem;
          color: var(--nm-text);
          text-align: center;
          opacity: 0.6;
        }
        .cc-empty-icon { font-size: 2rem; }
        .cc-empty-text { font-size: 0.78rem; font-family: 'DM Mono', monospace; }

        /* ── Spinner ── */
        .cc-spinner {
          width: 18px; height: 18px;
          border-radius: 50%;
          border: 2px solid var(--nm-dark);
          border-top-color: var(--nm-brand);
          animation: cc-spin 0.7s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }
        @keyframes cc-spin { to { transform: rotate(360deg); } }

        /* ── Toast ── */
        .cc-toast {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 900;
          padding: 0.6rem 1.25rem;
          border-radius: var(--radius-full);
          font-size: 0.78rem;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
          white-space: nowrap;
          box-shadow: 8px 8px 16px var(--nm-dark), -8px -8px 16px var(--nm-light);
          animation: cc-in 0.25s ease;
          background: var(--nm-bg);
        }
        .cc-toast.success { color: var(--clr-accent-700, #276749); }
        .cc-toast.error   { color: var(--clr-danger-500, #e53e3e); }

        /* ── Cloture modal ── */
        .cc-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.35);
          z-index: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .cc-modal {
          background: var(--nm-bg);
          border-radius: var(--radius-2xl);
          box-shadow: 16px 16px 32px var(--nm-dark), -16px -16px 32px var(--nm-light);
          padding: 2rem;
          max-width: 420px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cc-modal-title { font-size: 1.1rem; font-weight: 800; color: var(--nm-text-strong); margin: 0; }
        .cc-modal-body  { font-size: 0.8rem; color: var(--nm-text); line-height: 1.7; font-family: 'DM Mono', monospace; }
        .cc-modal-body strong { color: var(--nm-text-strong); }
        .cc-modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
        .cc-divider { height: 1px; background: linear-gradient(to right, transparent, var(--nm-dark), transparent); }

        /* ── Pending banner ── */
        .cc-pending-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem 1.1rem;
          border-radius: var(--radius-xl);
          background: rgba(217,119,6,0.08);
          border: 1px solid rgba(217,119,6,0.2);
          font-size: 0.78rem;
          color: #92400e;
          font-family: 'DM Mono', monospace;
          flex-wrap: wrap;
        }
        .cc-pending-banner strong { font-size: 0.88rem; }

        /* ── No office ── */
        .cc-no-office {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 4rem;
          color: var(--nm-text);
          opacity: 0.7;
          text-align: center;
          font-family: 'DM Mono', monospace;
          font-size: 0.82rem;
        }
        .cc-no-office-icon { font-size: 2.5rem; }

        @media (max-width: 640px) {
          .cc-body    { padding: 1rem; }
          .cc-header  { padding: 1rem; }
          .cc-tabs    { padding: 0.75rem 1rem 0; }
          .cc-form-row { flex-direction: column; }
        }
      `}</style>

      <div className="cc-root" data-style="neuro" data-mode="light">

        {/* ── HEADER ── */}
        <div className="cc-header">
          <div className="col gap-xs">
            <h1 className="cc-header-title">Charges &amp; Cashouts</h1>
            <p className="cc-header-sub">
              {selectedOffice ? `Bureau : ${selectedOffice} — ${currentMonthLabel()}` : 'Sélectionnez un bureau'}
            </p>
          </div>
          <div className="row align-center gap-md">
            {isOwner && (
              <OfficeSelector onOfficeSelect={(name) => setSelectedOffice(name)} />
            )}
            {selectedOffice && (
              <button className="cc-btn cloture" onClick={() => setShowCloture(true)}>
                🔒 Clôture du mois
              </button>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="cc-tabs">
          <button className={`cc-tab ${activeTab === 'charges' ? 'active' : ''}`} onClick={() => setActiveTab('charges')}>
            Charges
          </button>
          <button className={`cc-tab ${activeTab === 'cashouts' ? 'active' : ''}`} onClick={() => setActiveTab('cashouts')}>
            Cashouts
            {pendingCashouts.length > 0 && (
              <span style={{ marginLeft: '0.35rem', background: '#d97706', color: '#fff', borderRadius: '999px', fontSize: '0.58rem', padding: '0.1rem 0.4rem', fontWeight: 800 }}>
                {pendingCashouts.length}
              </span>
            )}
          </button>
        </div>

        {/* ── BODY ── */}
        {!selectedOffice ? (
          <div className="cc-no-office">
            <span className="cc-no-office-icon">🏢</span>
            <span>Sélectionnez un bureau pour voir ses données</span>
          </div>
        ) : (
          <div className="cc-body">

            {/* ════════════ CHARGES TAB ════════════ */}
            {activeTab === 'charges' && (
              <>
                {/* Summary */}
                <div className="cc-summary">
                  <div className="cc-card">
                    <span className="cc-card-label">Référence totale</span>
                    <span className="cc-card-val brand">{totalChargesRef.toLocaleString()} F</span>
                  </div>
                  <div className="cc-card">
                    <span className="cc-card-label">Fixes</span>
                    <span className="cc-card-val">{totalFix.toLocaleString()} F</span>
                  </div>
                  <div className="cc-card">
                    <span className="cc-card-label">Variables</span>
                    <span className="cc-card-val accent">{totalVariable.toLocaleString()} F</span>
                  </div>
                </div>

                {/* Section head */}
                <div className="cc-section-head">
                  <span className="cc-section-title">Catalogue des charges</span>
                  <button className="cc-btn primary" onClick={() => setShowNewCharge(!showNewCharge)}>
                    {showNewCharge ? '✕ Annuler' : '＋ Nouvelle charge'}
                  </button>
                </div>

                {/* New charge form */}
                {showNewCharge && (
                  <div className="cc-form">
                    <div className="cc-form-row">
                      <div className="cc-form-group" style={{ flex: 2 }}>
                        <label className="cc-label">Motif</label>
                        <input className="input" type="text" placeholder="Ex: Loyer bureau, Salaire agent…"
                          value={newCharge.motif}
                          onChange={e => setNewCharge(d => { d.motif = e.target.value; })} />
                      </div>
                      <div className="cc-form-group">
                        <label className="cc-label">Montant de référence (F)</label>
                        <input className="input" type="number" min="0" placeholder="0"
                          value={newCharge.montant || ''}
                          onChange={e => setNewCharge(d => { d.montant = Number(e.target.value); })} />
                      </div>
                      <div className="cc-form-group">
                        <label className="cc-label">Type</label>
                        <select className="input" value={newCharge.type}
                          onChange={e => setNewCharge(d => { d.type = e.target.value as 'fix' | 'not_fix'; })}>
                          <option value="fix">Fixe</option>
                          <option value="not_fix">Variable</option>
                        </select>
                      </div>
                    </div>
                    <div className="row justify-end">
                      <button className="cc-btn primary" onClick={handleCreateCharge} disabled={operating}>
                        {operating ? <span className="cc-spinner" /> : '✓ Enregistrer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Charge list */}
                {loadingCharges ? (
                  <div className="cc-empty"><span className="cc-spinner" /></div>
                ) : charges.length === 0 ? (
                  <div className="cc-empty">
                    <span className="cc-empty-icon">📋</span>
                    <span className="cc-empty-text">Aucune charge dans le catalogue</span>
                  </div>
                ) : (
                  <div className="cc-list">
                    {charges.map(c => (
                      <div key={c.id} className="cc-item">
                        <div className="cc-item-row">
                          <div className="cc-item-left">
                            <span className={`cc-type-badge ${c.type}`}>
                              {c.type === 'fix' ? 'Fixe' : 'Variable'}
                            </span>
                            <span className="cc-item-motif">{c.motif}</span>
                          </div>
                          <div className="row align-center gap-md">
                            <span className="cc-item-amount">{c.montant.toLocaleString()} F</span>
                            <div className="cc-item-actions">
                              {/* Bouton saisie mensuelle */}
                              <button
                                className={`cc-icon-btn ${openSaisieId === c.id ? 'active' : ''}`}
                                onClick={() => setOpenSaisieId(openSaisieId === c.id ? null : c.id)}
                                title="Enregistrer pour ce mois"
                              >📅</button>
                              {/* Bouton modifier modèle */}
                              <button
                                className={`cc-icon-btn ${editChargeId === c.id ? 'active' : ''}`}
                                onClick={() => {
                                  setEditChargeId(editChargeId === c.id ? null : c.id);
                                  setEditCharge(d => { d.motif = c.motif; d.montant = c.montant; });
                                  setOpenSaisieId(null);
                                }}
                                title="Modifier le modèle"
                              >✎</button>
                              <button className="cc-icon-btn del" onClick={() => handleDeleteCharge(c.id)} title="Supprimer">✕</button>
                            </div>
                          </div>
                        </div>

                        {/* Saisie mensuelle */}
                        {openSaisieId === c.id && (
                          <div className="cc-saisie-zone">
                            <span className="cc-saisie-hint">
                              Montant réel pour {currentMonthLabel()} — sera enregistré en cashout (en attente de clôture)
                            </span>
                            <div className="cc-form-group" style={{ maxWidth: 180 }}>
                              <label className="cc-label">Montant ce mois (F)</label>
                              <input className="input" type="number" min="0"
                                placeholder={String(c.montant)}
                                value={monthlySaisie[c.id] || ''}
                                onChange={e => setMonthlySaisie(prev => ({ ...prev, [c.id]: Number(e.target.value) }))} />
                            </div>
                            <button className="cc-btn primary" style={{ alignSelf: 'flex-end' }}
                              onClick={() => handleEnregistrerChargeMois(c)} disabled={operating}>
                              {operating ? <span className="cc-spinner" /> : '✓ Valider'}
                            </button>
                          </div>
                        )}

                        {/* Modifier modèle */}
                        {editChargeId === c.id && (
                          <div className="cc-edit-zone">
                            <div className="cc-form-group">
                              <label className="cc-label">Motif</label>
                              <input className="input" type="text" placeholder={c.motif}
                                value={editCharge.motif}
                                onChange={e => setEditCharge(d => { d.motif = e.target.value; })} />
                            </div>
                            <div className="cc-form-group">
                              <label className="cc-label">Montant de référence</label>
                              <input className="input" type="number" placeholder={String(c.montant)}
                                value={editCharge.montant || ''}
                                onChange={e => setEditCharge(d => { d.montant = Number(e.target.value); })} />
                            </div>
                            <button className="cc-btn primary" style={{ alignSelf: 'flex-end' }}
                              onClick={() => handleUpdateCharge(c.id)} disabled={operating}>
                              {operating ? <span className="cc-spinner" /> : '✓'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ════════════ CASHOUTS TAB ════════════ */}
            {activeTab === 'cashouts' && (
              <>
                {/* Summary */}
                <div className="cc-summary">
                  <div className="cc-card">
                    <span className="cc-card-label">Total (période)</span>
                    <span className="cc-card-val danger">{totalCashoutsFiltered.toLocaleString()} F</span>
                  </div>
                  <div className="cc-card">
                    <span className="cc-card-label">En attente clôture</span>
                    <span className="cc-card-val warn">{totalPending.toLocaleString()} F</span>
                  </div>
                  <div className="cc-card">
                    <span className="cc-card-label">Opérations</span>
                    <span className="cc-card-val">{filteredCashouts.length}</span>
                  </div>
                </div>

                {/* Pending banner */}
                {pendingCashouts.length > 0 && (
                  <div className="cc-pending-banner">
                    <span>⏳ <strong>{pendingCashouts.length} cashout(s)</strong> en attente de clôture — {totalPending.toLocaleString()} F</span>
                    <button className="cc-btn cloture" onClick={() => setShowCloture(true)}>
                      🔒 Clôturer maintenant
                    </button>
                  </div>
                )}

                {/* Section head */}
                <div className="cc-section-head">
                  <span className="cc-section-title">Dépenses spontanées</span>
                  <button className="cc-btn primary" onClick={() => setShowNewCashout(!showNewCashout)}>
                    {showNewCashout ? '✕ Annuler' : '＋ Nouvelle dépense'}
                  </button>
                </div>

                {/* New cashout form */}
                {showNewCashout && (
                  <div className="cc-form">
                    <div className="cc-form-row">
                      <div className="cc-form-group" style={{ flex: 2 }}>
                        <label className="cc-label">Motif</label>
                        <input className="input" type="text" placeholder="Ex: Réparation clim, Transport…"
                          value={newCashout.motif}
                          onChange={e => setNewCashout(d => { d.motif = e.target.value; })} />
                      </div>
                      <div className="cc-form-group">
                        <label className="cc-label">Montant (F)</label>
                        <input className="input" type="number" min="0" placeholder="0"
                          value={newCashout.montant || ''}
                          onChange={e => setNewCashout(d => { d.montant = Number(e.target.value); })} />
                      </div>
                      <div className="cc-form-group">
                        <label className="cc-label">Date (optionnelle)</label>
                        <input className="input" type="date"
                          value={newCashout.date}
                          onChange={e => setNewCashout(d => { d.date = e.target.value; })} />
                      </div>
                    </div>
                    <div className="row justify-end">
                      <button className="cc-btn primary" onClick={handleCreateCashout} disabled={operating}>
                        {operating ? <span className="cc-spinner" /> : '✓ Enregistrer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Filter bar */}
                <div className="cc-filter-bar">
                  <span className="cc-section-title" style={{ marginRight: '0.25rem' }}>Période :</span>
                  {(['week', 'month', 'custom'] as CashoutFilter[]).map(f => (
                    <button key={f} className={`cc-filter-chip ${cashoutFilter === f ? 'active' : ''}`}
                      onClick={() => setCashoutFilter(f)}>
                      {f === 'week' ? 'Cette semaine' : f === 'month' ? 'Ce mois' : 'Personnalisé'}
                    </button>
                  ))}
                  {cashoutFilter === 'custom' && (
                    <div className="cc-custom-dates">
                      <input className="input" type="date" style={{ width: 'auto', fontSize: '0.75rem' }}
                        value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--nm-text)' }}>→</span>
                      <input className="input" type="date" style={{ width: 'auto', fontSize: '0.75rem' }}
                        value={customTo} onChange={e => setCustomTo(e.target.value)} />
                    </div>
                  )}
                </div>

                {/* Cashout list */}
                {loadingCashouts ? (
                  <div className="cc-empty"><span className="cc-spinner" /></div>
                ) : filteredCashouts.length === 0 ? (
                  <div className="cc-empty">
                    <span className="cc-empty-icon">💸</span>
                    <span className="cc-empty-text">Aucun cashout sur cette période</span>
                  </div>
                ) : (
                  <div className="cc-list">
                    {filteredCashouts.map(c => (
                      <div key={c.id} className="cc-item">
                        <div className="cc-item-row">
                          <div className="cc-item-left">
                            <span className={`cc-status-badge ${c.is_paid ? 'paid' : c.motif.startsWith('[Charge]') ? 'pending' : 'auto'}`}>
                              {c.is_paid ? '✓ Soldé' : c.motif.startsWith('[Charge]') ? '⏳ En attente' : '✓ Auto'}
                            </span>
                            <span className="cc-item-motif">{c.motif}</span>
                          </div>
                          <div className="row align-center gap-md">
                            <div className="col align-end gap-xs">
                              <span className={`cc-item-amount ${!c.is_paid && c.motif.startsWith('[Charge]') ? 'pending' : 'danger'}`}>
                                {c.montant.toLocaleString()} F
                              </span>
                              <span className="cc-item-meta">{(c.created_at ?? '').split('T')[0]}</span>
                            </div>
                            <div className="cc-item-actions">
                              <button className={`cc-icon-btn ${editCashoutId === c.id ? 'active' : ''}`}
                                onClick={() => {
                                  setEditCashoutId(editCashoutId === c.id ? null : c.id);
                                  setEditCashout(d => { d.motif = c.motif; d.montant = c.montant; });
                                }} title="Modifier">✎</button>
                              <button className="cc-icon-btn del" onClick={() => handleDeleteCashout(c.id)} title="Supprimer">✕</button>
                            </div>
                          </div>
                        </div>

                        {editCashoutId === c.id && (
                          <div className="cc-edit-zone">
                            <div className="cc-form-group">
                              <label className="cc-label">Motif</label>
                              <input className="input" type="text" placeholder={c.motif}
                                value={editCashout.motif}
                                onChange={e => setEditCashout(d => { d.motif = e.target.value; })} />
                            </div>
                            <div className="cc-form-group">
                              <label className="cc-label">Montant</label>
                              <input className="input" type="number" placeholder={String(c.montant)}
                                value={editCashout.montant || ''}
                                onChange={e => setEditCashout(d => { d.montant = Number(e.target.value); })} />
                            </div>
                            <button className="cc-btn primary" style={{ alignSelf: 'flex-end' }}
                              onClick={() => handleUpdateCashout(c.id)} disabled={operating}>
                              {operating ? <span className="cc-spinner" /> : '✓'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* ── CLOTURE MODAL ── */}
        {showCloture && (
          <div className="cc-overlay" onClick={() => setShowCloture(false)}>
            <div className="cc-modal" onClick={e => e.stopPropagation()}>
              <h2 className="cc-modal-title">🔒 Clôture du mois — {currentMonthLabel()}</h2>
              <div className="cc-divider" />
              <p className="cc-modal-body">
                Cette action va marquer comme <strong>soldés</strong> tous les cashouts en attente du bureau <strong>{selectedOffice}</strong>.<br /><br />
                • <strong>{pendingCashouts.length}</strong> cashout(s) concerné(s)<br />
                • Montant total : <strong>{totalPending.toLocaleString()} F</strong><br /><br />
                Les données sont conservées intégralement pour l'historique et les statistiques.<br />
                Les modèles de charges restent inchangés.
              </p>
              <div className="cc-modal-actions">
                <button className="cc-btn" onClick={() => setShowCloture(false)}>Annuler</button>
                <button className="cc-btn cloture" onClick={handleCloture} disabled={operating}>
                  {operating ? <span className="cc-spinner" /> : '✓ Confirmer la clôture'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOAST ── */}
        {toast && (
          <div className={`cc-toast ${toast.kind}`}>
            {toast.kind === 'success' ? '✓' : '⚠'} {toast.message}
          </div>
        )}

      </div>
    </>
  );
}