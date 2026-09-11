import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#F7F7F5]">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl border border-[#E5E5E5] shadow-sm">
        <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-[#111111]">404 - Page Not Found</h1>
          <p className="text-xs text-[#737373] max-w-sm mx-auto leading-relaxed">
            The GharPay ODR page or dispute resource you are trying to access does not exist or has been moved.
          </p>
        </div>
        <div className="pt-2 flex justify-center space-x-3">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
