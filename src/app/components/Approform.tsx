const backendUrl = 'https://backend-nana-v2.onrender.com';

async function createDataToTable( fields: object) {
    const response = await fetch(backendUrl + '/appro/create/' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
    });
    const data = await response.json();
    return data;
}

const getDataFromTableWithConstraints = async (table: string, body: object) => {
    const res = await fetch(backendUrl + '/crud/getwith/' + table, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(data);
    return data;
};

const user = JSON.parse(localStorage.getItem('user') || 'null');
const connected = localStorage.getItem('connected');

import { useState, useEffect } from 'react';
import '../css/form.css';
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';
import OfficeSelector from './Office-selector';

type onCloseProps = { onclose: (s: boolean) => void };

export default function Appro({ onclose }: onCloseProps) {
    const navigate = useNavigate();

    useEffect(() => {
        if (!connected || !user) {
            localStorage.removeItem('user');
            localStorage.removeItem('connected');
            navigate('/login');
        }
    }, [connected, user, navigate]);

    type Stock = { name: string; qte: number };
    type ApproItem = { name: string; add_qte: number; prev_qte: number; next_qte: number, manager:string, office:string };
    type FetchData = { success: boolean; list: Stock[] };

    // FIX: start with an empty array — no dummy data
    const [stockActuel, setStockActuel] = useImmer<Stock[]>([]);
    const [approList, setApproList] = useImmer<ApproItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [highlighted, setHighlighted] = useState<string[]>([]);
    const [selectedOffice, setSelectedOffice] = useState('');
    const [errors, setErrors] = useImmer('');

    // FIX: boolean, not a function call in JSX
    const showOfficeSelector =
        user.role === 'superuser' || user.owner === true;

    // FIX: clear stale stock before fetching; guard against empty selectedOffice
    useEffect(() => {
        if (!selectedOffice) return;

        const fetchdata = async () => {
            setLoading(true);
            // Clear previous stock so old items don't linger
            setStockActuel(() => []);
            // Reset the appro list for the new office
            setApproList(() => []);

            const field = {
                fields: ['name', 'qte'],
                constraints: { office: selectedOffice },
            };
            try {
                const data: FetchData = await getDataFromTableWithConstraints('stock', field);
                if (!data.success || data.list.length === 0) {
                    setStockActuel(() => []);
                    return;
                }
                // FIX: replace content, don't push on top of leftovers
                setStockActuel(() => data.list);
            } catch (error) {
                setErrors('Erreur lors du chargement du stock : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
            } finally {
                setLoading(false);
                setTimeout(() => {
                    setErrors('');
                }, 3000);
            }
        };

        fetchdata();
    }, [selectedOffice]);

    const handleChange = (name: string, value: string) => {
        const add = Number(value);
        if (isNaN(add) || add <= 0) return;
        const stockItem = stockActuel.find((p) => p.name === name);
        if (!stockItem) return;
        setApproList((draft) => {
            const existing = draft.find((p) => p.name === name);
            if (existing) {
                existing.add_qte = add;
                existing.next_qte = stockItem.qte + add;
            } else {
                draft.push({ name, add_qte: add, prev_qte: stockItem.qte, next_qte: stockItem.qte + add, manager: user.id, office: selectedOffice || user.office });
            }
        });
    };

    const hasChanges = approList.some((p) => p.add_qte > 0);

    const submitAppro = async () => {
        setSubmitting(true);
        try {
            console.log(approList)
            // FIX: use selectedOffice (reflects the office picker), not the stale user.office
            const appro = await createDataToTable({
                approList
            });
            if (appro.success) {
                setStockActuel((draft) => {
                    approList.forEach((a) => {
                        const item = draft.find((p) => p.name === a.name);
                        if (item) item.qte = a.next_qte;
                    });
                });
                setHighlighted(approList.map((a) => a.name));
                setApproList(() => []);
                setShowConfirm(false);
                setTimeout(() => setHighlighted([]), 2000);
            }else{
                setErrors('Erreur lors de l\'approvisionnement : ' + (appro.message || 'Erreur inconnue'));
            }
            
        } catch (error) {
            setErrors('Erreur lors du chargement du stock : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
        } finally {
            setSubmitting(false);
            setTimeout(() => {
                setErrors('');
            }, 3000);
        }
    };

    const getStockBadgeClass = (qte: number) => {
        if (qte === 0) return 'badge badge-danger';
        if (qte < 10) return 'badge badge-warning';
        return 'badge badge-success';
    };

    return (
        <main className="main" data-style="neuro" data-mode="light">
            <div className="surface col gap-sm" style={{ width: '100%' }}>
                {/* ERROR TOAST */}
                {errors && (
                    <div
                        className="row align-center justify-center"
                        style={{ position: 'fixed', bottom: '4rem', left: '60%', transform: 'translateX(-50%)', zIndex: 800 }}
                    >
                        <span className="badge badge-danger">{errors}</span>
                    </div>
                )}

                {/* HEADER */}
                <div className="row align-center justify-between">
                    <div className="col gap-xs">
                        <h2 className="text-heading text-xl">Approvisionnement</h2>
                        <p className="text-body text-sm">Ajoutez les quantités à réapprovisionner.</p>
                    </div>
                    {showOfficeSelector && (
                        <OfficeSelector
                            onOfficeSelect={(officeName) => {
                                // FIX: no comma operator; two proper statements
                                setSelectedOffice(officeName);
                                console.log('selected office', officeName);
                            }}
                        />
                    )}
                    <button className="btn" onClick={() => onclose?.(true)}>
                        back
                    </button>
                </div>

                <div className="divider" />

                {/* TABLE HEADER */}
                <div
                    className="row align-center"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}
                >
                    <span className="text-label">Produit</span>
                    <span className="text-label text-center">Stock actuel</span>
                    <span className="text-label text-center">Quantité à ajouter</span>
                </div>

                {/* ROWS */}
                {loading ? (
                    <p className="text-body text-sm">Chargement du stock…</p>
                ) : stockActuel.length === 0 && selectedOffice ? (
                    <p className="text-body text-sm">Aucun stock disponible pour ce bureau.</p>
                ) : (
                    <div className="col gap-md" style={{ overflow: 'auto' }}>
                        {stockActuel.map((produit) => {
                            const appro = approList.find((a) => a.name === produit.name);
                            const isHighlighted = highlighted.includes(produit.name);

                            return (
                                <div
                                    key={produit.name}
                                    className="surface-inset row align-center"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr',
                                        transition: 'background 0.4s',
                                        ...(isHighlighted
                                            ? { background: 'rgba(13,242,97,0.08)' }
                                            : {}),
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
                )}

                <div className="divider" />

                {/* ACTION */}
                <button
                    className={`btn btn-primary w-full justify-center${
                        !hasChanges || submitting ? ' opacity-50 not-allowed' : ''
                    }`}
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
                            <p className="text-body text-sm">
                                Vérifiez les modifications avant de valider.
                            </p>
                        </div>

                        <div className="divider" />

                        <div className="col gap-sm">
                            {approList.map((item) => (
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
                                className={`btn btn-primary w-full justify-center${
                                    submitting ? ' opacity-75 not-allowed' : ''
                                }`}
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