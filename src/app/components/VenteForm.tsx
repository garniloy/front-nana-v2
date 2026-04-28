const backendUrl = 'https://backend-nana-v2.onrender.com';
// globale functions here


/*   POSSIBLE FIELDS STRUCTURE 
-- INSERT ONE ROW
    {
        name: 'Alice',
        email: 'alice@example.com',
        role: 'member',
    };
-- INSERT MANY ROWS
    [
        {name: 'Alice',email: 'alice@example.com',role: 'member',},
        {name: 'Bob',email: 'bob@example.com',role: 'member',},
        {name: 'Charlie',email: 'charlie@example.com',role: 'member',}
    ];

// Get the inserted row back
const res = await dbCreate('users', { name: 'Bob', email: 'bob@example.com' }, {
  returning: true,   // adds RETURNING * → fetch = 'one'
});

*/
// create data in any table
async function createDataToTable(table: string, fields: object) {

    const response = await fetch(backendUrl + '/crud/create/' + table, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });
    const data = await response.json();
    return data;
}


/*   POSSIBLE FIELDS STRUCTURE 

-- Filtered + specific columns
    {
    fields: ['id', 'email', 'role'],
    constraints: { role: 'admin', deleted_at: null },
    };

-- Single row
    {
        fields: ['id', 'email', 'role'],
        constraints: { id: 42 },
        fetch: 'one',
    };

-- With ordering + pagination
    {
    constraints: { active: true },
    orderBy: { created_at: 'DESC' },   // or a string / string[]
    limit: 20,
    offset: 40,
    };

-- Advanced operator
    {
    constraints: { total: { op: '>', value: 500 } },
    fetch: 'all',
    };
*/
//get data with contraints
const getDataFromTableWithConstraints = async (table:string, body:object) => {
    const res = await fetch(backendUrl +  '/crud/getwith/' + table, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log(data);
    return data
};


/*   POSSIBLE FIELDS STRUCTURE 

no fields, no constraints

*/

//get data without any contraints
/*
const getDataWithoutConstraints = async (table:string) => {
    const res = await fetch(backendUrl + 'get/' + table, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    console.log(data);
    return data
};
*/

/*   POSSIBLE FIELDS STRUCTURE 
-- Update by id  { id: 42 } or { id: 7, active: true }(complex where)     // WHERE -- to set in body 

   { 
        set : { role: 'admin' },
        where : { id: 42 } 
    } 

-- Multiple SET fields + complex WHERE

    { 
        set : { price: 19.99, updated_at: new Date() },
        where : { id: 42 } 
    } 

  
// Get updated rows back

    { 
        set : { price: 19.99, updated_at: new Date() },
        where : { id: 42 },
        returning: true 
    }

*/
//update data in any table


/*   POSSIBLE FIELDS STRUCTURE 
-- Delete by id
    { 
        contraints : {id: 99},
        returning: false   // or true
    };

// Delete with operator
    {
        contraints : {created_at: { op: '<', value: '2024-01-01' }},
        returning: false   // or true
    };

*/
//delete data


async function createSellData( fields: object) {

    const response = await fetch(backendUrl+'/sell' , {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
    });
    
    const data = await response.json();
    console.log('Sell creation response:', data);
    return data;
}

/*   POSSIBLE FIELDS STRUCTURE 

-- Filtered + specific columns
    {
    fields: ['id', 'email', 'role'],
    constraints: { role: 'admin', deleted_at: null },
    };

-- Single row
    {
    constraints: { id: 42 },
    fetch: 'one',
    };

-- With ordering + pagination
    {
    constraints: { active: true },
    orderBy: { created_at: 'DESC' },   // or a string / string[]
    limit: 20,
    offset: 40,
    };

-- Advanced operator
    {
    constraints: { total: { op: '>', value: 500 } },
    fetch: 'all',
    };
*/
//get data with contraints
/*const getDataFromTableWithConstraints = async (table:string, body:object) => {
    const res = await fetch(backendUrl +  'getwith/' + table, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log(data);
    return data
};
*/

/*   POSSIBLE FIELDS STRUCTURE 

no fields, no constraints

*/
//get data without any contraints
/*const getDataWithoutConstraints = async (table:string) => {
    const res = await fetch(backendUrl + 'get/' + table, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    console.log(data);
    return data
};*/





// global actions
const user = JSON.parse(localStorage.getItem("user") || "null");
const connected = localStorage.getItem("connected");


// imports
import '../css/form.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';
import Bills from './Bill-viewer';
import OfficeSelector from './Office-selector';

// ─── Types ────────────────────────────────────────────────────────────────────
type ProdServ = {
  type: "prod" | "serv";
  nom: string;
  pr_stock: number;
  pr_distr: number;
  pr_clt: number;
  pv: number;
};

type Stock = {
  qty: number;
  name: string;
};

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
  | (Seller & { _kind: "distributor" })
  | (Client & { _kind: "client" });

// [name, qty, total, benef, pv]
type AElement = [string, number, number, number, number];

type SellState = {
  id: string;
  seller: string;
  sellerObj: Seller | null;
  client: string;
  clientObj: ClientObj | null;
  clientKind: "client" | "distributor";
  payment_mode: string;
  details: {
    nb_prod: number;
    nb_serv: number;
    alements: AElement[];
  };
  total_amount: number;
  total_benefice: number;
  total_pv: number;
  office: string;
  date: string;
  bill_sent: boolean;
};

type Actualsell = {id:string;
  name:string;
  amount:number;
  office:string;
  manager:string}

type FormErrors = Partial<Record<"seller" | "client" | "payment" | "prod" | "qty" | "price", string>>;

// ─── Utility ──────────────────────────────────────────────────────────────────
function genId() {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const INITIAL_SELL: SellState = {
  id: "",
  seller: "",
  sellerObj: null,
  client: "",
  clientObj: null,
  clientKind: "client",
  payment_mode: "",
  details: { nb_prod: 0, nb_serv: 0, alements: [] },
  total_amount: 0,
  total_benefice: 0,
  total_pv: 0,
  office: "",
  date: "",
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
        <div
          className="suggestion-item suggestion-add"
          onMouseDown={(e) => { e.preventDefault(); onAddNew(); }}
        >
          <span className="s-plus">＋</span> {addLabel}
        </div>
      )}
      {items.map((item, i) => (
        <div
          key={i}
          className="suggestion-item"
          onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
        >
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
          <div
            className={`step-line step-line-top ${
              i === 0 ? "invisible" : step.on && steps[i - 1]?.on ? "on" : ""
            }`}
          />
          <div className={`step-circle ${step.on ? "on" : ""}`}>
            {step.on
              ? <span className="step-check">✓</span>
              : <span className="step-num">{i + 1}</span>}
          </div>
          <div
            className={`step-line step-line-bot ${
              i === steps.length - 1 ? "invisible" : step.on && steps[i + 1]?.on ? "on" : ""
            }`}
          />
        </div>
      ))}
    </div>
  );
}

type onCloseProps = {onclose :(s:boolean) => void}
// main function
export default function vente({onclose}: onCloseProps){

    const navigate = useNavigate()
    // Redirect
    useEffect(() => {
    if (!connected || !user) {
        localStorage.removeItem("user");
        localStorage.removeItem("connected");
        navigate("/login");
    }
    }, [connected, user, navigate]);

  // ── Remote data ──
    const [stock, setStock] = useImmer<Stock[]>([]);
    const [prodServList, setProdServList] = useImmer<ProdServ[]>([]);
    const [sellers, setSellers] = useImmer<Seller[]>([]);
    const [clients, setClients] = useImmer<Client[]>([]);
    const [loading, setLoading] = useState(true);
  
    // ── Sell state ──
    const [sell, setSell] = useImmer<SellState>({ ...INITIAL_SELL, id: genId() });
    const [actualSell, setActualSell] = useState<Actualsell[]>([{id:"", name:"", amount:0, office:"", manager:""}]);
  
    // ── Form / UI state ──
    const [sellerInput, setSellerInput] = useState("");
    const [clientInput, setClientInput] = useState("");
    const [sellerSugg, setSellerSugg] = useState<string[]>([]);
    const [clientSugg, setClientSugg] = useState<string[]>([]);
    const [showSellerSugg, setShowSellerSugg] = useState(false);
    const [showClientSugg, setShowClientSugg] = useState(false);
  
    // ── Product form ──
    const [prodInput, setProdInput] = useState("");
    const [prodSugg, setProdSugg] = useState<string[]>([]);
    const [showProdSugg, setShowProdSugg] = useState(false);
    const [selectedProd, setSelectedProd] = useState<ProdServ | null>(null);
    const [qtyInput, setQtyInput] = useState("");
    const [priceInput, setPriceInput] = useState("");
    const [showDetails, setShowDetails] = useState(false);
    const [selectedOffice, setSelectedOffice] = useState("");
  
    // ── Errors & submit ──
    const [errors, setErrors] = useImmer<FormErrors>({});
    const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
  
    // ── Refs ──
    const sellerRef = useRef<HTMLInputElement>(null);
    const clientRef = useRef<HTMLInputElement>(null);
    const prodRef = useRef<HTMLInputElement>(null);
  
    // ── Fetch on mount ──
    /*useEffect(() => {
      async function fetchAll() {
        try {
          const [stockData, psData, sellerData, clientData] = await Promise.all([
            getDataWithoutConstraints("stock"),
            getDataWithoutConstraints("prod_serv"),
            getDataWithoutConstraints("sellers"),
            getDataWithoutConstraints("clients"),
          ]);
          setStock(stockData ?? []);
          setProdServList(psData ?? []);
          setSellers(sellerData ?? []);
          setClients(clientData ?? []);
        } catch (e) {
          console.error("Fetch error", e);
        } finally {
          setLoading(false);
        }
      }
      fetchAll();
    }, []);
*/
  
const [changeView, setChangeView] = useState(false);
const handlechangeview = ()=>{
  setChangeView(changeView ? false : true);
}

useEffect(() => {
  const fetchAll = async () => {
    try {
      const officeConstraint = user.owner || user.role === 'superuser' ? {office: selectedOffice} : { office: user.office };

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

        getDataFromTableWithConstraints('clients', {
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
  };

  fetchAll();
}, []);

useEffect(() => {
  setStock([]);
  setProdServList([]);
  setSellers([]);
  setClients([]);
  const fetchAll = async () => {
    try {
      const officeConstraint = user.owner || user.role === 'superuser' ? {office: selectedOffice} : { office: user.office };

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

        getDataFromTableWithConstraints('clients', {
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
  };

  fetchAll();
}, [selectedOffice]);
  
    // ── Step tracker logic ──
    const steps: Step[] = [
      { label: "Vendeur", on: !!sell.sellerObj },
      { label: "Client", on: !!sell.clientObj },
      { label: "Paiement", on: !!sell.payment_mode },
      { label: "Articles", on: sell.details.alements.length > 0 },
    ];
    const allStepsOn = steps.every((s) => s.on);
  
    // ── Suggestion helpers ──
    const allNames = useCallback(() => {
      const sv = sellers.map((s) => s.name);
      const cv = clients.map((c) => c.name);
      return [...new Set([...sv, ...cv])];
    }, [sellers, clients]);
  
    function filterSugg(query: string, list: string[]): string[] {
      if (!query) return [];
      return list.filter((n) => n.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
    }
  
    // ── Seller input ──
    function onSellerInput(val: string) {
      setSellerInput(val);
      setSellerSugg(filterSugg(val, allNames()));
      setShowSellerSugg(true);
      if (!val) {
        setSell((d) => { d.sellerObj = null; d.seller = ""; });
      }
      setErrors((d) => { delete d.seller; });
    }
  
    function selectSeller(name: string) {
      const found = sellers.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (found) {
        setSellerInput(found.name);
        setSell((d) => {
          d.sellerObj = found as typeof d.sellerObj;
          d.seller = found.id;
          d.office = found.office;
        });
        setErrors((d) => { delete d.seller; });
      } else {
        setErrors((d) => { d.seller = "Vendeur introuvable dans la base."; });
      }
      setShowSellerSugg(false);
    }
  
    function onSellerBlur() {
      setTimeout(() => setShowSellerSugg(false), 150);
      if (sellerInput && !sell.sellerObj) {
        setErrors((d) => { d.seller = "Ce vendeur n'est pas enregistré."; });
      }
    }
  
    // ── Client input ──
    function onClientInput(val: string) {
      setClientInput(val);
      setClientSugg(filterSugg(val, allNames()));
      setShowClientSugg(true);
      if (!val) {
        setSell((d) => { d.clientObj = null; d.client = ""; d.clientKind = "client"; });
      }
      setErrors((d) => { delete d.client; });
    }
  
    function selectClient(name: string) {
      const asSeller = sellers.find((s) => s.name.toLowerCase() === name.toLowerCase());
      const asClient = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
  
      if (asSeller) {
        setClientInput(asSeller.name);
        setSell((d) => {
          d.clientObj = { ...asSeller, _kind: "distributor" } as typeof d.clientObj;
          d.client = asSeller.id;
          d.clientKind = "distributor";
        });
        recalcPricesForKind("distributor");
      } else if (asClient) {
        const clientSeller = sellers.find((s) => s.id === asClient.seller);
        setClientInput(asClient.name);
        setSell((d) => {
          d.clientObj = { ...asClient, _kind: "client" } as typeof d.clientObj;
          d.client = asClient.id;
          d.clientKind = "client";
          if (clientSeller && !d.sellerObj) {
            d.sellerObj = clientSeller;
            d.seller = clientSeller.id;
            d.office = clientSeller.office;
          }
        });
        // setSellerInput must be outside setSell (no side effects in immer)
        if (asClient && !sell.sellerObj) {
          const cs = sellers.find((s) => s.id === asClient.seller);
          if (cs) setSellerInput(cs.name);
        }
        recalcPricesForKind("client");
      } else {
        setErrors((d) => { d.client = "Client introuvable dans la base."; });
      }
      setShowClientSugg(false);
    }
  
    function onClientBlur() {
      setTimeout(() => setShowClientSugg(false), 150);
      if (clientInput && !sell.clientObj) {
        setErrors((d) => { d.client = "Ce client n'est pas enregistré."; });
      }
    }
  
    // ── Recalc prices when client kind changes ──
    function recalcPricesForKind(kind: "client" | "distributor") {
      setSell((d) => {
        d.clientKind = kind;
        let totalAmount = 0, totalPv = 0, totalBenef = 0;
        let nb_prod = 0, nb_serv = 0;
        d.details.alements = d.details.alements.map((el): AElement => {
          const ps = prodServList.find((p) => p.nom === el[0]);
          if (!ps) return el;
          const price =
            ps.type === "prod"
              ? kind === "distributor" ? ps.pr_distr : ps.pr_clt
              : ps.pr_clt;
          const pv = ps.type === "prod" ? ps.pv * el[1] : 0;
          const total = price * el[1];
          const benef = total - ps.pr_stock * el[1];
          if (ps.type === "prod") nb_prod++; else nb_serv++;
          totalAmount += total;
          totalPv += pv;
          totalBenef += benef;
          return [el[0], el[1], total, benef, pv];
        });
        d.details.nb_prod = nb_prod;
        d.details.nb_serv = nb_serv;
        d.total_amount = totalAmount;
        d.total_pv = totalPv;
        d.total_benefice = totalBenef;
      });
    }
  
    // ── Prod/serv input ──
    function onProdInput(val: string) {
      setProdInput(val);
      const names = prodServList.map((p) => p.nom);
      setProdSugg(filterSugg(val, names));
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
          ps.type === "prod"
            ? kind === "distributor" ? ps.pr_distr : ps.pr_clt
            : ps.pr_clt;
        setPriceInput(String(defaultPrice));
        setQtyInput("1");
      }
      setShowProdSugg(false);
      setErrors((d) => { delete d.prod; });
    }
  
    function onProdBlur() {
      setTimeout(() => setShowProdSugg(false), 150);
    }
  
    // ── Get stock qty ──
    function getStockQty(nom: string): number {
      const s = stock.find((st) => st.name === nom);
      return s ? s.qty : 0;
    }
  
    // ── Add item ──
    function addItem() {
      const newErrors: FormErrors = {};
      if (!selectedProd) newErrors.prod = "Sélectionnez un produit/service valide.";
      const qty = parseInt(qtyInput);
      if (!qty || qty <= 0) newErrors.qty = "Quantité invalide.";
      const price = parseFloat(priceInput);
      if (isNaN(price) || price < 0) newErrors.price = "Prix invalide.";
  
      if (selectedProd?.type === "prod") {
        const avail = getStockQty(selectedProd.nom);
        if (qty > avail) newErrors.qty = `Stock insuffisant (${avail} dispo).`;
      }
  
      if (Object.keys(newErrors).length) {
        setErrors((d) => Object.assign(d, newErrors));
        return;
      }
  
      // selectedProd is guaranteed non-null here (we returned above if null)
      const ps = selectedProd!;
      const pv = ps.type === "prod" ? ps.pv * qty : 0;
      const total = price * qty;
      const benef = total - ps.pr_stock * qty;
  
      setSell((d) => {
        const existing = d.details.alements.findIndex((el) => el[0] === ps.nom);
        if (existing !== -1) {
          const old = d.details.alements[existing];
          d.details.alements[existing] = [
            ps.nom, old[1] + qty, (old[1] + qty) * price, benef + old[3], pv + old[4],
          ];
        } else {
          d.details.alements.push([ps.nom, qty, total, benef, pv]);
          if (ps.type === "prod") d.details.nb_prod++;
          else d.details.nb_serv++;
        }
        let ta = 0, tpv = 0, tb = 0;
        d.details.alements.forEach((el) => { ta += el[2]; tpv += el[4]; tb += el[3]; });
        d.total_amount = ta;
        d.total_pv = tpv;
        d.total_benefice = tb;
      });
  
      setProdInput("");
      setSelectedProd(null);
      setQtyInput("");
      setPriceInput("");
      setErrors((d) => { delete d.prod; delete d.qty; delete d.price; });
    }
  
    function removeItem(idx: number) {
      setSell((d) => {
        const ps = prodServList.find((p) => p.nom === d.details.alements[idx][0]);
        if (ps?.type === "prod") d.details.nb_prod = Math.max(0, d.details.nb_prod - 1);
        else d.details.nb_serv = Math.max(0, d.details.nb_serv - 1);
        d.details.alements.splice(idx, 1);
        let ta = 0, tpv = 0, tb = 0;
        d.details.alements.forEach((el) => { ta += el[2]; tpv += el[4]; tb += el[3]; });
        d.total_amount = ta;
        d.total_pv = tpv;
        d.total_benefice = tb;
      });
    }
  
    // ── Submit ──
    async function handleSubmit() {
      if (!allStepsOn || isSubmitting) return;
      setIsSubmitting(true);
      setSubmitStatus(null);
      try {
        const now = new Date().toISOString();
        const activity = {
          id: sell.id,
          seller: sell.seller,
          clientKind: sell.clientKind,
          client: sell.client,
          payment_mode: sell.payment_mode,
          total_amount: sell.total_amount,
          total_benefice: sell.total_benefice,
          office: selectedOffice|| sell.office,
          date: now,
          bill_sent: false,
          total_pv: sell.total_pv,
          details: sell.details,
        };

        setActualSell((d) => [...d, {id:activity.id, name:activity.client || "Inconnu", amount: sell.total_amount, office: sell.office, manager: sell.sellerObj?.name || "Inconnu"}])
        console.log("Submitting activity:", activity, actualSell); //......

        const field = {
          office : selectedOffice|| sell.office,
          sell : actualSell,
          activity : activity
        }

        const response = await createSellData( field);

        if (!response || !response.success) {
          throw new Error(response.message);
        }
  
        for (const [name, qty] of sell.details.alements) {
          const ps = prodServList.find((p) => p.nom === name);
          if (ps?.type !== "prod") continue;
          const current = getStockQty(name);
          await createDataToTable("stock_move", {
            element: name, qty, type: "OUT", date: now, office: user.office,
          });
          setStock((d) => {
            const s = d.find((st) => st.name === name);
            if (s) s.qty = current - qty;
          });
        }
        
        setSubmitStatus("success");
        setTimeout(() => resetSell(), 2000);
      } catch (e) {
        console.error(e);
        setSubmitStatus("error");
      } finally {
        setIsSubmitting(false);
      }
    }
  
    function resetSell() {
      setSell({ ...INITIAL_SELL, id: genId() });
      setSellerInput("");
      setClientInput("");
      setProdInput("");
      setQtyInput("");
      setPriceInput("");
      setSelectedProd(null);
      setErrors({});
      setSubmitStatus(null);
      setShowDetails(false);
    }
  
    if (loading) {
    return (
      <div
        className="w-full h-full col align-center justify-center gap-md"
        data-style="neuro" data-mode="light"
      >
        <div className="vente-spinner" />
        <p className="text-label">Chargement des données…</p>
      </div>
    );
  }

 

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;700;800&display=swap');

        /* ── Layout shell ── */
        .vente-root {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .vente-header {
          display: flex; align-items: center; gap: 0.5rem;
          padding: var(--padding-sm);
          border-bottom: 1px solid var(--nm-dark);
          flex-shrink: 0;
        }
        .vente-main {
          display: grid;
          grid-template-columns: 300px 1fr;
          flex: 1; min-height: 0; overflow: hidden;
        }

        /* ── Left panel ── */
        .step-side {
          display: flex; gap: var(--gap-lg);
          padding: var(--padding-lg);
          border-right: 1px solid var(--nm-dark);
          overflow-y: auto; min-height: 0;
        }

        /* ── Step tracker geometry (no neuro equivalent) ── */
        .step-tracker { display: flex; flex-direction: column; align-items: center; padding-top: 0.25rem; flex-shrink: 0; width: 28px; }
        .step-node    { display: flex; flex-direction: column; align-items: center; }
        .step-line    { width: 2px; height: 52px; background: var(--nm-dark); border-radius: 2px; transition: background var(--duration-normal) var(--ease-out); }
        .step-line.on { background: var(--nm-brand); }
        .step-line.invisible { visibility: hidden; }
        .step-circle  { width: 26px; height: 26px; border-radius: var(--radius-full); border: 2px solid var(--nm-dark); background: var(--nm-bg); display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); color: var(--nm-text); transition: all var(--duration-normal) var(--ease-out); flex-shrink: 0; }
        .step-circle.on { border-color: var(--nm-brand); background: var(--nm-brand); color: #fff; }
        .step-check { font-size: 0.7rem; }
        .step-num   { font-size: 0.6rem; }

        /* ── Fields column ── */
        .fields { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .field-block { display: flex; flex-direction: column; gap: var(--gap-xs); height: 102px; justify-content: center; position: relative; }

        /* ── Input states on neuro inputs (error / ok ring) ── */
        .vente-input-error { box-shadow: inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light), 0 0 0 2px var(--clr-danger-500) !important; }
        .vente-input-ok    { box-shadow: inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light), 0 0 0 2px var(--clr-accent-600) !important; }

        /* ── Suggestion popup (absolute-positioned, no neuro equivalent) ── */
        .input-wrap { position: relative; }
        .suggestion-popup {
          position: absolute; top: calc(100% + var(--gap-xs)); left: 0; right: 0;
          background: var(--nm-bg);
          border-radius: var(--radius-xl);
          box-shadow: 8px 8px 16px var(--nm-dark), -8px -8px 16px var(--nm-light);
          z-index: var(--z-dropdown);
          overflow: hidden; max-height: 200px; overflow-y: auto;
        }
        .suggestion-item { padding: var(--padding-xs); font-size: var(--text-sm); color: var(--nm-text-strong); cursor: pointer; transition: var(--transition-colors); }
        .suggestion-item:hover { background: rgba(0,0,0,0.04); }
        .suggestion-add  { color: var(--nm-brand); font-weight: var(--weight-medium); border-bottom: 1px solid var(--nm-dark); }

        /* ── Client kind badge ── */
        .client-kind-badge { display: inline-flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-xs); padding: 0.15rem 0.6rem; border-radius: var(--radius-full); margin-top: var(--gap-xs); font-weight: var(--weight-medium); }
        .client-kind-badge.distr { color: var(--nm-brand); box-shadow: 2px 2px 4px var(--nm-dark), -2px -2px 4px var(--nm-light); background: var(--nm-bg); }
        .client-kind-badge.clt   { color: var(--clr-accent-700); box-shadow: 2px 2px 4px var(--nm-dark), -2px -2px 4px var(--nm-light); background: var(--nm-bg); }

        /* ── Sell summary box ── */
        .sell-summary { display: flex; align-items: center; gap: var(--gap-md); height: 102px; }
        .s-item  { display: flex; flex-direction: column; align-items: center; gap: var(--gap-xs); flex: 1; }
        .s-item p { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: var(--tracking-wider); color: var(--nm-text); margin: 0; }
        .s-nb    { font-family: 'Syne', sans-serif; font-weight: var(--weight-black); font-size: var(--text-2xl); color: var(--nm-text-strong); line-height: 1; }
        .s-sep   { width: 1px; height: 40px; box-shadow: 1px 0 0 var(--nm-light), -1px 0 0 var(--nm-dark); }
        .total-wrap { flex: 1.5; display: flex; flex-direction: column; gap: var(--gap-xs); }
        .total-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: var(--tracking-wider); color: var(--nm-text); }
        .total-val   { font-family: 'Syne', sans-serif; font-weight: var(--weight-bold); font-size: var(--text-md); color: var(--nm-brand); }

        /* ── Submit feedback ── */
        .submit-feedback { margin-top: var(--gap-sm); padding: var(--padding-xs); border-radius: var(--radius-xl); font-size: var(--text-xs); text-align: center; font-weight: var(--weight-medium); }
        .submit-feedback.success { color: var(--clr-accent-700); box-shadow: inset 2px 2px 5px var(--nm-dark), inset -2px -2px 5px var(--nm-light); }
        .submit-feedback.error   { color: var(--clr-danger-500); box-shadow: inset 2px 2px 5px var(--nm-dark), inset -2px -2px 5px var(--nm-light); }

        /* ── Right panel ── */
        .sell-form-side { display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

        /* ── Summary bar ── */
        .summary-bar {
          display: flex; align-items: center; gap: var(--gap-lg);
          padding: var(--padding-md);
          border-bottom: 1px solid var(--nm-dark);
          flex-shrink: 0;
        }
        .sbar-group { display: flex; align-items: center; gap: var(--gap-sm); }
        .sbar-icon  {
          width: 32px; height: 32px; border-radius: var(--radius-lg);
          display: flex; align-items: center; justify-content: center;
          font-size: var(--text-xs);
          box-shadow: 3px 3px 6px var(--nm-dark), -3px -3px 6px var(--nm-light);
          background: var(--nm-bg);
        }
        .sbar-val   { font-family: 'Syne', sans-serif; font-weight: var(--weight-bold); font-size: var(--text-base); color: var(--nm-text-strong); line-height: 1; }
        .sbar-sep   { width: 1px; height: 28px; box-shadow: 1px 0 0 var(--nm-light), -1px 0 0 var(--nm-dark); flex-shrink: 0; }
        .sbar-total { margin-left: auto; text-align: right; }
        .sbar-total .sbar-val { font-size: var(--text-lg); color: var(--nm-brand); }

        /* ── Detail toggle ── */
        .detail-toggle {
          margin-left: var(--gap-sm);
          background: var(--nm-bg); color: var(--nm-text);
          border-radius: var(--radius-xl); padding: var(--padding-xs);
          font-size: var(--text-xs); font-weight: var(--weight-medium);
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
          transition: var(--transition-all); cursor: pointer;
        }
        .detail-toggle.active {
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light);
          color: var(--nm-brand);
        }

        /* ── Product form row ── */
        .form-details { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
        .prod-form {
          display: grid; grid-template-columns: 1fr 100px 100px auto;
          gap: var(--gap-md); align-items: end;
          padding: var(--padding-md);
          border-bottom: 1px solid var(--nm-dark);
          flex-shrink: 0;
        }
        .prod-form-group { display: flex; flex-direction: column; gap: var(--gap-xs); }

        /* ── Stock badge ── */
        .stock-badge { display: flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-xs); color: var(--nm-text); margin-top: var(--gap-xs); }
        .stock-dot   { width: 6px; height: 6px; border-radius: var(--radius-full); background: var(--clr-accent-600); display: inline-block; }

        /* ── Scrollable details panel ── */
        .details-panel { flex: 1; overflow-y: auto; padding: var(--padding-md); min-height: 0; }

        /* ── Legend ── */
        .color-legend { display: flex; gap: var(--gap-lg); margin-bottom: var(--gap-md); padding: var(--padding-xs); border-radius: var(--radius-xl); width: fit-content; box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light); }
        .legend-item  { display: flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-xs); color: var(--nm-text); text-transform: uppercase; letter-spacing: var(--tracking-wider); }
        .boule        { width: 10px; height: 10px; border-radius: var(--radius-full); display: inline-block; flex-shrink: 0; }
        .boule-qty    { background: var(--nm-brand); }
        .boule-pv     { background: var(--clr-accent-600); }
        .boule-prix   { background: var(--clr-warning-500); }

        /* ── Detail item (grid layout, no neuro equivalent) ── */
        .details-list { display: flex; flex-direction: column; gap: var(--gap-sm); }
        .detail-item {
          display: grid; grid-template-columns: 1fr 28px auto auto auto 1fr auto;
          align-items: center; gap: var(--gap-sm);
          padding: var(--padding-sm);
          border-radius: var(--radius-xl);
          background: var(--nm-bg);
          box-shadow: 5px 5px 10px var(--nm-dark), -5px -5px 10px var(--nm-light);
          transition: var(--transition-shadow);
          animation: fadeUp var(--duration-normal) var(--ease-out);
        }
        .detail-item:hover { box-shadow: 7px 7px 14px var(--nm-dark), -7px -7px 14px var(--nm-light); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .di-name  { font-size: var(--text-sm); color: var(--nm-text-strong); font-weight: var(--weight-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .di-type  { width: 22px; height: 22px; border-radius: var(--radius-sm); font-size: 0.5rem; display: flex; align-items: center; justify-content: center; font-weight: var(--weight-bold); text-transform: uppercase; box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); }
        .di-type.prod { color: var(--nm-brand); }
        .di-type.serv { color: var(--clr-accent-600); }
        .di-val   { display: flex; align-items: center; gap: var(--gap-xs); font-size: var(--text-sm); color: var(--nm-text-strong); }
        .di-val .boule { width: 7px; height: 7px; }
        .di-rowsum { display: flex; gap: var(--gap-sm); justify-content: flex-end; }
        .di-chip   { font-size: var(--text-xs); padding: 0.2rem 0.5rem; border-radius: var(--radius-full); display: flex; align-items: center; gap: var(--gap-xs); white-space: nowrap; font-weight: var(--weight-medium); box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light); color: var(--nm-text); }
        .di-chip.pvt  { color: var(--clr-accent-700); }
        .di-chip.prit { color: var(--clr-warning-500); }
        .di-del   { background: none; border: none; color: var(--nm-text); cursor: pointer; padding: var(--gap-xs); font-size: var(--text-base); border-radius: var(--radius-md); transition: var(--transition-colors); display: flex; align-items: center; }
        .di-del:hover { color: var(--clr-danger-500); }

        /* ── Empty state ── */
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-48); gap: var(--gap-md); color: var(--nm-text); text-align: center; }
        .empty-icon  { font-size: var(--text-4xl); opacity: 0.35; }

        /* ── Spinner ── */
        .vente-spinner { width: 32px; height: 32px; border-radius: var(--radius-full); box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light); animation: spin 1s var(--ease-inout) infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Responsive ── */
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
                <button className='btn' onClick={handlechangeview}>
                  {changeView ? "Afficher le formulaire" : "Afficher les détails"}
                </button> 
            </div>
            <OfficeSelector onOfficeSelect={(officeName)=>{setSelectedOffice(officeName)}} />

            <button className='btn' onClick={()=>{onclose?.(true)}}>back</button>
            
          
        </div>

        {/* ── MAIN GRID ── */}
        {changeView && <Bills />}
        {!changeView && <div className="vente-main">

          {/* ── LEFT ── */}
          <div className="step-side">
            <StepTracker steps={steps} />
            <div className="fields">

              {/* Vendeur */}
              <div className="field-block">
                <label className="text-label">Vendeur</label>
                <div className="input-wrap">
                  <input
                    ref={sellerRef}
                    className={`input ${errors.seller ? "vente-input-error" : sell.sellerObj ? "vente-input-ok" : ""}`}
                    type="text"
                    placeholder="Nom du vendeur"
                    value={sellerInput}
                    onChange={(e) => onSellerInput(e.target.value)}
                    onBlur={onSellerBlur}
                    onFocus={() => { if (sellerInput) setShowSellerSugg(true); }}
                  />
                  {showSellerSugg && sellerSugg.length > 0 && (
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
                    className={`input ${errors.client ? "vente-input-error" : sell.clientObj ? "vente-input-ok" : ""}`}
                    type="text"
                    placeholder="Nom du client"
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
                  <span className={`client-kind-badge ${sell.clientKind === "distributor" ? "distr" : "clt"}`}>
                    {sell.clientKind === "distributor" ? "⬡ Distributeur" : "● Client"}
                  </span>
                )}
                {errors.client && <span className="badge badge-danger">{errors.client}</span>}
              </div>

              {/* Paiement */}
              <div className="field-block">
                <label className="text-label">Mode de paiement</label>
                <select
                  className={`input ${sell.payment_mode ? "vente-input-ok" : ""}`}
                  value={sell.payment_mode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSell((d) => { d.payment_mode = v; });
                    setErrors((d) => { delete d.payment; });
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
                  <div className="s-item">
                    <p>Produits</p>
                    <div className="s-nb">{sell.details.nb_prod}</div>
                  </div>
                  <div className="s-sep" />
                  <div className="s-item">
                    <p>Services</p>
                    <div className="s-nb">{sell.details.nb_serv}</div>
                  </div>
                  <div className="s-sep" />
                  <div className="total-wrap">
                    <span className="total-label">Total</span>
                    <span className="total-val">{sell.total_amount.toLocaleString()} F</span>
                    <span className="total-label" style={{ marginTop: 'var(--gap-xs)' }}>Bénéfice</span>
                    <span className="total-val text-sm">{sell.total_benefice.toLocaleString()} F</span>
                  </div>
                </div>
              </div>

              {/* Valider */}
              <div style={{ paddingTop: 'var(--gap-md)' }}>
                <button
                  className={`btn w-full justify-center ${allStepsOn ? "btn-primary" : "opacity-50 not-allowed"}`}
                  onClick={handleSubmit}
                  disabled={!allStepsOn || isSubmitting}
                >
                  {isSubmitting ? "Enregistrement…" : "✓ Valider la Vente"}
                </button>
                {submitStatus === "success" && (
                  <div className="submit-feedback success">✅ Vente enregistrée avec succès !</div>
                )}
                {submitStatus === "error" && (
                  <div className="submit-feedback error">⚠ Erreur lors de l'enregistrement.</div>
                )}
              </div>

            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="sell-form-side">

            {/* Summary bar */}
            <div className="summary-bar">
              <div className="sbar-group">
                <div className="sbar-icon">📦</div>
                <div className="col gap-xs">
                  <span className="text-label">Produits</span>
                  <span className="sbar-val">{sell.details.nb_prod}</span>
                </div>
              </div>
              <div className="sbar-sep" />
              <div className="sbar-group">
                <div className="sbar-icon">🛠</div>
                <div className="col gap-xs">
                  <span className="text-label">Services</span>
                  <span className="sbar-val">{sell.details.nb_serv}</span>
                </div>
              </div>
              <div className="sbar-sep" />
              <div className="sbar-group">
                <div className="sbar-icon">PV</div>
                <div className="col gap-xs">
                  <span className="text-label">Total PV</span>
                  <span className="sbar-val" style={{ color: 'var(--clr-accent-700)' }}>{sell.total_pv.toLocaleString()}</span>
                </div>
              </div>
              <div className="sbar-total col gap-xs">
                <span className="text-label">Montant Total</span>
                <span className="sbar-val">{sell.total_amount.toLocaleString()} FCFA</span>
              </div>
              <button
                className={`detail-toggle ${showDetails ? "active" : ""}`}
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? "◀ Masquer" : "▶ Détails"}
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
                        className={`input ${errors.prod ? "vente-input-error" : selectedProd ? "vente-input-ok" : ""}`}
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
                    {selectedProd?.type === "prod" && (
                      <div className="stock-badge">
                        <span className="stock-dot" />
                        Stock : {getStockQty(selectedProd.nom)} unités
                      </div>
                    )}
                    {errors.prod && <span className="badge badge-danger">{errors.prod}</span>}
                  </div>

                  <div className="prod-form-group qty-group">
                    <label className="text-label">Qté</label>
                    <input
                      className={`input ${errors.qty ? "vente-input-error" : ""}`}
                      type="number" min="1" placeholder="0"
                      value={qtyInput}
                      onChange={(e) => { setQtyInput(e.target.value); setErrors((d) => { delete d.qty; }); }}
                    />
                    {errors.qty && <span className="badge badge-danger text-xs">{errors.qty}</span>}
                  </div>

                  <div className="prod-form-group price-group">
                    <label className="text-label">Prix unit.</label>
                    <input
                      className={`input ${errors.price ? "vente-input-error" : ""}`}
                      type="number" min="0" placeholder="0"
                      value={priceInput}
                      onChange={(e) => { setPriceInput(e.target.value); setErrors((d) => { delete d.price; }); }}
                    />
                    {errors.price && <span className="badge badge-danger text-xs">{errors.price}</span>}
                  </div>

                  <button className="btn btn-primary" onClick={addItem}>＋ Ajouter</button>
                </div>
              )}

              {/* Scrollable list */}
              <div className="details-panel">
                {sell.details.alements.length > 0 && (
                  <div className="color-legend">
                    <div className="legend-item"><span className="boule boule-qty" /> Qté</div>
                    <div className="legend-item"><span className="boule boule-pv" /> PV</div>
                    <div className="legend-item"><span className="boule boule-prix" /> Prix</div>
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
                      const [name, qty, total, , pv] = el;
                      const ps = prodServList.find((p) => p.nom === name);
                      const isServ = ps?.type === "serv";
                      const unitPrice = qty > 0 ? total / qty : 0;
                      return (
                        <div key={i} className="detail-item">
                          <div className="di-name">{name}</div>
                          <div className={`di-type ${isServ ? "serv" : "prod"}`}>
                            {isServ ? "SV" : "PD"}
                          </div>
                          <div className="di-val"><span className="boule boule-qty" />{qty}</div>
                          <div className="di-val">
                            <span className="boule boule-pv" />
                            {isServ ? "—" : (ps?.pv ?? 0)}
                          </div>
                          <div className="di-val">
                            <span className="boule boule-prix" />
                            {unitPrice.toLocaleString()}
                          </div>
                          <div className="di-rowsum">
                            {!isServ && <div className="di-chip pvt">PV×{qty} = {pv.toLocaleString()}</div>}
                            <div className="di-chip prit">{total.toLocaleString()} F</div>
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
        </div>}
      </div>
    </>
  );
}