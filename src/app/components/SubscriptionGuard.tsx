// src/app/components/SubscriptionGuard.tsx
// ------------------------------------------------------------
// Wrapper à placer dans AppDash.tsx — design system neuromorphique
// Bloque l'app avec overlay si expiré ; bandeau si < 7 jours
// ------------------------------------------------------------
import React, { useEffect, useRef, useState } from 'react';
import { useSubscriptionStore } from '../../hooks/useSubscriptionStore';
import { useNavigate } from 'react-router-dom';
import '../../css/subscription.css';
import '../css/form.css';

interface Props {
  owner_id: string;
  children: React.ReactNode;
}

export default function SubscriptionGuard({ owner_id, children }: Props) {
  const { subscription, isLoading, fetchSubscription } = useSubscriptionStore();
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  useEffect(() => {
    if (!hasFetched.current && owner_id) {
      hasFetched.current = true;
      fetchSubscription(owner_id);
    }
  }, [owner_id]);

  // Pendant le chargement initial
  if (isLoading && !subscription) {
    return (
      <div className="sub-loading-wrapper">
        <div className="sub-spinner sub-spinner-lg" />
        <p className="text-body text-secondary">Vérification de l'abonnement...</p>
      </div>
    );
  }

  const isExpired = subscription?.status === 'expired' || (!subscription && !isLoading);
  const isExpiringSoon = subscription?.is_expiring_soon;
  const daysLeft = subscription?.days_remaining ?? 0;

  return (
    <div className="relative h-full" data-style="neuro" data-mode="light">

      {/* Bandeau avertissement — < 7 jours, pas expiré */}
      {isExpiringSoon && bannerVisible && !isExpired && (
        <div className="sub-banner">
          <div className="sub-banner-content">
            <span>⚠️</span>
            <span className="sub-banner-text text-body">
              Votre abonnement expire dans{' '}
              <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong>.
              Renouvelez maintenant pour éviter toute interruption.
            </span>
            <button className="btn btn-primary" onClick={() => navigate('/app/abonnement')}>
              Renouveler
            </button>
            <button className="sub-banner-close" onClick={() => setBannerVisible(false)} aria-label="Fermer">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Contenu normal de l'app */}
      <div className={isExpired ? 'sub-blurred' : ''}>
        {children}
      </div>

      {/* Overlay bloquante — abonnement expiré */}
      {isExpired && (
        <div className="overlay">
          <div className="modal sub-overlay-card">
            <span className="sub-emoji">🔒</span>
            <h2 className="sub-overlay-title text-heading">Abonnement expiré</h2>
            <p className="sub-overlay-text text-body text-secondary">
              Votre accès a été suspendu. Renouvelez votre abonnement
              pour continuer à utiliser l'application.
            </p>
            <div className="sub-overlay-badge">
              <span className="badge badge-danger">
                {subscription
                  ? `Expiré le ${new Date(subscription.expires_at).toLocaleDateString('fr-FR')}`
                  : 'Aucun abonnement actif'}
              </span>
            </div>
            <button className="btn btn-primary w-full justify-center" onClick={() => navigate('/app/abonnement')}>
              Voir les abonnements
            </button>
          </div>
        </div>
      )}
    </div>
  );
}