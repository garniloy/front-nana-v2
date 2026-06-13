// url backend here
const backendUrl = 'https://backend-nana-v2-production.up.railway.app';
//const backendUrl = 'http://localhost:3000';

async function createDataToTable(fields: object) {
    const response = await fetch(backendUrl + '/appro/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
    });
    return response.json();
}

async function refreshStock(office: string) {
    const response = await fetch(backendUrl + '/stock/actualiser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ office }),
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
    const sourceOffice = user.owner || user.role === 'superuser' ? selectedOffice : user.office;

    useEffect(() => {
        if (!sourceOffice) return;
        const fetchdata = async () => {
            setLoading(true);
            setStockActuel(() => []);
            setApproList(() => []);
            setTransferList(() => []);
            const field = { fields: ['name', 'qte'], constraints: { office: sourceOffice } };
            try {
                const data: FetchData = await getDataFromTableWithConstraints('stock', field);
                if (!data.success || data.list.length === 0) { setStockActuel(() => []); return; }
                setStockActuel(() => data.list);
            } catch (error) {
                showError('Erreur lors du chargement du stock : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
            } finally {
                setLoading(false);
            }
        };
        fetchdata();
    }, [sourceOffice]);

    useEffect(() => {
        setApproList(() => []);
        setTransferList(() => []);
        setTargetOffice('');
    }, [mode]);

    const showError = (msg: string) => {
        setErrors(msg);
        setTimeout(() => setErrors(''), 3500);
    };

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
                draft.push({ name, add_qte: add, prev_qte: stockItem.qte, next_qte: stockItem.qte + add, manager: user.id, office: sourceOffice });
            }
        });
    };

    const handleTransferChange = (name: string, value: string) => {
        const qte = Number(value);
        if (isNaN(qte) || qte <= 0) return;
        const stockItem = stockActuel.find((p) => p.name === name);
        if (!stockItem) return;
        if (qte > stockItem.qte) { showError(`Stock insuffisant pour "${name}" : disponible ${stockItem.qte}`); return; }
        setTransferList((draft) => {
            const existing = draft.find((p) => p.name === name);
            if (existing) {
                existing.transfer_qte = qte;
                existing.next_qte = stockItem.qte - qte;
            } else {
                draft.push({ name, transfer_qte: qte, prev_qte: stockItem.qte, next_qte: stockItem.qte - qte, manager: user.id });
            }
        });
    };

    const hasChanges =
        mode === 'appro'
            ? approList.some((p) => p.add_qte > 0)
            : transferList.some((p) => p.transfer_qte > 0) && !!targetOffice;

    const submitAppro = async () => {
        setSubmitting(true);
        try {
            const appro = await createDataToTable({ approList });
            if (appro.success) {
                setStockActuel((draft) => { approList.forEach((a) => { const item = draft.find((p) => p.name === a.name); if (item) item.qte = a.next_qte; }); });
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

    const submitTransfer = async () => {
        if (targetOffice === sourceOffice) { showError('Le bureau cible ne peut pas être le même que le bureau source.'); return; }
        setSubmitting(true);
        try {
            const result = await transferStock({ transferList, sourceOffice, targetOffice });
            if (result.success) {
                setStockActuel((draft) => { transferList.forEach((t) => { const item = draft.find((p) => p.name === t.name); if (item) item.qte = t.next_qte; }); });
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

    return (
        <>
        <style>{`
            /* ── Appro responsive wrapper ── */
            .appro-wrap {
                position: absolute;
                inset: 0;
                margin: 0 !important;
                width: 100% !important;
                height: 100% !important;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .appro-inner {
                width: 100%;
                height: 100%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                padding: 1rem;
                box-sizing: border-box;
            }

            /* ── Header ── */
            .appro-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 0.75rem;
                flex-shrink: 0;
                flex-wrap: wrap;
            }
            .appro-header__info { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
            .appro-header__actions {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0.5rem;
                flex-shrink: 0;
            }
            .appro-mode-toggle { display: flex; gap: 0.25rem; }

            /* ── Transfer bar ── */
            .appro-transfer-bar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0.65rem;
                padding: 0.65rem 0.85rem;
                flex-shrink: 0;
                border-radius: var(--radius-xl);
            }
            .appro-transfer-bar__arrow {
                font-size: 1.1rem;
                flex-shrink: 0;
            }

            /* ── Table header ── */
            .appro-table-head {
                display: grid;
                grid-template-columns: 1fr 80px 100px;
                gap: 0.5rem;
                padding: 0 0.1rem;
                flex-shrink: 0;
            }
            .appro-table-head span { font-size: 0.68rem; }

            /* ── Stock rows ── */
            .appro-rows { overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; }
            .appro-rows::-webkit-scrollbar { width: 4px; }
            .appro-rows::-webkit-scrollbar-thumb { background: var(--nm-dark, rgba(163,177,198,0.6)); border-radius: 99px; }

            .appro-row {
                display: grid;
                grid-template-columns: 1fr 80px 100px;
                gap: 0.5rem;
                align-items: center;
                padding: 0.6rem 0.75rem;
                border-radius: var(--radius-xl);
                transition: background 0.4s;
            }
            .appro-row__name {
                font-size: 0.88rem;
                font-weight: 500;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .appro-row__badge { display: flex; justify-content: center; }
            .appro-row__input { display: flex; justify-content: center; }
            .appro-row input.input {
                width: 5.5rem;
                text-align: center;
                padding: 0.35rem 0.5rem;
                font-size: 0.88rem;
            }

            /* ── Action button ── */
            .appro-action { flex-shrink: 0; }

            /* ── Error toast ── */
            .appro-toast {
                position: fixed;
                bottom: 5rem;
                left: 50%;
                transform: translateX(-50%);
                z-index: 800;
                white-space: nowrap;
            }

            /* ── Confirm modal mobile ── */
            .appro-modal-scroll {
                max-height: 55vh;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }

            /* ════════════════════════════
               MOBILE ≤ 640px
               ════════════════════════════ */
            @media (max-width: 640px) {
                .appro-inner { padding: 0.75rem; gap: 0.6rem; }

                .appro-header { flex-direction: column; gap: 0.6rem; }
                .appro-header__actions { width: 100%; justify-content: space-between; }
                .appro-mode-toggle { flex: 1; }
                .appro-mode-toggle .btn { flex: 1; justify-content: center; font-size: 0.78rem; }

                .appro-transfer-bar { gap: 0.4rem; padding: 0.55rem 0.75rem; }
                .appro-transfer-bar__arrow { display: none; }

                /* Mobile stock row: name full width, badge + input side by side below */
                .appro-table-head {
                    grid-template-columns: 1fr 70px 90px;
                    gap: 0.35rem;
                }
                .appro-row {
                    grid-template-columns: 1fr 70px 90px;
                    gap: 0.35rem;
                    padding: 0.55rem 0.65rem;
                }
                .appro-row input.input {
                    width: 4.5rem;
                    font-size: 0.82rem;
                    padding: 0.3rem 0.4rem;
                }
                .appro-row__name { font-size: 0.82rem; }
            }

            @media (max-width: 420px) {
                /* Stack to 2 rows: name on top, badge + input on bottom */
                .appro-table-head {
                    grid-template-columns: 1fr;
                }
                .appro-table-head span:not(:first-child) { display: none; }

                .appro-row {
                    grid-template-columns: 1fr;
                    grid-template-rows: auto auto;
                    gap: 0.4rem;
                    padding: 0.65rem 0.75rem;
                }
                .appro-row__badge { justify-content: flex-start; }
                .appro-row__input { justify-content: flex-start; }
                .appro-row__meta {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                }
                .appro-row input.input { width: 5rem; }
            }
        `}</style>

        <div className="appro-wrap" data-style="neuro" data-mode="light">
            {/* ERROR TOAST */}
            {errors && (
                <div className="appro-toast">
                    <span className="badge badge-danger">{errors}</span>
                </div>
            )}

            <div className="surface appro-inner">
                {/* ── HEADER ── */}
                <div className="appro-header">
                    <div className="appro-header__info">
                        <h2 className="text-heading text-xl">
                            {mode === 'appro' ? 'Approvisionnement' : 'Transfert de stock'}
                        </h2>
                        <p className="text-body text-sm">
                            {mode === 'appro'
                                ? 'Ajoutez les quantités à réapprovisionner.'
                                : 'Transférez des produits vers un autre bureau.'}
                        </p>
                    </div>

                    <div className="appro-header__actions">
                        {canTransfer && (
                            <div className="appro-mode-toggle">
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
                            <OfficeSelector onOfficeSelect={(officeName) => setSelectedOffice(officeName)} />
                        )}

                        <button
                            className="btn btn-sm"
                            disabled={!sourceOffice || loading}
                            onClick={async () => {
                                if (!sourceOffice) { showError('Veuillez sélectionner un bureau.'); return; }
                                try {
                                    setLoading(true);
                                    const result = await refreshStock(sourceOffice);
                                    if (!result.success) { showError(result.error || 'Erreur lors de la synchronisation du stock.'); return; }
                                    const field = { fields: ['name', 'qte'], constraints: { office: sourceOffice } };
                                    const data: FetchData = await getDataFromTableWithConstraints('stock', field);
                                    if (data.success) setStockActuel(() => data.list || []);
                                } catch (error) {
                                    showError('Erreur lors de la synchronisation : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            ↻ Actualiser
                        </button>

                        <button className="btn btn-sm" onClick={() => onclose?.(true)}>✕</button>
                    </div>
                </div>

                {/* ── TRANSFER BAR ── */}
                {mode === 'transfer' && (
                    <div className="surface-inset appro-transfer-bar">
                        <span className="text-label" style={{ whiteSpace: 'nowrap' }}>Source :</span>
                        <span className="badge badge-warning">{sourceOffice || '—'}</span>
                        <span className="appro-transfer-bar__arrow text-secondary">→</span>
                        <span className="text-label" style={{ whiteSpace: 'nowrap' }}>Cible :</span>
                        <OfficeSelector
                            onOfficeSelect={(officeName) => {
                                if (officeName === sourceOffice) { showError('Impossible de transférer vers le même bureau.'); return; }
                                setTargetOffice(officeName);
                            }}
                        />
                        {targetOffice && <span className="badge badge-success">{targetOffice}</span>}
                    </div>
                )}

                <div className="divider" />

                {/* ── TABLE HEADER ── */}
                <div className="appro-table-head">
                    <span className="text-label">Produit</span>
                    <span className="text-label text-center">Stock</span>
                    <span className="text-label text-center">
                        {mode === 'appro' ? 'À ajouter' : 'À transférer'}
                    </span>
                </div>

                {/* ── ROWS ── */}
                {loading ? (
                    <p className="text-body text-sm">Chargement du stock…</p>
                ) : stockActuel.length === 0 && sourceOffice ? (
                    <p className="text-body text-sm">Aucun stock disponible pour ce bureau.</p>
                ) : !sourceOffice ? (
                    <p className="text-body text-sm" style={{ opacity: 0.6 }}>Sélectionnez un bureau pour voir le stock.</p>
                ) : (
                    <div className="appro-rows">
                        <div className="col gap-sm">
                            {stockActuel.map((produit) => {
                                const approItem = approList.find((a) => a.name === produit.name);
                                const transferItem = transferList.find((t) => t.name === produit.name);
                                const isHighlighted = highlighted.includes(produit.name);
                                const currentValue =
                                    mode === 'appro' ? approItem?.add_qte || '' : transferItem?.transfer_qte || '';
                                const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
                                    mode === 'appro'
                                        ? handleApproChange(produit.name, e.target.value)
                                        : handleTransferChange(produit.name, e.target.value);

                                return (
                                    <div
                                        key={produit.name}
                                        className="surface-inset appro-row"
                                        style={isHighlighted ? { background: 'rgba(13,242,97,0.08)' } : {}}
                                    >
                                        <p className="appro-row__name text-body weight-medium">{produit.name}</p>
                                        <div className="appro-row__badge">
                                            <span className={getStockBadgeClass(produit.qte)}>{produit.qte}</span>
                                        </div>
                                        <div className="appro-row__input">
                                            <input
                                                className="input"
                                                type="number"
                                                min={1}
                                                max={mode === 'transfer' ? produit.qte : undefined}
                                                value={currentValue}
                                                onChange={onChange}
                                                disabled={mode === 'transfer' && produit.qte === 0}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="divider" />

                {/* ── ACTION ── */}
                <button
                    className={`btn btn-primary w-full justify-center appro-action${!hasChanges || submitting ? ' opacity-50 not-allowed' : ''}`}
                    disabled={!hasChanges || submitting}
                    onClick={() => {
                        if (mode === 'transfer' && !targetOffice) { showError('Veuillez sélectionner un bureau cible.'); return; }
                        setShowConfirm(true);
                    }}
                >
                    {mode === 'appro' ? 'Approvisionner' : 'Transférer'}
                </button>
            </div>
        </div>

        {/* ── CONFIRM MODAL ── */}
        {showConfirm && (
            <div className="overlay">
                <div className="modal col gap-lg" style={{ maxHeight: '90dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="col gap-xs" style={{ flexShrink: 0 }}>
                        <h3 className="text-heading text-xl">
                            {mode === 'appro' ? "Confirmer l'approvisionnement" : 'Confirmer le transfert'}
                        </h3>
                        <p className="text-body text-sm">
                            {mode === 'appro'
                                ? 'Vérifiez les modifications avant de valider.'
                                : <><strong>{sourceOffice}</strong>{' → '}<strong>{targetOffice}</strong></>}
                        </p>
                    </div>

                    <div className="divider" style={{ flexShrink: 0 }} />

                    <div className="appro-modal-scroll col gap-sm">
                        {mode === 'appro'
                            ? approList.map((item) => (
                                <div key={item.name} className="row align-center justify-between" style={{ gap: '0.5rem' }}>
                                    <span className="text-body weight-medium" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                    <div className="row align-center gap-sm" style={{ flexShrink: 0 }}>
                                        <span className="badge badge-warning">{item.prev_qte}</span>
                                        <span className="text-secondary">→</span>
                                        <span className="badge badge-success">{item.next_qte}</span>
                                    </div>
                                </div>
                            ))
                            : transferList.map((item) => (
                                <div key={item.name} className="row align-center justify-between" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span className="text-body weight-medium" style={{ flex: 1, minWidth: '8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                    <div className="row align-center gap-sm" style={{ flexShrink: 0 }}>
                                        <div className="col gap-xs" style={{ alignItems: 'flex-end' }}>
                                            <span className="text-label" style={{ fontSize: '0.62rem' }}>{sourceOffice}</span>
                                            <div className="row align-center gap-xs">
                                                <span className="badge badge-warning">{item.prev_qte}</span>
                                                <span className="text-secondary">→</span>
                                                <span className="badge badge-danger">{item.next_qte}</span>
                                            </div>
                                        </div>
                                        <span className="text-secondary" style={{ fontSize: '1.1rem', padding: '0 0.15rem' }}>⇄</span>
                                        <div className="col gap-xs" style={{ alignItems: 'flex-start' }}>
                                            <span className="text-label" style={{ fontSize: '0.62rem' }}>{targetOffice}</span>
                                            <span className="badge badge-success">+{item.transfer_qte}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>

                    <div className="divider" style={{ flexShrink: 0 }} />

                    <div className="row gap-md" style={{ flexShrink: 0 }}>
                        <button className="btn btn-ghost w-full justify-center" onClick={() => setShowConfirm(false)}>Annuler</button>
                        <button
                            className={`btn btn-primary w-full justify-center${submitting ? ' opacity-75 not-allowed' : ''}`}
                            onClick={mode === 'appro' ? submitAppro : submitTransfer}
                            disabled={submitting}
                        >
                            {submitting ? '…' : 'Confirmer'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}