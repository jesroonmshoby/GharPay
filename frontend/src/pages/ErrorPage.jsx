import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export const ErrorPage = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#F7F7F5]">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl border border-[#E5E5E5] shadow-sm">
        <div className="w-14 h-14 bg-red-50 border border-red-200 text-[#DC2626] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-[#111111]">Application Error</h1>
          <p className="text-xs text-[#737373] max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred while communicating with the GharPay server. Please refresh or return to the main dashboard.
          </p>
        </div>
        <div className="pt-2 flex justify-center space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center space-x-2 bg-[#505423] hover:bg-[#3f421b] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Page</span>
          </button>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-white border border-[#E5E5E5] text-[#111111] hover:bg-[#F7F7F5] text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
