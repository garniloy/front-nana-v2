// url backend here
const backendUrl = 'http://localhost:3000/crud/';

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

    const response = await fetch(backendUrl + 'create/' + table, {
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
    const res = await fetch(backendUrl +  'getwith/' + table, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log(data);
    return data
};

// global actions
const user = JSON.parse(localStorage.getItem("user") || "null");
const connected = localStorage.getItem("connected");


import { useState, useEffect } from 'react'
import '../css/form.css'
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';

type onCloseProps = {onclose :(s:boolean) => void}
/* =========================
   COMPONENT
========================= */
export default function Appro({onclose}: onCloseProps) {

    const navigate = useNavigate();
    useEffect(() => {
        if (!connected || !user) {
            localStorage.removeItem("user");
            localStorage.removeItem("connected");
            navigate("/login");
        }
    }, [connected, user, navigate]);


    type Stock = { name: string; qte: number; }
    type ApproItem = { name: string; add_qte: number; prev_qte: number; next_qte: number; }
    type data = { success: boolean; list: []; }

    const [stockActuel, setStockActuel] = useImmer<Stock[]>([{name:'noni',qte:3},{name:'veslime',qte:10},{name:'amla',qte:15}]);
    const [approList, setApproList] = useImmer<ApproItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [highlighted, setHighlighted] = useState<string[]>([]);

    useEffect(() => {
        const fetchdata = async () => {
            const field = { fields: ['name', 'qte'], constraints: user.office };
            try {
                const data: data = await getDataFromTableWithConstraints('stock', field);
                if (data.success === false) { setStockActuel(() => []); return; }
                if (data.list.length === 0) { setStockActuel(() => []); return; }
                setStockActuel(dr => { dr.push(...data.list) });
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };
        fetchdata();
    }, []);

    const handleChange = (name: string, value: string) => {
        const add = Number(value);
        if (isNaN(add) || add <= 0) return;
        const stockItem = stockActuel.find(p => p.name === name);
        if (!stockItem) return;
        setApproList(draft => {
            const existing = draft.find(p => p.name === name);
            if (existing) { existing.add_qte = add; existing.next_qte = stockItem.qte + add; }
            else { draft.push({ name, add_qte: add, prev_qte: stockItem.qte, next_qte: stockItem.qte + add }); }
        });
    };

    const hasChanges = approList.some(p => p.add_qte > 0);

    const submitAppro = async () => {
        setSubmitting(true);
        try {
            await createDataToTable("approvisionnement", { items: approList, office: user.office, manager: user.id });
            setStockActuel(draft => { approList.forEach(a => { const item = draft.find(p => p.name === a.name); if (item) item.qte = a.next_qte; }); });
            setHighlighted(approList.map(a => a.name));
            setApproList(() => []);
            setShowConfirm(false);
            setTimeout(() => setHighlighted([]), 2000);
        } catch (error) {
            console.log(error);
        } finally {
            setSubmitting(false);
        }
    };

    const getStockBadgeClass = (qte: number) => {
        if (qte === 0) return 'badge badge-danger';
        if (qte < 10) return 'badge badge-warning';
        return 'badge badge-success';
    };

    if (loading) {
        return (
            <main className="min-h-screen col align-center justify-center" data-style="neuro" data-mode="light">
                <p className="text-body text-sm">Chargement du stock…</p>
            </main>
        );
    }
    

    return (
        <main
            className="main"
            data-style="neuro"
            data-mode="light"
        >
            <div className="surface col gap-sm" style={{ width: '100%' }}>

                {/* HEADER */}
                <div className="row align-center justify-between">
                    <div className="col gap-xs">
                        <h2 className="text-heading text-xl">Approvisionnement</h2>
                        <p className="text-body text-sm">Ajoutez les quantités à réapprovisionner.</p>
                    </div>
                    <button className='btn ' onClick={()=>{onclose?.(true)}}>back</button>
                </div>

                <div className="divider" />

                {/* TABLE HEADER */}
                <div className="row align-center" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <span className="text-label">Produit</span>
                    <span className="text-label text-center">Stock actuel</span>
                    <span className="text-label text-center">Quantité à ajouter</span>
                </div>

                {/* ROWS */}
                <div className="col gap-md" style={{overflow:'auto'}}>
                    {stockActuel.map((produit) => {
                        const appro = approList.find(a => a.name === produit.name);
                        const isHighlighted = highlighted.includes(produit.name);

                        return (
                            <div
                                key={produit.name}
                                className="surface-inset row align-center"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    transition: 'background 0.4s',
                                    ...(isHighlighted ? { background: 'rgba(13,242,97,0.08)' } : {})
                                }}
                            >
                                <p className="text-body weight-medium">{produit.name}</p>

                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <span className={getStockBadgeClass(produit.qte)}>
                                        {produit.qte}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <input
                                        className="input"
                                        type="number"
                                        style={{ width: '6rem', textAlign: 'center' }}
                                        value={appro?.add_qte || ''}
                                        onChange={(e) => handleChange(produit.name, e.target.value)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="divider" />

                {/* ACTION */}
                <button
                    className={`btn btn-primary w-full justify-center${(!hasChanges || submitting) ? ' opacity-50 not-allowed' : ''}`}
                    disabled={!hasChanges || submitting}
                    onClick={() => setShowConfirm(true)}
                >
                    Approvisionner
                </button>
            </div>

            {/* CONFIRM MODAL */}
            {showConfirm && (
                <div className="overlay">
                    <div className="modal col gap-lg">
                        <div className="col gap-xs">
                            <h3 className="text-heading text-xl">Confirmer l'approvisionnement</h3>
                            <p className="text-body text-sm">Vérifiez les modifications avant de valider.</p>
                        </div>

                        <div className="divider" />

                        <div className="col gap-sm">
                            {approList.map(item => (
                                <div key={item.name} className="row align-center justify-between">
                                    <span className="text-body weight-medium">{item.name}</span>
                                    <div className="row align-center gap-sm">
                                        <span className="badge badge-warning">{item.prev_qte}</span>
                                        <span className="text-secondary">→</span>
                                        <span className="badge badge-success">{item.next_qte}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="divider" />

                        <div className="row gap-md">
                            <button
                                className="btn btn-ghost w-full justify-center"
                                onClick={() => setShowConfirm(false)}
                            >
                                Annuler
                            </button>
                            <button
                                className={`btn btn-primary w-full justify-center${submitting ? ' opacity-75 not-allowed' : ''}`}
                                onClick={submitAppro}
                                disabled={submitting}
                            >
                                {submitting ? '…' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}