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

const getDataFromTableWithConstraints = async (table: string, body: object) => {
  const res = await fetch(backendUrl + '/crud/getwith/' + table, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

// ─── imports ──────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useImmer } from 'use-immer';

// ─── types ────────────────────────────────────────────────────────────────────
type ModalType = 'client' | 'distributor';

type Seller = {
  id: string;
  name: string;
  phone: string;
  sexe: string;
  office: string;
};

type Props = {
  type: ModalType;
  prefillName: string;
  office: string;
  promotedBy: string;
  onSuccess: (name: string) => void;
  onClose: () => void;
};

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
  { code: '250', name: 'Rwanda' },
  { code: '257', name: 'Burundi' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT FORM
// ─────────────────────────────────────────────────────────────────────────────
function ClientForm({
  prefillName,
  office,
  promotedBy,
  onSuccess,
}: {
  prefillName: string;
  office: string;
  promotedBy: string;
  onSuccess: (name: string) => void;
}) {
  const [form, setForm] = useImmer({
    name: prefillName,
    sexe: '',
    age: '',
    seller: '',
  });
  const [phoneNumber, setPhoneNumber]     = useState('');
  const [theCountry, setTheCountry]       = useState('237');
  const [showCountries, setShowCountries] = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState('');

  // seller lookup
  const [sellerFound, setSellerFound]         = useState<Seller | null>(null);
  const [sellerSearching, setSellerSearching] = useState(false);
  const [sellerError, setSellerError]         = useState('');

  useEffect(() => {
    const id = form.seller.trim();
    if (!id) { setSellerFound(null); setSellerError(''); return; }
    const timer = setTimeout(async () => {
      setSellerSearching(true);
      setSellerError('');
      try {
        const res = await getDataFromTableWithConstraints('seller', {
          fields: ['id', 'name', 'phone', 'sexe', 'office'],
          constraints: { id, is_deleted: false, owner: promotedBy },
          fetch: 'one',
        });
        if (res.success && res.list) setSellerFound(res.list);
        else { setSellerFound(null); setSellerError('Vendeur introuvable'); }
      } catch {
        setSellerFound(null); setSellerError('Erreur de recherche');
      } finally {
        setSellerSearching(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.seller]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim())                                    errs.name  = 'Nom requis';
    if (!form.sexe)                                           errs.sexe  = 'Sexe requis';
    if (phoneNumber.length <= 8 || isNaN(Number(phoneNumber))) errs.phone = 'Numéro invalide (min 9 chiffres)';
    if (!form.age || isNaN(Number(form.age)))                 errs.age   = 'Âge invalide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await createDataToTable('client', {
        name:       form.name,
        sexe:       form.sexe,
        age:        Number(form.age),
        phone:      theCountry + phoneNumber,
        seller:     form.seller || promotedBy,
        office,
        owner:      promotedBy,
        created_at: 'now()',
      });
      if (data.success === false) throw new Error(data.message || 'Erreur serveur');
      setSuccess('Client enregistré !');
      setTimeout(() => onSuccess(form.name), 1200);
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col gap-md">
      {/* Nom */}
      <div className="col gap-xs">
        <label className="text-label">Nom complet</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => setForm((d) => { d.name = e.target.value; })}
          placeholder="Nom complet"
        />
        {errors.name && <span className="badge badge-danger">{errors.name}</span>}
      </div>

      {/* Sexe */}
      <div className="col gap-xs">
        <label className="text-label">Sexe</label>
        <div className="row gap-md">
          <button
            className={`btn w-full justify-center${form.sexe === 'm' ? ' btn-primary' : ''}`}
            onClick={() => setForm((d) => { d.sexe = 'm'; })}
          >Homme</button>
          <button
            className={`btn w-full justify-center${form.sexe === 'f' ? ' btn-primary' : ''}`}
            onClick={() => setForm((d) => { d.sexe = 'f'; })}
          >Femme</button>
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
            onClick={() => setShowCountries((v) => !v)}
          >
            {theCountry ? `+${theCountry}` : 'Pays'}
          </div>
          <input
            className="input w-full"
            placeholder="6XX XXX XXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        {showCountries && (
          <div className="surface-inset col gap-xs" style={{ maxHeight: '10rem', overflowY: 'auto' }}>
            {countries.map((c) => (
              <div
                key={c.code}
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

      {/* Âge */}
      <div className="col gap-xs">
        <label className="text-label">Âge</label>
        <input
          className="input"
          type="number"
          placeholder="Âge"
          value={form.age}
          onChange={(e) => setForm((d) => { d.age = e.target.value; })}
        />
        {errors.age && <span className="badge badge-danger">{errors.age}</span>}
      </div>

      {/* Vendeur (optionnel) */}
      <div className="col gap-xs">
        <label className="text-label">ID Vendeur <span style={{ opacity: 0.5, fontWeight: 400 }}>(optionnel)</span></label>
        <input
          className="input"
          placeholder="Identifiant du vendeur"
          value={form.seller}
          onChange={(e) => setForm((d) => { d.seller = e.target.value; })}
        />
        {sellerSearching && (
          <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>Recherche…</p>
        )}
        {!sellerSearching && sellerFound && (
          <div className="surface-inset row align-center gap-sm" style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
            <span className="badge" style={{ background: 'var(--color-background-info)', color: 'var(--color-text-info)', fontSize: '0.75rem' }}>
              {sellerFound.sexe === 'f' ? '♀' : '♂'}
            </span>
            <div className="col gap-xs" style={{ flex: 1 }}>
              <p className="text-label" style={{ margin: 0 }}>{sellerFound.name}</p>
              <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                {sellerFound.phone} · {sellerFound.office}
              </p>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>✓</span>
          </div>
        )}
        {!sellerSearching && sellerError && <span className="badge badge-danger">{sellerError}</span>}
      </div>

      {/* Bureau readonly */}
      <div className="col gap-xs">
        <label className="text-label">Bureau</label>
        <input disabled className="input" placeholder={office} value="" />
      </div>

      {/* Feedback */}
      {errors.global && (
        <span className="badge badge-danger w-full" style={{ justifyContent: 'center' }}>{errors.global}</span>
      )}
      {success && (
        <span className="badge badge-success w-full" style={{ justifyContent: 'center' }}>{success}</span>
      )}

      <button
        className={`btn btn-primary w-full justify-center${loading ? ' opacity-75' : ''}`}
        disabled={loading}
        onClick={handleSubmit}
      >
        {loading ? 'Enregistrement…' : 'Enregistrer le client'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUTOR FORM
// ─────────────────────────────────────────────────────────────────────────────
function DistributorForm({
  prefillName,
  office,
  promotedBy,
  onSuccess,
}: {
  prefillName: string;
  office: string;
  promotedBy: string;
  onSuccess: (name: string) => void;
}) {
  const [form, setForm] = useImmer({
    id:     '',
    name:   prefillName,
    sexe:   '',
    upline: '',
  });
  const [phoneNumber, setPhoneNumber]     = useState('');
  const [theCountry, setTheCountry]       = useState('237');
  const [showCountries, setShowCountries] = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState('');

  // upline lookup
  const [uplineFound, setUplineFound]         = useState<Seller | null>(null);
  const [uplineSearching, setUplineSearching] = useState(false);
  const [uplineError, setUplineError]         = useState('');

  useEffect(() => {
    const id = form.upline.trim();
    if (!id) { setUplineFound(null); setUplineError(''); return; }
    const timer = setTimeout(async () => {
      setUplineSearching(true);
      setUplineError('');
      try {
        const res = await getDataFromTableWithConstraints('seller', {
          fields: ['id', 'name', 'phone', 'sexe', 'office'],
          constraints: { id, is_deleted: false, owner: promotedBy },
          fetch: 'one',
        });
        if (res.success && res.list) setUplineFound(res.list);
        else { setUplineFound(null); setUplineError('Upline introuvable'); }
      } catch {
        setUplineFound(null); setUplineError('Erreur de recherche');
      } finally {
        setUplineSearching(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.upline]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.id.trim())                                       errs.id    = 'Identifiant requis';
    if (!form.name.trim())                                     errs.name  = 'Nom requis';
    if (!form.sexe)                                            errs.sexe  = 'Sexe requis';
    if (phoneNumber.length <= 8 || isNaN(Number(phoneNumber))) errs.phone = 'Numéro invalide (min 9 chiffres)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await createDataToTable('seller', {
        id:         form.id,
        name:       form.name,
        sexe:       form.sexe,
        phone:      theCountry + phoneNumber,
        upline:     form.upline || promotedBy,
        office,
        owner:      promotedBy,
        created_at: 'now()',
        is_deleted: false,
      });
      if (data.success === false) throw new Error(data.message || 'Erreur serveur');
      setSuccess('Distributeur enregistré !');
      setTimeout(() => onSuccess(form.name), 1200);
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col gap-md">
      {/* ID */}
      <div className="col gap-xs">
        <label className="text-label">Identifiant unique</label>
        <input
          className="input"
          placeholder="ID du distributeur"
          value={form.id}
          onChange={(e) => setForm((d) => { d.id = e.target.value; })}
        />
        {errors.id && <span className="badge badge-danger">{errors.id}</span>}
      </div>

      {/* Nom */}
      <div className="col gap-xs">
        <label className="text-label">Nom complet</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => setForm((d) => { d.name = e.target.value; })}
          placeholder="Nom complet"
        />
        {errors.name && <span className="badge badge-danger">{errors.name}</span>}
      </div>

      {/* Sexe */}
      <div className="col gap-xs">
        <label className="text-label">Sexe</label>
        <div className="row gap-md">
          <button
            className={`btn w-full justify-center${form.sexe === 'm' ? ' btn-primary' : ''}`}
            onClick={() => setForm((d) => { d.sexe = 'm'; })}
          >Homme</button>
          <button
            className={`btn w-full justify-center${form.sexe === 'f' ? ' btn-primary' : ''}`}
            onClick={() => setForm((d) => { d.sexe = 'f'; })}
          >Femme</button>
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
            onClick={() => setShowCountries((v) => !v)}
          >
            {theCountry ? `+${theCountry}` : 'Pays'}
          </div>
          <input
            className="input w-full"
            placeholder="6XX XXX XXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        {showCountries && (
          <div className="surface-inset col gap-xs" style={{ maxHeight: '10rem', overflowY: 'auto' }}>
            {countries.map((c) => (
              <div
                key={c.code}
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

      {/* Upline (optionnel) */}
      <div className="col gap-xs">
        <label className="text-label">Upline <span style={{ opacity: 0.5, fontWeight: 400 }}>(optionnel)</span></label>
        <input
          className="input"
          placeholder="ID de l'upline"
          value={form.upline}
          onChange={(e) => setForm((d) => { d.upline = e.target.value; })}
        />
        {uplineSearching && (
          <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)' }}>Recherche…</p>
        )}
        {!uplineSearching && uplineFound && (
          <div className="surface-inset row align-center gap-sm" style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
            <span className="badge" style={{ background: 'var(--color-background-info)', color: 'var(--color-text-info)', fontSize: '0.75rem' }}>
              {uplineFound.sexe === 'f' ? '♀' : '♂'}
            </span>
            <div className="col gap-xs" style={{ flex: 1 }}>
              <p className="text-label" style={{ margin: 0 }}>{uplineFound.name}</p>
              <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                {uplineFound.phone} · {uplineFound.office}
              </p>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>✓</span>
          </div>
        )}
        {!uplineSearching && uplineError && <span className="badge badge-danger">{uplineError}</span>}
      </div>

      {/* Bureau readonly */}
      <div className="col gap-xs">
        <label className="text-label">Bureau</label>
        <input disabled className="input" placeholder={office} value="" />
      </div>

      {/* Feedback */}
      {errors.global && (
        <span className="badge badge-danger w-full" style={{ justifyContent: 'center' }}>{errors.global}</span>
      )}
      {success && (
        <span className="badge badge-success w-full" style={{ justifyContent: 'center' }}>{success}</span>
      )}

      <button
        className={`btn btn-primary w-full justify-center${loading ? ' opacity-75' : ''}`}
        disabled={loading}
        onClick={handleSubmit}
      >
        {loading ? 'Enregistrement…' : 'Enregistrer le distributeur'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
export default function QuickRegisterModal({
  type,
  prefillName,
  office,
  promotedBy,
  onSuccess,
  onClose,
}: Props) {
  const title = type === 'client' ? '＋ Nouveau client' : '＋ Nouveau distributeur';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="surface col gap-md"
        data-style="neuro"
        data-mode="light"
        style={{
          width: '100%',
          maxWidth: '26rem',
          maxHeight: '88vh',
          borderRadius: '0.9rem',
          padding: '1.25rem',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* header */}
        <div className="row align-center justify-between" style={{ flexShrink: 0 }}>
          <div className="col gap-xs">
            <h3 className="text-heading" style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h3>
            <p className="text-body text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              Bureau : <strong>{office}</strong>
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="divider" style={{ flexShrink: 0 }} />

        {/* scrollable form body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {type === 'client' ? (
            <ClientForm
              prefillName={prefillName}
              office={office}
              promotedBy={promotedBy}
              onSuccess={onSuccess}
            />
          ) : (
            <DistributorForm
              prefillName={prefillName}
              office={office}
              promotedBy={promotedBy}
              onSuccess={onSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}