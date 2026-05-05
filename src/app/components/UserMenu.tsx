import React, { useEffect, useRef } from "react";

type UserMenuProps = {
  username: string;
  userId: string;
  showStatBtn: boolean;
  onLogout: () => void;
  onGoStats: () => void;
  onClose : ()=> void
};

const UserMenu: React.FC<UserMenuProps> = ({
  username,
  userId,
  showStatBtn,
  onLogout,
  onGoStats,
  onClose
}) => {
  
  const menuRef = useRef<HTMLDivElement>(null);

  /* ── CLOSE ON OUTSIDE CLICK ── */
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  /* ── CLOSE ON ESC ── */
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  return (
    <>
      

      {/* Overlay */}
      {<div style={styles.overlay} />}

      {/* Menu */}
      <div
        ref={menuRef}
        style={{
          ...styles.menu,
          ...styles.menuOpen ,
        }}
      >
        {/* Close */}
        <button style={styles.closeBtn} onClick={() => onClose()}>
          ✕
        </button>

        {/* User */}
        <div style={styles.userBlock}>
          <div style={styles.username}>{username}</div>
          <div style={styles.userId}>{userId}</div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {showStatBtn && <button
            style={styles.statBtn}
            onClick={() => {
              onGoStats();
              onClose();
            }}
          >
            📊 Statistics
          </button>}

          <button
            style={styles.logoutBtn}
            onClick={() => {
              onLogout();
              onClose();
            }}
          >
            ⎋ Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default UserMenu;

/* ── STYLES ── */
const styles: Record<string, React.CSSProperties> = {
  trigger: {
    position: "fixed",
    top: "1rem",
    left: "1rem",
    zIndex: 1000,
    padding: "0.5rem 0.7rem",
    borderRadius: "10px",
    border: "1px solid rgba(0,0,0,0.1)",
    background: "#ffffff",
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.2)",
    backdropFilter: "blur(3px)",
    zIndex: 998,
  },

  menu: {
    position: "fixed",
    top: "4rem",
    left: "1rem",
    width: "260px",
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
    padding: "1.2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    zIndex: 999,
    transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
  },

  menuOpen: {
    opacity: 1,
    transform: "translateY(0) scale(1)",
    pointerEvents: "auto",
  },

  menuClosed: {
    opacity: 0,
    transform: "translateY(-10px) scale(0.98)",
    pointerEvents: "none",
  },

  closeBtn: {
    position: "absolute",
    top: "0.5rem",
    right: "0.5rem",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#64748b",
  },

  userBlock: {
    paddingBottom: "0.75rem",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },

  username: {
    fontWeight: 700,
    color: "#0f172a",
  },

  userId: {
    fontSize: "0.75rem",
    color: "#64748b",
    fontFamily: "monospace",
  },

  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },

  statBtn: {
    padding: "0.5rem",
    borderRadius: "10px",
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#f1f5f9",
    cursor: "pointer",
  },

  logoutBtn: {
    padding: "0.5rem",
    borderRadius: "10px",
    border: "none",
    background: "#ef4444",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};