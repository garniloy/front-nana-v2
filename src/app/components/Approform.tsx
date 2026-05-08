const backendUrl = 'https://backend-nana-v2.onrender.com';
//const backendUrl = 'http://localhost:3000';

async function createDataToTable(fields: object) {
    const response = await fetch(backendUrl + '/appro/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
    });
    return response.json();
}

async function transferStock(fields: object) {
    const response = await fetch(backendUrl + '/appro/transfer', {
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



import { useState, useEffect } from 'react';
import '../css/form.css';
import { useNavigate } from 'react-router-dom';
import { useImmer } from 'use-immer';
import OfficeSelector from './Office-selector';

type onCloseProps = { onclose: (s: boolean) => void };

export default function Appro({ onclose }: onCloseProps) {
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

    type Stock = { name: string; qte: number };
    type ApproItem = {
        name: string;
        add_qte: number;
        prev_qte: number;
        next_qte: number;
        manager: string;
        office: string;
    };
    type TransferItem = {
        name: string;
        transfer_qte: number;
        prev_qte: number;
        next_qte: number;
        manager: string;
    };
    type FetchData = { success: boolean; list: Stock[] };

    // ── mode : 'appro' | 'transfer'
    const [mode, setMode] = useState<'appro' | 'transfer'>('appro');

    const [stockActuel, setStockActuel] = useImmer<Stock[]>([]);
    const [approList, setApproList] = useImmer<ApproItem[]>([]);
    const [transferList, setTransferList] = useImmer<TransferItem[]>([]);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [highlighted, setHighlighted] = useState<string[]>([]);
    const [selectedOffice, setSelectedOffice] = useState('');
    const [targetOffice, setTargetOffice] = useState('');
    const [errors, setErrors] = useImmer('');

    const canTransfer = user?.role === 'superuser' || user?.owner === true;
    const showOfficeSelector = canTransfer;

    // Source office : pour un appro classique c'est l'office du user (sauf superuser/owner).
    const sourceOffice = user.owner || user.role === 'superuser' ? selectedOffice : user.office;

    // ── Charge le stock dès que le bureau source change
    useEffect(() => {
        if (!sourceOffice) return;

        const fetchdata = async () => {
            setLoading(true);
            setStockActuel(() => []);
            setApproList(() => []);
            setTransferList(() => []);

            const field = {
                fields: ['name', 'qte'],
                constraints: { office: sourceOffice },
            };
            try {
                const data: FetchData = await getDataFromTableWithConstraints('stock', field);
                if (!data.success || data.list.length === 0) {
                    setStockActuel(() => []);
                    return;
                }
                setStockActuel(() => data.list);
            } catch (error) {
                showError('Erreur lors du chargement du stock : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
            } finally {
                setLoading(false);
            }
        };

        fetchdata();
    }, [sourceOffice]);

    // ── Reset les listes quand on change de mode
    useEffect(() => {
        setApproList(() => []);
        setTransferList(() => []);
        setTargetOffice('');
    }, [mode]);

    const showError = (msg: string) => {
        setErrors(msg);
        setTimeout(() => setErrors(''), 3500);
    };

    // ── Handlers appro
    const handleApproChange = (name: string, value: string) => {
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
                draft.push({
                    name,
                    add_qte: add,
                    prev_qte: stockItem.qte,
                    next_qte: stockItem.qte + add,
                    manager: user.id,
                    office: sourceOffice,
                });
            }
        });
    };

    // ── Handlers transfert
    const handleTransferChange = (name: string, value: string) => {
        const qte = Number(value);
        if (isNaN(qte) || qte <= 0) return;
        const stockItem = stockActuel.find((p) => p.name === name);
        if (!stockItem) return;

        // Validation côté client : ne pas dépasser le stock disponible
        if (qte > stockItem.qte) {
            showError(`Stock insuffisant pour "${name}" : disponible ${stockItem.qte}`);
            return;
        }

        setTransferList((draft) => {
            const existing = draft.find((p) => p.name === name);
            if (existing) {
                existing.transfer_qte = qte;
                existing.next_qte = stockItem.qte - qte;
            } else {
                draft.push({
                    name,
                    transfer_qte: qte,
                    prev_qte: stockItem.qte,
                    next_qte: stockItem.qte - qte,
                    manager: user.id,
                });
            }
        });
    };

    const hasChanges =
        mode === 'appro'
            ? approList.some((p) => p.add_qte > 0)
            : transferList.some((p) => p.transfer_qte > 0) && !!targetOffice;

    // ── Submit appro
    const submitAppro = async () => {
        setSubmitting(true);
        console.log(sourceOffice, approList)
        try {
            const appro = await createDataToTable({ approList });
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
            } else {
                showError("Erreur lors de l'approvisionnement : " + (appro.message || 'Erreur inconnue'));
            }
        } catch (error) {
            showError('Erreur : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
        } finally {
            setSubmitting(false);
        }
    };

    // ── Submit transfert
    const submitTransfer = async () => {
        if (targetOffice === sourceOffice) {
            showError('Le bureau cible ne peut pas être le même que le bureau source.');
            return;
        }
        setSubmitting(true);
        try {
            const result = await transferStock({
                transferList,
                sourceOffice,
                targetOffice,
            });
            if (result.success) {
                // Met à jour le stock affiché (bureau source se vide)
                setStockActuel((draft) => {
                    transferList.forEach((t) => {
                        const item = draft.find((p) => p.name === t.name);
                        if (item) item.qte = t.next_qte;
                    });
                });
                setHighlighted(transferList.map((t) => t.name));
                setTransferList(() => []);
                setShowConfirm(false);
                setTimeout(() => setHighlighted([]), 2000);
            } else {
                showError('Erreur lors du transfert : ' + (result.message || result.error?.message || 'Erreur inconnue'));
            }
        } catch (error) {
            showError('Erreur : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
        } finally {
            setSubmitting(false);
        }
    };

    const getStockBadgeClass = (qte: number) => {
        if (qte === 0) return 'badge badge-danger';
        if (qte < 10) return 'badge badge-warning';
        return 'badge badge-success';
    };

    //const activeList = mode === 'appro' ? approList : transferList;

    return (
        <main className="main" data-style="neuro" data-mode="light" style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="surface col gap-sm" style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                        <h2 className="text-heading text-xl">
                            {mode === 'appro' ? 'Approvisionnement' : 'Transfert de stock'}
                        </h2>
                        <p className="text-body text-sm">
                            {mode === 'appro'
                                ? 'Ajoutez les quantités à réapprovisionner.'
                                : 'Transférez des produits vers un autre bureau.'}
                        </p>
                    </div>

                    <div className="row gap-sm align-center">
                        {/* Toggle mode (superuser / owner seulement) */}
                        {canTransfer && (
                            <div className="row gap-xs">
                                <button
                                    className={`btn btn-sm${mode === 'appro' ? ' btn-primary' : ' btn-ghost'}`}
                                    onClick={() => setMode('appro')}
                                >
                                    Appro
                                </button>
                                <button
                                    className={`btn btn-sm${mode === 'transfer' ? ' btn-primary' : ' btn-ghost'}`}
                                    onClick={() => setMode('transfer')}
                                >
                                    ⇄ Transfert
                                </button>
                            </div>
                        )}

                        {showOfficeSelector && (
                            <OfficeSelector
                                onOfficeSelect={(officeName) => {
                                    setSelectedOffice(officeName);
                                }}
                            />
                        )}

                        <button className="btn" onClick={() => onclose?.(true)}>
                            back
                        </button>
                    </div>
                </div>

                {/* SÉLECTION DU BUREAU CIBLE (mode transfert uniquement) */}
                {mode === 'transfer' && (
                    <div className="surface-inset row align-center gap-md" style={{ padding: '0.75rem 1rem' }}>
                        <span className="text-label" style={{ whiteSpace: 'nowrap' }}>
                            Bureau source :
                        </span>
                        <span className="badge badge-warning">{sourceOffice || '—'}</span>

                        <span className="text-secondary" style={{ fontSize: '1.2rem' }}>→</span>

                        <span className="text-label" style={{ whiteSpace: 'nowrap' }}>
                            Bureau cible :
                        </span>
                        {/* On réutilise OfficeSelector en filtrant le bureau source */}
                        <OfficeSelector
                            onOfficeSelect={(officeName) => {
                                if (officeName === sourceOffice) {
                                    showError('Impossible de transférer vers le même bureau.');
                                    return;
                                }
                                setTargetOffice(officeName);
                            }}
                        />
                        {targetOffice && (
                            <span className="badge badge-success">{targetOffice}</span>
                        )}
                    </div>
                )}

                <div className="divider" />

                {/* TABLE HEADER */}
                <div
                    className="row align-center"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}
                >
                    <span className="text-label">Produit</span>
                    <span className="text-label text-center">Stock actuel</span>
                    <span className="text-label text-center">
                        {mode === 'appro' ? 'Quantité à ajouter' : 'Quantité à transférer'}
                    </span>
                </div>

                {/* ROWS */}
                {loading ? (
                    <p className="text-body text-sm">Chargement du stock…</p>
                ) : stockActuel.length === 0 && sourceOffice ? (
                    <p className="text-body text-sm">Aucun stock disponible pour ce bureau.</p>
                ) : (
                    <div className="col gap-md" style={{ overflow: 'auto' }}>
                        {stockActuel.map((produit) => {
                            const approItem = approList.find((a) => a.name === produit.name);
                            const transferItem = transferList.find((t) => t.name === produit.name);
                            const isHighlighted = highlighted.includes(produit.name);

                            const currentValue =
                                mode === 'appro'
                                    ? approItem?.add_qte || ''
                                    : transferItem?.transfer_qte || '';

                            const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
                                mode === 'appro'
                                    ? handleApproChange(produit.name, e.target.value)
                                    : handleTransferChange(produit.name, e.target.value);

                            return (
                                <div
                                    key={produit.name}
                                    className="surface-inset row align-center"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr 1fr',
                                        transition: 'background 0.4s',
                                        ...(isHighlighted ? { background: 'rgba(13,242,97,0.08)' } : {}),
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
                                            min={1}
                                            max={mode === 'transfer' ? produit.qte : undefined}
                                            style={{ width: '6rem', textAlign: 'center' }}
                                            value={currentValue}
                                            onChange={onChange}
                                            // En mode transfert, désactiver si stock = 0
                                            disabled={mode === 'transfer' && produit.qte === 0}
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
                    onClick={() => {
                        if (mode === 'transfer' && !targetOffice) {
                            showError('Veuillez sélectionner un bureau cible.');
                            return;
                        }
                        setShowConfirm(true);
                    }}
                >
                    {mode === 'appro' ? 'Approvisionner' : 'Transférer'}
                </button>
            </div>

            {/* CONFIRM MODAL */}
            {showConfirm && (
                <div className="overlay">
                    <div className="modal col gap-lg">
                        <div className="col gap-xs">
                            <h3 className="text-heading text-xl">
                                {mode === 'appro'
                                    ? "Confirmer l'approvisionnement"
                                    : 'Confirmer le transfert'}
                            </h3>
                            <p className="text-body text-sm">
                                {mode === 'appro'
                                    ? 'Vérifiez les modifications avant de valider.'
                                    : (
                                        <>
                                            Transfert de{' '}
                                            <strong>{sourceOffice}</strong>
                                            {' → '}
                                            <strong>{targetOffice}</strong>
                                        </>
                                    )}
                            </p>
                        </div>

                        <div className="divider" />

                        <div className="col gap-sm">
                            {mode === 'appro'
                                ? approList.map((item) => (
                                    <div key={item.name} className="row align-center justify-between">
                                        <span className="text-body weight-medium">{item.name}</span>
                                        <div className="row align-center gap-sm">
                                            <span className="badge badge-warning">{item.prev_qte}</span>
                                            <span className="text-secondary">→</span>
                                            <span className="badge badge-success">{item.next_qte}</span>
                                        </div>
                                    </div>
                                ))
                                : transferList.map((item) => (
                                    <div key={item.name} className="row align-center justify-between">
                                        <span className="text-body weight-medium">{item.name}</span>
                                        <div className="row align-center gap-sm">
                                            {/* Stock bureau source : avant → après */}
                                            <div className="col gap-xs" style={{ alignItems: 'flex-end' }}>
                                                <span className="text-label" style={{ fontSize: '0.65rem' }}>{sourceOffice}</span>
                                                <div className="row align-center gap-xs">
                                                    <span className="badge badge-warning">{item.prev_qte}</span>
                                                    <span className="text-secondary">→</span>
                                                    <span className="badge badge-danger">{item.next_qte}</span>
                                                </div>
                                            </div>
                                            <span className="text-secondary" style={{ fontSize: '1.1rem', padding: '0 0.25rem' }}>⇄</span>
                                            {/* Quantité ajoutée dans le bureau cible */}
                                            <div className="col gap-xs" style={{ alignItems: 'flex-start' }}>
                                                <span className="text-label" style={{ fontSize: '0.65rem' }}>{targetOffice}</span>
                                                <span className="badge badge-success">+{item.transfer_qte}</span>
                                            </div>
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
                                onClick={mode === 'appro' ? submitAppro : submitTransfer}
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