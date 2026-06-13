import { useState, useEffect, useCallback } from 'react';

const backendUrl = 'https://backend-nana-v2-production.up.railway.app';
//const backendUrl = 'http://localhost:3000';

const getDataFromTableWithConstraints = async (table: string, body: object) => {
    const res = await fetch(backendUrl + '/crud/getwith/' + table, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
};

const updateDataInTable = async (table: string, fields: object, constraints: object) => {
    const body = { set: fields, where: constraints };
    const res = await fetch(backendUrl + '/crud/update/' + table, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
};

type ActivityDetail = {
    nb_prod: number;
    nb_serv: number;
    alements: { name: string; type: string; qty: number; total: number; benef: number; pv: number; commission: number | null }[];
    sellerName: string;
    clientName: string;
    commission: number;
};

type Activity = {
    id: string;
    seller: string;
    client: string;
    payment_mode: string;
    clientKind: string;
    total_amount: number;
    total_benefice: number;
    office: string;
    date: string;
    bill_sent: boolean;
    total_pv: number;
    details: ActivityDetail;
    waiting_reglement: boolean;
    date_reglement: string | null;
    issue: string;
};

type Filter = 'today' | 'week' | 'month';

const FILTERS: { label: string; value: Filter }[] = [
    { label: "Aujourd'hui", value: 'today' },
    { label: 'Cette semaine', value: 'week' },
    { label: 'Ce mois', value: 'month' },
];

const PENDING_MODES = ['attente_paiement', 'paiement_livraison'];

function isPendingMode(mode: string) {
    return PENDING_MODES.includes(mode);
}

function paymentLabel(mode: string) {
    if (mode === 'attente_paiement') return 'En attente';
    if (mode === 'paiement_livraison') return 'À la livraison';
    if (mode === 'not_valid') return 'Annulé';
    return mode;
}

function paymentBadgeClass(waiting: boolean) {
    if (waiting) return 'badge badge-danger';
    return 'badge badge-success';
}

function filterActivities(activities: Activity[], filter: Filter): Activity[] {
    const now = new Date();
    return activities.filter((a) => {
        const d = new Date(a.date);
        if (filter === 'today') return d.toDateString() === now.toDateString();
        if (filter === 'week') {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            return d >= start && d <= now;
        }
        if (filter === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
    });
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatAmount(n: number) {
    return n.toLocaleString('fr-FR') + ' FCFA';
}

function getInitials(name: string) {
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

type props = {
    office: string;
};

export default function Bills({ office }: props) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [filter, setFilter] = useState<Filter>('today');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [validating, setValidating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [successId, setSuccessId] = useState<string | null>(null);
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const canDelete = user?.owner === true || user?.role === 'superuser';

    useEffect(() => {
        async function fetchActivities() {
            setLoading(true);
            const field = { contraints: { office: office } };
            try {
                const res = await getDataFromTableWithConstraints('activity', field);
                setActivities(res.list ?? res ?? []);
            } catch {
                setError('Impossible de charger les factures.');
            } finally {
                setLoading(false);
            }
        }
        fetchActivities();
    }, [office]);

    const showError = useCallback((msg: string) => {
        setError(msg);
        setTimeout(() => setError(''), 3500);
    }, []);

    async function downloadBill(activity: Activity) {
        if (downloading) return;
        setDownloading(activity.id);
        try {
            const res = await fetch(
                `${backendUrl}/bill/download/${activity.clientKind}/${activity.id}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activity }),
                }
            );
            if (!res.ok) throw new Error('Échec du téléchargement');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `facture-${activity.client.replace(/\s+/g, '_')}-${activity.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setSuccessId(activity.id);
            setTimeout(() => setSuccessId(null), 2000);
        } catch (e: any) {
            showError(e.message || 'Erreur lors du téléchargement');
        } finally {
            setDownloading(null);
        }
    }

    async function validateReglement(activity: Activity) {
        if (validating) return;
        setValidating(activity.id);
        try {
            const res = await fetch(`${backendUrl}/activity/reglement/${activity.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Erreur serveur');

            setActivities((prev) =>
                prev.map((a) =>
                    a.id === activity.id
                        ? { ...a, waiting_reglement: false, date_reglement: new Date().toISOString(), issue: 'valid' }
                        : a
                )
            );
            setTimeout(() => setSuccessId(null), 2000);
        } catch (e: any) {
            showError(e.message || 'Erreur lors de la validation du règlement');
        } finally {
            setValidating(null);
        }
    }

    async function annulerReglement(activity: Activity) {
        if (validating) return;
        setValidating(activity.id);
        try {
            const res = await fetch(`${backendUrl}/activity/reglement/cancel/${activity.id}/${office}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activity.details.alements),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Erreur serveur');

            setActivities((prev) =>
                prev.map((a) =>
                    a.id === activity.id
                        ? { ...a, waiting_reglement: false, issue: 'canceled' }
                        : a
                )
            );
            setSuccessId(activity.id);
            setTimeout(() => setSuccessId(null), 2000);
        } catch (e: any) {
            showError(e.message || 'Erreur lors de la validation du règlement');
        } finally {
            setValidating(null);
        }
    }

    // ── Supprimer une vente valid : marque issue=deleted + rétablit les stocks produits
    async function deleteActivity(activity: Activity) {
        if (!window.confirm(
            `Supprimer définitivement la vente de "${activity.details.clientName}" ?\n\nLes stocks des produits concernés seront rétablis.`
        )) return;

        setDeleting(activity.id);
        try {
            // 1. Marquer la vente comme supprimée
            const updateRes = await updateDataInTable(
                'activity',
                { issue: 'deleted' },
                { id: activity.id },
            );
            if (updateRes.success === false) throw new Error(updateRes.message || 'Erreur mise à jour vente');

            // 2. Rétablir les stocks pour chaque produit de la vente
            const prodAlements = activity.details.alements.filter((a) => a.type === 'prod');
            for (const alement of prodAlements) {
                // Fetch current stock for this product in this office
                const stockRes = await fetch(backendUrl + '/crud/getwith/stock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fields: ['id', 'ref_prod_serv_id', 'name', 'office', 'qte'],
                        constraints: { name: alement.name, office },
                    }),
                });
                const stockData = await stockRes.json();
                const stockItem = stockData.list?.[0] ?? null;

                if (stockItem) {
                    const newQte = (stockItem.qte ?? 0) + alement.qty;
                    await updateDataInTable(
                        'stock',
                        { qte: newQte },
                        { ref_prod_serv_id: stockItem.ref_prod_serv_id },
                    );
                }
            }

            // 3. Update local state
            setActivities((prev) =>
                prev.map((a) =>
                    a.id === activity.id ? { ...a, issue: 'deleted' } : a
                )
            );
        } catch (e: any) {
            showError(e.message || 'Erreur lors de la suppression de la vente');
        } finally {
            setDeleting(null);
        }
    }

    const filtered = filterActivities(activities, filter);

    const validActivities = filtered.filter((activity) => activity.issue === 'valid');

    const totalAmount = validActivities.reduce((sum, activity) => sum + activity.total_amount, 0);
    const totalBenef = validActivities.reduce((sum, activity) => sum + activity.total_benefice, 0);
    const pendingCount = filtered.filter((a) => a.waiting_reglement).length;
    const deletedCount = filtered.filter((a) => a.issue === 'deleted').length;

    return (
        <div data-style="neuro" data-mode="light" className="col align-center justify-start"
            style={{ height: '100%', overflow: 'hidden' }}>
            <style>{`
        .bills-root { width: 100%; }

        .filter-pill {
          padding: var(--padding-sm);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          background: var(--nm-bg);
          color: var(--nm-text);
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
          transition: var(--transition-all);
          cursor: pointer;
        }
        .filter-pill.active {
          background: var(--nm-brand);
          color: #fff;
          box-shadow: inset 3px 3px 6px rgba(0,0,0,0.2), inset -2px -2px 4px rgba(255,255,255,0.1);
        }
        .filter-pill:not(.active):hover { filter: brightness(0.97); }

        .bill-card {
          background: var(--nm-bg);
          border-radius: var(--radius-2xl);
          padding: var(--padding-lg);
          box-shadow: 6px 6px 12px var(--nm-dark), -6px -6px 12px var(--nm-light);
          transition: var(--transition-shadow);
          display: flex; align-items: center; gap: var(--gap-md);
        }
        .bill-card:hover {
          box-shadow: 8px 8px 16px var(--nm-dark), -8px -8px 16px var(--nm-light);
        }
        .bill-card.pending {
          border-left: 3px solid #ef4444;
        }
        .bill-card.deleted-card {
          border-left: 3px solid #9ca3af;
          opacity: 0.65;
        }
        .bill-card.success-flash {
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light);
        }

        .avatar {
          width: 44px; height: 44px; border-radius: var(--radius-full); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: var(--text-sm); font-weight: var(--weight-semibold);
          color: var(--nm-brand);
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light);
        }
        .avatar.pending { color: #ef4444; }
        .avatar.deleted { color: #9ca3af; }

        .dl-btn {
          width: 40px; height: 40px; border-radius: var(--radius-xl); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: var(--text-base); cursor: pointer;
          background: var(--nm-bg);
          color: var(--nm-text);
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
          transition: var(--transition-all);
        }
        .dl-btn:hover:not(:disabled) {
          box-shadow: 5px 5px 10px var(--nm-dark), -5px -5px 10px var(--nm-light);
          color: var(--nm-brand);
        }
        .dl-btn:active:not(:disabled) {
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light);
        }
        .dl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dl-btn.loading {
          animation: pulse 1s ease-in-out infinite;
          box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light);
        }

        /* ── Delete button ── */
        .delete-btn {
          width: 40px; height: 40px; border-radius: var(--radius-xl); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; cursor: pointer;
          background: var(--nm-bg);
          color: #ef4444;
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
          transition: var(--transition-all);
        }
        .delete-btn:hover:not(:disabled) {
          box-shadow: 5px 5px 10px var(--nm-dark), -5px -5px 10px var(--nm-light);
        }
        .delete-btn:active:not(:disabled) {
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light);
        }
        .delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .delete-btn.loading { animation: pulse 1s ease-in-out infinite; }

        .validate-btn {
          display: inline-flex; align-items: center; gap: 0.3rem;
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: var(--weight-semibold);
          cursor: pointer;
          background: var(--nm-bg);
          color: #16a34a;
          box-shadow: 3px 3px 6px var(--nm-dark), -3px -3px 6px var(--nm-light);
          transition: var(--transition-all);
          white-space: nowrap;
        }
        .validate-btn:hover:not(:disabled) {
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
        }
        .validate-btn:active:not(:disabled) {
          box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light);
        }
        .validate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .validate-btn.loading { animation: pulse 1s ease-in-out infinite; }

        .cancel-v-btn {
          display: inline-flex; align-items: center; gap: 0.3rem;
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: var(--weight-semibold);
          cursor: pointer;
          background: var(--nm-bg);
          color: #ca1c1c;
          box-shadow: 3px 3px 6px var(--nm-dark), -3px -3px 6px var(--nm-light);
          transition: var(--transition-all);
          white-space: nowrap;
        }
        .cancel-v-btn:hover:not(:disabled) {
          box-shadow: 4px 4px 8px var(--nm-dark), -4px -4px 8px var(--nm-light);
        }
        .cancel-v-btn:active:not(:disabled) {
          box-shadow: inset 2px 2px 4px var(--nm-dark), inset -2px -2px 4px var(--nm-light);
        }
        .cancel-v-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cancel-v-btn.loading { animation: pulse 1s ease-in-out infinite; }

        @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }

        .stat-strip { display: flex; gap: var(--gap-md); align-items: stretch; }
        .stat-box {
          flex: 1;
          background: var(--nm-bg);
          border-radius: var(--radius-xl);
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .stat-box.pending-box {
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light),
                      0 0 0 1.5px #ef4444;
        }
        .stat-box.deleted-box {
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light),
                      0 0 0 1.5px #9ca3af;
        }

        .pill-tag {
          display: inline-flex; align-items: center;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          background: var(--nm-bg);
          box-shadow: 2px 2px 4px var(--nm-dark), -2px -2px 4px var(--nm-light);
          color: var(--nm-text);
        }

        /* Deleted pill-tag style */
        .pill-tag.deleted-tag {
          text-decoration: line-through;
          opacity: 0.5;
        }

        .empty-zone {
          padding: var(--space-48) var(--space-16);
          display: flex; flex-direction: column; align-items: center; gap: var(--gap-md);
        }
        .spinner {
          width: 32px; height: 32px; border-radius: var(--radius-full);
          border: 2px solid var(--nm-dark);
          border-top-color: var(--nm-brand);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .error-toast {
          position: fixed; bottom: 2rem; left: 50%;
          transform: translateX(-50%);
          z-index: var(--z-toast);
          animation: slideUp var(--duration-normal) var(--ease-out);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(1rem); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .amount-pending { color: #ef4444; font-weight: var(--weight-semibold); }
        .amount-deleted { color: #9ca3af; text-decoration: line-through; font-size: var(--text-sm); }
      `}</style>

            <div className="bills-root col gap-lg">

                {/* ── Filter pills ── */}
                <div className="row gap-sm">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            className={`filter-pill${filter === f.value ? ' active' : ''}`}
                            onClick={() => setFilter(f.value)}
                            style={{ height: '3rem', display: 'flex', alignItems: 'center' }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* ── Stat strip ── */}
                {!loading && filtered.length > 0 && (
                    <div className="stat-strip" style={{ width: '100%', height: '4rem' }}>
                        <div className="stat-box">
                            <span className="text-label">Factures</span>
                            <span className="text-heading text-xl">{filtered.length}</span>
                        </div>
                        {user.role === 'superuser' && (
                            <div className="stat-box">
                                <span className="text-label">Total</span>
                                <span className="text-heading text-xl">{formatAmount(totalAmount)}</span>
                            </div>
                        )}
                        {user.role === 'superuser' && (
                            <div className="stat-box">
                                <span className="text-label">Bénéfice</span>
                                <span className="text-heading text-xl" style={{ color: 'var(--nm-brand)' }}>
                                    {formatAmount(totalBenef)}
                                </span>
                            </div>
                        )}
                        {pendingCount > 0 && (
                            <div className="stat-box pending-box">
                                <span className="text-label" style={{ color: '#ef4444' }}>En attente</span>
                                <span className="text-heading text-xl" style={{ color: '#ef4444' }}>
                                    {pendingCount}
                                </span>
                            </div>
                        )}
                        {deletedCount > 0 && (
                            <div className="stat-box deleted-box">
                                <span className="text-label" style={{ color: '#9ca3af' }}>Supprimées</span>
                                <span className="text-heading text-xl" style={{ color: '#9ca3af' }}>
                                    {deletedCount}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="divider" />

                {/* ── List ── */}
                {loading ? (
                    <div className="empty-zone">
                        <div className="spinner" />
                        <p className="text-label">Chargement…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-zone">
                        <p className="text-body text-sm">Aucune facture pour cette période.</p>
                    </div>
                ) : (
                    <div className="col gap-sm" style={{ width: '100%', height: '300px', overflow: 'auto', padding: '5px' }}>
                        {filtered.map((activity) => {
                            const isDownloading = downloading === activity.id;
                            const isDeleting = deleting === activity.id;
                            const isValidating = validating === activity.id;
                            const isSuccess = successId === activity.id;
                            const isPending = activity.waiting_reglement;
                            const isDeleted = activity.issue === 'deleted';
                            const isCanceled = activity.issue === 'canceled';

                            return (
                                <div
                                    key={activity.id}
                                    className={`bill-card${isSuccess ? ' success-flash' : ''}${isPending || isCanceled ? ' pending' : ''}${isDeleted ? ' deleted-card' : ''}`}
                                    style={{ width: '100%' }}
                                >
                                    {/* Avatar */}
                                    <div className={`avatar${isPending || isCanceled ? ' pending' : ''}${isDeleted ? ' deleted' : ''}`}>
                                        {getInitials(activity.details.clientName)}
                                    </div>

                                    {/* Info */}
                                    <div className="col" style={{ flex: 1, minWidth: 0, gap: 0 }}>
                                        <span
                                            className="text-heading text-base truncate"
                                            style={isDeleted ? { textDecoration: 'line-through', color: '#9ca3af' } : undefined}
                                        >
                                            {activity.client}
                                        </span>

                                        <div className="row gap-xs align-center wrap">
                                            <span className="text-label">{formatDate(activity.date)}</span>

                                            {isDeleted ? (
                                                <span className="badge" style={{ background: '#f3f4f6', color: '#9ca3af', fontSize: '0.72rem' }}>
                                                    🗑 Supprimée
                                                </span>
                                            ) : isCanceled ? (
                                                <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>
                                                    Annulée
                                                </span>
                                            ) : (
                                                <span className={paymentBadgeClass(isPending)}>
                                                    {paymentLabel(activity.payment_mode)}
                                                </span>
                                            )}

                                            {activity.bill_sent && !isDeleted && (
                                                <span className="badge badge-success">Envoyée</span>
                                            )}
                                        </div>

                                        {/* Montant */}
                                        {user.role === 'superuser' && (
                                            <div className="row gap-sm align-center">
                                                {isDeleted ? (
                                                    <span className="amount-deleted">
                                                        {formatAmount(activity.total_amount)}
                                                    </span>
                                                ) : isPending ? (
                                                    <span className="amount-pending">
                                                        -{formatAmount(activity.total_amount)}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="text-body text-sm weight-semibold">
                                                            {formatAmount(activity.total_amount)}
                                                        </span>
                                                        <span className="text-label" style={{ color: 'var(--nm-brand)' }}>
                                                            +{formatAmount(activity.total_benefice)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Articles */}
                                        <div className="row gap-xs wrap">
                                            {activity.details.alements.slice(0, 3).map((a, i) => (
                                                <span
                                                    key={i}
                                                    className={`pill-tag truncate${isDeleted ? ' deleted-tag' : ''}`}
                                                    style={{ maxWidth: '8rem' }}
                                                >
                                                    {a.name}
                                                </span>
                                            ))}
                                            {activity.details.alements.length > 3 && (
                                                <span className="pill-tag">
                                                    +{activity.details.alements.length - 3}
                                                </span>
                                            )}
                                        </div>

                                        {/* Deleted notice */}
                                        {isDeleted && (
                                            <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0.2rem 0 0' }}>
                                                Stocks rétablis — vente annulée
                                            </p>
                                        )}

                                        {/* Boutons règlement (pending uniquement) */}
                                        {isPending && !isDeleted && (
                                            <div style={{ marginTop: '0.35rem' }}>
                                                <button
                                                    className={`validate-btn${isValidating ? ' loading' : ''}`}
                                                    disabled={!!validating}
                                                    onClick={() => validateReglement(activity)}
                                                >
                                                    {isValidating ? '⏳' : '✓'} Valider le paiement
                                                </button>
                                                <button
                                                    className={`cancel-v-btn${isValidating ? ' loading' : ''}`}
                                                    disabled={!!validating}
                                                    onClick={() => annulerReglement(activity)}
                                                    style={{ marginLeft: '0.45rem' }}
                                                >
                                                    {isValidating ? '⏳' : 'x'} Supprimer la vente
                                                </button>
                                            </div>
                                        )}

                                        {/* Date de règlement */}
                                        {!isPending && isPendingMode(activity.payment_mode) && activity.date_reglement && !isDeleted && (
                                            <span className="text-label" style={{ fontSize: '0.65rem', color: '#16a34a', marginTop: '0.2rem' }}>
                                                ✓ Réglé le {formatDate(activity.date_reglement)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions: Download + Delete */}
                                    <div className="col gap-xs align-center" style={{ flexShrink: 0 }}>
                                        {/* Download */}
                                        <button
                                            className={`dl-btn${isDownloading ? ' loading' : ''}`}
                                            disabled={!!downloading || isDeleted}
                                            onClick={() => downloadBill(activity)}
                                            title={isDeleted ? 'Vente supprimée' : 'Télécharger la facture'}
                                        >
                                            {isSuccess ? '✓' : isDownloading ? '⏳' : '↓'}
                                        </button>

                                        {/* Delete — visible uniquement pour valid, owners/superusers */}
                                        {canDelete && activity.issue === 'valid' && (
                                            <button
                                                className={`delete-btn${isDeleting ? ' loading' : ''}`}
                                                disabled={!!deleting}
                                                onClick={() => deleteActivity(activity)}
                                                title="Supprimer la vente et rétablir les stocks"
                                            >
                                                {isDeleting ? '⏳' : '🗑'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Error toast ── */}
            {error && (
                <div className="error-toast">
                    <span className="badge badge-danger">{error}</span>
                </div>
            )}
        </div>
    );
}