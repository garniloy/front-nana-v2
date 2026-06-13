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

import '../css/form.css';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';
import OfficeSelector from './Office-selector';

type OnCloseProps = { onclose: (s: boolean) => void };

type Client = {
  id: number;
  name: string;
  phone: string;
  sexe: string;
  age: number;
  tag: string;
  level: string;
  seller: string;
  office: string;
  created_at: string;
  updated_at: string;
  owner: string;
};

type Seller = {
  id: string;
  name: string;
  phone: string;
  sexe: string;
  office: string;
};

type View = 'list' | 'detail' | 'form';

const countries = [
  { code: '237', name: 'Cameroun' },
  { code: '241', name: 'Gabon' },
  { code: '225', name: "Côte d'Ivoire" },
  { code: '229', name: 'Bénin' },
  { code: '236', name: 'République centrafricaine' },
  { code: '235', name: 'Tchad' },
  { code: '243', name: 'RD Congo' },
  { code: '242', name: 'République du Congo' },
];

function validateRequired(value: string) {
  return value.trim().length > 0;
}

const getInitialClient = () => ({
  name: '',
  phone: '',
  sexe: '',
  office: '',
  age: '',
  seller: '',
  created_at: 'now()',
});

// ── Shared responsive CSS for ClientManager & Distributeur ──────────────────
const sharedCSS = `
  /* ── Manager root: fills parent absolutely, overrides form.css margin ── */
  .mgr-wrap {
    position: absolute;
    inset: 0;
    margin: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden;
  }
  .mgr-inner {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .mgr-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.85rem 1rem 0;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .mgr-header__info { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
  .mgr-header__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  .mgr-tabs {
    display: flex;
    gap: 0.2rem;
    background: var(--nm-bg, #e4e9f0);
    border-radius: 0.5rem;
    padding: 0.2rem;
    box-shadow: inset 2px 2px 5px var(--nm-dark, rgba(163,177,198,0.5)),
                inset -2px -2px 5px var(--nm-light, rgba(255,255,255,0.8));
  }
  .mgr-tabs .btn { font-size: 0.8rem; }

  /* ── Body ── */
  .mgr-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0 1rem 1rem;
    margin-top: 0.75rem;
  }

  /* ── List view ── */
  .mgr-list { height: 100%; overflow: hidden; display: flex; flex-direction: column; gap: 0.75rem; }
  .mgr-search { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }
  .mgr-list-body { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .mgr-list-body::-webkit-scrollbar { width: 4px; }
  .mgr-list-body::-webkit-scrollbar-thumb { background: var(--nm-dark, rgba(163,177,198,0.5)); border-radius: 99px; }

  /* ── Form view ── */
  .mgr-form { height: 100%; overflow: hidden; display: flex; flex-direction: column; gap: 0.75rem; }
  .mgr-form-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0.25rem 0.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    -webkit-overflow-scrolling: touch;
  }
  .mgr-form-scroll::-webkit-scrollbar { width: 4px; }
  .mgr-form-scroll::-webkit-scrollbar-thumb { background: var(--nm-dark, rgba(163,177,198,0.5)); border-radius: 99px; }
  .mgr-form-field { display: flex; flex-direction: column; gap: 0.4rem; }
  .mgr-form-footer { flex-shrink: 0; display: flex; flex-direction: column; gap: 0.5rem; }

  /* ── Detail view ── */
  .mgr-detail { height: 100%; overflow: hidden; display: flex; flex-direction: column; gap: 0.75rem; }
  .mgr-detail-scroll {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    -webkit-overflow-scrolling: touch;
  }
  .mgr-detail-scroll::-webkit-scrollbar { width: 4px; }
  .mgr-detail-scroll::-webkit-scrollbar-thumb { background: var(--nm-dark, rgba(163,177,198,0.5)); border-radius: 99px; }
  .mgr-detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
  .mgr-detail-cell {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.6rem 0.75rem;
    border-radius: 0.5rem;
  }

  /* ── Sexe buttons ── */
  .mgr-sexe-row { display: flex; gap: 0.65rem; }
  .mgr-sexe-row .btn { flex: 1; justify-content: center; }

  /* ── Country selector ── */
  .mgr-phone-row { display: flex; gap: 0.5rem; align-items: center; }
  .mgr-country-btn { min-width: 4.5rem; justify-content: center; flex-shrink: 0; }
  .mgr-country-list { max-height: 11rem; overflow-y: auto; -webkit-overflow-scrolling: touch; }

  /* ── Seller / upline lookup card ── */
  .mgr-lookup-card {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
  }

  /* ── Activity card ── */
  .mgr-act-card {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.7rem 0.85rem;
    border-radius: 0.6rem;
  }

  /* ════════════════════════════
     MOBILE ≤ 600px
     ════════════════════════════ */
  @media (max-width: 600px) {
    .mgr-header { flex-direction: column; align-items: flex-start; padding: 0.65rem 0.85rem 0; gap: 0.5rem; }
    .mgr-header__actions { width: 100%; justify-content: space-between; }
    .mgr-tabs .btn { font-size: 0.75rem; padding: 0.3rem 0.6rem; }
    .mgr-body { padding: 0 0.85rem 0.85rem; margin-top: 0.6rem; }
    .mgr-detail-grid { grid-template-columns: 1fr; }
    .mgr-sexe-row { gap: 0.5rem; }
    .mgr-country-btn { min-width: 4rem; }
    .mgr-form-scroll { gap: 0.6rem; }
    .mgr-list { gap: 0.6rem; }
  }

  @media (max-width: 380px) {
    .mgr-tabs { flex-wrap: wrap; }
    .mgr-tabs .btn { font-size: 0.72rem; }
    .mgr-header__actions { gap: 0.35rem; }
  }
`;

export default function ClientManager({ onclose }: OnCloseProps) {
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

  const [view, setView]                     = useState<View>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string>(
    showOfficeSelector ? '' : user?.office ?? '',
  );

  const [clients, setClients]         = useState<Client[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch]           = useState('');

  const [newClient, setnewClient] = useImmer(getInitialClient());
  const resetClient = () => {
    setnewClient(getInitialClient());
    setPhoneNumber('');
    setTheCountry('');
    setSellerFound(null);
    setSellerSearching(false);
  };

  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const [theCnuntry, setTheCountry]       = useState('');
  const [phoneNumber, setPhoneNumber]     = useState('');

  const [sellerFound, setSellerFound]           = useState<Seller | null>(null);
  const [sellerSearching, setSellerSearching]   = useState(false);
  const [sellerError, setSellerError]           = useState('');

  const fetchClients = useCallback(
    async (office: string) => {
      if (!office) return;
      setListLoading(true);
      try {
        const res = await getDataFromTableWithConstraints('client', {
          fields: ['id', 'name', 'phone', 'sexe', 'age', 'tag', 'level', 'seller', 'office', 'created_at', 'owner'],
          constraints: { office, owner: user.promoted_by },
        });
        if (res.success) setClients(res.list ?? []);
      } catch { } finally {
        setListLoading(false);
      }
    },
    [user.promoted_by],
  );

  useEffect(() => {
    const office = showOfficeSelector ? selectedOffice : user?.office ?? '';
    fetchClients(office);
  }, [selectedOffice]);

  useEffect(() => {
    const sellerId = newClient.seller.trim();
    if (!sellerId) { setSellerFound(null); setSellerError(''); return; }
    const timer = setTimeout(async () => {
      setSellerSearching(true);
      setSellerError('');
      try {
        const res = await getDataFromTableWithConstraints('seller', {
          fields: ['id', 'name', 'phone', 'sexe', 'office'],
          constraints: { id: sellerId, is_deleted: false, owner: user.promoted_by },
          fetch: 'one',
        });
        if (res.success && res.list) { setSellerFound(res.list); }
        else { setSellerFound(null); setSellerError('Vendeur introuvable'); }
      } catch { setSellerFound(null); setSellerError('Erreur de recherche'); }
      finally { setSellerSearching(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [newClient.seller, selectedOffice]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!validateRequired(newClient.name))  errs.name  = 'Nom requis';
    if (!newClient.sexe)                    errs.sexe  = 'Sexe requis';
    if (phoneNumber.length <= 8 || isNaN(Number(phoneNumber))) errs.phone = 'Numéro invalide (min 9 chiffres)';
    if (!newClient.age || isNaN(Number(newClient.age))) errs.age = 'Âge invalide';
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
        age: Number(newClient.age), created_at: 'now()', name: newClient.name,
        office, phone: theCnuntry + phoneNumber,
        seller: newClient.seller || user.promoted_by, sexe: newClient.sexe, owner: user.promoted_by,
      };
      const data = await createDataToTable('client', payload);
      if (data.success === false) throw new Error(data.message || 'Erreur serveur');
      setSuccess('Client enregistré avec succès');
      resetClient();
      fetchClients(office);
      setTimeout(() => { setSuccess(''); setView('list'); }, 1800);
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setErrors({}), 4000);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search),
  );

  const handleOfficeSelect = (office: string) => {
    setSelectedOffice(office);
    setView('list');
    setSelectedClient(null);
  };

  return (
    <>
      <style>{sharedCSS}</style>

      <div className="mgr-wrap" data-style="neuro" data-mode="light">
        <div className="surface mgr-inner">

          {/* ── HEADER ── */}
          <div className="mgr-header">
            <div className="mgr-header__info">
              <h2 className="text-heading text-2xl">Clients</h2>
              <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {view === 'list'   && `${filteredClients.length} client${filteredClients.length !== 1 ? 's' : ''}`}
                {view === 'form'   && 'Nouveau client'}
                {view === 'detail' && selectedClient?.name}
              </p>
            </div>

            <div className="mgr-header__actions">
              {showOfficeSelector && <OfficeSelector onOfficeSelect={handleOfficeSelect} />}

              <div className="mgr-tabs">
                <button
                  className={`btn btn-sm${view === 'list' ? ' btn-primary' : ' btn-ghost'}`}
                  onClick={() => { setView('list'); setSelectedClient(null); }}
                >
                  Liste
                </button>
                <button
                  className={`btn btn-sm${view === 'form' ? ' btn-primary' : ' btn-ghost'}`}
                  onClick={() => setView('form')}
                >
                  + Nouveau
                </button>
              </div>

              <button className="btn btn-sm" onClick={() => onclose?.(true)}>✕</button>
            </div>
          </div>

          <div className="divider" style={{ flexShrink: 0, margin: '0.65rem 1rem 0' }} />

          {/* ── BODY ── */}
          <div className="mgr-body">

            {/* ═══ LIST ═══ */}
            {view === 'list' && (
              <div className="mgr-list">
                <div className="mgr-search">
                  <input
                    className="input w-full"
                    placeholder="Rechercher par nom ou téléphone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => fetchClients(showOfficeSelector ? selectedOffice : user?.office ?? '')}
                    title="Rafraîchir"
                  >↻</button>
                </div>

                <div className="mgr-list-body">
                  {listLoading ? (
                    <div className="col align-center justify-center" style={{ height: '8rem' }}>
                      <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>Chargement…</p>
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="col align-center justify-center" style={{ height: '8rem', gap: '0.5rem' }}>
                      <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {search ? 'Aucun résultat.' : 'Aucun client enregistré pour ce bureau.'}
                      </p>
                      <button className="btn btn-primary btn-sm" onClick={() => setView('form')}>+ Ajouter</button>
                    </div>
                  ) : (
                    <div className="col gap-sm">
                      {filteredClients.map((c) => (
                        <ClientRow key={c.id} client={c} onClick={() => { setSelectedClient(c); setView('detail'); }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ DETAIL ═══ */}
            {view === 'detail' && selectedClient && (
              <ClientDetail
                client={selectedClient}
                onBack={() => { setView('list'); setSelectedClient(null); }}
              />
            )}

            {/* ═══ FORM ═══ */}
            {view === 'form' && (
              <div className="mgr-form">
                <div className="mgr-form-scroll">

                  {/* Nom */}
                  <div className="mgr-form-field">
                    <label className="text-label">Nom complet</label>
                    <input className="input" placeholder="Nom complet" value={newClient.name}
                      onChange={(e) => setnewClient((d) => { d.name = e.target.value; })} />
                    {errors.name && <span className="badge badge-danger">{errors.name}</span>}
                  </div>

                  {/* Sexe */}
                  <div className="mgr-form-field">
                    <label className="text-label">Sexe</label>
                    <div className="mgr-sexe-row">
                      <button
                        className={`btn${newClient.sexe === 'm' ? ' btn-primary' : ''}`}
                        onClick={() => setnewClient((d) => { d.sexe = 'm'; })}
                      >Homme</button>
                      <button
                        className={`btn${newClient.sexe === 'f' ? ' btn-primary' : ''}`}
                        onClick={() => setnewClient((d) => { d.sexe = 'f'; })}
                      >Femme</button>
                    </div>
                    {errors.sexe && <span className="badge badge-danger">{errors.sexe}</span>}
                  </div>

                  {/* Téléphone */}
                  <div className="mgr-form-field">
                    <label className="text-label">Téléphone</label>
                    <div className="mgr-phone-row">
                      <div className="btn mgr-country-btn" onClick={() => setShowCountries(!showCountries)} style={{ cursor: 'pointer' }}>
                        {theCnuntry ? `+${theCnuntry}` : 'Pays'}
                      </div>
                      <input className="input w-full" placeholder="6XX XXX XXX" value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>
                    {showCountries && (
                      <div className="surface-inset mgr-country-list col gap-xs">
                        {countries.map((c) => (
                          <div key={c.code} className="btn btn-ghost text-sm" style={{ cursor: 'pointer' }}
                            onClick={() => { setTheCountry(c.code); setShowCountries(false); }}>
                            +{c.code} {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.phone && <span className="badge badge-danger">{errors.phone}</span>}
                  </div>

                  {/* Âge */}
                  <div className="mgr-form-field">
                    <label className="text-label">Âge</label>
                    <input className="input" placeholder="Âge" value={newClient.age}
                      onChange={(e) => setnewClient((d) => { d.age = e.target.value; })} />
                    {errors.age && <span className="badge badge-danger">{errors.age}</span>}
                  </div>

                  {/* Vendeur */}
                  <div className="mgr-form-field">
                    <label className="text-label">ID Vendeur</label>
                    <input className="input" placeholder="Identifiant du vendeur (optionnel)" value={newClient.seller}
                      onChange={(e) => setnewClient((d) => { d.seller = e.target.value; })} />
                    {sellerSearching && (
                      <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>Recherche…</p>
                    )}
                    {!sellerSearching && sellerFound && (
                      <div className="surface-inset mgr-lookup-card">
                        <span className="badge" style={{ background: 'var(--color-background-info)', color: 'var(--color-text-info)', fontSize: '0.75rem' }}>
                          {sellerFound.sexe === 'f' ? '♀' : '♂'}
                        </span>
                        <div className="col gap-xs" style={{ flex: 1, minWidth: 0 }}>
                          <p className="text-label" style={{ margin: 0 }}>{sellerFound.name}</p>
                          <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                            {sellerFound.phone} · {sellerFound.office}
                          </p>
                        </div>
                        <span className="badge badge-success" style={{ fontSize: '0.7rem', flexShrink: 0 }}>✓</span>
                      </div>
                    )}
                    {!sellerSearching && sellerError && <span className="badge badge-danger">{sellerError}</span>}
                  </div>

                  {/* Bureau */}
                  <div className="mgr-form-field">
                    <label className="text-label">Bureau</label>
                    <input disabled className="input"
                      placeholder={showOfficeSelector ? selectedOffice || 'Sélectionnez un bureau' : user?.office}
                      value="" />
                  </div>
                </div>

                <div className="mgr-form-footer">
                  {errors.global && (
                    <span className="badge badge-danger w-full" style={{ justifyContent: 'center' }}>{errors.global}</span>
                  )}
                  {success && (
                    <span className="badge badge-success w-full" style={{ justifyContent: 'center' }}>{success}</span>
                  )}
                  <button
                    className={`btn btn-primary w-full justify-center${loading ? ' opacity-75' : ''}`}
                    disabled={loading} onClick={handleSubmit}
                  >
                    {loading ? 'Enregistrement…' : 'Enregistrer le client'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── CLIENT ROW ───────────────────────────────────────────────────────────────
function ClientRow({ client, onClick }: { client: Client; onClick: () => void }) {
  const initials = client.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div
      className="surface-inset row align-center gap-md"
      onClick={onClick}
      style={{ padding: '0.65rem 0.85rem', borderRadius: '0.6rem', cursor: 'pointer', transition: 'opacity 0.15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      <div style={{ width: '2.4rem', height: '2.4rem', borderRadius: '50%', background: 'var(--color-background-info)', color: 'var(--color-text-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem', flexShrink: 0 }}>
        {initials}
      </div>
      <div className="col gap-xs" style={{ flex: 1, minWidth: 0 }}>
        <p className="text-label" style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {client.name}
        </p>
        <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          {client.phone || '—'} · {client.age ? `${client.age} ans` : '—'}
        </p>
      </div>
      <div className="row gap-xs align-center" style={{ flexShrink: 0 }}>
        {client.level && <span className="badge badge-brand" style={{ fontSize: '0.7rem' }}>{client.level}</span>}
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: '1rem' }}>›</span>
      </div>
    </div>
  );
}

// ─── shared activity types ────────────────────────────────────────────────────
type AElement = { name: string; qty: number; total: number; benef: number; pv: number; commission: number | null };
type ActivityDetails = { nb_prod: number; nb_serv: number; alements: AElement[]; sellerName: string; clientName: string; commission: number | null };
type Activity = { id: string; seller: string; client: string; client_kind: string; payment_mode: string; total_amount: number; total_benefice: number; total_pv: number; office: string; date: string; bill_sent: boolean; issue: string; date_reglement: string | null; waiting_reglement: boolean; details: ActivityDetails };

function fmtAmount(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
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

// ─── CLIENT DETAIL ────────────────────────────────────────────────────────────
function ClientDetail({ client, onBack }: { client: Client; onBack: () => void }) {
  const initials = client.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const [activities, setActivities]     = useState<Activity[]>([]);
  const [activLoading, setActivLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setActivLoading(true);
      try {
        const res = await getDataFromTableWithConstraints('activity', {
          fields: ['id', 'date', 'total_amount', 'issue', 'details'],
          constraints: { client: String(client.id) },
          orderBy: { date: 'DESC' },
          limit: 3,
        });
        if (!cancelled && res.success) setActivities(res.list ?? []);
      } catch { } finally { if (!cancelled) setActivLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [client.id]);

  const fields: { label: string; value: string | number | null | undefined }[] = [
    { label: 'Téléphone',    value: client.phone },
    { label: 'Sexe',         value: client.sexe === 'm' ? 'Homme' : client.sexe === 'f' ? 'Femme' : client.sexe },
    { label: 'Âge',          value: client.age ? `${client.age} ans` : null },
    { label: 'Niveau',       value: client.level },
    { label: 'Tag',          value: client.tag },
    { label: 'Bureau',       value: client.office },
    { label: 'Vendeur',      value: client.seller },
    { label: 'Propriétaire', value: client.owner },
    { label: 'Inscrit le',   value: client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR') : null },
  ];

  return (
    <div className="mgr-detail">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ alignSelf: 'flex-start', flexShrink: 0 }}>
        ← Retour
      </button>

      <div className="mgr-detail-scroll">
        {/* profile card */}
        <div className="surface-inset col align-center gap-md" style={{ padding: '1.25rem', borderRadius: '0.75rem' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--color-background-info)', color: 'var(--color-text-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem' }}>
            {initials}
          </div>
          <div className="col align-center gap-xs">
            <h3 className="text-heading" style={{ margin: 0, textAlign: 'center' }}>{client.name}</h3>
            {client.level && <span className="badge badge-brand">{client.level}</span>}
          </div>
        </div>

        {/* fields grid */}
        <div className="mgr-detail-grid">
          {fields.map(({ label, value }) => (
            <div key={label} className="surface-inset mgr-detail-cell">
              <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{label}</p>
              <p className="text-label" style={{ margin: 0 }}>
                {value ?? <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
              </p>
            </div>
          ))}
        </div>

        {/* derniers achats */}
        <div className="col gap-sm">
          <p className="text-label" style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Derniers achats
          </p>
          {activLoading ? (
            <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>Chargement…</p>
          ) : activities.length === 0 ? (
            <p className="text-body text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Aucun achat enregistré.</p>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="surface-inset mgr-act-card">
                <div className="row align-center justify-between">
                  <p className="text-body text-sm" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{fmtDate(act.date)}</p>
                  <div className="row gap-xs align-center">
                    <span className={`badge ${issueBadgeClass(act.issue)}`} style={{ fontSize: '0.68rem' }}>{issueLabel(act.issue)}</span>
                    <p className="text-label" style={{ margin: 0 }}>{fmtAmount(act.total_amount)}</p>
                  </div>
                </div>
                <div className="col gap-xs">
                  {act.details?.alements?.map((el, i) => (
                    <div key={i} className="row align-center justify-between" style={{ gap: '0.5rem' }}>
                      <div className="row align-center gap-xs" style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ width: '0.3rem', height: '0.3rem', borderRadius: '50%', flexShrink: 0, background: 'var(--color-text-tertiary)' }} />
                        <p className="text-body text-sm" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {el.name}<span style={{ color: 'var(--color-text-tertiary)' }}> × {el.qty}</span>
                        </p>
                      </div>
                      <p className="text-body text-sm" style={{ margin: 0, flexShrink: 0, color: 'var(--color-text-secondary)' }}>{fmtAmount(el.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}