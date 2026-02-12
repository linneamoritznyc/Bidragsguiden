import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext({ showToast: () => {} });

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success", duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    if (type !== "error") {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: "fixed", top: 20, right: 20, zIndex: 9999,
        display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "none",
      }}>
        {toasts.map((toast) => {
          const colors = {
            success: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
            error: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
            info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
          };
          const c = colors[toast.type] || colors.success;
          return (
            <div key={toast.id} style={{
              padding: "12px 16px", borderRadius: 8,
              background: c.bg, border: `1px solid ${c.border}`,
              color: c.text, fontSize: 13, fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              display: "flex", alignItems: "center", gap: 10,
              pointerEvents: "auto", maxWidth: 360,
              animation: "toastIn 0.2s ease-out",
            }}>
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button onClick={() => dismiss(toast.id)} style={{
                background: "none", border: "none", color: c.text,
                cursor: "pointer", fontSize: 16, lineHeight: 1,
                padding: 0, opacity: 0.6,
              }}>&times;</button>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
