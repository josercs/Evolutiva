import React, { createContext, useContext, useState, ReactNode } from "react";

type NotificationType = "success" | "error" | "info";

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  const notify = (message: string, type: NotificationType = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: "12px 24px",
            borderRadius: 8,
            background: notification.type === "success"
              ? "#22c55e"
              : notification.type === "error"
              ? "#ef4444"
              : "#2563eb",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            fontWeight: "bold",
          }}
        >
          {notification.message}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification deve ser usado dentro de NotificationProvider");
  return ctx;
};