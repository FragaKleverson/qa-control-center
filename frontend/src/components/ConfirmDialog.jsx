export default function ConfirmDialog({ isOpen, message, onConfirm, onCancel, danger = true }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.15s ease",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "28px 32px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          animation: "popIn 0.18s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ margin: "0 0 24px 0", fontSize: "15px", color: "#111827", lineHeight: "1.5" }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              background: "#f3f4f6",
              color: "#374151",
              padding: "9px 20px",
              fontSize: "14px",
              boxShadow: "none",
              transform: "none",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: danger ? "#ef4444" : "#10b981",
              padding: "9px 20px",
              fontSize: "14px",
            }}
          >
            Confirmar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn  { from { transform: scale(0.93); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  );
}
