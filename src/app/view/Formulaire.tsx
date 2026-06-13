import '../css/form.css';
import Appro from '../components/Approform';
import Vente from '../components/VenteForm';
import Client from '../components/Client';
import Distributeur from '../components/Distributeur';
import { useState } from 'react';

const FORMS = [
    { key: 'appro',        label: 'Appro',        icon: '📦', desc: 'Réapprovisionner le stock' },
    { key: 'vente',        label: 'Vente',         icon: '🛒', desc: 'Enregistrer une vente' },
    { key: 'client',       label: 'Client',        icon: '👤', desc: 'Gérer les clients' },
    { key: 'distributeur', label: 'Distributeur',  icon: '🏆', desc: 'Gérer les distributeurs' },
] as const;

type FormKey = typeof FORMS[number]['key'];

export default function Register() {
    const [contentLevel, setContentLevel] = useState(false);
    const [activeForm, setActiveForm]     = useState<FormKey | ''>('');

    function handleFormChoice(name: FormKey) {
        setActiveForm(name);
        setContentLevel(true);
    }

    function handleClose() {
        setActiveForm('');
        setContentLevel(false);
    }

    return (
        <>
            <style>{`
                /* ── Register fills appdash-content fully ── */
                .register-root {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                /* ── Picker grid ── */
                .register-picker {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    gap: 1rem;
                    overflow-y: auto;
                }
                .register-picker__title {
                    font-family: var(--font-body, 'Manrope', sans-serif);
                    font-weight: 700;
                    font-size: 1.1rem;
                    color: #2d3b4f;
                    letter-spacing: -0.02em;
                    margin-bottom: 0.25rem;
                    text-align: center;
                }
                .register-picker__sub {
                    font-size: 0.8rem;
                    color: #5a6a7e;
                    text-align: center;
                    margin-bottom: 0.5rem;
                }
                .register-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    width: 100%;
                    max-width: 480px;
                }
                .register-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 1.5rem 1rem;
                    border-radius: 1.25rem;
                    background: #e4e9f0;
                    cursor: pointer;
                    box-shadow: 8px 8px 16px rgba(163,177,198,0.6), -8px -8px 16px rgba(255,255,255,0.8);
                    transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
                    border: none;
                    text-align: center;
                    -webkit-tap-highlight-color: transparent;
                }
                .register-card:hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 12px 12px 24px rgba(163,177,198,0.6), -12px -12px 24px rgba(255,255,255,0.8);
                }
                .register-card:active {
                    transform: scale(0.97);
                    box-shadow: inset 4px 4px 8px rgba(163,177,198,0.6), inset -4px -4px 8px rgba(255,255,255,0.8);
                }
                .register-card__icon {
                    font-size: 2rem;
                    line-height: 1;
                }
                .register-card__label {
                    font-weight: 700;
                    font-size: 0.92rem;
                    color: #2d3b4f;
                    letter-spacing: -0.01em;
                }
                .register-card__desc {
                    font-size: 0.72rem;
                    color: #5a6a7e;
                    line-height: 1.3;
                }

                /* ── Form content: must fill root and provide positioned context ── */
                .register-form-wrap {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                    min-height: 0;
                }

                /* ════════════════════════════
                   MOBILE ≤ 480px
                   ════════════════════════════ */
                @media (max-width: 480px) {
                    .register-picker { padding: 1rem 0.85rem; }
                    .register-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.75rem;
                        max-width: 100%;
                    }
                    .register-card { padding: 1.1rem 0.75rem; gap: 0.4rem; border-radius: 1rem; }
                    .register-card__icon { font-size: 1.75rem; }
                    .register-card__label { font-size: 0.85rem; }
                    .register-card__desc { font-size: 0.68rem; }
                }

                @media (max-width: 340px) {
                    .register-grid { grid-template-columns: 1fr; }
                    .register-card { flex-direction: row; justify-content: flex-start; padding: 0.9rem 1rem; }
                    .register-card__icon { font-size: 1.5rem; }
                }
            `}</style>

            <div className="register-root" data-style="neuro" data-mode="light">

                {/* ── PICKER ── */}
                {!contentLevel && (
                    <div className="register-picker">
                        <p className="register-picker__title">Que souhaitez-vous faire ?</p>
                        <p className="register-picker__sub">Choisissez un formulaire</p>
                        <div className="register-grid">
                            {FORMS.map((form) => (
                                <button
                                    key={form.key}
                                    className="register-card"
                                    onClick={() => handleFormChoice(form.key)}
                                >
                                    <span className="register-card__icon">{form.icon}</span>
                                    <span className="register-card__label">{form.label}</span>
                                    <span className="register-card__desc">{form.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── ACTIVE FORM ── */}
                {contentLevel && (
                    <div className="register-form-wrap">
                        {activeForm === 'appro'        && <Appro        onclose={handleClose} />}
                        {activeForm === 'vente'        && <Vente        onclose={handleClose} />}
                        {activeForm === 'client'       && <Client       onclose={handleClose} />}
                        {activeForm === 'distributeur' && <Distributeur onclose={handleClose} />}
                    </div>
                )}
            </div>
        </>
    );
}