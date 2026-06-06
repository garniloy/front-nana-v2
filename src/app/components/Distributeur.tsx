// url backend here
const backendUrl = 'https://backend-nana-v2-production.up.railway.app';

async function createDataToTable(table: string, fields: object) {
  const response = await fetch(backendUrl + '/crud/create/' + table, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
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
type OnCloseProps = { onclose: (s: boolean) => void };

type Seller = {
  id: string;
  name: string;
  phone: string;
  sexe: string;
  upline: string;
  office: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  owner: string;
};

type View = 'list' | 'detail' | 'form';

// ─── constants ────────────────────────────────────────────────────────────────
const countries = [
  { code: '237', name: 'Cameroun' },
  { code: '241', name: 'Gabon' },
  { code: '225', name: "Côte d'Ivoire" },
  { code: '229', name: 'Bénin' },
  { code: '236', name: 'République centrafricaine' },
  { code: '235', name: 'Tchad' },
  { code: '243', name: 'RD Congo' },
  { code: '242', name: 'République du Congo' },
  { code: '240', name: 'Guinée équatoriale' },
  { code: '239', name: 'Sao Tomé-et-Principe' },
  { code: '250', name: 'Rwanda' },
  { code: '257', name: 'Burundi' },
];

function validateRequired(value: string) {
  return value.trim().length > 0;
}

const getInitialSeller = () => ({
  id: '',
  name: '',
  phone: '',
  sexe: '',
  upline: '',
  office: '',
  created_at: 'now()',
});

// ─────────────────────────────────────────────────────────────────────────────
export default function Distributeur({ onclose }: OnCloseProps) {
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem('user') || 'null');
  const connected = localStorage.getItem('connected');

  useEffect(() => {
    if (!connected || !user) {
      localStorage.removeItem('user');
      localStorage.removeItem('connected');
      navigate('/login');
    }
  }, [connected, user, navigate]);

  const showOfficeSelector = user?.role === 'superuser' || user?.owner === true;

  // ── navigation ────────────────────────────────────────────────────────────
  const [view, setView]                     = useState<View>('list');
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string>(
    showOfficeSelector ? '' : user?.office ?? '',
  );

  // ── sellers list ──────────────────────────────────────────────────────────
  const [sellers, setSellers]       = useState<Seller[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch]         = useState('');

  // ── form state ────────────────────────────────────────────────────────────
  const [newSeller, setnewSeller]     = useImmer(getInitialSeller());
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const [theCnuntry, setTheCountry]   = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // ── upline lookup ─────────────────────────────────────────────────────────
  const [uplineFound, setUplineFound]       = useState<Seller | null>(null);
  const [uplineSearching, setUplineSearching] = useState(false);
  const [uplineError, setUplineError]       = useState('');

  const resetForm = () => {
    setnewSeller(getInitialSeller());
    setPhoneNumber('');
    setTheCountry('');
    setUplineFound(null);
    setUplineError('');
    setErrors({});
  };

  // ─── fetch sellers list ───────────────────────────────────────────────────
  const fetchSellers = useCallback(
    async (office: string) => {
      if (!office) return;
      setListLoading(true);
      try {
        const res = await getDataFromTableWithConstraints('seller', {
          fields: ['id', 'name', 'phone', 'sexe', 'upline', 'office', 'created_at', 'is_deleted', 'owner'],
          constraints: { office, owner: user.promoted_by, is_deleted: false },
        });
        if (res.success) setSellers(res.list ?? []);
      } catch {
        // silently ignore
      } finally {
        setListLoading(false);
      }
    },
    [user.promoted_by],
  );

  useEffect(() => {
    const office = showOfficeSelector ? selectedOffice : user?.office ?? '';
    fetchSellers(office);
  }, [selectedOffice]);

  // ─── upline lookup (debounced 600ms) ──────────────────────────────────────
  useEffect(() => {
    const uplineId = newSeller.upline.trim();
    if (!uplineId) { setUplineFound(null); setUplineError(''); return; }

    const timer = setTimeout(async () => {
      setUplineSearching(true);
      setUplineError('');
      try {
        //const office = showOfficeSelector ? selectedOffice : user?.office ?? '';
        const res = await getDataFromTableWithConstraints('seller', {
          fields: ['id', 'name', 'phone', 'sexe', 'office'],
          constraints: { id: uplineId, is_deleted: false, owner: user.promoted_by },
          fetch: 'one',
        });
        if (res.success && res.list) {
          setUplineFound(res.list);
        } else {
          setUplineFound(null);
          setUplineError('Upline introuvable');
        }
      } catch {
        setUplineFound(null);
        setUplineError('Erreur de recherche');
      } finally {
        setUplineSearching(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [newSeller.upline, selectedOffice]);

  // ─── validation & submit ──────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!validateRequired(newSeller.id))   errs.id   = 'Identifiant requis';
    if (!validateRequired(newSeller.name)) errs.name = 'Nom requis';
    if (!validateRequired(newSeller.sexe)) errs.sexe = 'Sexe requis';
    if (phoneNumber.length <= 8 || isNaN(Number(phoneNumber)))
      errs.phone = 'Numéro invalide (min 9 chiffres)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setSuccess('');
    if (!validate()) return;
    setLoading(true);
    try {
      const office = showOfficeSelector ? selectedOffice : user?.office ?? '';
      const payload = {
        id:         newSeller.id,
        name:       newSeller.name,
        phone:      theCnuntry + phoneNumber,
        sexe:       newSeller.sexe,
        upline:     newSeller.upline || user.promoted_by,
        office,
        owner:      user.promoted_by,
        created_at: 'now()',
        is_deleted: false,
      };
      const data = await createDataToTable('seller', payload);
      if (data.success === false) throw new Error(data.message || 'Erreur serveur');
      setSuccess('Distributeur enregistré avec succès');
      resetForm();
      fetchSellers(office);
      setTimeout(() => { setSuccess(''); setView('list'); }, 1800);
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setErrors((e) => { const { global: _, ...rest } = e; return rest; }), 4000);
    }
  };

  // ─── office change ────────────────────────────────────────────────────────
  const handleOfficeSelect = (office: string) => {
    setSelectedOffice(office);
    setView('list');
    setSelectedSeller(null);
  };

  // ─── filtered list ────────────────────────────────────────────────────────
  const filtered = sellers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search),
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main
      className="col align-center justify-center"
      data-style="neuro"
      data-mode="light"
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <div
        className="surface col gap-md"
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      >
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div className="row align-center justify-between" style={{ padding: '0 0.25rem', flexShrink: 0 }}>
          <div className="col gap-xs">
            <h2 className="text-heading text-2xl">Distributeurs</h2>
            <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {view === 'list'   && `${filtered.length} distributeur${filtered.length !== 1 ? 's' : ''}`}
              {view === 'form'   && 'Nouveau distributeur'}
              {view === 'detail' && selectedSeller?.name}
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
                onClick={() => { setView('list'); setSelectedSeller(null); }}
              >
                Liste
              </button>
              <button
                className={`btn btn-sm${view === 'form' ? ' btn-primary' : ' btn-ghost'}`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => setView('form')}
              >
                + Nouveau
              </button>
            </div>

            <button className="btn btn-sm" onClick={() => onclose?.(true)}>✕</button>
          </div>
        </div>

        <div className="divider" style={{ flexShrink: 0 }} />

        {/* ── BODY ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ═══ LIST VIEW ════════════════════════════════════════════ */}
          {view === 'list' && (
            <div className="col gap-md" style={{ height: '100%', overflow: 'hidden' }}>
              <div className="row gap-sm align-center" style={{ flexShrink: 0 }}>
                <input
                  className="input w-full"
                  placeholder="Rechercher par nom, ID ou téléphone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  title="Rafraîchir"
                  onClick={() => fetchSellers(showOfficeSelector ? selectedOffice : user?.office ?? '')}
                >
                  ↻
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {listLoading ? (
                  <div className="col align-center justify-center" style={{ height: '10rem' }}>
                    <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Chargement…
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="col align-center justify-center" style={{ height: '10rem', gap: '0.5rem' }}>
                    <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {search
                        ? 'Aucun résultat pour cette recherche.'
                        : 'Aucun distributeur enregistré pour ce bureau.'}
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={() => setView('form')}>
                      + Ajouter un distributeur
                    </button>
                  </div>
                ) : (
                  <div className="col gap-sm">
                    {filtered.map((s) => (
                      <SellerRow
                        key={s.id}
                        seller={s}
                        onClick={() => { setSelectedSeller(s); setView('detail'); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ DETAIL VIEW ══════════════════════════════════════════ */}
          {view === 'detail' && selectedSeller && (
            <SellerDetail
              seller={selectedSeller}
              onBack={() => { setView('list'); setSelectedSeller(null); }}
            />
          )}

          {/* ═══ FORM VIEW ════════════════════════════════════════════ */}
          {view === 'form' && (
            <div className="col gap-md" style={{ height: '100%', overflow: 'hidden' }}>
              <div className="form-field" style={{ overflow: 'auto', padding: '0.3rem', flex: 1 }}>

                {/* ID */}
                <div className="col gap-xs">
                  <label className="text-label">Identifiant</label>
                  <input
                    className="input"
                    placeholder="ID unique du distributeur"
                    value={newSeller.id}
                    onChange={(e) => setnewSeller((d) => { d.id = e.target.value; })}
                  />
                  {errors.id && <span className="badge badge-danger">{errors.id}</span>}
                </div>

                {/* Nom */}
                <div className="col gap-xs">
                  <label className="text-label">Nom complet</label>
                  <input
                    className="input"
                    placeholder="Nom complet"
                    value={newSeller.name}
                    onChange={(e) => setnewSeller((d) => { d.name = e.target.value; })}
                  />
                  {errors.name && <span className="badge badge-danger">{errors.name}</span>}
                </div>

                {/* Sexe */}
                <div className="col gap-xs">
                  <label className="text-label">Sexe</label>
                  <div className="row gap-md">
                    <button
                      className={`btn w-full justify-center${newSeller.sexe === 'm' ? ' btn-primary' : ''}`}
                      onClick={() => setnewSeller((d) => { d.sexe = 'm'; })}
                    >
                      Homme
                    </button>
                    <button
                      className={`btn w-full justify-center${newSeller.sexe === 'f' ? ' btn-primary' : ''}`}
                      onClick={() => setnewSeller((d) => { d.sexe = 'f'; })}
                    >
                      Femme
                    </button>
                  </div>
                  {errors.sexe && <span className="badge badge-danger">{errors.sexe}</span>}
                </div>

                {/* Téléphone */}
                <div className="col gap-xs">
                  <label className="text-label">Téléphone</label>
                  <div className="row gap-sm align-center">
                    <div
                      className="btn"
                      style={{ minWidth: '5rem', justifyContent: 'center', cursor: 'pointer' }}
                      onClick={() => setShowCountries(!showCountries)}
                    >
                      {theCnuntry ? `+${theCnuntry}` : 'Pays'}
                    </div>
                    <input
                      className="input w-full"
                      placeholder="6XX XXX XXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  {showCountries && (
                    <div
                      className="surface-inset col gap-xs"
                      style={{ maxHeight: '12rem', overflowY: 'auto' }}
                    >
                      {countries.map((c) => (
                        <div
                          key={c.code + c.name}
                          className="btn btn-ghost text-sm"
                          style={{ cursor: 'pointer' }}
                          onClick={() => { setTheCountry(c.code); setShowCountries(false); }}
                        >
                          +{c.code} {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.phone && <span className="badge badge-danger">{errors.phone}</span>}
                </div>

                {/* Upline */}
                <div className="col gap-xs">
                  <label className="text-label">Upline (ID)</label>
                  <input
                    className="input"
                    placeholder="ID de l'upline (optionnel)"
                    value={newSeller.upline}
                    onChange={(e) => setnewSeller((d) => { d.upline = e.target.value; })}
                  />

                  {/* upline feedback */}
                  {uplineSearching && (
                    <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Recherche…
                    </p>
                  )}
                  {!uplineSearching && uplineFound && (
                    <div
                      className="surface-inset row align-center gap-sm"
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}
                    >
                      <span
                        className="badge"
                        style={{
                          background: 'var(--color-background-info)',
                          color: 'var(--color-text-info)',
                          fontSize: '0.75rem',
                        }}
                      >
                        {uplineFound.sexe === 'f' ? '♀' : '♂'}
                      </span>
                      <div className="col gap-xs" style={{ flex: 1 }}>
                        <p className="text-label" style={{ margin: 0 }}>{uplineFound.name}</p>
                        <p
                          className="text-body text-sm"
                          style={{ color: 'var(--color-text-secondary)', margin: 0 }}
                        >
                          {uplineFound.phone} · {uplineFound.office}
                        </p>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>✓ trouvé</span>
                    </div>
                  )}
                  {!uplineSearching && uplineError && (
                    <span className="badge badge-danger">{uplineError}</span>
                  )}
                </div>

                {/* Bureau (readonly) */}
                <div className="col gap-xs">
                  <label className="text-label">Bureau</label>
                  <input
                    disabled
                    className="input"
                    placeholder={
                      showOfficeSelector
                        ? selectedOffice || 'Sélectionnez un bureau'
                        : user?.office
                    }
                    value=""
                  />
                </div>
              </div>

              {/* feedback global */}
              {errors.global && (
                <span
                  className="badge badge-danger w-full"
                  style={{ justifyContent: 'center', flexShrink: 0 }}
                >
                  {errors.global}
                </span>
              )}
              {success && (
                <span
                  className="badge badge-success w-full"
                  style={{ justifyContent: 'center', flexShrink: 0 }}
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
                {loading ? 'Enregistrement…' : 'Enregistrer le distributeur'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ─── shared activity types ────────────────────────────────────────────────────
type AElement = {
  name: string;
  qty: number;
  total: number;
  benef: number;
  pv: number;
  commission: number | null;
};

type ActivityDetails = {
  nb_prod: number;
  nb_serv: number;
  alements: AElement[];
  sellerName: string;
  clientName: string;
  commission: number | null;
};

type Activity = {
  id: string;
  seller: string;
  client: string;
  client_kind: string;
  payment_mode: string;
  total_amount: number;
  total_benefice: number;
  total_pv: number;
  office: string;
  date: string;
  bill_sent: boolean;
  issue: string;
  date_reglement: string | null;
  waiting_reglement: boolean;
  details: ActivityDetails;
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtAmount(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function issueBadgeClass(issue: string) {
  if (issue === 'valid')    return 'badge-success';
  if (issue === 'pending')  return 'badge-warning';
  if (issue === 'canceled') return 'badge-danger';
  return 'badge-neutral';
}

function issueLabel(issue: string) {
  if (issue === 'valid')    return 'Payé';
  if (issue === 'pending')  return 'En attente';
  if (issue === 'canceled') return 'Annulé';
  return issue;
}

// ─── SELLER ROW ───────────────────────────────────────────────────────────────
function SellerRow({ seller, onClick }: { seller: Seller; onClick: () => void }) {
  const initials = seller.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className="surface-inset row align-center gap-md"
      onClick={onClick}
      style={{
        padding: '0.65rem 0.85rem',
        borderRadius: '0.6rem',
        cursor: 'pointer',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {/* avatar */}
      <div
        style={{
          width: '2.4rem',
          height: '2.4rem',
          borderRadius: '50%',
          background: 'var(--color-background-success)',
          color: 'var(--color-text-success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '0.85rem',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      {/* info */}
      <div className="col gap-xs" style={{ flex: 1, minWidth: 0 }}>
        <p
          className="text-label"
          style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {seller.name}
        </p>
        <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          {seller.phone || '—'} · ID : {seller.id}
        </p>
      </div>

      {/* badge office + chevron */}
      <div className="row gap-xs align-center" style={{ flexShrink: 0 }}>
        {seller.office && (
          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
            {seller.office}
          </span>
        )}
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: '1rem' }}>›</span>
      </div>
    </div>
  );
}

// ─── SELLER DETAIL ────────────────────────────────────────────────────────────
function SellerDetail({ seller, onBack }: { seller: Seller; onBack: () => void }) {
  const initials = seller.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [activities, setActivities]     = useState<Activity[]>([]);
  const [activLoading, setActivLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setActivLoading(true);
      try {
        const res = await getDataFromTableWithConstraints('activity', {
          fields: ['id', 'date', 'total_amount', 'total_benefice', 'issue', 'details'],
          constraints: { seller: seller.id },
          orderBy: { date: 'DESC' },
          limit: 3,
        });
        if (!cancelled && res.success) setActivities(res.list ?? []);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setActivLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seller.id]);

  const fields: { label: string; value: string | boolean | null | undefined }[] = [
    { label: 'Identifiant',  value: seller.id },
    { label: 'Téléphone',    value: seller.phone },
    { label: 'Sexe',         value: seller.sexe === 'm' ? 'Homme' : seller.sexe === 'f' ? 'Femme' : seller.sexe },
    { label: 'Upline',       value: seller.upline },
    { label: 'Bureau',       value: seller.office },
    { label: 'Propriétaire', value: seller.owner },
    { label: 'Statut',       value: seller.is_deleted ? 'Désactivé' : 'Actif' },
    { label: 'Inscrit le',   value: seller.created_at ? new Date(seller.created_at).toLocaleDateString('fr-FR') : null },
    { label: 'Mis à jour',   value: seller.updated_at ? new Date(seller.updated_at).toLocaleDateString('fr-FR') : null },
  ];

  return (
    <div className="col gap-lg" style={{ height: '100%', overflow: 'hidden' }}>
      {/* back */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={onBack}
        style={{ alignSelf: 'flex-start', flexShrink: 0 }}
      >
        ← Retour à la liste
      </button>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* profile card */}
        <div
          className="surface-inset col align-center gap-md"
          style={{ padding: '1.5rem', borderRadius: '0.75rem' }}
        >
          <div
            style={{
              width: '4rem', height: '4rem', borderRadius: '50%',
              background: 'var(--color-background-success)', color: 'var(--color-text-success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1.4rem',
            }}
          >
            {initials}
          </div>
          <div className="col align-center gap-xs">
            <h3 className="text-heading" style={{ margin: 0, textAlign: 'center' }}>{seller.name}</h3>
            <span
              className={`badge ${seller.is_deleted ? 'badge-danger' : 'badge-success'}`}
              style={{ fontSize: '0.75rem' }}
            >
              {seller.is_deleted ? 'Désactivé' : 'Actif'}
            </span>
          </div>
        </div>

        {/* fields grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          {fields.map(({ label, value }) => (
            <div
              key={label}
              className="surface-inset col gap-xs"
              style={{ padding: '0.65rem 0.85rem', borderRadius: '0.5rem' }}
            >
              <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                {label}
              </p>
              <p className="text-label" style={{ margin: 0 }}>
                {value != null && value !== ''
                  ? String(value)
                  : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
              </p>
            </div>
          ))}
        </div>

        {/* ── dernières ventes ────────────────────────────────────────── */}
        <div className="col gap-sm">
          <p className="text-label" style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Dernières ventes
          </p>

          {activLoading ? (
            <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>Chargement…</p>
          ) : activities.length === 0 ? (
            <p className="text-body text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Aucune vente enregistrée.</p>
          ) : (
            activities.map((act) => {
              const commission = act.details?.commission;
              return (
                <div
                  key={act.id}
                  className="surface-inset col gap-sm"
                  style={{ padding: '0.75rem 0.9rem', borderRadius: '0.6rem' }}
                >
                  {/* ligne supérieure : date + statut */}
                  <div className="row align-center justify-between">
                    <p className="text-body text-sm" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                      {fmtDate(act.date)}
                    </p>
                    <span className={`badge ${issueBadgeClass(act.issue)}`} style={{ fontSize: '0.68rem' }}>
                      {issueLabel(act.issue)}
                    </span>
                  </div>

                  {/* client */}
                  <div className="row align-center justify-between">
                    <p className="text-body text-sm" style={{ margin: 0, color: 'var(--color-text-tertiary)' }}>Client</p>
                    <p className="text-label" style={{ margin: 0 }}>{act.details?.clientName || act.client}</p>
                  </div>

                  {/* chiffres clés */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: commission != null ? '1fr 1fr 1fr' : '1fr 1fr',
                      gap: '0.5rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    {/* montant */}
                    <div
                      className="col gap-xs align-center"
                      style={{
                        padding: '0.45rem 0.5rem',
                        borderRadius: '0.4rem',
                        background: 'var(--color-background-secondary)',
                      }}
                    >
                      <p className="text-body text-sm" style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: '0.7rem' }}>Montant</p>
                      <p className="text-label" style={{ margin: 0, fontSize: '0.85rem' }}>{fmtAmount(act.total_amount)}</p>
                    </div>

                    {/* bénéfice */}
                    <div
                      className="col gap-xs align-center"
                      style={{
                        padding: '0.45rem 0.5rem',
                        borderRadius: '0.4rem',
                        background: 'var(--color-background-success)',
                      }}
                    >
                      <p className="text-body text-sm" style={{ margin: 0, color: 'var(--color-text-success)', fontSize: '0.7rem' }}>Bénéfice bureau</p>
                      <p className="text-label" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-success)' }}>
                        {fmtAmount(act.total_benefice)}
                      </p>
                    </div>

                    {/* commission — uniquement si présente */}
                    {commission != null && (
                      <div
                        className="col gap-xs align-center"
                        style={{
                          padding: '0.45rem 0.5rem',
                          borderRadius: '0.4rem',
                          background: 'var(--color-background-info)',
                        }}
                      >
                        <p className="text-body text-sm" style={{ margin: 0, color: 'var(--color-text-info)', fontSize: '0.7rem' }}>Commission</p>
                        <p className="text-label" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-info)' }}>
                          {fmtAmount(commission)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* articles */}
                  <div className="col gap-xs" style={{ marginTop: '0.1rem' }}>
                    {act.details?.alements?.map((el, i) => (
                      <div key={i} className="row align-center justify-between" style={{ gap: '0.5rem' }}>
                        <div className="row align-center gap-xs" style={{ minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              width: '0.35rem', height: '0.35rem', borderRadius: '50%', flexShrink: 0,
                              background: 'var(--color-text-tertiary)',
                            }}
                          />
                          <p
                            className="text-body text-sm"
                            style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {el.name}
                            <span style={{ color: 'var(--color-text-tertiary)' }}> × {el.qty}</span>
                          </p>
                        </div>
                        <p className="text-body text-sm" style={{ margin: 0, flexShrink: 0, color: 'var(--color-text-secondary)' }}>
                          {fmtAmount(el.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}