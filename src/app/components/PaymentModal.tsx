// src/app/components/PaymentModal.tsx
// ------------------------------------------------------------
// Modal de paiement — design system neuromorphique
// ------------------------------------------------------------
import { useEffect, useState } from 'react';
import type { SubscriptionPlan, PaymentMethod } from '../../hooks/useSubscriptionStore';
import { useSubscriptionStore } from '../../hooks/useSubscriptionStore';
import '../../css/subscription.css';
import '../css/form.css';

interface Props {
  owner_id: string;
  onClose: () => void;
}

type Step = 'plan' | 'payment' | 'simulate' | 'success';

const STEPS: Step[] = ['plan', 'payment', 'simulate', 'success'];

const PLAN_DISPLAY = [
  {
    key: 'trial' as SubscriptionPlan,
    label: 'Essai gratuit',
    duration: '14 jours',
    price: 0,
    icon: '🎁',
    desc: 'Accès complet pendant 14 jours',
  },
  {
    key: 'monthly' as SubscriptionPlan,
    label: 'Mensuel',
    duration: '30 jours',
    price: 15000,
    icon: '📅',
    desc: 'Renouvelable chaque mois',
  },
  {
    key: 'annual' as SubscriptionPlan,
    label: 'Annuel',
    duration: '365 jours',
    price: 150000,
    icon: '🏆',
    desc: 'Économisez 2 mois par rapport au mensuel',
  },
];

const METHODS = [
  { key: 'mtn' as PaymentMethod, label: 'MTN Mobile Money', icon: '📱' },
  { key: 'orange' as PaymentMethod, label: 'Orange Money', icon: '🟠' },
  { key: 'virement' as PaymentMethod, label: 'Virement bancaire', icon: '🏦' },
];

export default function PaymentModal({ owner_id, onClose }: Props) {
  const { initiatePayment, simulateConfirm } = useSubscriptionStore();

  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<{ payment_id: string; reference: string; amount: number } | null>(null);
  const [error, setError] = useState('');
  const [simulateLoading, setSimulateLoading] = useState(false);

  const planInfo = PLAN_DISPLAY.find(p => p.key === selectedPlan);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleInitiatePayment = async () => {
    if (!selectedPlan || !selectedMethod) return;
    if ((selectedMethod === 'mtn' || selectedMethod === 'orange') && !phoneNumber.trim()) {
      setError('Veuillez entrer votre numéro de téléphone');
      return;
    }
    setError('');
    setIsProcessing(true);
    const result = await initiatePayment({
      owner_id,
      plan: selectedPlan,
      method: selectedMethod,
      phone_number: phoneNumber || undefined,
      notes: notes || undefined,
    });
    setIsProcessing(false);
    if (result) {
      setPaymentData(result);
      setStep('simulate');
    } else {
      setError('Une erreur est survenue. Réessayez.');
    }
  };

  const handleInitiateTrial = async () => {
    setIsProcessing(true);
    const result = await initiatePayment({
      owner_id,
      plan: 'trial',
      method: 'virement',
      notes: 'Essai gratuit',
    });
    setIsProcessing(false);
    if (result) {
      setPaymentData(result);
      setStep('simulate');
    } else {
      setError("Erreur lors de l'activation de l'essai.");
    }
  };

  const handleSimulate = async () => {
    if (!paymentData) return;
    setSimulateLoading(true);
    const ok = await simulateConfirm(owner_id, paymentData.payment_id);
    setSimulateLoading(false);
    if (ok) setStep('success');
    else setError('Échec de la simulation. Réessayez.');
  };

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <div data-style="neuro" data-mode="light" className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">

        {/* Header */}
        <div className="sub-modal-header">
          <div>
            <h2 className="sub-modal-title text-heading">
              {step === 'plan' && 'Choisir un plan'}
              {step === 'payment' && 'Paiement'}
              {step === 'simulate' && 'Confirmer le paiement'}
              {step === 'success' && 'Paiement réussi !'}
            </h2>
            <div className="sub-step-indicator">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`sub-step-dot ${
                    step === s ? 'is-active' : currentStepIndex > i ? 'is-done' : ''
                  }`}
                />
              ))}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* ── ÉTAPE 1 : Choix du plan ── */}
        {step === 'plan' && (
          <div>
            <div className="sub-plan-grid">
              {PLAN_DISPLAY.map((plan) => (
                <button
                  key={plan.key}
                  className={`surface-inset sub-plan-card ${selectedPlan === plan.key ? 'icon-brand' : ''}`}
                  style={selectedPlan === plan.key ? { boxShadow: 'inset 4px 4px 10px var(--nm-dark), inset -4px -4px 10px var(--nm-light), 0 0 0 2px var(--nm-brand)' } : undefined}
                  onClick={() => setSelectedPlan(plan.key)}
                >
                  <span className="sub-emoji">{plan.icon}</span>
                  <span className={`sub-plan-label ${selectedPlan === plan.key ? 'text-brand' : 'text-body'}`}>
                    {plan.label}
                  </span>
                  <span className="sub-plan-duration text-secondary">{plan.duration}</span>
                  <span className="sub-plan-price text-heading">
                    {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString('fr-FR')} XAF`}
                  </span>
                  <span className="sub-plan-desc text-secondary">{plan.desc}</span>
                  {selectedPlan === plan.key && <span className="sub-check text-brand">✓</span>}
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary w-full justify-center"
              disabled={!selectedPlan || isProcessing}
              onClick={() => {
                if (selectedPlan === 'trial') {
                  handleInitiateTrial();
                } else {
                  setStep('payment');
                }
              }}
            >
              {isProcessing ? 'Traitement...' : 'Continuer →'}
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : Infos de paiement ── */}
        {step === 'payment' && (
          <div>
            {/* Récap plan */}
            <div className="surface-inset sub-recap">
              <span className="sub-recap-label text-secondary">Plan sélectionné</span>
              <span className="text-brand weight-bold">
                {planInfo?.icon} {planInfo?.label} — {planInfo?.price?.toLocaleString('fr-FR')} XAF
              </span>
            </div>

            <p className="sub-field-label">Méthode de paiement</p>
            <div className="sub-method-grid">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  className="surface-inset sub-method-card"
                  style={selectedMethod === m.key ? { boxShadow: 'inset 4px 4px 10px var(--nm-dark), inset -4px -4px 10px var(--nm-light), 0 0 0 2px var(--nm-brand)' } : undefined}
                  onClick={() => { setSelectedMethod(m.key); setPhoneNumber(''); setNotes(''); }}
                >
                  <span className="sub-emoji">{m.icon}</span>
                  <span className={`sub-method-label ${selectedMethod === m.key ? 'text-brand' : 'text-body'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Champ numéro — Mobile Money */}
            {(selectedMethod === 'mtn' || selectedMethod === 'orange') && (
              <div className="sub-field-group">
                <label className="sub-field-label">Numéro Mobile Money</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="Ex: 237693857276"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}

            {/* Champ notes — Virement */}
            {selectedMethod === 'virement' && (
              <div className="sub-field-group">
                <label className="sub-field-label">Informations de virement (optionnel)</label>
                <textarea
                  className="input"
                  style={{ height: '5rem', resize: 'vertical' }}
                  placeholder="Ex: Nom de la banque, numéro de compte expéditeur..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}

            {error && <p className="sub-error-text">{error}</p>}

            <div className="sub-btn-row">
              <button className="btn btn-secondary" onClick={() => setStep('plan')}>← Retour</button>
              <button
                className="btn btn-primary justify-center"
                disabled={!selectedMethod || isProcessing}
                onClick={handleInitiatePayment}
              >
                {isProcessing ? 'Traitement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : SIMULATEUR ── */}
        {step === 'simulate' && paymentData && (
          <div>
            <div className="sub-sim-box">
              <span className="sub-sim-badge">⚙️ MODE SIMULATEUR</span>
              <p className="sub-sim-text text-body">
                En production, l'utilisateur effectuerait le paiement via son opérateur.
                Ici, on simule la confirmation pour les tests.
              </p>
            </div>

            <div className="surface-inset sub-payment-summary">
              <div className="sub-summary-row">
                <span className="sub-summary-key text-secondary">Référence</span>
                <span className="sub-summary-val">{paymentData.reference}</span>
              </div>
              <div className="sub-summary-row">
                <span className="sub-summary-key text-secondary">Montant</span>
                <span className="sub-summary-val">
                  {paymentData.amount === 0 ? 'Gratuit' : `${paymentData.amount.toLocaleString('fr-FR')} XAF`}
                </span>
              </div>
              <div className="sub-summary-row">
                <span className="sub-summary-key text-secondary">Plan</span>
                <span className="sub-summary-val">{planInfo?.label}</span>
              </div>
              <div className="sub-summary-row">
                <span className="sub-summary-key text-secondary">Méthode</span>
                <span className="sub-summary-val">
                  {METHODS.find(m => m.key === selectedMethod)?.label}
                </span>
              </div>
            </div>

            {error && <p className="sub-error-text">{error}</p>}

            <button
              className="btn btn-primary w-full justify-center"
              disabled={simulateLoading}
              onClick={handleSimulate}
            >
              {simulateLoading ? '⏳ Simulation en cours...' : '✅ Simuler la confirmation du paiement'}
            </button>
          </div>
        )}

        {/* ── ÉTAPE 4 : SUCCÈS ── */}
        {step === 'success' && (
          <div className="sub-success">
            <span className="sub-emoji">🎉</span>
            <h3 className="sub-success-title text-heading">Abonnement activé !</h3>
            <p className="sub-success-text text-body text-secondary">
              Votre abonnement <strong>{planInfo?.label}</strong> est maintenant actif.
              Profitez de toutes les fonctionnalités de l'application.
            </p>
            <button className="btn btn-primary w-full justify-center" onClick={onClose}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}