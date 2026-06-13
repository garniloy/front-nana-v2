// ─── backend ──────────────────────────────────────────────────────────────────
const backendUrl = 'https://backend-nana-v2-production.up.railway.app';

async function createDataToTable(table: string, fields: object) {
  const response = await fetch(backendUrl + '/crud/create/' + table, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return response.json();
}

async function updateDataInTable(table: string, fields: object, constraints: object) {
  const body = { set: fields, where: constraints };
  const response = await fetch(backendUrl + '/crud/update/' + table, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

const getDataFromTableWithConstraints = async (table: string, body: object) => {
  const res = await fetch(backendUrl + '/crud/getwith/' + table, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

// ─── imports ──────────────────────────────────────────────────────────────────
import '../css/form.css';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';
import OfficeSelector from './Office-selector';

// ─── types ────────────────────────────────────────────────────────────────────
type ProdServ = {
  id: number;
  nom: string;
  type: 'prod' | 'serv';
  pr_stock: number;
  pr_distr: number;
  pr_clt: number;
  pv: number;
  modifier: string;
  last_modification: string;
};

type RefProdServ = {
  id: number;
  prod_serv_id: number | null;
  nom: string;
  type: 'prod' | 'serv';
  pr_stock: number;
  pr_distr: number;
  pr_clt: number;
  pv: number;
  modifier: string;
  last_modification: string;
  office: string;
  is_deleted: boolean;
};

type StockItem = {
  id?: number;
  ref_prod_serv_id: number;
  name: string;
  office: string;
  qte: number;
};

type View = 'list' | 'detail' | 'form' | 'stock';

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtAmount(n: number) {
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const getInitialForm = (): Omit<
  RefProdServ,
  'id' | 'office' | 'is_deleted' | 'prod_serv_id' | 'modifier' | 'last_modification'
> => ({
  nom: '',
  type: 'prod',
  pr_stock: 0,
  pr_distr: 0,
  pr_clt: 0,
  pv: 0,
});

// ─── responsive styles ─────────────────────────────────────────────────────────
const PSM_STYLES = `
  @media (max-width: 768px) {
    .psm-header {
      flex-direction: column;
      align-items: stretch !important;
      gap: 0.75rem;
    }
    .psm-header > .row {
      flex-wrap: wrap;
      justify-content: stretch;
    }
    .psm-header .row.gap-sm.align-center {
      width: 100%;
    }
  }

  @media (max-width: 640px) {
    .psm-toolbar {
      flex-direction: column;
      align-items: stretch !important;
    }
    .psm-toolbar > input,
    .psm-toolbar > div {
      width: 100%;
    }

    .psm-sync-banner {
      flex-direction: column;
      align-items: stretch !important;
    }
    .psm-sync-banner > .row {
      width: 100%;
      justify-content: space-between;
    }

    .psm-grid-2 {
      grid-template-columns: 1fr !important;
    }

    .psm-row {
      flex-wrap: wrap;
    }
    .psm-row > .row.gap-xs.align-center {
      width: 100%;
      justify-content: space-between;
      margin-top: 0.4rem;
    }

    .psm-restore-modal {
      max-width: 100% !important;
      margin: 0.5rem;
    }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
export default function ProdServManager() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const connected = localStorage.getItem('connected');

  useEffect(() => {
    if (!connected || !user) {
      localStorage.removeItem('user');
      localStorage.removeItem('connected');
      navigate('/login');
    }
  }, [connected, user, navigate]);

  const showOfficeSelector = user?.owner === true;
  const canEdit = user?.owner === true || user?.role === 'superuser';

  // ── navigation ────────────────────────────────────────────────────────────
  const [view, setView] = useState<View>('list');
  const [selectedItem, setSelectedItem] = useState<RefProdServ | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string>(
    showOfficeSelector ? '' : user?.office ?? '',
  );

  // ── list state ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<RefProdServ[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'prod' | 'serv'>('all');

  // ── sync state ────────────────────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // ── form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useImmer(getInitialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // ── edit state (detail view) ──────────────────────────────────────────────
  const [editForm, setEditForm] = useImmer<Partial<RefProdServ>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // ── restore modal state ───────────────────────────────────────────────────
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [deletedItems, setDeletedItems] = useState<RefProdServ[]>([]);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  // ── stock state ───────────────────────────────────────────────────────────
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  // editing: map of ref_prod_serv_id -> draft qte string
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({});
  const [stockSaving, setStockSaving] = useState<number | null>(null);
  const [stockSuccess, setStockSuccess] = useState<number | null>(null);

  // ─── fetch ref items ───────────────────────────────────────────────────────
  const fetchItems = useCallback(async (office: string) => {
    if (!office) return;
    setListLoading(true);
    try {
      const res = await getDataFromTableWithConstraints('ref_prod_serv', {
        fields: [
          'id', 'prod_serv_id', 'nom', 'type', 'pr_stock', 'pr_distr',
          'pr_clt', 'pv', 'modifier', 'last_modification', 'office', 'is_deleted',
        ],
        constraints: { office, is_deleted: false },
      });
      if (res.success) setItems(res.list ?? []);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    const office = showOfficeSelector ? selectedOffice : user?.office ?? '';
    fetchItems(office);
  }, [selectedOffice]);

  // ─── fetch stock ───────────────────────────────────────────────────────────
  const fetchStock = useCallback(async (office: string) => {
    if (!office) return;
    setStockLoading(true);
    try {
      const res = await getDataFromTableWithConstraints('stock', {
        fields: ['ref_prod_serv_id', 'name', 'office', 'qte'],
        constraints: { office },
      });
      if (res.success) setStockItems(res.list ?? []);
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'stock') {
      const office = showOfficeSelector ? selectedOffice : user?.office ?? '';
      fetchStock(office);
    }
  }, [view, selectedOffice]);

  // ─── fetch deleted items for restore modal ────────────────────────────────
  const fetchDeletedItems = useCallback(async (office: string) => {
    if (!office) return;
    setRestoreLoading(true);
    try {
      const res = await getDataFromTableWithConstraints('ref_prod_serv', {
        fields: [
          'id', 'prod_serv_id', 'nom', 'type', 'pr_stock', 'pr_distr',
          'pr_clt', 'pv', 'modifier', 'last_modification', 'office', 'is_deleted',
        ],
        constraints: { office, is_deleted: true },
      });
      if (res.success) setDeletedItems(res.list ?? []);
    } finally {
      setRestoreLoading(false);
    }
  }, []);

  const openRestoreModal = () => {
    const office = showOfficeSelector ? selectedOffice : user?.office ?? '';
    fetchDeletedItems(office);
    setShowRestoreModal(true);
  };

  // ─── restore a single item ─────────────────────────────────────────────────
  const handleRestore = async (item: RefProdServ) => {
    setRestoringId(item.id);
    try {
      const res = await updateDataInTable(
        'ref_prod_serv',
        { is_deleted: false, modifier: user.id, last_modification: 'now()' },
        { id: item.id },
      );
      if (res.success === false) throw new Error(res.message);
      setDeletedItems((prev) => prev.filter((d) => d.id !== item.id));
      setItems((prev) => [...prev, { ...item, is_deleted: false }]);
    } finally {
      setRestoringId(null);
    }
  };

  // ─── sync logic ────────────────────────────────────────────────────────────
  const handleSync = async () => {
    const office = showOfficeSelector ? selectedOffice : user?.office ?? '';
    if (!office) { setSyncMessage("Sélectionnez un bureau d'abord."); return; }

    setSyncing(true);
    setSyncMessage('');
    try {
      // 1. fetch all prod_serv
      const psRes = await getDataFromTableWithConstraints('prod_serv', {
        fields: ['id', 'nom', 'type', 'pr_stock', 'pr_distr', 'pr_clt', 'pv', 'modifier', 'last_modification'],
        constraints: {},
      });
      if (!psRes.success) throw new Error('Impossible de lire prod_serv');
      const allPS: ProdServ[] = psRes.list ?? [];

      // 2. fetch existing ref_prod_serv for this office (including deleted)
      const refRes = await getDataFromTableWithConstraints('ref_prod_serv', {
        fields: ['id', 'prod_serv_id'],
        constraints: { office },
      });
      const existingPsIds = new Set<number>(
        (refRes.list ?? [])
          .map((r: RefProdServ) => r.prod_serv_id)
          .filter((id: number | null) => id !== null),
      );

      // 3. fetch existing stock entries for this office
      const stockRes = await getDataFromTableWithConstraints('stock', {
        fields: ['ref_prod_serv_id'],
        constraints: { office },
      });
      const existingStockRefIds = new Set<number>(
        (stockRes.list ?? []).map((s: StockItem) => s.ref_prod_serv_id),
      );

      // 4. find new prod_serv entries not yet in ref for this office
      const toInsert = allPS.filter((ps) => !existingPsIds.has(ps.id));

      if (toInsert.length === 0) {
        setSyncMessage('Répertoire déjà à jour — aucun nouveau produit/service.');
        setSyncing(false);
        return;
      }

      // 5. insert each missing one into ref_prod_serv, then init stock if prod
      let stockInitCount = 0;
      for (const ps of toInsert) {
        const refData = await createDataToTable('ref_prod_serv', {
          prod_serv_id: ps.id,
          nom: ps.nom,
          type: ps.type,
          pr_stock: ps.pr_stock,
          pr_distr: ps.pr_distr,
          pr_clt: ps.pr_clt,
          pv: ps.pv,
          modifier: user.id,
          last_modification: 'now()',
          office,
          is_deleted: false,
        });

        // 6. init stock entry for products only (not services)
        if (ps.type === 'prod' && refData.success !== false) {
          const newRefId = refData.id ?? null;
          if (newRefId && !existingStockRefIds.has(newRefId)) {
            await createDataToTable('stock', {
              ref_prod_serv_id: newRefId,
              name: ps.nom,
              office,
              qte: 0,
            });
            stockInitCount++;
          }
        }
      }

      setSyncMessage(
        `${toInsert.length} produit(s)/service(s) ajouté(s)` +
        (stockInitCount > 0 ? ` · ${stockInitCount} stock(s) initialisé(s) à 0` : '') +
        '.',
      );
      fetchItems(office);
    } catch (err: any) {
      setSyncMessage('Erreur de synchronisation : ' + err.message);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  // ─── form validation ───────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nom.trim()) errs.nom = 'Nom requis';
    if (!form.type) errs.type = 'Type requis';
    if (isNaN(Number(form.pv)) || Number(form.pv) < 0) errs.pv = 'Prix de vente invalide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── create new prod/serv — catalogue only, sync will handle ref + stock ──
  const handleSubmit = async () => {
    setSuccess('');
    if (!validate()) return;
    setLoading(true);
    try {
      // Insert only into prod_serv (global catalogue).
      // Sync button will clone into ref_prod_serv + init stock.
      const psData = await createDataToTable('prod_serv', {
        nom: form.nom,
        type: form.type,
        pr_stock: Number(form.pr_stock),
        pr_distr: Number(form.pr_distr),
        pr_clt: Number(form.pr_clt),
        pv: Number(form.pv),
        modifier: user.id,
        last_modification: 'now()',
      });
      if (psData.success === false) throw new Error(psData.message || 'Erreur prod_serv');

      setSuccess(
        '✓ Produit ajouté au catalogue global. Cliquez sur « Actualiser » pour l\'intégrer au répertoire de ce bureau.',
      );
      setForm(getInitialForm());
      setTimeout(() => { setSuccess(''); setView('list'); }, 3500);
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setErrors({}), 4000);
    }
  };

  // ─── open detail + prefill edit form ──────────────────────────────────────
  const openDetail = (item: RefProdServ) => {
    setSelectedItem(item);
    setEditForm({
      nom: item.nom,
      type: item.type,
      pr_stock: item.pr_stock,
      pr_distr: item.pr_distr,
      pr_clt: item.pr_clt,
      pv: item.pv,
    });
    setEditSuccess('');
    setEditErrors({});
    setView('detail');
  };

  // ─── save edits ────────────────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!selectedItem) return;
    const errs: Record<string, string> = {};
    if (!editForm.nom?.trim()) errs.nom = 'Nom requis';
    if (isNaN(Number(editForm.pv)) || Number(editForm.pv) < 0) errs.pv = 'Prix invalide';
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setEditLoading(true);
    setEditSuccess('');
    try {
      const res = await updateDataInTable(
        'ref_prod_serv',
        {
          nom: editForm.nom,
          type: editForm.type,
          pr_stock: Number(editForm.pr_stock),
          pr_distr: Number(editForm.pr_distr),
          pr_clt: Number(editForm.pr_clt),
          pv: Number(editForm.pv),
          modifier: user.id,
          last_modification: 'now()',
        },
        { id: selectedItem.id },
      );
      if (res.success === false) throw new Error(res.message || 'Erreur serveur');

      // If it's a product and name changed, update stock name too
      const nameChanged = editForm.nom !== selectedItem.nom;
      if (selectedItem.type === 'prod' && nameChanged) {
        await updateDataInTable(
          'stock',
          { name: editForm.nom },
          { ref_prod_serv_id: selectedItem.id },
        );
      }

      setEditSuccess('Modifications enregistrées');
      setItems((prev) =>
        prev.map((it) =>
          it.id === selectedItem.id
            ? { ...it, ...editForm, modifier: user.id, last_modification: new Date().toISOString() }
            : it,
        ),
      );
      setSelectedItem((prev) =>
        prev
          ? { ...prev, ...editForm, modifier: user.id, last_modification: new Date().toISOString() }
          : prev,
      );
      // Also sync name in local stockItems if present
      if (selectedItem.type === 'prod' && nameChanged) {
        setStockItems((prev) =>
          prev.map((s) =>
            s.ref_prod_serv_id === selectedItem.id ? { ...s, name: editForm.nom ?? s.name } : s,
          ),
        );
      }
      setTimeout(() => setEditSuccess(''), 2500);
    } catch (err: any) {
      setEditErrors({ global: err.message });
    } finally {
      setEditLoading(false);
    }
  };

  // ─── soft delete ───────────────────────────────────────────────────────────
  const handleDelete = async (item: RefProdServ) => {
    if (!window.confirm(`Supprimer "${item.nom}" du répertoire de ce bureau ?`)) return;
    try {
      await updateDataInTable('ref_prod_serv', { is_deleted: true }, { id: item.id });
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      if (view === 'detail') setView('list');
    } catch {
      // silently ignore
    }
  };

  // ─── stock inline edit ────────────────────────────────────────────────────
  const handleStockEdit = (refId: number, value: string) => {
    setStockEdits((prev) => ({ ...prev, [refId]: value }));
  };

  const handleStockSave = async (item: StockItem) => {
    const draft = stockEdits[item.ref_prod_serv_id];
    if (draft === undefined) return;
    const newQte = parseInt(draft, 10);
    if (isNaN(newQte) || newQte < 0) return;

    setStockSaving(item.ref_prod_serv_id);
    try {
      const res = await updateDataInTable(
        'stock',
        { qte: newQte },
        { ref_prod_serv_id: item.ref_prod_serv_id },
      );
      if (res.success === false) throw new Error(res.message);
      setStockItems((prev) =>
        prev.map((s) =>
          s.ref_prod_serv_id === item.ref_prod_serv_id ? { ...s, qte: newQte } : s,
        ),
      );
      setStockEdits((prev) => {
        const next = { ...prev };
        delete next[item.ref_prod_serv_id];
        return next;
      });
      setStockSuccess(item.ref_prod_serv_id);
      setTimeout(() => setStockSuccess(null), 1800);
    } catch {
      // silently ignore
    } finally {
      setStockSaving(null);
    }
  };

  // ─── filtered list ─────────────────────────────────────────────────────────
  const filteredItems = items.filter((it) => {
    const matchSearch = it.nom.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || it.type === filterType;
    return matchSearch && matchType;
  });

  const filteredStock = stockItems.filter((s) =>
    s.name.toLowerCase().includes(stockSearch.toLowerCase()),
  );

  // ─── office change ─────────────────────────────────────────────────────────
  const handleOfficeSelect = (office: string) => {
    setSelectedOffice(office);
    setView('list');
    setSelectedItem(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main
      className="col align-center justify-center"
      data-style="neuro"
      data-mode="light"
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <style>{PSM_STYLES}</style>

      <div
        className="surface col gap-md"
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="row align-center justify-between psm-header" style={{ padding: '0 0.25rem', flexShrink: 0 }}>
          <div className="col gap-xs">
            <h2 className="text-heading text-2xl">Produits & Services</h2>
            <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {view === 'list' && `${filteredItems.length} article${filteredItems.length !== 1 ? 's' : ''}`}
              {view === 'form' && 'Nouveau produit / service'}
              {view === 'detail' && selectedItem?.nom}
              {view === 'stock' && `${filteredStock.length} produit${filteredStock.length !== 1 ? 's' : ''} en stock`}
            </p>
          </div>

          <div className="row gap-sm align-center">
            {showOfficeSelector && (
              <OfficeSelector onOfficeSelect={handleOfficeSelect} />
            )}

            {/* Tab pills */}
            <div
              className="row gap-xs"
              style={{
                background: 'var(--color-background-secondary)',
                borderRadius: '0.5rem',
                padding: '0.2rem',
              }}
            >
              <button
                className={`btn btn-sm${view === 'list' ? ' btn-primary' : ' btn-ghost'}`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => { setView('list'); setSelectedItem(null); }}
              >
                Liste
              </button>
              {canEdit && (
                <>
                  <button
                    className={`btn btn-sm${view === 'stock' ? ' btn-primary' : ' btn-ghost'}`}
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => { setView('stock'); setSelectedItem(null); }}
                  >
                    📦 Stock
                  </button>
                  <button
                    className={`btn btn-sm${view === 'form' ? ' btn-primary' : ' btn-ghost'}`}
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => setView('form')}
                  >
                    + Nouveau
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="divider" style={{ flexShrink: 0 }} />

        {/* ── BODY ────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ═══ LIST VIEW ════════════════════════════════════════════════ */}
          {view === 'list' && (
            <div className="col gap-md" style={{ height: '100%', overflow: 'hidden' }}>

              {/* toolbar */}
              <div className="row gap-sm align-center psm-toolbar" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
                <input
                  className="input"
                  style={{ flex: 1, minWidth: '8rem' }}
                  placeholder="Rechercher par nom…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                {/* type filter */}
                <div
                  className="row gap-xs"
                  style={{
                    background: 'var(--color-background-secondary)',
                    borderRadius: '0.5rem',
                    padding: '0.2rem',
                    flexShrink: 0,
                  }}
                >
                  {(['all', 'prod', 'serv'] as const).map((t) => (
                    <button
                      key={t}
                      className={`btn btn-sm${filterType === t ? ' btn-primary' : ' btn-ghost'}`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setFilterType(t)}
                    >
                      {t === 'all' ? 'Tous' : t === 'prod' ? 'Produits' : 'Services'}
                    </button>
                  ))}
                </div>

                {/* refresh */}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => fetchItems(showOfficeSelector ? selectedOffice : user?.office ?? '')}
                  title="Rafraîchir"
                >
                  ↻
                </button>
              </div>

              {/* sync banner */}
              {canEdit && (
                <div
                  className="surface-inset row align-center justify-between gap-sm psm-sync-banner"
                  style={{ padding: '0.6rem 0.85rem', borderRadius: '0.6rem', flexShrink: 0 }}
                >
                  <div className="col gap-xs">
                    <p className="text-label" style={{ margin: 0, fontSize: '0.8rem' }}>
                      Synchroniser le répertoire
                    </p>
                    <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                      Importe les nouveaux produits/services depuis le catalogue global et initialise les stocks
                    </p>
                    {syncMessage && (
                      <p
                        className="text-body text-sm"
                        style={{
                          margin: 0,
                          color: syncMessage.startsWith('Erreur')
                            ? 'var(--color-danger)'
                            : 'var(--color-success)',
                        }}
                      >
                        {syncMessage}
                      </p>
                    )}
                  </div>
                  <div className="row gap-xs align-center">
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.78rem' }}
                      onClick={openRestoreModal}
                      title="Restaurer des articles supprimés"
                    >
                      🗄 Corbeille
                    </button>
                    <button
                      className={`btn btn-primary btn-sm${syncing ? ' opacity-75' : ''}`}
                      disabled={syncing}
                      onClick={handleSync}
                      style={{ flexShrink: 0 }}
                    >
                      {syncing ? 'Synchro…' : '⟳ Actualiser'}
                    </button>
                  </div>
                </div>
              )}

              {/* list body */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {listLoading ? (
                  <div className="col align-center justify-center" style={{ height: '10rem' }}>
                    <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Chargement…
                    </p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="col align-center justify-center" style={{ height: '10rem', gap: '0.75rem' }}>
                    <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                      {search
                        ? 'Aucun résultat pour cette recherche.'
                        : items.length === 0
                          ? 'Répertoire vide pour ce bureau.'
                          : 'Aucun article correspondant au filtre.'}
                    </p>
                    {items.length === 0 && canEdit && (
                      <button className="btn btn-primary btn-sm" onClick={handleSync} disabled={syncing}>
                        {syncing ? 'Synchro…' : '⟳ Initialiser le répertoire'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="col gap-sm">
                    {filteredItems.map((it) => (
                      <ProdServRow
                        key={it.id}
                        item={it}
                        canEdit={canEdit}
                        onClick={() => openDetail(it)}
                        onDelete={() => handleDelete(it)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ STOCK VIEW ═══════════════════════════════════════════════ */}
          {view === 'stock' && (
            <div className="col gap-md" style={{ height: '100%', overflow: 'hidden' }}>

              {/* toolbar */}
              <div className="row gap-sm align-center" style={{ flexShrink: 0 }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="Rechercher un produit…"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => fetchStock(showOfficeSelector ? selectedOffice : user?.office ?? '')}
                  title="Rafraîchir"
                >
                  ↻
                </button>
              </div>

              {/* stock list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {stockLoading ? (
                  <div className="col align-center justify-center" style={{ height: '10rem' }}>
                    <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Chargement…
                    </p>
                  </div>
                ) : filteredStock.length === 0 ? (
                  <div className="col align-center justify-center" style={{ height: '10rem', gap: '0.75rem' }}>
                    <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                      {stockItems.length === 0
                        ? 'Aucun stock initialisé. Cliquez sur « Actualiser » dans la liste.'
                        : 'Aucun produit correspondant.'}
                    </p>
                  </div>
                ) : (
                  <div className="col gap-sm">
                    {filteredStock.map((item) => {
                      const isDirty = stockEdits[item.ref_prod_serv_id] !== undefined;
                      const isSaving = stockSaving === item.ref_prod_serv_id;
                      const isOk = stockSuccess === item.ref_prod_serv_id;
                      const currentQte = isDirty
                        ? stockEdits[item.ref_prod_serv_id]
                        : String(item.qte);
                      const isLow = item.qte <= 2;

                      return (
                        <div
                          key={item.ref_prod_serv_id}
                          className="surface-inset row align-center gap-md psm-row"
                          style={{
                            padding: '0.65rem 0.85rem',
                            borderRadius: '0.6rem',
                            borderLeft: isLow ? '3px solid var(--color-warning, #f59e0b)' : undefined,
                          }}
                        >
                          {/* icon */}
                          <div
                            style={{
                              width: '2.4rem',
                              height: '2.4rem',
                              borderRadius: '0.5rem',
                              background: 'var(--color-background-brand)',
                              color: 'var(--color-text-brand)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              flexShrink: 0,
                            }}
                          >
                            PRD
                          </div>

                          {/* name */}
                          <div className="col gap-xs" style={{ flex: 1, minWidth: 0 }}>
                            <p
                              className="text-label"
                              style={{
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.name}
                            </p>
                            {isLow && !isDirty && (
                              <p
                                className="text-body text-sm"
                                style={{ margin: 0, color: 'var(--color-warning, #f59e0b)', fontSize: '0.72rem' }}
                              >
                                ⚠ Stock faible
                              </p>
                            )}
                          </div>

                          {/* inline edit */}
                          <div className="row gap-xs align-center" style={{ flexShrink: 0 }}>
                            <input
                              type="number"
                              min={0}
                              className="input"
                              style={{ width: '5rem', textAlign: 'center', padding: '0.3rem 0.5rem' }}
                              value={currentQte}
                              onChange={(e) => handleStockEdit(item.ref_prod_serv_id, e.target.value)}
                            />
                            <span className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              unité{item.qte !== 1 ? 's' : ''}
                            </span>
                            {isDirty && (
                              <button
                                className={`btn btn-primary btn-sm${isSaving ? ' opacity-75' : ''}`}
                                disabled={isSaving}
                                onClick={() => handleStockSave(item)}
                                style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                              >
                                {isSaving ? '…' : isOk ? '✓' : '✓ Confirmer'}
                              </button>
                            )}
                            {!isDirty && isOk && (
                              <span style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}>✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ DETAIL VIEW ══════════════════════════════════════════════ */}
          {view === 'detail' && selectedItem && (
            <div className="col gap-md" style={{ height: '100%', overflow: 'hidden' }}>
              <div className="row align-center justify-between" style={{ flexShrink: 0 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setView('list'); setSelectedItem(null); }}
                >
                  ← Retour
                </button>
                {canEdit && (
                  <button
                    className="btn btn-sm"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={() => handleDelete(selectedItem)}
                  >
                    Supprimer
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* type badge */}
                <div className="row align-center gap-sm" style={{ flexShrink: 0 }}>
                  <span
                    className={`badge ${selectedItem.type === 'prod' ? 'badge-brand' : 'badge-info'}`}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {selectedItem.type === 'prod' ? 'Produit' : 'Service'}
                  </span>
                  <p className="text-body text-sm" style={{ color: 'var(--color-text-tertiary)', margin: 0 }}>
                    Modifié le {fmtDate(selectedItem.last_modification)} · par {selectedItem.modifier}
                  </p>
                </div>

                {/* ── inline edit form ─────────────────────────────────── */}
                {canEdit ? (
                  <div className="col gap-md">

                    {/* Nom */}
                    <div className="col gap-xs">
                      <label className="text-label">Nom</label>
                      <input
                        className="input"
                        value={editForm.nom ?? ''}
                        onChange={(e) => setEditForm((d) => { d.nom = e.target.value; })}
                      />
                      {editErrors.nom && <span className="badge badge-danger">{editErrors.nom}</span>}
                    </div>

                    {/* Type */}
                    <div className="col gap-xs">
                      <label className="text-label">Type</label>
                      <div className="row gap-md">
                        <button
                          className={`btn w-full justify-center${editForm.type === 'prod' ? ' btn-primary' : ''}`}
                          onClick={() => setEditForm((d) => { d.type = 'prod'; })}
                        >
                          Produit
                        </button>
                        <button
                          className={`btn w-full justify-center${editForm.type === 'serv' ? ' btn-primary' : ''}`}
                          onClick={() => setEditForm((d) => { d.type = 'serv'; })}
                        >
                          Service
                        </button>
                      </div>
                    </div>

                    {/* Prix — grid 2 cols */}
                    <div className="psm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {(
                        [
                          { key: 'pr_stock', label: 'Prix stock' },
                          { key: 'pr_distr', label: 'Prix distributeur' },
                          { key: 'pr_clt', label: 'Prix client' },
                          { key: 'pv', label: 'Prix de vente (PV)' },
                        ] as const
                      ).map(({ key, label }) => (
                        <div key={key} className="col gap-xs">
                          <label className="text-label">{label}</label>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            value={editForm[key] ?? 0}
                            onChange={(e) => setEditForm((d) => { (d as any)[key] = e.target.value; })}
                          />
                        </div>
                      ))}
                    </div>
                    {editErrors.pv && <span className="badge badge-danger">{editErrors.pv}</span>}

                    {editErrors.global && (
                      <span className="badge badge-danger w-full" style={{ justifyContent: 'center' }}>
                        {editErrors.global}
                      </span>
                    )}
                    {editSuccess && (
                      <span className="badge badge-success w-full" style={{ justifyContent: 'center' }}>
                        {editSuccess}
                      </span>
                    )}

                    <button
                      className={`btn btn-primary w-full justify-center${editLoading ? ' opacity-75' : ''}`}
                      disabled={editLoading}
                      onClick={handleEditSave}
                    >
                      {editLoading ? 'Enregistrement…' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                ) : (
                  /* read-only view for managers */
                  <div className="psm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    {(
                      [
                        { label: 'Nom', value: selectedItem.nom },
                        { label: 'Type', value: selectedItem.type === 'prod' ? 'Produit' : 'Service' },
                        { label: 'Prix stock', value: fmtAmount(selectedItem.pr_stock) },
                        { label: 'Prix distributeur', value: fmtAmount(selectedItem.pr_distr) },
                        { label: 'Prix client', value: fmtAmount(selectedItem.pr_clt) },
                        { label: 'Prix de vente', value: fmtAmount(selectedItem.pv) },
                      ]
                    ).map(({ label, value }) => (
                      <div
                        key={label}
                        className="surface-inset col gap-xs"
                        style={{ padding: '0.65rem 0.85rem', borderRadius: '0.5rem' }}
                      >
                        <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                          {label}
                        </p>
                        <p className="text-label" style={{ margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ FORM VIEW (create) ═══════════════════════════════════════ */}
          {view === 'form' && (
            <div className="col gap-md" style={{ height: '100%', overflow: 'hidden' }}>

              {/* info banner */}
              <div
                className="surface-inset"
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '0.6rem',
                  borderLeft: '3px solid var(--color-brand)',
                  flexShrink: 0,
                }}
              >
                <p className="text-body text-sm" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  💡 Le produit sera ajouté au catalogue global. Cliquez ensuite sur{' '}
                  <strong>« ⟳ Actualiser »</strong> dans la liste pour l'intégrer au répertoire de ce bureau et initialiser son stock.
                </p>
              </div>

              <div className="form-field" style={{ overflow: 'auto', padding: '0.3rem', flex: 1 }}>

                {/* Nom */}
                <div className="col gap-xs">
                  <label className="text-label">Nom</label>
                  <input
                    className="input"
                    placeholder="Nom du produit ou service"
                    value={form.nom}
                    onChange={(e) => setForm((d) => { d.nom = e.target.value; })}
                  />
                  {errors.nom && <span className="badge badge-danger">{errors.nom}</span>}
                </div>

                {/* Type */}
                <div className="col gap-xs">
                  <label className="text-label">Type</label>
                  <div className="row gap-md">
                    <button
                      className={`btn w-full justify-center${form.type === 'prod' ? ' btn-primary' : ''}`}
                      onClick={() => setForm((d) => { d.type = 'prod'; })}
                    >
                      Produit
                    </button>
                    <button
                      className={`btn w-full justify-center${form.type === 'serv' ? ' btn-primary' : ''}`}
                      onClick={() => setForm((d) => { d.type = 'serv'; })}
                    >
                      Service
                    </button>
                  </div>
                  {errors.type && <span className="badge badge-danger">{errors.type}</span>}
                </div>

                {/* Prix */}
                <div className="psm-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {(
                    [
                      { key: 'pr_stock', label: 'Prix stock' },
                      { key: 'pr_distr', label: 'Prix distributeur' },
                      { key: 'pr_clt', label: 'Prix client' },
                      { key: 'pv', label: 'Prix de vente (PV)' },
                    ] as const
                  ).map(({ key, label }) => (
                    <div key={key} className="col gap-xs">
                      <label className="text-label">{label}</label>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={form[key]}
                        onChange={(e) => setForm((d) => { (d as any)[key] = e.target.value; })}
                      />
                    </div>
                  ))}
                </div>
                {errors.pv && <span className="badge badge-danger">{errors.pv}</span>}
              </div>

              {errors.global && (
                <span className="badge badge-danger w-full" style={{ justifyContent: 'center', flexShrink: 0 }}>
                  {errors.global}
                </span>
              )}
              {success && (
                <span
                  className="badge badge-success w-full"
                  style={{ justifyContent: 'center', flexShrink: 0, whiteSpace: 'normal', textAlign: 'center' }}
                >
                  {success}
                </span>
              )}

              <button
                className={`btn btn-primary w-full justify-center${loading ? ' opacity-75' : ''}`}
                disabled={loading}
                onClick={handleSubmit}
                style={{ flexShrink: 0 }}
              >
                {loading ? 'Enregistrement…' : 'Enregistrer dans le catalogue'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RESTORE MODAL ─────────────────────────────────────────────────── */}
      {showRestoreModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRestoreModal(false); }}
        >
          <div
            className="surface col gap-md psm-restore-modal"
            style={{
              width: '100%',
              maxWidth: '28rem',
              maxHeight: '80vh',
              borderRadius: '0.85rem',
              padding: '1.25rem',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="row align-center justify-between" style={{ flexShrink: 0 }}>
              <div className="col gap-xs">
                <h3 className="text-heading" style={{ margin: 0, fontSize: '1.1rem' }}>
                  🗄 Corbeille
                </h3>
                <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                  Articles supprimés pour ce bureau
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRestoreModal(false)}>
                ✕
              </button>
            </div>

            <div className="divider" style={{ flexShrink: 0 }} />

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {restoreLoading ? (
                <div className="col align-center justify-center" style={{ height: '8rem' }}>
                  <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Chargement…
                  </p>
                </div>
              ) : deletedItems.length === 0 ? (
                <div className="col align-center justify-center" style={{ height: '8rem' }}>
                  <p className="text-body text-sm" style={{ color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                    Aucun article supprimé pour ce bureau.
                  </p>
                </div>
              ) : (
                <div className="col gap-sm">
                  {deletedItems.map((item) => (
                    <div
                      key={item.id}
                      className="surface-inset row align-center gap-md psm-row"
                      style={{ padding: '0.65rem 0.85rem', borderRadius: '0.6rem' }}
                    >
                      <div
                        style={{
                          width: '2.2rem',
                          height: '2.2rem',
                          borderRadius: '0.45rem',
                          background: item.type === 'prod'
                            ? 'var(--color-background-brand)'
                            : 'var(--color-background-info)',
                          color: item.type === 'prod'
                            ? 'var(--color-text-brand)'
                            : 'var(--color-text-info)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          flexShrink: 0,
                        }}
                      >
                        {item.type === 'prod' ? 'PRD' : 'SRV'}
                      </div>

                      <div className="col gap-xs" style={{ flex: 1, minWidth: 0 }}>
                        <p
                          className="text-label"
                          style={{
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            opacity: 0.6,
                          }}
                        >
                          {item.nom}
                        </p>
                        <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                          PV : {Number(item.pv).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>

                      <button
                        className={`btn btn-sm btn-primary${restoringId === item.id ? ' opacity-75' : ''}`}
                        disabled={restoringId === item.id}
                        style={{ flexShrink: 0, fontSize: '0.75rem' }}
                        onClick={() => handleRestore(item)}
                      >
                        {restoringId === item.id ? '…' : '↩ Restaurer'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── PROD SERV ROW ────────────────────────────────────────────────────────────
function ProdServRow({
  item,
  canEdit,
  onClick,
  onDelete,
}: {
  item: RefProdServ;
  canEdit: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="surface-inset row align-center gap-md psm-row"
      style={{
        padding: '0.65rem 0.85rem',
        borderRadius: '0.6rem',
        cursor: 'pointer',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {/* type indicator */}
      <div
        style={{
          width: '2.4rem',
          height: '2.4rem',
          borderRadius: '0.5rem',
          background: item.type === 'prod'
            ? 'var(--color-background-brand)'
            : 'var(--color-background-info)',
          color: item.type === 'prod'
            ? 'var(--color-text-brand)'
            : 'var(--color-text-info)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.7rem',
          flexShrink: 0,
          letterSpacing: '0.03em',
        }}
        onClick={onClick}
      >
        {item.type === 'prod' ? 'PRD' : 'SRV'}
      </div>

      <div className="col gap-xs" style={{ flex: 1, minWidth: 0 }} onClick={onClick}>
        <p
          className="text-label"
          style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {item.nom}
        </p>
        <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          PV : {Number(item.pv).toLocaleString('fr-FR')}
          {item.pr_clt ? ` · Client : ${Number(item.pr_clt).toLocaleString('fr-FR')} FCFA` : ''}
        </p>
      </div>

      <div className="row gap-xs align-center" style={{ flexShrink: 0 }}>
        {canEdit && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--color-danger)', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Supprimer"
          >
            ✕
          </button>
        )}
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: '1rem' }} onClick={onClick}>
          ›
        </span>
      </div>
    </div>
  );
}