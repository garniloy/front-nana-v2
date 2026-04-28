import { useState, useEffect, useCallback, useRef } from 'react';

// ── Backend helpers ───────────────────────────────────────────────────────────
const backendUrl = 'https://backend-nana-v2.onrender.com';

const getDataFromTableWithConstraints = async (table: string, body: object) => {
  const res = await fetch(`${backendUrl}/crud/getwith/${table}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json();
};
const createDataToTable = async (table: string, fields: object) => {
  const res = await fetch(`${backendUrl}/crud/create/${table}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
  });
  return res.json();
};
const updateDataToTable = async (table: string, fields: object) => {
  const res = await fetch(`${backendUrl}/crud/update/${table}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
  });
  return res.json();
};
const deleteDataFromTable = async (table: string, fields: object) => {
  const res = await fetch(`${backendUrl}/crud/delete/${table}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
  });
  return res.json();
};

// ── User ──────────────────────────────────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('user') || 'null');
const isSuperUser = user?.role === 'superuser' || user?.owner === true;

// ── Table definitions ─────────────────────────────────────────────────────────
type ColDef = { key: string; label: string; type?: string; readonly?: boolean; options?: string[] };

type TableDef = {
  name: string;
  label: string;
  crud: boolean;           // false = read-only
  pkField: string;
  officeField: string | null;
  columns: ColDef[];
};

const TABLES: TableDef[] = [
  {
    name: 'stock_move', label: 'Mouvements', crud: true, pkField: 'id', officeField: 'office',
    columns: [
      { key: 'id',      label: 'ID',       readonly: true },
      { key: 'element', label: 'Élément' },
      { key: 'qty',     label: 'Qté',      type: 'number' },
      { key: 'type',    label: 'Type',     type: 'select', options: ['IN', 'OUT'] },
      { key: 'date',    label: 'Date',     type: 'datetime-local' },
      { key: 'office',  label: 'Bureau' },
    ],
  },
  {
    name: 'activity', label: 'Activités', crud: false, pkField: 'id', officeField: 'office',
    columns: [
      { key: 'id',             label: 'ID',         readonly: true },
      { key: 'seller',         label: 'Vendeur' },
      { key: 'client',         label: 'Client' },
      { key: 'payment_mode',   label: 'Paiement' },
      { key: 'total_amount',   label: 'Montant',    type: 'number' },
      { key: 'total_benefice', label: 'Bénéfice',   type: 'number' },
      { key: 'total_pv',       label: 'PV',         type: 'number' },
      { key: 'office',         label: 'Bureau' },
      { key: 'date',           label: 'Date' },
      { key: 'bill_sent',      label: 'Facture',    type: 'boolean' },
      { key: 'details',        label: 'Détails',    type: 'json' },
    ],
  },
  {
    name: 'approvisionnement', label: 'Appros', crud: false, pkField: 'id', officeField: 'office',
    columns: [
      { key: 'id',         label: 'ID',       readonly: true },
      { key: 'name',       label: 'Produit' },
      { key: 'prev_qte',   label: 'Qté préc', type: 'number' },
      { key: 'qte',        label: 'Qté ajout', type: 'number' },
      { key: 'last_qte',   label: 'Qté finale', type: 'number' },
      { key: 'created_at', label: 'Date' },
      { key: 'office',     label: 'Bureau' },
      { key: 'manager',    label: 'Manager' },
    ],
  },
  {
    name: 'stock', label: 'Stock', crud: false, pkField: 'name', officeField: 'office',
    columns: [
      { key: 'name',   label: 'Produit' },
      { key: 'office', label: 'Bureau' },
      { key: 'qte',    label: 'Quantité', type: 'number' },
    ],
  },
  {
    name: 'sell', label: 'Ventes', crud: false, pkField: 'id', officeField: 'office',
    columns: [
      { key: 'id',         label: 'ID',      readonly: true },
      { key: 'name',       label: 'Client' },
      { key: 'amount',     label: 'Montant', type: 'number' },
      { key: 'created_at', label: 'Date' },
      { key: 'office',     label: 'Bureau' },
      { key: 'manager',    label: 'Manager' },
    ],
  },
  {
    name: 'clients', label: 'Clients', crud: true, pkField: 'id', officeField: 'office',
    columns: [
      { key: 'id',         label: 'ID',      readonly: true },
      { key: 'name',       label: 'Nom' },
      { key: 'phone',      label: 'Téléphone' },
      { key: 'sexe',       label: 'Sexe',    type: 'select', options: ['M', 'F'] },
      { key: 'age',        label: 'Âge',     type: 'number' },
      { key: 'tag',        label: 'Tag' },
      { key: 'level',      label: 'Niveau' },
      { key: 'seller',     label: 'Vendeur' },
      { key: 'office',     label: 'Bureau' },
      { key: 'created_at', label: 'Créé le', readonly: true },
    ],
  },
  {
    name: 'seller', label: 'Vendeurs', crud: true, pkField: 'id', officeField: 'office',
    columns: [
      { key: 'id',         label: 'ID',       readonly: true },
      { key: 'name',       label: 'Nom' },
      { key: 'phone',      label: 'Téléphone' },
      { key: 'sexe',       label: 'Sexe',     type: 'select', options: ['M', 'F'] },
      { key: 'upline',     label: 'Upline',   type: 'number' },
      { key: 'office',     label: 'Bureau' },
      { key: 'is_deleted', label: 'Supprimé', type: 'boolean' },
      { key: 'created_at', label: 'Créé le',  readonly: true },
    ],
  },
  {
    name: 'prod_serv', label: 'Produits/Services', crud: true, pkField: 'nom', officeField: null,
    columns: [
      { key: 'nom',               label: 'Nom' },
      { key: 'type',              label: 'Type',     type: 'select', options: ['prod', 'serv'] },
      { key: 'pr_stock',          label: 'Prix stock', type: 'number' },
      { key: 'pr_distr',          label: 'Prix distr', type: 'number' },
      { key: 'pr_clt',            label: 'Prix client', type: 'number' },
      { key: 'pv',                label: 'PV',         type: 'number' },
      { key: 'modifier',          label: 'Modifié par' },
      { key: 'last_modification', label: 'Modifié le', readonly: true },
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;

// ── JSON Cell ─────────────────────────────────────────────────────────────────
function JsonCell({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  if (!value || typeof value !== 'object') return <span className="text-secondary text-sm">—</span>;
  const obj = value as Record<string, unknown>;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn gap-xs"
        style={{ padding: '2px 10px', fontSize: '0.72rem' }}
      >
        <span>{open ? '▲' : '▼'}</span>
        <span>{String(obj.nb_prod ?? '?')} prod · {String(obj.nb_serv ?? '?')} serv</span>
      </button>
      {open && (
        <pre style={{
          marginTop: 6, padding: 8, borderRadius: 8,
          fontSize: '0.68rem', maxHeight: 160, overflow: 'auto',
          background: 'rgba(0,0,0,0.06)', lineHeight: 1.5,
        }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Cell display ──────────────────────────────────────────────────────────────
function CellValue({ col, value }: { col: ColDef; value: unknown }) {
  if (col.type === 'json') return <JsonCell value={value} />;
  if (col.type === 'boolean') {
    return (
      <span className={`badge ${value ? 'badge-success' : 'badge-danger'}`}>
        {value ? 'Oui' : 'Non'}
      </span>
    );
  }
  if (value === null || value === undefined || value === '') return <span className="text-secondary text-sm">—</span>;
  if (typeof value === 'string' && (col.key.includes('date') || col.key.includes('_at'))) {
    return <span className="text-sm">{new Date(value).toLocaleDateString('fr-FR')}</span>;
  }
  if (col.type === 'number' && typeof value === 'number') {
    return <span className="text-sm weight-medium">{value.toLocaleString('fr-FR')}</span>;
  }
  return <span className="text-sm">{String(value)}</span>;
}

// ── Row Form Modal ────────────────────────────────────────────────────────────
function RowModal({
  table, row, onClose, onSaved,
}: {
  table: TableDef;
  row: Row | null;  // null = create new
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = row === null;
  const [form, setForm] = useState<Row>(() => {
    if (isNew) return {};
    return { ...row };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const editableCols = table.columns.filter(c => !c.readonly);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      let res;
      if (isNew) {
        res = await createDataToTable(table.name, form);
      } else {
        res = await updateDataToTable(table.name, {
          set: form,
          where: { [table.pkField]: row![table.pkField] },
        });
      }
      if (res.success === false) throw new Error(res.error || 'Erreur');
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal col gap-lg"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="row align-center justify-between">
          <h3 className="text-heading text-xl">
            {isNew ? `Nouveau · ${table.label}` : `Modifier · ${table.label}`}
          </h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="divider" />

        {/* Fields */}
        <div className="col gap-md">
          {editableCols.map(col => (
            <div key={col.key} className="col gap-xs">
              <label className="text-label">{col.label}</label>
              {col.type === 'select' ? (
                <select
                  className="input"
                  value={String(form[col.key] ?? '')}
                  onChange={e => setForm(f => ({ ...f, [col.key]: e.target.value }))}
                >
                  <option value="">— Choisir —</option>
                  {col.options!.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : col.type === 'boolean' ? (
                <select
                  className="input"
                  value={form[col.key] ? 'true' : 'false'}
                  onChange={e => setForm(f => ({ ...f, [col.key]: e.target.value === 'true' }))}
                >
                  <option value="false">Non</option>
                  <option value="true">Oui</option>
                </select>
              ) : (
                <input
                  className="input"
                  type={col.type === 'number' ? 'number' : col.type === 'datetime-local' ? 'datetime-local' : 'text'}
                  value={String(form[col.key] ?? '')}
                  onChange={e => setForm(f => ({
                    ...f,
                    [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value,
                  }))}
                />
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="divider" />

        {/* Actions */}
        <div className="row gap-md">
          <button className="btn btn-ghost w-full justify-center" onClick={onClose}>Annuler</button>
          <button
            className={`btn btn-primary w-full justify-center${saving ? ' opacity-75 not-allowed' : ''}`}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? '…' : isNew ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteModal({
  table, row, onClose, onDeleted,
}: {
  table: TableDef; row: Row; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteDataFromTable(table.name, {
        constraints: { [table.pkField]: row[table.pkField] },
      });
      if (res.success === false) throw new Error(res.error || 'Erreur');
      onDeleted();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal col gap-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-heading text-xl">Confirmer la suppression</h3>
        <p className="text-body text-sm">
          Supprimer la ligne <strong>{String(row[table.pkField])}</strong> ?
          Cette action est irréversible.
        </p>
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="row gap-md">
          <button className="btn btn-ghost w-full justify-center" onClick={onClose}>Annuler</button>
          <button
            className={`btn w-full justify-center${deleting ? ' opacity-75 not-allowed' : ''}`}
            style={{ background: 'var(--clr-danger-500)', color: '#fff' }}
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? '…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Table Panel ───────────────────────────────────────────────────────────────
function TablePanel({ table }: { table: TableDef }) {
  const [rows, setRows]           = useState<Row[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [editRow, setEditRow]     = useState<Row | null | 'new'>( null); // null=closed, 'new'=create, Row=edit
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);
  const fetched                   = useRef(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const constraints: Record<string, unknown> = {};
      if (table.officeField && !isSuperUser) {
        constraints[table.officeField] = user?.office;
      }
      const res = await getDataFromTableWithConstraints(table.name, {
        constraints,
        orderBy: table.columns.find(c => c.key === 'created_at' || c.key === 'date')
          ? { [table.columns.find(c => c.key === 'created_at' || c.key === 'date')!.key]: 'DESC' }
          : undefined,
        limit: 200,
      });
      if (res.success === false) throw new Error(res.error || 'Erreur serveur');
      setRows(res.list ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [table]);

  // Fetch once when panel mounts (lazy — only happens when tab is selected)
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchRows();
  }, [fetchRows]);

  // Filtered rows
  const filtered = rows.filter(row =>
    search === '' ||
    Object.values(row).some(v =>
      String(v ?? '').toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="col gap-md" style={{ height: '100%' }}>

      {/* Toolbar */}
      <div className="row align-center justify-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="row align-center gap-sm" style={{ flex: 1, minWidth: 200 }}>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="text-label">{filtered.length} ligne{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="row gap-sm">
          <button className="btn gap-xs" onClick={fetchRows} title="Rafraîchir">
            <span>↻</span><span className="text-sm">Actualiser</span>
          </button>
          {table.crud && (
            <button className="btn btn-primary gap-xs" onClick={() => setEditRow('new')}>
              <span>＋</span><span className="text-sm">Ajouter</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, borderRadius: 16 }}>
        {loading ? (
          <div className="col align-center justify-center" style={{ padding: 48 }}>
            <p className="text-body text-sm">Chargement…</p>
          </div>
        ) : error ? (
          <div className="col align-center justify-center" style={{ padding: 48 }}>
            <p className="text-danger text-sm">{error}</p>
            <button className="btn btn-ghost" onClick={fetchRows}>Réessayer</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col align-center justify-center" style={{ padding: 48 }}>
            <p className="text-body text-sm">Aucune donnée.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                {table.columns.map(col => (
                  <th key={col.key} style={{
                    padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap',
                    position: 'sticky', top: 0, zIndex: 2,
                    background: 'var(--nm-bg)',
                    boxShadow: '0 2px 0 var(--nm-dark)',
                    fontSize: '0.7rem', fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--nm-text)',
                  }}>
                    {col.label}
                  </th>
                ))}
                {table.crud && (
                  <th style={{
                    padding: '10px 14px', position: 'sticky', top: 0, zIndex: 2,
                    background: 'var(--nm-bg)', boxShadow: '0 2px 0 var(--nm-dark)',
                    fontSize: '0.7rem', fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--nm-text)',
                  }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={String(row[table.pkField]) + i}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {table.columns.map(col => (
                    <td key={col.key} style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--nm-dark)',
                      maxWidth: col.type === 'json' ? 220 : 180,
                    }}>
                      <CellValue col={col} value={row[col.key]} />
                    </td>
                  ))}
                  {table.crud && (
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--nm-dark)', whiteSpace: 'nowrap' }}>
                      <div className="row gap-xs">
                        <button
                          className="btn gap-xs"
                          style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                          onClick={() => setEditRow(row)}
                        >
                          ✎
                        </button>
                        <button
                          className="btn gap-xs"
                          style={{ padding: '3px 10px', fontSize: '0.75rem', color: 'var(--clr-danger-500)' }}
                          onClick={() => setDeleteRow(row)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {editRow !== null && (
        <RowModal
          table={table}
          row={editRow === 'new' ? null : editRow}
          onClose={() => setEditRow(null)}
          onSaved={fetchRows}
        />
      )}
      {deleteRow && (
        <DeleteModal
          table={table}
          row={deleteRow}
          onClose={() => setDeleteRow(null)}
          onDeleted={fetchRows}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DataViewer() {
  const [activeIdx, setActiveIdx] = useState(0);
  // We keep a set of which panels have been mounted (so their data isn't reset on tab switch)
  const [mounted, setMounted] = useState<Set<number>>(new Set([0]));

  const handleTab = (idx: number) => {
    setActiveIdx(idx);
    setMounted(prev => new Set([...prev, idx]));
  };

  return (
    <main
      className="col"
      data-style="neuro"
      data-mode="light"
      style={{ minHeight: '100dvh', padding: 24, gap: 0 }}
    >
      {/* Title */}
      <div className="col gap-xs" style={{ marginBottom: 20 }}>
        <h1 className="text-heading text-2xl">Base de données</h1>
        <p className="text-body text-sm">
          {isSuperUser ? 'Vue globale — tous les bureaux' : `Bureau : ${user?.office ?? '—'}`}
        </p>
      </div>

      {/* Tabs */}
      <div
        className="surface"
        style={{ padding: 0, borderRadius: '20px 20px 0 0', overflow: 'hidden', flexShrink: 0 }}
      >
        <div
          style={{
            display: 'flex', overflowX: 'auto', gap: 0,
            borderBottom: '2px solid var(--nm-dark)',
          }}
        >
          {TABLES.map((t, i) => {
            const active = i === activeIdx;
            return (
              <button
                key={t.name}
                onClick={() => handleTab(i)}
                style={{
                  padding: '14px 20px',
                  fontSize: '0.8rem',
                  fontWeight: active ? 700 : 500,
                  whiteSpace: 'nowrap',
                  color: active ? 'var(--nm-brand)' : 'var(--nm-text)',
                  background: active
                    ? 'var(--nm-bg)'
                    : 'transparent',
                  boxShadow: active
                    ? 'inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light)'
                    : 'none',
                  borderBottom: active ? '2px solid var(--nm-brand)' : '2px solid transparent',
                  transition: 'all 0.18s',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {t.label}
                {!t.crud && (
                  <span style={{
                    fontSize: '0.6rem', padding: '1px 5px',
                    borderRadius: 9999,
                    background: 'var(--nm-dark)',
                    color: 'var(--nm-text)',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}>
                    RO
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panels — render all mounted ones, hide inactive (preserves state & avoids refetch) */}
      <div
        className="surface"
        style={{
          borderRadius: '0 0 20px 20px', padding: 20,
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        }}
      >
        {TABLES.map((t, i) =>
          mounted.has(i) ? (
            <div
              key={t.name}
              style={{
                display: i === activeIdx ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                height: '100%',
              }}
            >
              <TablePanel table={t} />
            </div>
          ) : null
        )}
      </div>
    </main>
  );
}