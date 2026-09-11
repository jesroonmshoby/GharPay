import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const NotificationContainer = () => {
  const { notifications, dismissNotification } = useNotification();

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-20 inset-x-0 z-50 pointer-events-none flex flex-col items-center space-y-2 px-4 max-w-xl mx-auto"
      style={{ zIndex: 9999 }}
    >
      {notifications.map((n) => {
        const isError = n.type === 'error';
        const isSuccess = n.type === 'success';
        const isWarning = n.type === 'warning';

        return (
          <div
            key={n.id}
            role="status"
            aria-live={isError ? 'assertive' : 'polite'}
            className={`pointer-events-auto w-full p-4 rounded-xl border shadow-lg flex items-start justify-between space-x-3 transition-all duration-300 ease-out transform translate-y-0 opacity-100 ${
              isSuccess
                ? 'bg-white border-[#1B8E13]/30 text-[#111111]'
                : isError
                ? 'bg-white border-red-200 text-[#111111]'
                : isWarning
                ? 'bg-white border-[#B68400]/30 text-[#111111]'
                : 'bg-white border-[#505423]/30 text-[#111111]'
            }`}
          >
            <div className="flex items-start space-x-3 pr-2">
              {isSuccess && <CheckCircle className="w-5 h-5 text-[#1B8E13] flex-shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-[#B68400] flex-shrink-0 mt-0.5" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-[#505423] flex-shrink-0 mt-0.5" />}

              <div className="text-xs font-semibold leading-relaxed text-[#111111]">
                {n.message}
              </div>
            </div>

            <button
              onClick={() => dismissNotification(n.id)}
              aria-label="Dismiss notification"
              className="text-[#737373] hover:text-[#111111] p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationContainer;
