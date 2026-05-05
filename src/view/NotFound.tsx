

import React from "react";

type NotFoundProps = {
  title?: string;
  message?: string;
  onGoHome?: () => void;
};

const NotFound: React.FC<NotFoundProps> = ({
  title = "404",
  message = "The page you are looking for does not exist.",
  onGoHome,
}) => {
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.code}>{title}</div>

        <h1 style={styles.title}>Page Not Found</h1>

        <p style={styles.message}>{message}</p>

        <div style={styles.actions}>
          <button
            style={styles.primaryBtn}
            onClick={() => {
              if (onGoHome) return onGoHome();
              window.location.href = "/";
            }}
          >
            Go Home
          </button>

          <button
            style={styles.secondaryBtn}
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

/* ── STYLES ── */
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    height: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fb",
    fontFamily: "'Inter', sans-serif",
  },

  card: {
    textAlign: "center",
    padding: "3rem 2.5rem",
    borderRadius: "20px",
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    maxWidth: "420px",
    width: "90%",
  },

  code: {
    fontSize: "5rem",
    fontWeight: 800,
    color: "#0d65f2",
    lineHeight: 1,
    marginBottom: "0.5rem",
  },

  title: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "0.5rem",
  },

  message: {
    fontSize: "0.95rem",
    color: "#64748b",
    marginBottom: "1.5rem",
  },

  actions: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  primaryBtn: {
    padding: "0.6rem 1.2rem",
    borderRadius: "10px",
    border: "none",
    background: "#0d65f2",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.2s",
  },

  secondaryBtn: {
    padding: "0.6rem 1.2rem",
    borderRadius: "10px",
    border: "1px solid rgba(0,0,0,0.1)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 500,
    cursor: "pointer",
  },
};