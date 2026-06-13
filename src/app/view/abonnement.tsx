// src/app/view/abonnement.tsx
// ------------------------------------------------------------
// Page d'abonnement — design system neuromorphique
// Wrapper attendu : <body data-style="neuro" data-mode="dark|light">
// ------------------------------------------------------------
import  { useEffect, useState } from 'react';
import { useSubscriptionStore } from '../../hooks/useSubscriptionStore';
import PaymentModal from '../components/PaymentModal';
import '../../css/subscription.css';
import '../css/form.css';

function getStoredOwnerId(): string {
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      return user.promoted_by || user.id || '';
    }
  } catch (_) {}
  return '';
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'Essai gratuit',
  monthly: 'Mensuel',
  annual: 'Annuel',
};

const PLAN_BADGE_CLASS: Record<string, string> = {
  trial: 'badge-warning',
  monthly: 'badge-brand',
  annual: 'badge-success',
};

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  active: { label: 'Actif', badgeClass: 'badge-success' },
  trial: { label: 'Essai gratuit', badgeClass: 'badge-warning' },
  expired: { label: 'Expiré', badgeClass: 'badge-danger' },
  pending: { label: 'En attente', badgeClass: 'badge-neutral' },
};

const METHOD_LABELS: Record<string, string> = {
  mtn: '📱 MTN Mobile Money',
  orange: '📱 Orange Money',
  virement: '🏦 Virement bancaire',
};

export default function Subscription() {
  const {
    subscription,
    paymentHistory,
    isLoading,
    isHistoryLoading,
    fetchSubscription,
    fetchHistory,
    fetchPlans,
  } = useSubscriptionStore();

  const [modalOpen, setModalOpen] = useState(false);
  const owner_id = getStoredOwnerId();

  useEffect(() => {
    if (owner_id) {
      fetchSubscription(owner_id);
      fetchHistory(owner_id);
      fetchPlans();
    }
  }, [owner_id]);

  const statusInfo = subscription
    ? STATUS_LABELS[subscription.status] || STATUS_LABELS.pending
    : STATUS_LABELS.expired;

  return (
    <div className="sub-page" data-style="neuro" data-mode="light" style={{height:'100vh'}}>
      <div className="sub-container" style={{height:'100%', overflow: 'auto'}}>

        {/* En-tête */}
        <div className="sub-header">
          <button className="btn" style={{width:'3rem'}} onClick={() => window.history.back()}>
            ←
          </button>
          <h1 className="text-heading">Abonnement</h1>
          <p className="text-body text-secondary">
            Gérez votre abonnement et consultez vos paiements
          </p>
        </div>

        {/* Carte état actuel */}
        <div className="surface">
          {isLoading ? (
            <div className="sub-loading-row text-secondary">
              <span className="sub-spinner" /> Chargement...
            </div>
          ) : subscription ? (
            <>
              <div className="sub-card-top">
                <div>
                  <div className="sub-plan-row">
                    <span className={`badge ${PLAN_BADGE_CLASS[subscription.plan]}`}>
                      {PLAN_LABELS[subscription.plan]}
                    </span>
                    <span className={`badge ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="sub-days-remaining">
                    {subscription.status !== 'expired' ? (
                      <>
                        <span
                          className={`sub-days-number ${
                            subscription.is_expiring_soon ? 'text-warning' : 'text-brand'
                          }`}
                        >
                          {subscription.days_remaining}
                        </span>
                        <span className="sub-days-label text-secondary"> jours restants</span>
                      </>
                    ) : (
                      <span className="text-danger weight-bold text-xl">
                        Abonnement expiré
                      </span>
                    )}
                  </div>
                </div>

                <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                  {subscription.status === 'expired' ? '🔓 Renouveler' : '⟳ Changer de plan'}
                </button>
              </div>

              <div className="divider sub-divider" />

              <div className="sub-date-grid">
                <div className="sub-date-item">
                  <span className="text-label">Début</span>
                  <span className="text-body weight-semibold">
                    {new Date(subscription.started_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="sub-date-item">
                  <span className="text-label">Expiration</span>
                  <span className={`text-body weight-semibold ${subscription.is_expiring_soon ? 'text-warning' : ''}`}>
                    {new Date(subscription.expires_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="sub-date-item">
                  <span className="text-label">Tarif</span>
                  <span className="text-body weight-semibold">
                    {subscription.plan_details?.price === 0
                      ? 'Gratuit'
                      : `${subscription.plan_details?.price?.toLocaleString('fr-FR')} XAF`}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="sub-no-sub">
              <span className="sub-emoji">📭</span>
              <p className="text-body text-secondary">Aucun abonnement actif</p>
              <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                Démarrer un abonnement
              </button>
            </div>
          )}
        </div>

        {/* Historique des paiements */}
        <div>
          <h2 className="sub-section-title text-heading">Historique des paiements</h2>

          {isHistoryLoading ? (
            <div className="sub-loading-row text-secondary">
              <span className="sub-spinner" /> Chargement...
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="surface sub-empty-history">
              <span className="sub-emoji">📄</span>
              <p className="text-body text-secondary">Aucun paiement enregistré</p>
            </div>
          ) : (
            <div className="sub-history-list">
              {paymentHistory.map((p) => {
                const pStatus = p.status === 'confirmed'
                  ? { label: 'Confirmé', badgeClass: 'badge-success' }
                  : p.status === 'failed'
                  ? { label: 'Échoué', badgeClass: 'badge-danger' }
                  : { label: 'En attente', badgeClass: 'badge-warning' };

                return (
                  <div key={p.id} className="surface sub-history-row">
                    <div className="sub-history-left">
                      <span className="sub-method text-body">
                        {METHOD_LABELS[p.method] || p.method}
                      </span>
                      <span className="sub-ref text-secondary">Réf: {p.reference}</span>
                      <span className="sub-date text-secondary">
                        {new Date(p.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="sub-history-right">
                      <span className="sub-history-amount text-body">
                        {p.amount === 0 ? 'Gratuit' : `${Number(p.amount).toLocaleString('fr-FR')} ${p.currency}`}
                      </span>
                      <span className={`badge ${pStatus.badgeClass}`}>
                        {pStatus.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de paiement */}
      {modalOpen && (
        <PaymentModal
          owner_id={owner_id}
          onClose={() => {
            setModalOpen(false);
            fetchSubscription(owner_id);
            fetchHistory(owner_id);
          }}
        />
      )}
    </div>
  );
}