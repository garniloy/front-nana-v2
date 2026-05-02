//const backendUrl = 'https://backend-nana-v2.onrender.com';
const backendUrl = 'http://localhost:3000';

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

async function createSellData(fields: object) {
  const response = await fetch(backendUrl + '/sell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  return response.json();
}

import '../css/form.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';
import Bills from './Bill-viewer';
import OfficeSelector from './Office-selector';

// ─── Types ────────────────────────────────────────────────────────────────────
type ProdServ = {
  type: 'prod' | 'serv';
  nom: string;
  pr_stock: number;
  pr_distr: number;
  pr_clt: number;
  pv: number;
};

type Stock = { qty: number; name: string };

type Seller = {
  id: string;
  name: string;
  sexe: string;
  phone: string;
  upline: string;
  office: string;
};

type Client = {
  id: string;
  name: string;
  sexe: string;
  phone: string;
  seller: string;
};

type ClientObj =
  | (Seller & { _kind: 'distributor' })
  | (Client & { _kind: 'client' });

// ─── AElement ─────────────────────────────────────────────────────────────────
// {name: string, qty: number, total: number, benef: number, pv: number, commission: number|null}
// commission: number (per-item × qty) | null (no commission applicable)
type AElement = {name: string, qty: number, total: number, benef: number, pv: number, commission: number|null};

// ─── Commission object stored in details ──────────────────────────────────────
// null  → distributor sale or owner-is-seller (office keeps everything)
// object → regular client sale with an external seller to pay


type SellState = {
  id: string;
  seller: string;
  sellerObj: Seller | null;
  client: string;
  clientObj: ClientObj | null;
  clientKind: 'client' | 'distributor';
  payment_mode: string;
  details: {
    nb_prod: number;
    nb_serv: number;
    alements: AElement[];
    sellerName: string;
    clientName: string;
    commission: number|null;  // NEW
  };
  total_amount: number;
  total_benefice: number;
  total_pv: number;
  office: string;
  date: string;
  bill_sent: boolean;
};

type Actualsell = {
  id: string;
  name: string;
  amount: number;
  office: string;
  manager: string;
};

type FormErrors = Partial<Record<'seller' | 'client' | 'payment' | 'prod' | 'qty' | 'price', string>>;

// ─── Utility ──────────────────────────────────────────────────────────────────
function genId() {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const user = JSON.parse(localStorage.getItem('user') || 'null');
const connected = localStorage.getItem('connected');

// ─── Commission & benef calculation helpers ────────────────────────────────────
/**
 * Returns per-unit commission for one product line.
 * - distributor sale      → 0 (no commission)
 * - client sale, owner-seller → 0 (office keeps pr_clt - pr_stock)
 * - client sale, external seller → pr_clt - pr_distr
 */
function calcUnitCommission(
  ps: ProdServ,
  kind: 'client' | 'distributor',
  sellerIsOwner: boolean,
): number {
  if (ps.type === 'serv') return 0;   // ← services never generate commission
  if (kind === 'distributor') return 0;
  if (sellerIsOwner) return 0;
  return ps.pr_clt - ps.pr_distr;
}

/**
 * Returns per-unit benefice for the office.
 * - distributor sale              → pr_distr - pr_stock
 * - client sale, external seller  → pr_distr - pr_stock  (commission goes to seller separately)
 * - client sale, owner-seller     → pr_clt   - pr_stock  (office keeps everything)
 */
function calcUnitBenef(
  ps: ProdServ,
  kind: 'client' | 'distributor',
  sellerIsOwner: boolean,
  price: number,           // actual selling price used in this transaction
): number {
  if (kind === 'distributor') return ps.pr_distr - ps.pr_stock;
  if (sellerIsOwner)          return price - ps.pr_stock;   // pr_clt - pr_stock
  return ps.pr_distr - ps.pr_stock;
}

const INITIAL_SELL: SellState = {
  id: '',
  seller: '',
  sellerObj: null,
  client: '',
  clientObj: null,
  clientKind: 'client',
  payment_mode: '',
  details: {
    nb_prod: 0,
    nb_serv: 0,
    alements: [],
    sellerName: '',
    clientName: '',
    commission: null,
  },
  total_amount: 0,
  total_benefice: 0,
  total_pv: 0,
  office: '',
  date: '',
  bill_sent: false,
};

// ─── Sub-components ───────────────────────────────────────────────────────────
type SuggestionPopupProps = {
  items: string[];
  onSelect: (item: string) => void;
  onAddNew?: () => void;
  addLabel?: string;
};

function SuggestionPopup({ items, onSelect, onAddNew, addLabel }: SuggestionPopupProps) {
  if (!items.length && !onAddNew) return null;
  return (
    <div className="suggestion-popup">
      {onAddNew && (
        <div className="suggestion-item suggestion-add" onMouseDown={(e) => { e.preventDefault(); onAddNew(); }}>
          <span className="s-plus">＋</span> {addLabel}
        </div>
      )}
      {items.map((item, i) => (
        <div key={i} className="suggestion-item" onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}>
          {item}
        </div>
      ))}
    </div>
  );
}

type Step = { label: string; on: boolean };

function StepTracker({ steps }: { steps: Step[] }) {
  return (
    <div className="step-tracker">
      {steps.map((step, i) => (
        <div key={i} className="step-node">
          <div className={`step-line step-line-top ${i === 0 ? 'invisible' : step.on && steps[i - 1]?.on ? 'on' : ''}`} />
          <div className={`step-circle ${step.on ? 'on' : ''}`}>
            {step.on ? <span className="step-check">✓</span> : <span className="step-num">{i + 1}</span>}
          </div>
          <div className={`step-line step-line-bot ${i === steps.length - 1 ? 'invisible' : step.on && steps[i + 1]?.on ? 'on' : ''}`} />
        </div>
      ))}
    </div>
  );
}

type onCloseProps = { onclose: (s: boolean) => void };

// ─── Main component ───────────────────────────────────────────────────────────
export default function Vente({ onclose }: onCloseProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!connected || !user) {
      localStorage.removeItem('user');
      localStorage.removeItem('connected');
      navigate('/login');
    }
  }, [connected, user, navigate]);

  // ── Remote data ──
  const [stock, setStock]               = useImmer<Stock[]>([] as Stock[]);
  const [prodServList, setProdServList] = useImmer<ProdServ[]>([] as ProdServ[]);
  const [sellers, setSellers]           = useImmer<Seller[]>([] as Seller[]);
  const [clients, setClients]           = useImmer<Client[]>([] as Client[]);
  const [loading, setLoading]           = useState(true);

  // ── Sell state ──
  const [sell, setSell]             = useImmer<SellState>({ ...INITIAL_SELL } as SellState);
  //const [actualSell, setActualSell] = useImmer<Actualsell>({} as Actualsell);

  // ── Form / UI state ──
  const [sellerInput, setSellerInput]       = useState('');
  const [clientInput, setClientInput]       = useState('');
  const [sellerSugg, setSellerSugg]         = useState<string[]>([]);
  const [clientSugg, setClientSugg]         = useState<string[]>([]);
  const [showSellerSugg, setShowSellerSugg] = useState(false);
  const [showClientSugg, setShowClientSugg] = useState(false);
  const [sellerLocked, setSellerLocked]     = useState(false);

  // ── Product form ──
  const [prodInput, setProdInput]       = useState('');
  const [prodSugg, setProdSugg]         = useState<string[]>([]);
  const [showProdSugg, setShowProdSugg] = useState(false);
  const [selectedProd, setSelectedProd] = useState<ProdServ | null>(null);
  const [qtyInput, setQtyInput]         = useState('');
  const [priceInput, setPriceInput]     = useState('');
  const [showDetails, setShowDetails]   = useState(false);
  const [selectedOffice, setSelectedOffice] = useState('');

  // ── Errors & submit ──
  const [errors, setErrors]             = useImmer<FormErrors>({} as FormErrors);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [changeView, setChangeView] = useState(false);

  // ── Refs ──
  const sellerRef = useRef<HTMLInputElement>(null);
  const clientRef = useRef<HTMLInputElement>(null);
  const prodRef   = useRef<HTMLInputElement>(null);

  // ── Owner seller resolution ───────────────────────────────────────────────
  // ownerSeller: the seller whose id = user.promoted_by (auto-assigned for distributor sales)
  const ownerSeller = sellers.find((s) => s.id === String(user?.promoted_by ?? '')) ?? null;

  // ── Helper: is current seller the owner? ──────────────────────────────────
  const sellerIsOwner = useCallback(
    (sellerId: string) => sellerId === String(user?.promoted_by ?? ''),
    [],
  );

  // ── Reset ─────────────────────────────────────────────────────────────────
  function resetSell() {
    setSell({ ...INITIAL_SELL });
    setSellerInput(''); setClientInput(''); setProdInput('');
    setQtyInput(''); setPriceInput(''); setSelectedProd(null);
    setErrors({}); setSubmitStatus(null); setShowDetails(false); setSellerLocked(false);
  }

  // ─── Core recalc — called any time kind, sellerObj, or alements change ─────
  /**
   * Recomputes every line's price, benef, commission and all totals
   * given a new kind and seller context. Mutates the immer draft directly.
   */
  function recomputeAll(
    d: SellState,
    kind: 'client' | 'distributor',
    sellerId: string,
    prodList: ProdServ[],
  ) {
    const isOwner = sellerIsOwner(sellerId);
    let totalAmount = 0, totalPv = 0, totalBenef = 0, totalCommission = 0;
    let nb_prod = 0, nb_serv = 0;

    d.details.alements = d.details.alements.map((el): AElement => {
      const ps = prodList.find((p) => p.nom === el.name);
      if (!ps) return el;

      const canonicalPrice =
        ps.type === 'prod'
          ? kind === 'distributor' ? ps.pr_distr : ps.pr_clt
          : ps.pr_clt;

      const qty       = el.qty;
      const unitBenef = calcUnitBenef(ps, kind, isOwner, canonicalPrice);
      const unitComm  = calcUnitCommission(ps, kind, isOwner);
      const lineTotal = canonicalPrice * qty;
      const lineBenef = unitBenef * qty;
      const linePv    = ps.type === 'prod' ? ps.pv * qty : 0;
      const lineComm  = unitComm * qty;
      const commSlot: number | null = kind === 'distributor' || isOwner ? null : lineComm;

      if (ps.type === 'prod') nb_prod++; else nb_serv++;
      totalAmount     += lineTotal;
      totalPv         += linePv;
      totalBenef      += lineBenef;
      totalCommission += lineComm;

      return { name: el.name, qty, total: lineTotal, benef: lineBenef, pv: linePv, commission: commSlot };
    });

    d.details.nb_prod    = nb_prod;
    d.details.nb_serv    = nb_serv;
    d.total_amount       = totalAmount;
    d.total_pv           = totalPv;
    d.total_benefice     = totalBenef;
    d.clientKind         = kind;
    d.details.commission = (kind === 'distributor' || isOwner || totalCommission === 0)
      ? null
      : totalCommission;
  }

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (office: string) => {
    setLoading(true);
    try {
      const officeConstraint =
        user.owner || user.role === 'superuser'
          ? office ? { office } : {}
          : { office: user.office };

      const [stockRes, prodServRes, sellersRes, clientsRes] = await Promise.all([
        getDataFromTableWithConstraints('stock', {
          fields: ['name', 'qte'],
          constraints: { ...officeConstraint },
        }),
        getDataFromTableWithConstraints('prod_serv', {
          fields: ['nom', 'type', 'pr_stock', 'pr_distr', 'pr_clt', 'pv'],
        }),
        getDataFromTableWithConstraints('seller', {
          fields: ['id', 'name', 'sexe', 'phone', 'upline', 'office'],
          constraints: { is_deleted: false, ...officeConstraint },
        }),
        getDataFromTableWithConstraints('client', {
          fields: ['id', 'name', 'sexe', 'phone', 'seller'],
          constraints: { ...officeConstraint },
        }),
      ]);

      if (stockRes.success)    setStock(() => stockRes.list.map((s: { name: string; qte: number }) => ({ name: s.name, qty: s.qte })));
      if (prodServRes.success) setProdServList(() => prodServRes.list);
      if (sellersRes.success)  setSellers(() => sellersRes.list);
      if (clientsRes.success)  setClients(() => clientsRes.list);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(''); }, [fetchAll]);

  useEffect(() => {
    setStock([]); setProdServList([]); setSellers([]); setClients([]);
    resetSell();
    fetchAll(selectedOffice);
    // Pre-fill owner as default seller after reset (no guard needed — sell was just cleared)
    const ownerId    = String(user?.promoted_by ?? '');
    const officeName = user?.owner || user?.role === 'superuser'
      ? selectedOffice
      : user?.office ?? '';
    if (ownerId) {
      setSell((d: SellState) => {
        d.seller             = ownerId;
        d.details.sellerName = officeName;
      });
    }
  }, [selectedOffice]);

  // ── Re-run recomputeAll whenever clientKind or sellerObj changes ──────────
  // This is the reactive hook that makes the form "react immediately":
  // if the user already added items, then provides a client that turns out
  // to be a distributor, everything reprices automatically.
  useEffect(() => {
    if (sell.details.alements.length === 0) return;
    setSell((d: SellState) => {
      recomputeAll(d, d.clientKind, d.seller, prodServList);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sell.clientKind, sell.seller]);

  // ── Step tracker ──────────────────────────────────────────────────────────
  const steps: Step[] = [
    { label: 'Vendeur',  on: !!sell.sellerObj || !!sell.seller  },
    { label: 'Client',   on: !!sell.clientObj },
    { label: 'Paiement', on: !!sell.payment_mode },
    { label: 'Articles', on: sell.details.alements.length > 0 },
  ];
  const allStepsOn = steps.every((s) => s.on);

  // ── Suggestion helpers ────────────────────────────────────────────────────
  const allNames = useCallback(() => {
    const sv = sellers.map((s) => s.name);
    const cv = clients.map((c) => c.name);
    return [...new Set([...sv, ...cv])];
  }, [sellers, clients]);

  function filterSugg(query: string, list: string[]): string[] {
    if (!query) return [];
    return list.filter((n) => n.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }

  // ── Seller input ──────────────────────────────────────────────────────────
  function onSellerInput(val: string) {
    if (sellerLocked) return;
    setSellerInput(val);
    setSellerSugg(filterSugg(val, sellers.map((s) => s.name)));
    setShowSellerSugg(true);
    if (!val) {
      setSell((d: SellState) => {
        d.sellerObj = null; d.seller = '';  d.details.sellerName = '';
      });
    }
    setErrors((d: FormErrors) => { delete d.seller; });
  }

  function selectSeller(name: string) {
    if (sell.clientObj && sell.clientObj.name.toLowerCase() === name.toLowerCase()) {
      setErrors((d: FormErrors) => { d.seller = 'Le vendeur et le client ne peuvent pas être la même personne.'; });
      setSellerInput('');
      setShowSellerSugg(false);
      return;
    }
    const found = sellers.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setSellerInput(found.name);
      setSell((d: SellState) => {
        d.sellerObj          = found as typeof d.sellerObj;
        d.seller             = found.id;
        d.office             = found.office;
        d.details.sellerName = found.name;
        // Recompute immediately with the new seller context
        recomputeAll(d, d.clientKind, found.id, prodServList);
      });
      setErrors((d: FormErrors) => { delete d.seller; });
    } else {
      setErrors((d: FormErrors) => { d.seller = 'Vendeur introuvable dans la base.'; });
    }
    setShowSellerSugg(false);
  }

  function onSellerBlur() {
    setTimeout(() => setShowSellerSugg(false), 150);
    if (sellerInput && !sell.sellerObj) {
      setErrors((d: FormErrors) => { d.seller = "Ce vendeur n'est pas enregistré."; });
    }
  }

  // ── Client input ──────────────────────────────────────────────────────────
  function onClientInput(val: string) {
    setClientInput(val);
    setClientSugg(filterSugg(val, allNames()));
    setShowClientSugg(true);
    if (!val) {
      setSell((d: SellState) => {
        d.clientObj  = null; d.client = ''; 
        d.clientKind = 'client'; d.details.clientName = '';
        // Recompute back to client mode
        recomputeAll(d, 'client', d.seller, prodServList);
      });
      setSellerLocked(false);
    }
    setErrors((d: FormErrors) => { delete d.client; });
  }

  function selectClient(name: string) {
    if (sell.sellerObj && sell.sellerObj.name.toLowerCase() === name.toLowerCase()) {
      setErrors((d: FormErrors) => { d.client = 'Le client et le vendeur ne peuvent pas être la même personne.'; });
      setClientInput('');
      setShowClientSugg(false);
      return;
    }

    const asSeller = sellers.find((s) => s.name.toLowerCase() === name.toLowerCase());
    const asClient = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());

    if (asSeller) {
      // ── DISTRIBUTOR path ──────────────────────────────────────────────────
      const ownerForSale = ownerSeller;
      setClientInput(asSeller.name);
      setSellerInput(user.promoted_by)
      setSell((d: SellState) => {
        d.clientObj          = { ...asSeller, _kind: 'distributor' } as typeof d.clientObj;
        d.client             = asSeller.id;
        d.seller = user.promoted_by
        d.details.clientName = asSeller.name;
        if (ownerForSale) {
          d.sellerObj          = ownerForSale as typeof d.sellerObj;
          d.seller             = ownerForSale.id;
          d.office             = ownerForSale.office;
          d.details.sellerName = user?.owner || user?.role === 'superuser' ? selectedOffice : user?.office ?? '';
        }
        // Immediate full recompute at distributor prices
        recomputeAll(d, 'distributor', ownerForSale?.id ?? d.seller, prodServList);
      });
      if (ownerForSale) { setSellerInput(ownerForSale.name); setSellerLocked(true); }
      setErrors((d: FormErrors) => { delete d.client; delete d.seller; });

    } else if (asClient) {
      // ── REGULAR CLIENT path ───────────────────────────────────────────────
      const clientSeller = sellers.find((s) => s.id === asClient.seller);
      setClientInput(asClient.name);
      setSell((d: SellState) => {
        d.clientObj          = { ...asClient, _kind: 'client' } as typeof d.clientObj;
        d.client             = asClient.id;
        d.details.clientName = asClient.name;
        if (clientSeller && !d.sellerObj) {
          d.sellerObj          = clientSeller;
          d.seller             = clientSeller.id;
          d.office             = clientSeller.office;
          d.details.sellerName = clientSeller.name;
        }
        const effectiveSellerId = clientSeller && !sell.sellerObj ? clientSeller.id : d.seller;
        // Immediate full recompute at client prices
        recomputeAll(d, 'client', effectiveSellerId, prodServList);
      });
      if (asClient && !sell.sellerObj) {
        const cs = sellers.find((s) => s.id === asClient.seller);
        if (cs) setSellerInput(cs.name);
      }
      setSellerLocked(false);
      setErrors((d: FormErrors) => { delete d.client; });

    } else {
      setErrors((d: FormErrors) => { d.client = 'Client introuvable dans la base.'; });
    }
    setShowClientSugg(false);
  }

  function onClientBlur() {
    setTimeout(() => setShowClientSugg(false), 150);
    if (clientInput && !sell.clientObj) {
      setErrors((d: FormErrors) => { d.client = "Ce client n'est pas enregistré."; });
    }
  }

  // ── Product input ─────────────────────────────────────────────────────────
  function onProdInput(val: string) {
    setProdInput(val);
    setProdSugg(filterSugg(val, prodServList.map((p) => p.nom)));
    setShowProdSugg(true);
    if (!val) setSelectedProd(null);
  }

  function selectProd(name: string) {
    const ps = prodServList.find((p) => p.nom.toLowerCase() === name.toLowerCase());
    if (ps) {
      setProdInput(ps.nom);
      setSelectedProd(ps);
      const kind = sell.clientKind;
      const defaultPrice =
        ps.type === 'prod'
          ? kind === 'distributor' ? ps.pr_distr : ps.pr_clt
          : ps.pr_clt;
      setPriceInput(String(defaultPrice));
      setQtyInput('1');
    }
    setShowProdSugg(false);
    setErrors((d: FormErrors) => { delete d.prod; });
  }

  function onProdBlur() { setTimeout(() => setShowProdSugg(false), 150); }

  // ── Stock qty helper ──────────────────────────────────────────────────────
  function getStockQty(nom: string): number {
    const s = stock.find((st) => st.name === nom);
    return s ? s.qty : 0;
  }

  // ── Add item ──────────────────────────────────────────────────────────────
  // ─── Replace the entire addItem function ──────────────────────────────────────
function addItem() {
  const newErrors: FormErrors = {};
  if (!selectedProd) newErrors.prod = 'Sélectionnez un produit/service valide.';
  const qty   = parseInt(qtyInput);
  const price = parseFloat(priceInput);
  if (!qty || qty <= 0)          newErrors.qty   = 'Quantité invalide.';
  if (isNaN(price) || price < 0) newErrors.price = 'Prix invalide.';
  if (selectedProd?.type === 'prod') {
    const avail = getStockQty(selectedProd.nom);
    if (qty > avail) newErrors.qty = `Stock insuffisant (${avail} dispo).`;
  }
  if (Object.keys(newErrors).length) {
    setErrors((d: FormErrors) => Object.assign(d, newErrors));
    return;
  }

  const ps          = selectedProd!;
  const kind        = sell.clientKind;
  const isOwner     = sellerIsOwner(sell.seller);
  const canonicalPrice =
    ps.type === 'prod'
      ? kind === 'distributor' ? ps.pr_distr : ps.pr_clt
      : ps.pr_clt;
  const salePrice   = kind === 'distributor' ? canonicalPrice : price;
  const unitBenef   = calcUnitBenef(ps, kind, isOwner, salePrice);
  const unitComm    = calcUnitCommission(ps, kind, isOwner);
  const linePv      = ps.type === 'prod' ? ps.pv * qty : 0;
  const lineTotal   = salePrice * qty;
  const lineBenef   = unitBenef * qty;
  const lineComm    = unitComm * qty;
  const commSlot: number | null = kind === 'distributor' || isOwner ? null : lineComm;

  setSell((d: SellState) => {
    const existing = d.details.alements.findIndex((el) => el.name === ps.nom);
    if (existing !== -1) {
      const old         = d.details.alements[existing];
      const newQty      = old.qty + qty;
      const newTotal    = old.total + lineTotal;
      const newBenef    = old.benef + lineBenef;
      const newPv       = old.pv + linePv;
      const oldComm     = old.commission;
      const newCommSlot: number | null =
        commSlot === null && oldComm === null
          ? null
          : ((commSlot ?? 0) + (oldComm ?? 0));
      d.details.alements[existing] = {
        name: ps.nom, qty: newQty, total: newTotal,
        benef: newBenef, pv: newPv, commission: newCommSlot,
      };
    } else {
      d.details.alements.push({
        name: ps.nom, qty, total: lineTotal,
        benef: lineBenef, pv: linePv, commission: commSlot,
      });
      if (ps.type === 'prod') d.details.nb_prod++; else d.details.nb_serv++;
    }

    // Recompute totals + commission summary
    let ta = 0, tpv = 0, tb = 0, tc = 0;
    d.details.alements.forEach((el) => {
      ta  += el.total;
      tpv += el.pv;
      tb  += el.benef;
      if (el.commission !== null && el.commission > 0) tc += el.commission;
    });
    d.total_amount       = ta;
    d.total_pv           = tpv;
    d.total_benefice     = tb;
    d.details.commission = (kind === 'distributor' || isOwner || tc === 0) ? null : tc;
  });

  setProdInput(''); setSelectedProd(null); setQtyInput(''); setPriceInput('');
  setErrors((d: FormErrors) => { delete d.prod; delete d.qty; delete d.price; });
}

  // ─── Replace the entire removeItem function ───────────────────────────────────
function removeItem(idx: number) {
  setSell((d: SellState) => {
    const removed = d.details.alements[idx];
    const ps = prodServList.find((p) => p.nom === removed.name);
    if (ps?.type === 'prod') d.details.nb_prod = Math.max(0, d.details.nb_prod - 1);
    else                     d.details.nb_serv = Math.max(0, d.details.nb_serv - 1);
    d.details.alements.splice(idx, 1);

    const kind    = d.clientKind;
    const isOwner = sellerIsOwner(d.seller);
    let ta = 0, tpv = 0, tb = 0, tc = 0;
    d.details.alements.forEach((el) => {
      ta  += el.total;
      tpv += el.pv;
      tb  += el.benef;
      if (el.commission !== null && el.commission > 0) tc += el.commission;
    });
    d.total_amount       = ta;
    d.total_pv           = tpv;
    d.total_benefice     = tb;
    d.details.commission = (kind === 'distributor' || isOwner || tc === 0) ? null : tc;
  });
}

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!allStepsOn || isSubmitting) return;
    // Ensure seller is set to office owner if not manually chosen
    
    

    setIsSubmitting(true); setSubmitStatus(null);
    try {
      const now = new Date().toISOString();
      const id  = genId();
      const activity = {
        id,
        seller:         sell.seller,
        clientKind:     sell.clientKind,
        client:         sell.client,
        payment_mode:   sell.payment_mode,
        total_amount:   sell.total_amount,
        total_benefice: sell.total_benefice,
        office:         user.owner || user.role ==='superuser'? selectedOffice : user.office,
        date:           now,
        bill_sent:      false,
        total_pv:       sell.total_pv,
        details:        sell.details,   // includes commission
      };

      const newSellEntry: Actualsell = {
        id:      id,
        name:    sell.details.clientName || sell.client || 'Inconnu',
        amount:  sell.total_amount,
        office:  user.owner || user.role === 'superuser' ? selectedOffice : user.office,
        manager: user.id,
      };
      

      console.log(activity, newSellEntry)
      const response = await createSellData({
        office:   user.owner || user.role === 'superuser' ? selectedOffice : user.office,
        sell:     newSellEntry,   // ← use the local value
        activity,
      });
      if (!response || !response.success) throw new Error(response.message);

      for (const el of sell.details.alements) {
        const ps = prodServList.find((p) => p.nom === el.name);
        if (ps?.type !== 'prod') continue;
        const current = getStockQty(el.name);
        await createDataToTable('stock_move', {
          element: el.name, qty: el.qty, type: 'OUT', date: now, office: user.office,
        });
        setStock((d: Stock[]) => {
          const s = d.find((st) => st.name === el.name);
          if (s) s.qty = current - el.qty;
        });
      }
      setSubmitStatus('success');
      setTimeout(() => resetSell(), 2000);
    } catch (e) {
      console.error(); setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  

  if (loading) {
    return (
      <div className="w-full h-full col align-center justify-center gap-md" data-style="neuro" data-mode="light">
        <div className="vente-spinner" />
        <p className="text-label">Chargement des données…</p>
      </div>
    );
  }

  const isPriceLocked = sell.clientKind === 'distributor';
  const commissionSummary = sell.details.commission;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;700;800&display=swap');

        .vente-root { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
        .vente-header { display: flex; align-items: center; gap: 0.5rem; padding: var(--padding-sm); border-bottom: 1px solid var(--nm-dark); flex-shrink: 0; }
        .vente-main { display: grid; grid-template-columns: 300px 1fr; flex: 1; min-height: 0; overflow: hidden; }

        .step-side { display: flex; gap: var(--gap-lg); padding: var(--padding-lg); border-right: 1px solid var(--nm-dark); overflow-y: auto; min-height: 0; }
        .step-tracker { display: flex; flex-direction: column; align-items: center; padding-top: 0.25rem; flex-shrink: 0; width: 28px; }
        .step-node    { display: flex; flex-direction: column; align-items: center; }
        .step-line    { width: 2px; height: 52px; background: var(--nm-dark); border-radius: 2px; transition: background var(--duration-normal) var(--ease-out); }
        .step-line.on { background: var(--nm-brand); }
        .step-line.invisible { visibility: hidden; }
        .step-circle  { width: 26px; height: 26px; border-radius: var(--radius-full); border: 2px solid var(--nm-dark); background: var(--nm-bg); display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); color: var(--nm-text); transition: all var(--duration-normal) var(--ease-out); flex-shrink: 0; }
        .step-circle.on { border-color: var(--nm-brand); background: var(--nm-brand); color: #fff; }
        .step-check { font-size: 0.7rem; }
        .step-num   { font-size: 0.6rem; }

        .fields { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .field-block { display: flex; flex-direction: column; gap: var(--gap-xs); height: 102px; justify-content: center; position: relative; }

        .vente-input-error  { box-shadow: inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light), 0 0 0 2px var(--clr-danger-500) !important; }
        .vente-input-ok     { box-shadow: inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light), 0 0 0 2px var(--clr-accent-600) !important; }
        .vente-input-locked { box-shadow: inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light) !important; opacity: 0.7; cursor: not-allowed; }

        .input-wrap { position: relative; }
        .suggestion-popup { position: absolute; top: calc(100% + var(--gap-xs)); left: 0; right: 0; background: var(--nm-bg); border-radius: var(--radius-xl); box-shadow: 8px 8px 16px var(--nm-dark), -8px -8px 16px var(--nm-light); z-index: var(--z-dropdown); overflow: hidden; max-height: 200px; overflow-y: auto; }
        .suggestion-item { padding: var(--padding-xs); font-size: var(--text-sm); color: var(--nm-text-strong); cursor: pointer; transition: var(--transition-colors); }
        .suggestion-item:hover { background: rgba(0,0,0,0.04); }
        .suggestion-add  { color: var(--nm-brand); font-weight: var(--weight-medium); border-bottom: 1px solid var(--nm-dark); }

        .client-kind-badge { display: inline-flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-xs); padding: 0.15rem 0.6rem; border-radius: var(--radius-full); margin-top: var(--gap-xs); font-weight: var(--weight-medium); }
        .client-kind-badge.distr { color: var(--nm-brand); box-shadow: 2px 2px 4px var(--nm-dark), -2px -2px 4px var(--nm-light); background: var(--nm-bg); }
        .client-kind-badge.clt   { color: var(--clr-accent-700); box-shadow: 2px 2px 4px var(--nm-dark), -2px -2px 4px var(--nm-light); background: var(--nm-bg); }

        .lock-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; color: var(--nm-text); opacity: 0.6; margin-top: 2px; }

        .sell-summary { display: flex; align-items: center; gap: var(--gap-md); height: 102px; }
        .s-item  { display: flex; flex-direction: column; align-items: center; gap: var(--gap-xs); flex: 1; }
        .s-item p { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: var(--tracking-wider); color: var(--nm-text); margin: 0; }
        .s-nb    { font-family: 'Syne', sans-serif; font-weight: var(--weight-black); font-size: var(--text-2xl); color: var(--nm-text-strong); line-height: 1; }
        .s-sep   { width: 1px; height: 40px; box-shadow: 1px 0 0 var(--nm-light), -1px 0 0 var(--nm-dark); }
        .total-wrap { flex: 1.5; display: flex; flex-direction: column; gap: var(--gap-xs); }
        .total-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: var(--tracking-wider); color: var(--nm-text); }
        .total-val   { font-family: 'Syne', sans-serif; font-weight: var(--weight-bold); font-size: var(--text-md); color: var(--nm-brand); }

        .submit-feedback { margin-top: var(--gap-sm); padding: var(--padding-xs); border-radius: var(--radius-xl); font-size: var(--text-xs); text-align: center; font-weight: var(--weight-medium); }
        .submit-feedback.success { color: var(--clr-accent-700); box-shadow: inset 2px 2px 5px var(--nm-dark), inset -2px -2px 5px var(--nm-light); }
        .submit-feedback.error   { color: var(--clr-danger-500); box-shadow: inset 2px 2px 5px var(--nm-dark), inset -2px -2px 5px var(--nm-light); }

        /* Commission badge in left panel */
        .commission-badge {
          display: flex; flex-direction: column; gap: 4px;
          padding: 8px 12px; border-radius: var(--radius-xl); margin-top: var(--gap-sm);
          background: rgba(13,101,242,0.07);
          border: 1px solid rgba(13,101,242,0.18);
          font-size: 0.72rem; color: #0b55cb;
        }
        .commission-badge strong { font-size: 0.8rem; }
        .commission-null-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: var(--radius-full); margin-top: var(--gap-sm);
          font-size: 0.68rem; color: var(--nm-text); opacity: 0.65;
          box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light);
        }

        .sell-form-side { display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
        .summary-bar { display: flex; align-items: center; gap: var(--gap-lg); padding: var(--padding-md); border-bottom: 1px solid var(--nm-dark); flex-shrink: 0; }
        .sbar-group { display: flex; align-items: center; gap: var(--gap-sm); }
        .sbar-icon  { width: 32px; height: 32px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); box-shadow: 3px 3px 6px var(--nm-dark), -3px -3px 6px var(--nm-light); background: var(--nm-bg); }
        .sbar-val   { font-family: 'Syne', sans-serif; font-weight: var(--weight-bold); font-size: var(--text-base); color: var(--nm-text-strong); line-height: 1; }
        .sbar-sep   { width: 1px; height: 28px; box-shadow: 1px 0 0 var(--nm-light), -1px 0 0 var(--nm-dark); flex-shrink: 0; }
        .sbar-total { margin-left: auto; text-align: right; }
        .sbar-total .sbar-val { font-size: var(--text-lg); color: var(--nm-brand); }

        .detail-toggle { margin-left: var(--gap-sm); background: var(--nm-bg); color: var(--nm-text); border-radius: var(--radius-xl); padding: var(--padding-xs); font-size: var(--text-xs); font-weight: var(--weight-medium); box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light); transition: var(--transition-all); cursor: pointer; }
        .detail-toggle.active { box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light); color: var(--nm-brand); }

        .form-details { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
        .prod-form { display: grid; grid-template-columns: 1fr 100px 100px auto; gap: var(--gap-md); align-items: end; padding: var(--padding-md); border-bottom: 1px solid var(--nm-dark); flex-shrink: 0; }
        .prod-form-group { display: flex; flex-direction: column; gap: var(--gap-xs); }

        .stock-badge { display: flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-xs); color: var(--nm-text); margin-top: var(--gap-xs); }
        .stock-dot   { width: 6px; height: 6px; border-radius: var(--radius-full); background: var(--clr-accent-600); display: inline-block; }

        .details-panel { flex: 1; overflow-y: auto; padding: var(--padding-md); min-height: 0; }

        .color-legend { display: flex; gap: var(--gap-lg); margin-bottom: var(--gap-md); padding: var(--padding-xs); border-radius: var(--radius-xl); width: fit-content; box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light); }
        .legend-item  { display: flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-xs); color: var(--nm-text); text-transform: uppercase; letter-spacing: var(--tracking-wider); }
        .boule        { width: 10px; height: 10px; border-radius: var(--radius-full); display: inline-block; flex-shrink: 0; }
        .boule-qty    { background: var(--nm-brand); }
        .boule-pv     { background: var(--clr-accent-600); }
        .boule-prix   { background: var(--clr-warning-500); }
        .boule-comm   { background: #0d65f2; }

        .details-list { display: flex; flex-direction: column; gap: var(--gap-sm); }
        .detail-item { display: grid; grid-template-columns: 1fr 28px auto auto auto 1fr auto; align-items: center; gap: var(--gap-sm); padding: var(--padding-sm); border-radius: var(--radius-xl); background: var(--nm-bg); box-shadow: 5px 5px 10px var(--nm-dark), -5px -5px 10px var(--nm-light); transition: var(--transition-shadow); animation: fadeUp var(--duration-normal) var(--ease-out); }
        .detail-item:hover { box-shadow: 7px 7px 14px var(--nm-dark), -7px -7px 14px var(--nm-light); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .di-name  { font-size: var(--text-sm); color: var(--nm-text-strong); font-weight: var(--weight-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .di-type  { width: 22px; height: 22px; border-radius: var(--radius-sm); font-size: 0.5rem; display: flex; align-items: center; justify-content: center; font-weight: var(--weight-bold); text-transform: uppercase; box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); }
        .di-type.prod { color: var(--nm-brand); }
        .di-type.serv { color: var(--clr-accent-600); }
        .di-val   { display: flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-sm); color: var(--nm-text-strong); }
        .di-val .boule { width: 7px; height: 7px; }
        .di-rowsum { display: flex; gap: var(--gap-sm); justify-content: flex-end; flex-wrap: wrap; }
        .di-chip   { font-size: var(--text-xs); padding: 0.2rem 0.5rem; border-radius: var(--radius-full); display: flex; align-items: center; gap: var(--gap-xs); white-space: nowrap; font-weight: var(--weight-medium); box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); color: var(--nm-text); }
        .di-chip.pvt   { color: var(--clr-accent-700); }
        .di-chip.prit  { color: var(--clr-warning-500); }
        .di-chip.commt { color: #0d65f2; }
        .di-del   { background: none; border: none; color: var(--nm-text); cursor: pointer; padding: var(--gap-xs); font-size: var(--text-base); border-radius: var(--radius-md); transition: var(--transition-colors); display: flex; align-items: center; }
        .di-del:hover { color: var(--clr-danger-500); }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-48); gap: var(--gap-md); color: var(--nm-text); text-align: center; }
        .empty-icon  { font-size: var(--text-4xl); opacity: 0.35; }

        .vente-spinner { width: 32px; height: 32px; border-radius: var(--radius-full); box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light); animation: spin 1s var(--ease-inout) infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 860px) {
          .vente-main { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
          .step-side  { border-right: none; border-bottom: 1px solid var(--nm-dark); overflow-y: visible; }
          .prod-form  { grid-template-columns: 1fr auto; }
          .prod-form .qty-group, .prod-form .price-group { display: none; }
        }
      `}</style>

      <div className="vente-root" data-style="neuro" data-mode="light">

        {/* ── HEADER ── */}
        <div className="vente-header justify-between">
          <div className="col">
            <h1 className="text-heading text-xl">Nouvelle Vente</h1>
            <button className="btn" onClick={() => setChangeView((v) => !v)}>
              {changeView ? 'Afficher le formulaire' : 'Afficher les détails'}
            </button>
          </div>
          <OfficeSelector onOfficeSelect={(officeName) => setSelectedOffice(officeName)} />
          <button className="btn" onClick={() => onclose?.(true)}>back</button>
        </div>

        {changeView && <Bills />}
        {!changeView && (
          <div className="vente-main">

            {/* ── LEFT ── */}
            <div className="step-side">
              <StepTracker steps={steps} />
              <div className="fields">

                {/* Vendeur */}
                <div className="field-block">
                  <label className="text-label">
                    Vendeur
                    {sellerLocked
                      ? <span className="lock-badge"> 🔒 automatique</span>
                      : <span className="lock-badge"> (optionnel — bureau par défaut)</span>}
                  </label>
                  <div className="input-wrap">
                    <input
                      ref={sellerRef}
                      className={`input ${errors.seller ? 'vente-input-error' : sellerLocked ? 'vente-input-locked' : sell.sellerObj ? 'vente-input-ok' : ''}`}
                      type="text" placeholder="Nom du vendeur"
                      value={sellerInput} readOnly={sellerLocked}
                      onChange={(e) => onSellerInput(e.target.value)}
                      onBlur={onSellerBlur}
                      onFocus={() => { if (sellerInput && !sellerLocked) setShowSellerSugg(true); }}
                    />
                    {showSellerSugg && sellerSugg.length > 0 && !sellerLocked && (
                      <SuggestionPopup items={sellerSugg} onSelect={selectSeller} />
                    )}
                  </div>
                  {errors.seller && <span className="badge badge-danger">{errors.seller}</span>}
                </div>

                {/* Client */}
                <div className="field-block">
                  <label className="text-label">Client</label>
                  <div className="input-wrap">
                    <input
                      ref={clientRef}
                      className={`input ${errors.client ? 'vente-input-error' : sell.clientObj ? 'vente-input-ok' : ''}`}
                      type="text" placeholder="Nom du client"
                      value={clientInput}
                      onChange={(e) => onClientInput(e.target.value)}
                      onBlur={onClientBlur}
                      onFocus={() => { if (clientInput) setShowClientSugg(true); }}
                    />
                    {showClientSugg && clientSugg.length > 0 && (
                      <SuggestionPopup items={clientSugg} onSelect={selectClient} />
                    )}
                  </div>
                  {sell.clientObj && (
                    <span className={`client-kind-badge ${sell.clientKind === 'distributor' ? 'distr' : 'clt'}`}>
                      {sell.clientKind === 'distributor' ? '⬡ Distributeur — prix fixe' : '● Client'}
                    </span>
                  )}
                  {errors.client && <span className="badge badge-danger">{errors.client}</span>}
                </div>

                {/* Paiement */}
                <div className="field-block">
                  <label className="text-label">Mode de paiement</label>
                  <select
                    className={`input ${sell.payment_mode ? 'vente-input-ok' : ''}`}
                    value={sell.payment_mode}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSell((d: SellState) => { d.payment_mode = v; });
                      setErrors((d: FormErrors) => { delete d.payment; });
                    }}
                  >
                    <option value="">Sélectionner…</option>
                    <option value="Cash">Cash</option>
                    <option value="MTN Money">MTN Money</option>
                    <option value="Orange Money">Orange Money</option>
                  </select>
                  {errors.payment && <span className="badge badge-danger">{errors.payment}</span>}
                </div>

                {/* Résumé */}
                <div className="field-block" style={{ height: 'auto', paddingTop: 'var(--gap-sm)' }}>
                  <label className="text-label">Résumé</label>
                  <div className="surface-inset sell-summary">
                    <div className="s-item"><p>Produits</p><div className="s-nb">{sell.details.nb_prod}</div></div>
                    <div className="s-sep" />
                    <div className="s-item"><p>Services</p><div className="s-nb">{sell.details.nb_serv}</div></div>
                    <div className="s-sep" />
                    <div className="total-wrap">
                      <span className="total-label">Total</span>
                      <span className="total-val">{sell.total_amount.toLocaleString()} F</span>
                      <span className="total-label" style={{ marginTop: 'var(--gap-xs)' }}>Bénéfice</span>
                      <span className="total-val text-sm">{sell.total_benefice.toLocaleString()} F</span>
                    </div>
                  </div>

                  {/* Commission summary — shown below the résumé box */}
                  {sell.details.alements.length > 0 && (
                    commissionSummary !== null ? (
                      <div className="commission-badge">
                        <strong>💸 Commission → {sell.details.sellerName}</strong>
                        <span>{commissionSummary.toLocaleString()} F au total</span>
                      </div>
                    ) : (
                      <div className="commission-null-badge">
                        {sell.clientKind === 'distributor'
                          ? '⬡ Vente distributeur — pas de commission'
                          : sellerIsOwner(sell.seller)
                          ? '🏢 Vendeur = propriétaire — pas de commission'
                          : '—'}
                      </div>
                    )
                  )}
                </div>

                {/* Valider */}
                <div style={{ paddingTop: 'var(--gap-md)' }}>
                  <button
                    className={`btn w-full justify-center ${allStepsOn ? 'btn-primary' : 'opacity-50 not-allowed'}`}
                    onClick={handleSubmit}
                    disabled={!allStepsOn || isSubmitting}
                  >
                    {isSubmitting ? 'Enregistrement…' : '✓ Valider la Vente'}
                  </button>
                  {submitStatus === 'success' && <div className="submit-feedback success">✅ Vente enregistrée avec succès !</div>}
                  {submitStatus === 'error'   && <div className="submit-feedback error">⚠ Erreur lors de l'enregistrement.</div>}
                </div>

              </div>
            </div>

            {/* ── RIGHT ── */}
            <div className="sell-form-side">

              {/* Summary bar */}
              <div className="summary-bar">
                <div className="sbar-group">
                  <div className="sbar-icon">📦</div>
                  <div className="col gap-xs"><span className="text-label">Produits</span><span className="sbar-val">{sell.details.nb_prod}</span></div>
                </div>
                <div className="sbar-sep" />
                <div className="sbar-group">
                  <div className="sbar-icon">🛠</div>
                  <div className="col gap-xs"><span className="text-label">Services</span><span className="sbar-val">{sell.details.nb_serv}</span></div>
                </div>
                <div className="sbar-sep" />
                <div className="sbar-group">
                  <div className="sbar-icon">PV</div>
                  <div className="col gap-xs">
                    <span className="text-label">Total PV</span>
                    <span className="sbar-val" style={{ color: 'var(--clr-accent-700)' }}>{sell.total_pv.toLocaleString()}</span>
                  </div>
                </div>
                {/* Commission chip in summary bar */}
                {commissionSummary && (
                  <>
                    <div className="sbar-sep" />
                    <div className="sbar-group">
                      <div className="sbar-icon">💸</div>
                      <div className="col gap-xs">
                        <span className="text-label">Commission</span>
                        <span className="sbar-val" style={{ color: '#0d65f2' }}>{commissionSummary.toLocaleString()} F</span>
                      </div>
                    </div>
                  </>
                )}
                <div className="sbar-total col gap-xs">
                  <span className="text-label">Montant Total</span>
                  <span className="sbar-val">{sell.total_amount.toLocaleString()} FCFA</span>
                </div>
                <button className={`detail-toggle ${showDetails ? 'active' : ''}`} onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? '◀ Masquer' : '▶ Détails'}
                </button>
              </div>

              {/* Product form + list */}
              <div className="form-details">
                {!showDetails && (
                  <div className="prod-form">
                    <div className="prod-form-group relative">
                      <label className="text-label">Produit / Service</label>
                      <div className="input-wrap">
                        <input
                          ref={prodRef}
                          className={`input ${errors.prod ? 'vente-input-error' : selectedProd ? 'vente-input-ok' : ''}`}
                          type="text" placeholder="Rechercher…"
                          value={prodInput}
                          onChange={(e) => onProdInput(e.target.value)}
                          onBlur={onProdBlur}
                          onFocus={() => { if (prodInput) setShowProdSugg(true); }}
                        />
                        {showProdSugg && prodSugg.length > 0 && (
                          <SuggestionPopup items={prodSugg} onSelect={selectProd} />
                        )}
                      </div>
                      {selectedProd?.type === 'prod' && (
                        <div className="stock-badge"><span className="stock-dot" />Stock : {getStockQty(selectedProd.nom)} unités</div>
                      )}
                      {errors.prod && <span className="badge badge-danger">{errors.prod}</span>}
                    </div>

                    <div className="prod-form-group qty-group">
                      <label className="text-label">Qté</label>
                      <input
                        className={`input ${errors.qty ? 'vente-input-error' : ''}`}
                        type="number" min="1" placeholder="0" value={qtyInput}
                        onChange={(e) => { setQtyInput(e.target.value); setErrors((d: FormErrors) => { delete d.qty; }); }}
                      />
                      {errors.qty && <span className="badge badge-danger text-xs">{errors.qty}</span>}
                    </div>

                    <div className="prod-form-group price-group">
                      <label className="text-label">
                        Prix unit.{isPriceLocked && <span className="lock-badge"> 🔒</span>}
                      </label>
                      <input
                        className={`input ${errors.price ? 'vente-input-error' : ''} ${isPriceLocked ? 'vente-input-locked' : ''}`}
                        type="number" min="0" placeholder="0"
                        value={priceInput} readOnly={isPriceLocked}
                        onChange={(e) => {
                          if (isPriceLocked) return;
                          setPriceInput(e.target.value);
                          setErrors((d: FormErrors) => { delete d.price; });
                        }}
                      />
                      {errors.price && <span className="badge badge-danger text-xs">{errors.price}</span>}
                    </div>

                    <button className="btn btn-primary" onClick={addItem}>＋ Ajouter</button>
                  </div>
                )}

                <div className="details-panel">
                  {sell.details.alements.length > 0 && (
                    <div className="color-legend">
                      <div className="legend-item"><span className="boule boule-qty" /> Qté</div>
                      <div className="legend-item"><span className="boule boule-pv" /> PV</div>
                      <div className="legend-item"><span className="boule boule-prix" /> Prix</div>
                      {commissionSummary !== null && <div className="legend-item"><span className="boule boule-comm" /> Commission</div>}
                    </div>
                  )}
                  <div className="details-list">
                    {sell.details.alements.length === 0 ? (
                      <div className="empty-state">
                        <span className="empty-icon">📋</span>
                        <span className="text-body text-sm">Aucun article ajouté</span>
                        <span className="text-label">Recherchez un produit ou service et cliquez sur Ajouter</span>
                      </div>
                    ) : (
                      sell.details.alements.map((el, i) => {
                        const { name, qty, total, pv, commission: comm } = el;
                        const ps        = prodServList.find((p) => p.nom === name);
                        const isServ    = ps?.type === 'serv';
                        const unitPrice = qty > 0 ? total / qty : 0;
                        return (
                          <div key={i} className="detail-item">
                            <div className="di-name">{name}</div>
                            <div className={`di-type ${isServ ? 'serv' : 'prod'}`}>{isServ ? 'SV' : 'PD'}</div>
                            <div className="di-val"><span className="boule boule-qty" />{qty}</div>
                            <div className="di-val"><span className="boule boule-pv" />{isServ ? '—' : (ps?.pv ?? 0)}</div>
                            <div className="di-val"><span className="boule boule-prix" />{unitPrice.toLocaleString()}</div>
                            <div className="di-rowsum">
                              {!isServ && <div className="di-chip pvt">PV×{qty} = {pv.toLocaleString()}</div>}
                              <div className="di-chip prit">{total.toLocaleString()} F</div>
                              {comm !== null && comm > 0 && (
                                <div className="di-chip commt">💸 {comm.toLocaleString()} F</div>
                              )}
                            </div>
                            <button className="di-del" onClick={() => removeItem(i)} title="Supprimer">✕</button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}