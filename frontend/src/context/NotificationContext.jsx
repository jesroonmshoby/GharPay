import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addNotification = useCallback(({ type, message, duration }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newNotification = { id, type, message };

    setNotifications((prev) => [newNotification, ...prev]);

    if (duration && duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }

    return id;
  }, [dismissNotification]);

  const showSuccess = useCallback((message, duration = 4500) => {
    return addNotification({ type: 'success', message, duration });
  }, [addNotification]);

  const showError = useCallback((message) => {
    // Errors persist until dismissed manually or cleared by next success
    return addNotification({ type: 'error', message, duration: 0 });
  }, [addNotification]);

  const showWarning = useCallback((message, duration = 6000) => {
    return addNotification({ type: 'warning', message, duration });
  }, [addNotification]);

  const showInfo = useCallback((message, duration = 5000) => {
    return addNotification({ type: 'info', message, duration });
  }, [addNotification]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
