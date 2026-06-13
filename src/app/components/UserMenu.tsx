import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type UserMenuProps = {
  username: string;
  userId: string;
  showStatBtn: boolean;
  onLogout: () => void;
  onGoStats: () => void;
  onClose: () => void;
};

const UserMenu: React.FC<UserMenuProps> = ({
  username,
  userId,
  showStatBtn,
  onLogout,
  onGoStats,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  /* ── CLOSE ON OUTSIDE CLICK ── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── CLOSE ON ESC ── */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div data-style="neuro" data-mode="light">
      {/* Overlay */}
      

      {/* Menu */}
      <div ref={menuRef} className="surface um-menu">
        {/* Close */}
        <button className="btn btn-ghost um-close-btn" onClick={onClose} aria-label="Fermer">
          ✕
        </button>

        {/* User */}
        <div className="um-user-block">
          <div className="text-heading um-username">{username}</div>
          <div className="text-label um-userid">{userId}</div>
        </div>

        {/* Actions */}
        <div className="col gap-sm">
          {showStatBtn && (
            <button
              className="btn btn-secondary w-full justify-center"
              onClick={() => {
                onGoStats();
                onClose();
              }}
            >
              📊 Statistiques
            </button>
          )}

          <button
            className="btn btn-secondary w-full justify-center"
            onClick={() => {
              navigate('/abonnement');
              onClose();
            }}
          >
            💳 Abonnement
          </button>

          <button
            className="btn btn-primary w-full justify-center um-logout-btn"
            onClick={() => {
              onLogout();
              onClose();
            }}
          >
            ⎋ Déconnexion
          </button>
        </div>
      </div>

      <style>{`
        .um-menu {
          position: fixed;
          top: 4rem;
          left: 1rem;
          width: 260px;
          max-width: calc(100vw - 2rem);
          display: flex;
          flex-direction: column;
          gap: var(--gap-md);
          z-index: var(--z-modal);
        }

        .um-close-btn {
          position: absolute;
          top: var(--space-6);
          right: var(--space-6);
          padding: var(--space-2);
          min-width: auto;
        }

        .um-user-block {
          padding-bottom: var(--space-12);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .um-username { font-size: var(--text-base); }
        .um-userid   { font-family: var(--font-mono); }

        .um-logout-btn {
          background: var(--clr-danger-500);
          color: #fff;
          box-shadow: 5px 5px 10px var(--nm-dark), -5px -5px 10px var(--nm-light);
        }
        [data-style="neuro"][data-mode="dark"] .um-logout-btn,
        [data-style="neuro"] .um-logout-btn:active {
          box-shadow: inset 3px 3px 6px var(--nm-dark), inset -3px -3px 6px var(--nm-light);
        }

        @media (max-width: 480px) {
          .um-menu {
            left: 0.5rem;
            right: 0.5rem;
            top: 3.5rem;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default UserMenu;