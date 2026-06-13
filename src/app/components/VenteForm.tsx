// url backend here
const backendUrl = 'https://backend-nana-v2-production.up.railway.app';
//const backendUrl = 'http://localhost:3000';

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
import QuickRegisterModal from './Quickregistermodal';

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

type AElement = { name: string; type: string; qty: number; total: number; benef: number; pv: number; commission: number | null };

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
    commission: number | null;
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

type QuickRegisterState = {
  open: boolean;
  type: 'client' | 'distributor';
  prefillName: string;
};

// ─── Utility ──────────────────────────────────────────────────────────────────
function genId() {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function calcUnitCommission(ps: ProdServ, kind: 'client' | 'distributor', sellerIsOwner: boolean, price: number): number {
  if (ps.type === 'serv') return 0;
  if (kind === 'distributor') return 0;
  if (sellerIsOwner) return 0;
  return Math.max(0, price - ps.pr_distr);
}

function calcUnitBenef(ps: ProdServ, kind: 'client' | 'distributor', sellerIsOwner: boolean, price: number): number {
  if (ps.type === 'serv') return price;
  if (kind === 'distributor') return ps.pr_distr - ps.pr_stock;
  if (sellerIsOwner) return price - ps.pr_stock;
  return ps.pr_distr - ps.pr_stock;
}

const INITIAL_SELL: SellState = {
  id: '', seller: '', sellerObj: null, client: '', clientObj: null,
  clientKind: 'client', payment_mode: '',
  details: { nb_prod: 0, nb_serv: 0, alements: [], sellerName: '', clientName: '', commission: null },
  total_amount: 0, total_benefice: 0, total_pv: 0, office: '', date: '', bill_sent: false,
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

// Horizontal step tracker for mobile, vertical for desktop
function StepTracker({ steps, horizontal = false }: { steps: Step[]; horizontal?: boolean }) {
  if (horizontal) {
    return (
      <div className="step-tracker-h">
        {steps.map((step, i) => (
          <div key={i} className="step-node-h">
            <div className={`step-circle-h ${step.on ? 'on' : ''}`}>
              {step.on ? <span className="step-check">✓</span> : <span className="step-num">{i + 1}</span>}
            </div>
            <span className={`step-label-h ${step.on ? 'on' : ''}`}>{step.label}</span>
            {i < steps.length - 1 && (
              <div className={`step-line-h ${step.on && steps[i + 1]?.on ? 'on' : ''}`} />
            )}
          </div>
        ))}
      </div>
    );
  }
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
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const connected = localStorage.getItem('connected');

  useEffect(() => {
    if (!connected || !user) navigate('/login');
  }, [connected, user]);

  const [stock, setStock]               = useImmer<Stock[]>([] as Stock[]);
  const [prodServList, setProdServList] = useImmer<ProdServ[]>([] as ProdServ[]);
  const [sellers, setSellers]           = useImmer<Seller[]>([] as Seller[]);
  const [clients, setClients]           = useImmer<Client[]>([] as Client[]);
  const [loading, setLoading]           = useState(false);
  const [sell, setSell]                 = useImmer<SellState>({ ...INITIAL_SELL } as SellState);

  const [sellerInput, setSellerInput]       = useState('');
  const [clientInput, setClientInput]       = useState('');
  const [sellerSugg, setSellerSugg]         = useState<string[]>([]);
  const [clientSugg, setClientSugg]         = useState<string[]>([]);
  const [showSellerSugg, setShowSellerSugg] = useState(false);
  const [showClientSugg, setShowClientSugg] = useState(false);
  const [sellerLocked, setSellerLocked]     = useState(false);

  const [prodInput, setProdInput]       = useState('');
  const [prodSugg, setProdSugg]         = useState<string[]>([]);
  const [showProdSugg, setShowProdSugg] = useState(false);
  const [selectedProd, setSelectedProd] = useState<ProdServ | null>(null);
  const [qtyInput, setQtyInput]         = useState('');
  const [priceInput, setPriceInput]     = useState('');
  const [showDetails, setShowDetails]   = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

  const [errors, setErrors]             = useImmer<FormErrors>({} as FormErrors);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changeView, setChangeView]     = useState(false);

  // Mobile tab: 'form' | 'articles'
  const [mobileTab, setMobileTab] = useState<'form' | 'articles'>('form');

  const [quickRegister, setQuickRegister] = useState<QuickRegisterState>({
    open: false, type: 'client', prefillName: '',
  });

  const sellerRef = useRef<HTMLInputElement>(null);
  const clientRef = useRef<HTMLInputElement>(null);
  const prodRef   = useRef<HTMLInputElement>(null);

  const ownerSeller = sellers.find((s) => s.id === String(user?.promoted_by ?? '')) ?? null;

  const sellerIsOwner = useCallback(
    (sellerId: string) => sellerId === String(user?.promoted_by ?? ''),
    [],
  );

  function resetSell() {
    setSell({ ...INITIAL_SELL });
    setSellerInput(''); setClientInput(''); setProdInput('');
    setQtyInput(''); setPriceInput(''); setSelectedProd(null);
    setErrors({}); setSubmitStatus(null); setShowDetails(false); setSellerLocked(false);
  }

  function recomputeAll(d: SellState, kind: 'client' | 'distributor', sellerId: string, prodList: ProdServ[]) {
    const isOwner = sellerIsOwner(sellerId);
    let totalAmount = 0, totalPv = 0, totalBenef = 0, totalCommission = 0;
    let nb_prod = 0, nb_serv = 0;

    d.details.alements = d.details.alements.map((el): AElement => {
      const ps = prodList.find((p) => p.nom === el.name);
      if (!ps) return el;
      const canonicalPrice = ps.type === 'prod' ? (kind === 'distributor' ? ps.pr_distr : ps.pr_clt) : ps.pr_clt;
      const qty = el.qty;
      const unitBenef = calcUnitBenef(ps, kind, isOwner, canonicalPrice);
      const unitComm  = calcUnitCommission(ps, kind, isOwner, canonicalPrice);
      const lineTotal = canonicalPrice * qty;
      const lineBenef = unitBenef * qty;
      const linePv    = ps.type === 'prod' ? ps.pv * qty : 0;
      const lineComm  = unitComm * qty;
      const commSlot: number | null = kind === 'distributor' || isOwner ? null : lineComm;
      if (ps.type === 'prod') nb_prod++; else nb_serv++;
      totalAmount += lineTotal; totalPv += linePv; totalBenef += lineBenef; totalCommission += lineComm;
      return { name: el.name, type: el.type, qty, total: lineTotal, benef: lineBenef, pv: linePv, commission: commSlot };
    });

    d.details.nb_prod    = nb_prod;
    d.details.nb_serv    = nb_serv;
    d.total_amount       = totalAmount;
    d.total_pv           = totalPv;
    d.total_benefice     = totalBenef;
    d.clientKind         = kind;
    d.details.commission = (kind === 'distributor' || isOwner || totalCommission === 0) ? null : totalCommission;
  }

  const fetchAll = async (office: string) => {
    setLoading(true);
    try {
      const [stockRes, prodServRes, sellersRes, clientsRes] = await Promise.all([
        getDataFromTableWithConstraints('stock', { fields: ['name', 'qte'], constraints: { office } }),
        getDataFromTableWithConstraints('ref_prod_serv', { fields: ['nom', 'type', 'pr_stock', 'pr_distr', 'pr_clt', 'pv'], constraints: { office, is_deleted: false } }),
        getDataFromTableWithConstraints('seller', { fields: ['id', 'name', 'sexe', 'phone', 'upline', 'office'], constraints: { is_deleted: false, owner: user.promoted_by } }),
        getDataFromTableWithConstraints('client', { fields: ['id', 'name', 'sexe', 'phone', 'seller'], constraints: { owner: user.promoted_by } }),
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
  };

  useEffect(() => {
    if (!user.owner || user.role !== 'superuser') {
      setStock([]); setProdServList([]); setSellers([]); setClients([]);
      resetSell(); fetchAll(user.office);
      const ownerId = String(user?.promoted_by ?? '');
      const officeName = user?.office;
      if (ownerId) setSell((d: SellState) => { d.seller = ownerId; d.details.sellerName = officeName; });
    }
  }, []);

  useEffect(() => {
    if (selectedOffice === null) return;
    setStock([]); setProdServList([]); setSellers([]); setClients([]);
    resetSell(); fetchAll(selectedOffice);
    const ownerId = String(user?.promoted_by ?? '');
    if (ownerId) setSell((d: SellState) => { d.seller = ownerId; d.details.sellerName = selectedOffice; });
  }, [selectedOffice]);

  useEffect(() => {
    if (sell.details.alements.length === 0 || !sell.seller) return;
    setSell((d: SellState) => { recomputeAll(d, d.clientKind, d.seller, prodServList); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sell.clientKind, sell.seller]);

  const steps: Step[] = [
    { label: 'Client',   on: !!sell.clientObj },
    { label: 'Paiement', on: !!sell.payment_mode },
    { label: 'Articles', on: sell.details.alements.length > 0 },
  ];
  const allStepsOn = steps.every((s) => s.on);

  const allNames = useCallback(() => {
    return [...new Set([...sellers.map((s) => s.name), ...clients.map((c) => c.name)])];
  }, [sellers, clients]);

  function filterSugg(query: string, list: string[]): string[] {
    if (!query) return [];
    return list.filter((n) => n.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }

  function shouldShowAddSeller(query: string, sugg: string[]): boolean {
    if (query.trim().length < 2) return false;
    return !sugg.some((s) => s.toLowerCase() === query.toLowerCase());
  }
  function shouldShowAddClient(query: string, sugg: string[]): boolean {
    if (query.trim().length < 2) return false;
    return !sugg.some((s) => s.toLowerCase() === query.toLowerCase());
  }

  function onSellerInput(val: string) {
    if (sellerLocked) return;
    setSellerInput(val);
    setSellerSugg(filterSugg(val, sellers.map((s) => s.name)));
    setShowSellerSugg(true);
    if (!val) setSell((d: SellState) => { d.sellerObj = null; d.seller = ''; d.details.sellerName = ''; });
    setErrors((d: FormErrors) => { delete d.seller; });
  }

  function selectSeller(name: string) {
    if (sell.clientObj && sell.clientObj.name.toLowerCase() === name.toLowerCase()) {
      setErrors((d: FormErrors) => { d.seller = 'Le vendeur et le client ne peuvent pas être la même personne.'; });
      setSellerInput(''); setShowSellerSugg(false); return;
    }
    const found = sellers.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setSellerInput(found.name);
      setSell((d: SellState) => {
        d.sellerObj = found as typeof d.sellerObj; d.seller = found.id;
        d.office = found.office; d.details.sellerName = found.name;
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
    if (sellerInput && !sell.sellerObj) setErrors((d: FormErrors) => { d.seller = "Ce vendeur n'est pas enregistré."; });
  }

  function onClientInput(val: string) {
    setClientInput(val);
    setClientSugg(filterSugg(val, allNames()));
    setShowClientSugg(true);
    if (!val) {
      setSell((d: SellState) => { d.clientObj = null; d.client = ''; d.clientKind = 'client'; d.details.clientName = ''; recomputeAll(d, 'client', d.seller, prodServList); });
      setSellerLocked(false);
    }
    setErrors((d: FormErrors) => { delete d.client; });
  }

  function selectClient(name: string) {
    if (sell.sellerObj && sell.sellerObj.name.toLowerCase() === name.toLowerCase()) {
      setErrors((d: FormErrors) => { d.client = 'Le client et le vendeur ne peuvent pas être la même personne.'; });
      setClientInput(''); setShowClientSugg(false); return;
    }
    const asSeller = sellers.find((s) => s.name.toLowerCase() === name.toLowerCase());
    const asClient = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());

    if (asSeller) {
      const ownerForSale = ownerSeller;
      setClientInput(asSeller.name); setSellerInput(user.promoted_by);
      setSell((d: SellState) => {
        d.clientObj = { ...asSeller, _kind: 'distributor' } as typeof d.clientObj;
        d.client = asSeller.id; d.seller = user.promoted_by; d.details.clientName = asSeller.name;
        if (ownerForSale) {
          d.sellerObj = ownerForSale as typeof d.sellerObj; d.seller = ownerForSale.id;
          d.office = ownerForSale.office;
          d.details.sellerName = user?.owner || user?.role === 'superuser' ? selectedOffice || '' : user?.office ?? '';
        }
        recomputeAll(d, 'distributor', ownerForSale?.id ?? d.seller, prodServList);
      });
      if (ownerForSale) { setSellerInput(ownerForSale.name); setSellerLocked(true); }
      setErrors((d: FormErrors) => { delete d.client; delete d.seller; });
    } else if (asClient) {
      const clientSeller = sellers.find((s) => s.id === asClient.seller);
      setClientInput(asClient.name);
      setSell((d: SellState) => {
        d.clientObj = { ...asClient, _kind: 'client' } as typeof d.clientObj;
        d.client = asClient.id; d.details.clientName = asClient.name;
        if (clientSeller && !d.sellerObj) {
          d.sellerObj = clientSeller; d.seller = clientSeller.id;
          d.office = clientSeller.office; d.details.sellerName = clientSeller.name;
        }
        const effectiveSellerId = clientSeller && !sell.sellerObj ? clientSeller.id : d.seller;
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
    if (clientInput && !sell.clientObj) setErrors((d: FormErrors) => { d.client = "Ce client n'est pas enregistré."; });
  }

  const currentOffice = selectedOffice ?? user?.office ?? '';

  function openQuickClient() { setShowClientSugg(false); setQuickRegister({ open: true, type: 'client', prefillName: clientInput }); }
  function openQuickDistributor() { setShowSellerSugg(false); setQuickRegister({ open: true, type: 'distributor', prefillName: sellerInput }); }

  async function handleQuickRegisterSuccess(name: string) {
    setQuickRegister((prev) => ({ ...prev, open: false }));
    const [sellersRes, clientsRes] = await Promise.all([
      getDataFromTableWithConstraints('seller', { fields: ['id', 'name', 'sexe', 'phone', 'upline', 'office'], constraints: { is_deleted: false, owner: user.promoted_by } }),
      getDataFromTableWithConstraints('client', { fields: ['id', 'name', 'sexe', 'phone', 'seller'], constraints: { owner: user.promoted_by } }),
    ]);
    if (sellersRes.success) setSellers(() => sellersRes.list);
    if (clientsRes.success) setClients(() => clientsRes.list);

    if (quickRegister.type === 'client') {
      setClientInput(name);
      setTimeout(() => {
        const asClient = (clientsRes.list ?? []).find((c: Client) => c.name.toLowerCase() === name.toLowerCase());
        if (asClient) {
          const clientSeller = (sellersRes.list ?? []).find((s: Seller) => s.id === asClient.seller);
          setClientInput(asClient.name);
          setSell((d: SellState) => {
            d.clientObj = { ...asClient, _kind: 'client' } as typeof d.clientObj;
            d.client = asClient.id; d.details.clientName = asClient.name;
            if (clientSeller && !d.sellerObj) {
              d.sellerObj = clientSeller; d.seller = clientSeller.id;
              d.office = clientSeller.office; d.details.sellerName = clientSeller.name;
            }
            recomputeAll(d, 'client', clientSeller?.id ?? d.seller, prodServList);
          });
          if (!sell.sellerObj && clientSeller) setSellerInput(clientSeller.name);
        }
      }, 100);
    } else {
      setClientInput(name);
      setTimeout(() => {
        const asSeller = (sellersRes.list ?? []).find((s: Seller) => s.name.toLowerCase() === name.toLowerCase());
        if (asSeller) {
          const ownerForSale = (sellersRes.list ?? []).find((s: Seller) => s.id === String(user?.promoted_by ?? ''));
          setClientInput(asSeller.name);
          setSell((d: SellState) => {
            d.clientObj = { ...asSeller, _kind: 'distributor' } as typeof d.clientObj;
            d.client = asSeller.id; d.seller = user.promoted_by; d.details.clientName = asSeller.name;
            if (ownerForSale) {
              d.sellerObj = ownerForSale; d.seller = ownerForSale.id;
              d.office = ownerForSale.office; d.details.sellerName = currentOffice;
            }
            recomputeAll(d, 'distributor', ownerForSale?.id ?? d.seller, prodServList);
          });
          if (ownerForSale) { setSellerInput(ownerForSale.name); setSellerLocked(true); }
        }
      }, 100);
    }
  }

  function onProdInput(val: string) {
    setProdInput(val);
    setProdSugg(filterSugg(val, prodServList.map((p) => p.nom)));
    setShowProdSugg(true);
    if (!val) setSelectedProd(null);
  }

  function selectProd(name: string) {
    const ps = prodServList.find((p) => p.nom.toLowerCase() === name.toLowerCase());
    if (ps) {
      setProdInput(ps.nom); setSelectedProd(ps);
      const kind = sell.clientKind;
      const defaultPrice = ps.type === 'prod' ? (kind === 'distributor' ? ps.pr_distr : ps.pr_clt) : ps.pr_clt;
      setPriceInput(String(defaultPrice)); setQtyInput('1');
    }
    setShowProdSugg(false);
    setErrors((d: FormErrors) => { delete d.prod; });
  }

  function onProdBlur() { setTimeout(() => setShowProdSugg(false), 150); }

  function getStockQty(nom: string): number {
    const s = stock.find((st) => st.name === nom);
    return s ? s.qty : 0;
  }

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
    if (Object.keys(newErrors).length) { setErrors((d: FormErrors) => Object.assign(d, newErrors)); return; }

    const ps = selectedProd!;
    const kind = sell.clientKind;
    const isOwner = sellerIsOwner(sell.seller);
    const canonicalPrice = ps.type === 'prod' ? (kind === 'distributor' ? ps.pr_distr : ps.pr_clt) : ps.pr_clt;
    const salePrice = kind === 'distributor' ? canonicalPrice : price;
    const unitBenef = calcUnitBenef(ps, kind, isOwner, salePrice);
    const unitComm  = calcUnitCommission(ps, kind, isOwner, salePrice);
    const linePv    = ps.type === 'prod' ? ps.pv * qty : 0;
    const lineTotal = salePrice * qty;
    const lineBenef = unitBenef * qty;
    const lineComm  = unitComm * qty;
    const commSlot: number | null = kind === 'distributor' || isOwner ? null : lineComm;

    if (selectedProd?.type === 'prod' && kind === 'client' && !isOwner) {
      if (price < selectedProd.pr_distr) {
        setErrors((d: FormErrors) => { d.price = `Prix inférieur au prix distributeur (min: ${selectedProd.pr_distr}).`; });
        return;
      }
    }
    if (selectedProd?.type === 'prod' && isOwner) {
      if (price < selectedProd.pr_stock) {
        setErrors((d: FormErrors) => { d.price = `Prix inférieur au prix stockiste (min: ${selectedProd.pr_stock}).`; });
        return;
      }
    }

    setSell((d: SellState) => {
      const existing = d.details.alements.findIndex((el) => el.name === ps.nom);
      if (existing !== -1) {
        const old = d.details.alements[existing];
        const newCommSlot: number | null = commSlot === null && old.commission === null ? null : ((commSlot ?? 0) + (old.commission ?? 0));
        d.details.alements[existing] = {
          name: ps.nom, type: ps.type, qty: old.qty + qty, total: old.total + lineTotal,
          benef: old.benef + lineBenef, pv: old.pv + linePv, commission: newCommSlot,
        };
      } else {
        d.details.alements.push({ name: ps.nom, type: ps.type, qty, total: lineTotal, benef: lineBenef, pv: linePv, commission: commSlot });
        if (ps.type === 'prod') d.details.nb_prod++; else d.details.nb_serv++;
      }
      let ta = 0, tpv = 0, tb = 0, tc = 0;
      d.details.alements.forEach((el) => { ta += el.total; tpv += el.pv; tb += el.benef; if (el.commission !== null && el.commission > 0) tc += el.commission; });
      d.total_amount = ta; d.total_pv = tpv; d.total_benefice = tb;
      d.details.commission = (kind === 'distributor' || isOwner || tc === 0) ? null : tc;
    });

    setProdInput(''); setSelectedProd(null); setQtyInput(''); setPriceInput('');
    setErrors((d: FormErrors) => { delete d.prod; delete d.qty; delete d.price; });
  }

  function removeItem(idx: number) {
    setSell((d: SellState) => {
      const removed = d.details.alements[idx];
      const ps = prodServList.find((p) => p.nom === removed.name);
      if (ps?.type === 'prod') d.details.nb_prod = Math.max(0, d.details.nb_prod - 1);
      else d.details.nb_serv = Math.max(0, d.details.nb_serv - 1);
      d.details.alements.splice(idx, 1);
      const kind = d.clientKind; const isOwner = sellerIsOwner(d.seller);
      let ta = 0, tpv = 0, tb = 0, tc = 0;
      d.details.alements.forEach((el) => { ta += el.total; tpv += el.pv; tb += el.benef; if (el.commission !== null && el.commission > 0) tc += el.commission; });
      d.total_amount = ta; d.total_pv = tpv; d.total_benefice = tb;
      d.details.commission = (kind === 'distributor' || isOwner || tc === 0) ? null : tc;
    });
  }

  async function handleSubmit() {
    if (!allStepsOn || isSubmitting) return;
    setIsSubmitting(true); setSubmitStatus(null);
    try {
      const now = 'now()'; const id = genId();
      const activity = {
        id, seller: sell.seller, clientKind: sell.clientKind, client: sell.client,
        payment_mode: sell.payment_mode, total_amount: sell.total_amount,
        total_benefice: sell.total_benefice, office: user.owner ? selectedOffice : user.office,
        date: now, bill_sent: false, total_pv: sell.total_pv,
        waiting_reglement: sell.payment_mode === 'attente_paiement',
        date_reglement: sell.payment_mode === 'attente_paiement' ? null : now,
        issue: sell.payment_mode === 'attente_paiement' ? 'pending' : 'valid',
        details: sell.details,
      };
      const newSellEntry: Actualsell = {
        id, name: sell.details.clientName || sell.client || 'Inconnu',
        amount: sell.total_amount, office: user.owner ? selectedOffice || '' : user.office, manager: user.id,
      };
      const response = await createSellData({ office: user.owner ? selectedOffice : user.office, sell: newSellEntry, activity });
      if (!response || !response.success) throw new Error(response.message);

      for (const el of sell.details.alements) {
        const ps = prodServList.find((p) => p.nom === el.name);
        if (ps?.type !== 'prod') continue;
        const current = getStockQty(el.name);
        await createDataToTable('stock_move', { element: el.name, qty: el.qty, type: 'OUT', date: now, office: user.office });
        setStock((d: Stock[]) => { const s = d.find((st) => st.name === el.name); if (s) s.qty = current - el.qty; });
      }
      setSubmitStatus('success');
      setTimeout(() => resetSell(), 2000);
    } catch (e) {
      console.error(e); setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isPriceLocked     = sell.clientKind === 'distributor';
  const commissionSummary = sell.details.commission;
  const articleCount      = sell.details.alements.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;700;800&display=swap');
           Override the external form.css .vente-root { margin: 0.5rem }
           and ensure the component fills its mounting container fully.
           position:absolute inset:0 works when the parent is positioned
           (modal, page wrapper, etc.). The wrapper div below sets that up. */
        .vente-root-wrap {
          position: relative;
          width: 100%;
          height: 100dvh;
          overflow: hidden;
        }
        .vente-root {
          position: absolute !important;
          inset: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── HEADER ── */
        .vente-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 1rem;
          border-bottom: 1px solid var(--nm-dark);
          flex-shrink: 0;
          flex-wrap: nowrap;
          min-height: 52px;
        }
        .vente-header__title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: var(--nm-text-strong);
          white-space: nowrap;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .vente-header__actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .vente-btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: var(--radius-lg);
          background: var(--nm-bg);
          border: none;
          color: var(--nm-text);
          font-size: 0.95rem;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--nm-dark), -3px -3px 6px var(--nm-light);
          transition: var(--transition-all);
          flex-shrink: 0;
        }
        .vente-btn-icon:active { box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); }

        /* ── MAIN DESKTOP LAYOUT ── */
        .vente-main {
          flex: 1;
          min-height: 0;
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
          overflow: hidden;
        }

        /* ── LEFT PANEL (desktop) ── */
        .step-side {
          display: flex;
          gap: var(--gap-lg);
          padding: clamp(12px, 2vw, 24px);
          border-right: 1px solid var(--nm-dark);
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          min-width: 0;
          -webkit-overflow-scrolling: touch;
        }
        .step-side::-webkit-scrollbar { width: 4px; }
        .step-side::-webkit-scrollbar-thumb { background: var(--nm-dark); border-radius: 99px; }

        /* ── VERTICAL STEP TRACKER ── */
        .step-tracker { display: flex; flex-direction: column; align-items: center; padding-top: 0.25rem; flex-shrink: 0; width: 28px; }
        .step-node    { display: flex; flex-direction: column; align-items: center; }
        .step-line    { width: 2px; height: 52px; background: var(--nm-dark); border-radius: 2px; transition: background var(--duration-normal) var(--ease-out); }
        .step-line.on { background: var(--nm-brand); }
        .step-line.invisible { visibility: hidden; }
        .step-circle  { width: 26px; height: 26px; border-radius: var(--radius-full); border: 2px solid var(--nm-dark); background: var(--nm-bg); display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); color: var(--nm-text); transition: all var(--duration-normal) var(--ease-out); flex-shrink: 0; }
        .step-circle.on { border-color: var(--nm-brand); background: var(--nm-brand); color: #fff; }
        .step-check { font-size: 0.7rem; }
        .step-num   { font-size: 0.6rem; }

        /* ── HORIZONTAL STEP TRACKER (mobile) ── */
        .step-tracker-h {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0.75rem 1rem 0.5rem;
          flex-shrink: 0;
        }
        .step-node-h {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex: 1;
        }
        .step-node-h:last-child { flex: 0; }
        .step-circle-h {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid var(--nm-dark);
          background: var(--nm-bg);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.6rem; color: var(--nm-text);
          flex-shrink: 0;
          transition: all var(--duration-normal) var(--ease-out);
        }
        .step-circle-h.on { border-color: var(--nm-brand); background: var(--nm-brand); color: #fff; }
        .step-label-h {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--nm-text);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .step-label-h.on { color: var(--nm-brand); }
        .step-line-h {
          flex: 1;
          height: 2px;
          background: var(--nm-dark);
          border-radius: 2px;
          margin: 0 0.4rem;
          transition: background var(--duration-normal) var(--ease-out);
        }
        .step-line-h.on { background: var(--nm-brand); }

        /* ── FIELDS ── */
        .fields { flex: 1; display: flex; flex-direction: column; gap: 1rem; min-width: 0; width: 100%; }
        .field-block { display: flex; flex-direction: column; gap: 0.5rem; position: relative; width: 100%; }

        /* ── INPUT STATES ── */
        .vente-input-error  { box-shadow: inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light), 0 0 0 2px var(--clr-danger-500) !important; }
        .vente-input-ok     { box-shadow: inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light), 0 0 0 2px var(--clr-accent-600) !important; }
        .vente-input-locked { box-shadow: inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light) !important; opacity: 0.7; cursor: not-allowed; }
        .input, select.input { width: 100%; min-width: 0; box-sizing: border-box; }

        /* ── SUGGESTION POPUP ── */
        .input-wrap { position: relative; }
        .suggestion-popup { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--nm-bg); border-radius: var(--radius-xl); box-shadow: 8px 8px 16px var(--nm-dark), -8px -8px 16px var(--nm-light); z-index: 200; overflow: hidden; max-height: 200px; overflow-y: auto; }
        .suggestion-item { padding: var(--padding-xs); font-size: var(--text-sm); color: var(--nm-text-strong); cursor: pointer; transition: var(--transition-colors); }
        .suggestion-item:hover, .suggestion-item:active { background: rgba(0,0,0,0.06); }
        .suggestion-add { color: var(--nm-brand); font-weight: var(--weight-medium); border-bottom: 1px solid var(--nm-dark); }

        /* ── BADGES ── */
        .client-kind-badge { display: inline-flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-xs); padding: 0.15rem 0.6rem; border-radius: var(--radius-full); margin-top: var(--gap-xs); font-weight: var(--weight-medium); }
        .client-kind-badge.distr { color: var(--nm-brand); box-shadow: 2px 2px 4px var(--nm-dark), -2px -2px 4px var(--nm-light); background: var(--nm-bg); }
        .client-kind-badge.clt   { color: var(--clr-accent-700); box-shadow: 2px 2px 4px var(--nm-dark), -2px -2px 4px var(--nm-light); background: var(--nm-bg); }
        .lock-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; color: var(--nm-text); opacity: 0.6; margin-top: 2px; }

        /* ── RÉSUMÉ ── */
        .total-wrap { display: flex; gap: 0.5rem; }
        .olone { flex: 1; display: flex; flex-direction: column; }
        .total-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: var(--tracking-wider); color: var(--nm-text); }
        .total-val   { font-family: 'Syne', sans-serif; font-weight: var(--weight-bold); font-size: var(--text-md); color: var(--nm-brand); }

        .commission-badge { display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; border-radius: var(--radius-xl); margin-top: var(--gap-sm); background: rgba(13,101,242,0.07); border: 1px solid rgba(13,101,242,0.18); font-size: 0.72rem; color: #0b55cb; }
        .commission-badge strong { font-size: 0.8rem; }
        .commission-null-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: var(--radius-full); margin-top: var(--gap-sm); font-size: 0.68rem; color: var(--nm-text); opacity: 0.65; box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); }

        .submit-feedback { margin-top: var(--gap-sm); padding: var(--padding-xs); border-radius: var(--radius-xl); font-size: var(--text-xs); text-align: center; font-weight: var(--weight-medium); }
        .submit-feedback.success { color: var(--clr-accent-700); box-shadow: inset 2px 2px 5px var(--nm-dark), inset -2px -2px 5px var(--nm-light); }
        .submit-feedback.error   { color: var(--clr-danger-500); box-shadow: inset 2px 2px 5px var(--nm-dark), inset -2px -2px 5px var(--nm-light); }

        /* ── RIGHT PANEL ── */
        .sell-form-side { display: flex; flex-direction: column; overflow: hidden; min-height: 0; min-width: 0; width: 100%; }

        /* ── SUMMARY BAR (desktop) ── */
        .summary-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; padding: clamp(10px, 2vw, 18px); border-bottom: 1px solid var(--nm-dark); flex-shrink: 0; width: 100%; }
        .sbar-group { display: flex; align-items: center; gap: var(--gap-sm); }
        .sbar-icon  { width: 30px; height: 30px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; box-shadow: 3px 3px 6px var(--nm-dark), -3px -3px 6px var(--nm-light); background: var(--nm-bg); flex-shrink: 0; }
        .sbar-val   { font-family: 'Syne', sans-serif; font-weight: var(--weight-bold); font-size: var(--text-base); color: var(--nm-text-strong); line-height: 1; }
        .sbar-sep   { width: 1px; height: 26px; box-shadow: 1px 0 0 var(--nm-light), -1px 0 0 var(--nm-dark); flex-shrink: 0; }
        .sbar-total { margin-left: auto; text-align: right; }
        .sbar-total .sbar-val { font-size: var(--text-lg); color: var(--nm-brand); }
        .detail-toggle { background: var(--nm-bg); color: var(--nm-text); border-radius: var(--radius-xl); padding: var(--padding-xs); font-size: var(--text-xs); font-weight: var(--weight-medium); box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light); transition: var(--transition-all); cursor: pointer; border: none; }
        .detail-toggle.active { box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light); color: var(--nm-brand); }

        /* ── PRODUCT FORM ── */
        .form-details { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
        .prod-form { display: grid; grid-template-columns: minmax(0, 1fr) 100px 120px auto; gap: 0.75rem; align-items: end; padding: clamp(10px, 2vw, 18px); border-bottom: 1px solid var(--nm-dark); flex-shrink: 0; width: 100%; min-width: 0; }
        .prod-form-group { display: flex; flex-direction: column; gap: var(--gap-xs); min-width: 0; }
        .stock-badge { display: flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-xs); color: var(--nm-text); margin-top: var(--gap-xs); }
        .stock-dot   { width: 6px; height: 6px; border-radius: var(--radius-full); background: var(--clr-accent-600); display: inline-block; flex-shrink: 0; }

        /* ── DETAILS PANEL ── */
        .details-panel { flex: 1; overflow-y: auto; overflow-x: hidden; padding: clamp(10px, 2vw, 18px); min-height: 0; width: 100%; -webkit-overflow-scrolling: touch; }
        .details-panel::-webkit-scrollbar { width: 4px; }
        .details-panel::-webkit-scrollbar-thumb { background: var(--nm-dark); border-radius: 99px; }

        .color-legend { display: flex; flex-wrap: wrap; gap: var(--gap-sm); margin-bottom: var(--gap-md); padding: var(--padding-xs); border-radius: var(--radius-xl); width: fit-content; box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light); }
        .legend-item  { display: flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-xs); color: var(--nm-text); text-transform: uppercase; letter-spacing: var(--tracking-wider); }
        .boule        { width: 8px; height: 8px; border-radius: var(--radius-full); display: inline-block; flex-shrink: 0; }
        .boule-qty    { background: var(--nm-brand); }
        .boule-pv     { background: var(--clr-accent-600); }
        .boule-prix   { background: var(--clr-warning-500); }
        .boule-comm   { background: #0d65f2; }

        .details-list { display: flex; flex-direction: column; gap: var(--gap-sm); }

        /* ── DETAIL ITEM (desktop) ── */
        .detail-item {
          display: grid;
          grid-template-columns: minmax(100px, 1fr) 28px auto auto auto minmax(120px, 1fr) auto;
          align-items: center;
          gap: 0.65rem;
          padding: 0.85rem;
          border-radius: var(--radius-xl);
          background: var(--nm-bg);
          box-shadow: 5px 5px 10px var(--nm-dark), -5px -5px 10px var(--nm-light);
          animation: fadeUp 0.25s ease both;
        }
        .detail-item:hover { box-shadow: 7px 7px 14px var(--nm-dark), -7px -7px 14px var(--nm-light); }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        .di-name  { font-size: var(--text-sm); color: var(--nm-text-strong); font-weight: var(--weight-medium); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .di-type  { width: 22px; height: 22px; border-radius: var(--radius-sm); font-size: 0.5rem; display: flex; align-items: center; justify-content: center; font-weight: var(--weight-bold); text-transform: uppercase; box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); flex-shrink: 0; }
        .di-type.prod { color: var(--nm-brand); }
        .di-type.serv { color: var(--clr-accent-600); }
        .di-val   { display: flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-sm); color: var(--nm-text-strong); white-space: nowrap; }
        .di-val .boule { width: 7px; height: 7px; }
        .di-rowsum { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.35rem; min-width: 0; }
        .di-chip   { font-size: var(--text-xs); padding: 0.18rem 0.45rem; border-radius: var(--radius-full); display: flex; align-items: center; gap: var(--gap-xs); white-space: nowrap; font-weight: var(--weight-medium); box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); color: var(--nm-text); }
        .di-chip.pvt   { color: var(--clr-accent-700); }
        .di-chip.prit  { color: var(--clr-warning-500); }
        .di-chip.commt { color: #0d65f2; }
        .di-del   { background: none; border: none; color: var(--nm-text); cursor: pointer; padding: var(--gap-xs); font-size: var(--text-base); border-radius: var(--radius-md); transition: var(--transition-colors); display: flex; align-items: center; flex-shrink: 0; min-width: 32px; min-height: 32px; justify-content: center; }
        .di-del:hover { color: var(--clr-danger-500); }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1.5rem; gap: var(--gap-md); color: var(--nm-text); text-align: center; }
        .empty-icon  { font-size: 2.5rem; opacity: 0.35; }

        /* ── SPINNER ── */
        .vente-spinner { width: 32px; height: 32px; border-radius: var(--radius-full); box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light); animation: spin 1s var(--ease-inout) infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ═══════════════════════════════════════════════════
           MOBILE LAYOUT (≤ 700px)
           Navigation par onglets + barre sticky en bas
           ═══════════════════════════════════════════════════ */

        /* All mobile-only elements hidden by default on desktop */
        .mobile-tabs,
        .mobile-summary-strip,
        .mobile-bottom-bar,
        .mobile-panel,
        .prod-form-mobile {
          display: none;
        }

        /* Mobile tab nav */
        .mobile-tabs {
          flex-shrink: 0;
          background: var(--nm-bg);
          border-bottom: 1px solid var(--nm-dark);
        }

        .mobile-tab-btn {
          flex: 1;
          padding: 0.65rem 0.5rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: var(--nm-text);
          font-size: 0.8rem;
          font-weight: 600;
          font-family: 'Syne', sans-serif;
          cursor: pointer;
          transition: var(--transition-all);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }
        .mobile-tab-btn.active {
          color: var(--nm-brand);
          border-bottom-color: var(--nm-brand);
        }
        .mobile-tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 99px;
          background: var(--nm-brand);
          color: #fff;
          font-size: 0.6rem;
          font-weight: 700;
        }

        /* Mobile panels */
        .mobile-panel { }

        /* Mobile summary strip (compact, above tabs content) */
        .mobile-summary-strip {
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.6rem 0.85rem;
          background: var(--nm-bg);
          border-bottom: 1px solid var(--nm-dark);
          flex-shrink: 0;
        }
        .msstrip-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-full);
          box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light);
          font-size: 0.72rem;
        }
        .msstrip-item .label { color: var(--nm-text); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.62rem; }
        .msstrip-item .val   { font-family: 'Syne', sans-serif; font-weight: 700; color: var(--nm-text-strong); }
        .msstrip-item .val.brand { color: var(--nm-brand); }
        .msstrip-item .val.accent { color: var(--clr-accent-700); }

        /* Mobile sticky bottom bar */
        .mobile-bottom-bar {
          flex-shrink: 0;
          padding: 0.75rem 1rem;
          background: var(--nm-bg);
          border-top: 1px solid var(--nm-dark);
          gap: 0.75rem;
          align-items: center;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
        }
        .mobile-bottom-bar__total {
          flex: 1;
          min-width: 0;
        }
        .mobile-bottom-bar__total .label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--nm-text);
          font-weight: 600;
        }
        .mobile-bottom-bar__total .amount {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--nm-brand);
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-bottom-bar__submit {
          flex-shrink: 0;
          padding: 0.65rem 1.25rem;
          border-radius: var(--radius-xl);
          border: none;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          transition: var(--transition-all);
          white-space: nowrap;
        }
        .mobile-bottom-bar__submit.ready {
          background: var(--nm-brand);
          color: #fff;
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
        }
        .mobile-bottom-bar__submit.ready:active {
          box-shadow: inset 3px 3px 6px rgba(0,0,0,0.3);
        }
        .mobile-bottom-bar__submit.disabled {
          background: var(--nm-bg);
          color: var(--nm-text);
          opacity: 0.5;
          box-shadow: 3px 3px 6px var(--nm-dark), -3px -3px 6px var(--nm-light);
          cursor: not-allowed;
        }

        /* Mobile product form: stacked 2-col */
        .prod-form-mobile {
          display: none;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.85rem;
          border-bottom: 1px solid var(--nm-dark);
          flex-shrink: 0;
        }
        .prod-form-mobile .prod-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
        }
        .prod-form-mobile .prod-add-btn {
          width: 100%;
          padding: 0.7rem;
          border-radius: var(--radius-xl);
          border: none;
          background: var(--nm-brand);
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
          transition: var(--transition-all);
        }
        .prod-form-mobile .prod-add-btn:active { box-shadow: inset 3px 3px 6px rgba(0,0,0,0.2); }

        /* Mobile detail item: card style */
        .detail-item-mobile {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.85rem;
          border-radius: var(--radius-xl);
          background: var(--nm-bg);
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
          animation: fadeUp 0.25s ease both;
        }
        .dim-top {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .dim-name {
          flex: 1;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--nm-text-strong);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dim-type {
          font-size: 0.55rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.2rem 0.45rem;
          border-radius: var(--radius-sm);
          box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light);
          flex-shrink: 0;
        }
        .dim-type.prod { color: var(--nm-brand); }
        .dim-type.serv { color: var(--clr-accent-600); }
        .dim-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          align-items: center;
        }
        .dim-chip {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-full);
          box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light);
          color: var(--nm-text);
          font-weight: 600;
          white-space: nowrap;
        }
        .dim-chip.total { color: var(--clr-warning-500); font-weight: 700; }
        .dim-chip.pv    { color: var(--clr-accent-700); }
        .dim-chip.comm  { color: #0d65f2; }
        .dim-del {
          background: none;
          border: none;
          color: var(--nm-text);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: var(--radius-md);
          font-size: 1rem;
          display: flex;
          align-items: center;
          min-width: 32px;
          min-height: 32px;
          justify-content: center;
          flex-shrink: 0;
        }
        .dim-del:active { color: var(--clr-danger-500); }

        /* ═══════════════════════════════════════════════════
           BREAKPOINTS
           ═══════════════════════════════════════════════════ */

        /* ── Tablet (700–1100px) ── */
        @media (max-width: 1100px) {
          .vente-main { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
          .step-side  { border-right: none; border-bottom: 1px solid var(--nm-dark); overflow-y: visible; }
          .prod-form  { grid-template-columns: 1fr 100px 110px auto; }
        }

        @media (max-width: 900px) {
          .prod-form  { grid-template-columns: minmax(0, 1fr) 90px 105px auto; gap: 0.6rem; }
        }

        /* ── Mobile (≤ 700px): full tab layout ── */
        @media (max-width: 700px) {
          /* Activate mobile elements */
          .mobile-tabs          { display: flex; }
          .mobile-summary-strip { display: flex; }
          .mobile-bottom-bar    { display: flex; }
          .prod-form-mobile     { display: flex; }

          /* Active panel visible, hidden panel gone */
          .mobile-panel         { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
          .mobile-panel.hidden  { display: none !important; }

          /* Desktop layout hidden */
          .vente-main     { display: none !important; }
          .step-side      { display: none !important; }
          .sell-form-side { display: none !important; }
          .summary-bar    { display: none !important; }
          .form-details   { display: none !important; }
          .step-tracker   { display: none !important; }

          /* Header adjustments */
          .vente-header { padding: 0.5rem 0.75rem; min-height: 46px; }
          .vente-header__title { font-size: 0.92rem; }

          /* Form panel scroll area */
          .mobile-form-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 0.85rem;
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
            -webkit-overflow-scrolling: touch;
            min-height: 0;
          }

          /* Articles panel: prod-form-mobile already flex via above */
          .details-panel-mobile {
            flex: 1;
            overflow-y: auto;
            padding: 0.75rem 0.85rem;
            -webkit-overflow-scrolling: touch;
            min-height: 0;
          }
        }

        @media (max-width: 420px) {
          .prod-form-mobile .prod-row { grid-template-columns: 1fr; }
          .mobile-summary-strip { gap: 0.35rem; }
          .msstrip-item { padding: 0.2rem 0.45rem; }
        }
      `}</style>

      <div className="vente-root-wrap">
      <div className="vente-root" data-style="neuro" data-mode="light">

        {/* ── HEADER ── */}
        <div className="vente-header">
          <span className="vente-header__title">
            {changeView ? '📋 Historique' : '＋ Nouvelle Vente'}
          </span>
          <div className="vente-header__actions">
            {user.owner && (
              <OfficeSelector onOfficeSelect={(officeName) => setSelectedOffice(officeName)} />
            )}
            <button
              className="vente-btn-icon"
              onClick={() => setChangeView((v) => !v)}
              title={changeView ? 'Formulaire' : 'Historique'}
            >
              {changeView ? '✏' : '📋'}
            </button>
            <button className="vente-btn-icon" onClick={() => onclose?.(true)} title="Retour">
              ✕
            </button>
          </div>
        </div>

        {/* ── LOADING OVERLAY ── */}
        {loading && (
          <div className="col align-center justify-center gap-md" style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(var(--nm-bg-rgb, 235,235,235), 0.75)', backdropFilter: 'blur(2px)' }}>
            <div className="vente-spinner" />
            <p className="text-label">Chargement des données…</p>
          </div>
        )}

        {/* ── BILLS VIEW ── */}
        {changeView && <Bills office={user.owner ? selectedOffice : user.office} />}

        {/* ════════════════════════════════════════
            DESKTOP LAYOUT (> 700px)
            ════════════════════════════════════════ */}
        {!changeView && (
          <div className="vente-main">
            {/* LEFT */}
            <div className="step-side">
              <StepTracker steps={steps} />
              <div className="fields">
                <div className="field-block">
                  <label className="text-label">
                    Vendeur
                    {sellerLocked
                      ? <span className="lock-badge"> 🔒 automatique</span>
                      : <span className="lock-badge"> (optionnel)</span>}
                  </label>
                  <div className="input-wrap">
                    <input ref={sellerRef} className={`input ${errors.seller ? 'vente-input-error' : sellerLocked ? 'vente-input-locked' : sell.sellerObj ? 'vente-input-ok' : ''}`} type="text" placeholder="Nom du vendeur" value={sellerInput} readOnly={sellerLocked} onChange={(e) => onSellerInput(e.target.value)} onBlur={onSellerBlur} onFocus={() => { if (sellerInput && !sellerLocked) setShowSellerSugg(true); }} />
                    {showSellerSugg && !sellerLocked && (sellerSugg.length > 0 || shouldShowAddSeller(sellerInput, sellerSugg)) && (
                      <SuggestionPopup items={sellerSugg} onSelect={selectSeller} onAddNew={shouldShowAddSeller(sellerInput, sellerSugg) ? openQuickDistributor : undefined} addLabel={`Enregistrer "${sellerInput}" comme distributeur`} />
                    )}
                  </div>
                  {errors.seller && <span className="badge badge-danger">{errors.seller}</span>}
                </div>

                <div className="field-block">
                  <label className="text-label">Client</label>
                  <div className="input-wrap">
                    <input ref={clientRef} className={`input ${errors.client ? 'vente-input-error' : sell.clientObj ? 'vente-input-ok' : ''}`} type="text" placeholder="Nom du client" value={clientInput} onChange={(e) => onClientInput(e.target.value)} onBlur={onClientBlur} onFocus={() => { if (clientInput) setShowClientSugg(true); }} />
                    {showClientSugg && (clientSugg.length > 0 || shouldShowAddClient(clientInput, clientSugg)) && (
                      <SuggestionPopup items={clientSugg} onSelect={selectClient} onAddNew={shouldShowAddClient(clientInput, clientSugg) ? openQuickClient : undefined} addLabel={`Enregistrer "${clientInput}" comme client`} />
                    )}
                  </div>
                  {sell.clientObj && (
                    <span className={`client-kind-badge ${sell.clientKind === 'distributor' ? 'distr' : 'clt'}`}>
                      {sell.clientKind === 'distributor' ? '⬡ Distributeur — prix fixe' : '● Client'}
                    </span>
                  )}
                  {errors.client && <span className="badge badge-danger">{errors.client}</span>}
                </div>

                <div className="field-block">
                  <label className="text-label">Mode de paiement</label>
                  <select className={`input ${sell.payment_mode ? 'vente-input-ok' : ''}`} value={sell.payment_mode} onChange={(e) => { const v = e.target.value; setSell((d: SellState) => { d.payment_mode = v; }); setErrors((d: FormErrors) => { delete d.payment; }); }}>
                    <option value="">Sélectionner…</option>
                    <option value="Cash">Cash</option>
                    <option value="MTN Money">MTN Money</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="attente_paiement">Paiement en attente</option>
                  </select>
                  {errors.payment && <span className="badge badge-danger">{errors.payment}</span>}
                </div>

                <div className="field-block" style={{ paddingTop: 'var(--gap-sm)' }}>
                  <label className="text-label">Résumé</label>
                  <div className="total-wrap surface-inset" style={{ padding: '0.85rem' }}>
                    <div className="olone">
                      <span className="total-label">Total</span>
                      <span className="total-val">{sell.total_amount.toLocaleString()} F</span>
                    </div>
                    <div className="olone">
                      <span className="total-label">Bénéfice</span>
                      <span className="total-val" style={{ fontSize: 'var(--text-base)' }}>{sell.total_benefice.toLocaleString()} F</span>
                    </div>
                  </div>
                  {sell.details.alements.length > 0 && (
                    commissionSummary !== null ? (
                      <div className="commission-badge">
                        <strong>💸 Commission → {sell.details.sellerName}</strong>
                        <span>{commissionSummary.toLocaleString()} F au total</span>
                      </div>
                    ) : (
                      <div className="commission-null-badge">
                        {sell.clientKind === 'distributor' ? '⬡ Vente distributeur — pas de commission' : sellerIsOwner(sell.seller) ? '🏢 Vendeur = propriétaire' : '—'}
                      </div>
                    )
                  )}
                </div>

                <div style={{ paddingTop: 'var(--gap-md)' }}>
                  <button className={`btn w-full justify-center ${allStepsOn ? 'btn-primary' : 'opacity-50 not-allowed'}`} onClick={handleSubmit} disabled={!allStepsOn || isSubmitting}>
                    {isSubmitting ? 'Enregistrement…' : '✓ Valider la Vente'}
                  </button>
                  {submitStatus === 'success' && <div className="submit-feedback success">✅ Vente enregistrée avec succès !</div>}
                  {submitStatus === 'error'   && <div className="submit-feedback error">⚠ Erreur lors de l'enregistrement.</div>}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="sell-form-side">
              <div className="summary-bar">
                <div className="sbar-group"><div className="sbar-icon">📦</div><div className="col gap-xs"><span className="text-label">Produits</span><span className="sbar-val">{sell.details.nb_prod}</span></div></div>
                <div className="sbar-sep" />
                <div className="sbar-group"><div className="sbar-icon">🛠</div><div className="col gap-xs"><span className="text-label">Services</span><span className="sbar-val">{sell.details.nb_serv}</span></div></div>
                <div className="sbar-sep" />
                <div className="sbar-group"><div className="sbar-icon">PV</div><div className="col gap-xs"><span className="text-label">Total PV</span><span className="sbar-val" style={{ color: 'var(--clr-accent-700)' }}>{sell.total_pv.toLocaleString()}</span></div></div>
                {commissionSummary && (<><div className="sbar-sep" /><div className="sbar-group"><div className="sbar-icon">💸</div><div className="col gap-xs"><span className="text-label">Commission</span><span className="sbar-val" style={{ color: '#0d65f2' }}>{commissionSummary.toLocaleString()} F</span></div></div></>)}
                <div className="sbar-total col gap-xs"><span className="text-label">Montant Total</span><span className="sbar-val">{sell.total_amount.toLocaleString()} FCFA</span></div>
                <button className={`detail-toggle ${showDetails ? 'active' : ''}`} onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? '◀ Masquer' : '▶ Détails'}
                </button>
              </div>

              <div className="form-details">
                {!showDetails && (
                  <div className="prod-form">
                    <div className="prod-form-group relative">
                      <label className="text-label">Produit / Service</label>
                      <div className="input-wrap">
                        <input ref={prodRef} className={`input ${errors.prod ? 'vente-input-error' : selectedProd ? 'vente-input-ok' : ''}`} type="text" placeholder="Rechercher…" value={prodInput} onChange={(e) => onProdInput(e.target.value)} onBlur={onProdBlur} onFocus={() => { if (prodInput) setShowProdSugg(true); }} />
                        {showProdSugg && prodSugg.length > 0 && (<SuggestionPopup items={prodSugg} onSelect={selectProd} />)}
                      </div>
                      {selectedProd?.type === 'prod' && (<div className="stock-badge"><span className="stock-dot" />Stock : {getStockQty(selectedProd.nom)} u.</div>)}
                      {errors.prod && <span className="badge badge-danger">{errors.prod}</span>}
                    </div>
                    <div className="prod-form-group">
                      <label className="text-label">Qté</label>
                      <input className={`input ${errors.qty ? 'vente-input-error' : ''}`} type="number" min="1" placeholder="0" value={qtyInput} onChange={(e) => { setQtyInput(e.target.value); setErrors((d: FormErrors) => { delete d.qty; }); }} />
                      {errors.qty && <span className="badge badge-danger text-xs">{errors.qty}</span>}
                    </div>
                    <div className="prod-form-group">
                      <label className="text-label">Prix unit.{isPriceLocked && <span className="lock-badge"> 🔒</span>}</label>
                      <input className={`input ${errors.price ? 'vente-input-error' : ''} ${isPriceLocked ? 'vente-input-locked' : ''}`} type="number" min="0" placeholder="0" value={priceInput} readOnly={isPriceLocked} onChange={(e) => { if (isPriceLocked) return; setPriceInput(e.target.value); setErrors((d: FormErrors) => { delete d.price; }); }} />
                      {errors.price && <span className="badge badge-danger text-xs">{errors.price}</span>}
                    </div>
                    <button className="btn btn-primary" onClick={addItem}>＋</button>
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
                      <div className="empty-state"><span className="empty-icon">📋</span><span className="text-body text-sm">Aucun article ajouté</span><span className="text-label">Recherchez un produit ou service</span></div>
                    ) : (
                      sell.details.alements.map((el, i) => {
                        const { name, qty, total, pv, commission: comm } = el;
                        const ps = prodServList.find((p) => p.nom === name);
                        const isServ = ps?.type === 'serv';
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
                              {comm !== null && comm > 0 && <div className="di-chip commt">💸 {comm.toLocaleString()} F</div>}
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

        {/* ════════════════════════════════════════
            MOBILE LAYOUT (≤ 700px)
            ════════════════════════════════════════ */}
        {!changeView && (
          <>
            {/* Mini summary strip */}
            <div className="mobile-summary-strip">
              <div className="msstrip-item">
                <span className="label">Total</span>
                <span className="val brand">{sell.total_amount.toLocaleString()} F</span>
              </div>
              <div className="msstrip-item">
                <span className="label">Bénéf.</span>
                <span className="val">{sell.total_benefice.toLocaleString()} F</span>
              </div>
              {sell.total_pv > 0 && (
                <div className="msstrip-item">
                  <span className="label">PV</span>
                  <span className="val accent">{sell.total_pv.toLocaleString()}</span>
                </div>
              )}
              {commissionSummary !== null && commissionSummary > 0 && (
                <div className="msstrip-item">
                  <span className="label">Comm.</span>
                  <span className="val" style={{ color: '#0d65f2' }}>{commissionSummary.toLocaleString()} F</span>
                </div>
              )}
            </div>

            {/* Tab navigation */}
            <div className="mobile-tabs">
              <button className={`mobile-tab-btn ${mobileTab === 'form' ? 'active' : ''}`} onClick={() => setMobileTab('form')}>
                📝 Formulaire
                {/* show step indicators */}
                <span style={{ display: 'flex', gap: '2px' }}>
                  {steps.map((s, i) => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: s.on ? 'var(--nm-brand)' : 'var(--nm-dark)', display: 'inline-block' }} />
                  ))}
                </span>
              </button>
              <button className={`mobile-tab-btn ${mobileTab === 'articles' ? 'active' : ''}`} onClick={() => setMobileTab('articles')}>
                🛍 Articles
                {articleCount > 0 && <span className="mobile-tab-badge">{articleCount}</span>}
              </button>
            </div>

            {/* ── TAB: FORMULAIRE ── */}
            <div className={`mobile-panel ${mobileTab !== 'form' ? 'hidden' : ''}`}>
              {/* Horizontal step tracker */}
              <div style={{ flexShrink: 0, borderBottom: '1px solid var(--nm-dark)', padding: '0.5rem 0.85rem 0.4rem' }}>
                <StepTracker steps={steps} horizontal />
              </div>

              {/* Scrollable form fields */}
              <div className="mobile-form-scroll">
                {/* Vendeur */}
                <div className="field-block">
                  <label className="text-label">
                    Vendeur
                    {sellerLocked
                      ? <span className="lock-badge"> 🔒 auto</span>
                      : <span className="lock-badge"> (optionnel)</span>}
                  </label>
                  <div className="input-wrap">
                    <input className={`input ${errors.seller ? 'vente-input-error' : sellerLocked ? 'vente-input-locked' : sell.sellerObj ? 'vente-input-ok' : ''}`} type="text" placeholder="Nom du vendeur" value={sellerInput} readOnly={sellerLocked} onChange={(e) => onSellerInput(e.target.value)} onBlur={onSellerBlur} onFocus={() => { if (sellerInput && !sellerLocked) setShowSellerSugg(true); }} />
                    {showSellerSugg && !sellerLocked && (sellerSugg.length > 0 || shouldShowAddSeller(sellerInput, sellerSugg)) && (
                      <SuggestionPopup items={sellerSugg} onSelect={selectSeller} onAddNew={shouldShowAddSeller(sellerInput, sellerSugg) ? openQuickDistributor : undefined} addLabel={`Enregistrer "${sellerInput}" comme distributeur`} />
                    )}
                  </div>
                  {errors.seller && <span className="badge badge-danger">{errors.seller}</span>}
                </div>

                {/* Client */}
                <div className="field-block">
                  <label className="text-label">Client</label>
                  <div className="input-wrap">
                    <input className={`input ${errors.client ? 'vente-input-error' : sell.clientObj ? 'vente-input-ok' : ''}`} type="text" placeholder="Nom du client" value={clientInput} onChange={(e) => onClientInput(e.target.value)} onBlur={onClientBlur} onFocus={() => { if (clientInput) setShowClientSugg(true); }} />
                    {showClientSugg && (clientSugg.length > 0 || shouldShowAddClient(clientInput, clientSugg)) && (
                      <SuggestionPopup items={clientSugg} onSelect={selectClient} onAddNew={shouldShowAddClient(clientInput, clientSugg) ? openQuickClient : undefined} addLabel={`Enregistrer "${clientInput}" comme client`} />
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
                  <select className={`input ${sell.payment_mode ? 'vente-input-ok' : ''}`} value={sell.payment_mode} onChange={(e) => { const v = e.target.value; setSell((d: SellState) => { d.payment_mode = v; }); setErrors((d: FormErrors) => { delete d.payment; }); }}>
                    <option value="">Sélectionner…</option>
                    <option value="Cash">Cash</option>
                    <option value="MTN Money">MTN Money</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="attente_paiement">Paiement en attente</option>
                  </select>
                  {errors.payment && <span className="badge badge-danger">{errors.payment}</span>}
                </div>

                {/* Commission info */}
                {sell.details.alements.length > 0 && (
                  commissionSummary !== null ? (
                    <div className="commission-badge">
                      <strong>💸 Commission → {sell.details.sellerName}</strong>
                      <span>{commissionSummary.toLocaleString()} F au total</span>
                    </div>
                  ) : (
                    <div className="commission-null-badge">
                      {sell.clientKind === 'distributor' ? '⬡ Vente distributeur — pas de commission' : sellerIsOwner(sell.seller) ? '🏢 Vendeur = propriétaire' : '—'}
                    </div>
                  )
                )}

                {/* Hint to add articles */}
                {articleCount === 0 && (
                  <button className="mobile-tab-btn" style={{ borderRadius: 'var(--radius-xl)', border: '1px dashed var(--nm-dark)', padding: '0.75rem', justifyContent: 'center', color: 'var(--nm-brand)', fontWeight: 600, background: 'transparent' }} onClick={() => setMobileTab('articles')}>
                    ＋ Ajouter des articles →
                  </button>
                )}
              </div>
            </div>

            {/* ── TAB: ARTICLES ── */}
            <div className={`mobile-panel ${mobileTab !== 'articles' ? 'hidden' : ''}`}>
              {/* Product form */}
              <div className="prod-form-mobile">
                <div className="field-block">
                  <label className="text-label">Produit / Service</label>
                  <div className="input-wrap">
                    <input ref={prodRef} className={`input ${errors.prod ? 'vente-input-error' : selectedProd ? 'vente-input-ok' : ''}`} type="text" placeholder="Rechercher un produit…" value={prodInput} onChange={(e) => onProdInput(e.target.value)} onBlur={onProdBlur} onFocus={() => { if (prodInput) setShowProdSugg(true); }} />
                    {showProdSugg && prodSugg.length > 0 && (<SuggestionPopup items={prodSugg} onSelect={selectProd} />)}
                  </div>
                  {selectedProd?.type === 'prod' && (<div className="stock-badge"><span className="stock-dot" />Stock : {getStockQty(selectedProd.nom)} unités</div>)}
                  {errors.prod && <span className="badge badge-danger">{errors.prod}</span>}
                </div>

                <div className="prod-row">
                  <div className="field-block">
                    <label className="text-label">Qté</label>
                    <input className={`input ${errors.qty ? 'vente-input-error' : ''}`} type="number" min="1" placeholder="1" value={qtyInput} onChange={(e) => { setQtyInput(e.target.value); setErrors((d: FormErrors) => { delete d.qty; }); }} />
                    {errors.qty && <span className="badge badge-danger text-xs">{errors.qty}</span>}
                  </div>
                  <div className="field-block">
                    <label className="text-label">Prix u.{isPriceLocked && <span className="lock-badge"> 🔒</span>}</label>
                    <input className={`input ${errors.price ? 'vente-input-error' : ''} ${isPriceLocked ? 'vente-input-locked' : ''}`} type="number" min="0" placeholder="0" value={priceInput} readOnly={isPriceLocked} onChange={(e) => { if (isPriceLocked) return; setPriceInput(e.target.value); setErrors((d: FormErrors) => { delete d.price; }); }} />
                    {errors.price && <span className="badge badge-danger text-xs">{errors.price}</span>}
                  </div>
                </div>

                <button className="prod-add-btn" onClick={addItem}>＋ Ajouter l'article</button>
              </div>

              {/* Articles list */}
              <div className="details-panel-mobile">
                {sell.details.alements.length === 0 ? (
                  <div className="empty-state" style={{ paddingTop: '2rem' }}>
                    <span className="empty-icon">🛍</span>
                    <span className="text-body text-sm">Aucun article ajouté</span>
                    <span className="text-label">Recherchez un produit ci-dessus</span>
                  </div>
                ) : (
                  <div className="details-list" style={{ paddingBottom: '0.5rem' }}>
                    {sell.details.alements.map((el, i) => {
                      const { name, qty, total, pv, commission: comm } = el;
                      const ps = prodServList.find((p) => p.nom === name);
                      const isServ = ps?.type === 'serv';
                      const unitPrice = qty > 0 ? total / qty : 0;
                      return (
                        <div key={i} className="detail-item-mobile">
                          <div className="dim-top">
                            <div className="dim-name">{name}</div>
                            <div className={`dim-type ${isServ ? 'serv' : 'prod'}`}>{isServ ? 'SV' : 'PD'}</div>
                            <button className="dim-del" onClick={() => removeItem(i)} title="Supprimer">✕</button>
                          </div>
                          <div className="dim-chips">
                            <div className="dim-chip">×{qty}</div>
                            {!isServ && <div className="dim-chip pv">PV {pv.toLocaleString()}</div>}
                            <div className="dim-chip total">{total.toLocaleString()} F</div>
                            <div className="dim-chip" style={{ color: 'var(--nm-text)', opacity: 0.7 }}>{unitPrice.toLocaleString()} F/u</div>
                            {comm !== null && comm > 0 && <div className="dim-chip comm">💸 {comm.toLocaleString()} F</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── STICKY BOTTOM BAR (mobile only) ── */}
            <div className="mobile-bottom-bar">
              <div className="mobile-bottom-bar__total">
                <div className="label">{articleCount} article{articleCount !== 1 ? 's' : ''} · Total</div>
                <div className="amount">{sell.total_amount.toLocaleString()} FCFA</div>
              </div>
              <button
                className={`mobile-bottom-bar__submit ${allStepsOn ? 'ready' : 'disabled'}`}
                onClick={handleSubmit}
                disabled={!allStepsOn || isSubmitting}
              >
                {isSubmitting ? '⏳' : allStepsOn ? '✓ Valider' : '⋯ Incomplet'}
              </button>
            </div>

            {/* Submit feedback (mobile) */}
            {submitStatus && (
              <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 300, padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-xl)', background: 'var(--nm-bg)', boxShadow: '8px 8px 16px var(--nm-dark), -8px -8px 16px var(--nm-light)', fontSize: '0.85rem', fontWeight: 600, color: submitStatus === 'success' ? 'var(--clr-accent-700)' : 'var(--clr-danger-500)', whiteSpace: 'nowrap' }}>
                {submitStatus === 'success' ? '✅ Vente enregistrée !' : '⚠ Erreur lors de l\'enregistrement'}
              </div>
            )}
          </>
        )}
      </div>
      </div>{/* end vente-root-wrap */}

      {/* ── QuickRegisterModal ── */}
      {quickRegister.open && (
        <QuickRegisterModal
          type={quickRegister.type}
          prefillName={quickRegister.prefillName}
          office={currentOffice}
          promotedBy={String(user?.promoted_by ?? '')}
          onSuccess={handleQuickRegisterSuccess}
          onClose={() => setQuickRegister((prev) => ({ ...prev, open: false }))}
        />
      )}
    </>
  );
}