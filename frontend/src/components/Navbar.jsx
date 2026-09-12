import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, User as UserIcon, Home, FileText, Scale, HelpCircle } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleHomePath = (role) => {
    switch (role) {
      case 'LANDLORD':
        return '/landlord';
      case 'TENANT':
        return '/tenant';
      default:
        return '/';
    }
  };

  return (
    <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <Link
            to={isAuthenticated ? getRoleHomePath(user?.role) : '/'}
            className="flex items-center space-x-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B68400] to-[#505423] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#111111] block leading-none">
                GharPay
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#505423] block mt-1">
                Online Dispute Resolution
              </span>
            </div>
          </Link>

          {/* Navigation Items */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <Link
                to="/how-it-works"
                className="hidden md:flex items-center space-x-1 text-sm font-medium text-[#737373] hover:text-[#B68400] transition-colors px-3 py-2 rounded-lg hover:bg-[#F7F7F5]"
              >
                <HelpCircle className="w-4 h-4" />
                <span>How It Works</span>
              </Link>

              <Link
                to={getRoleHomePath(user?.role)}
                className="flex items-center space-x-1 text-sm font-medium text-[#505423] hover:text-[#B68400] transition-colors px-3 py-2 rounded-lg hover:bg-[#F7F7F5]"
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              {/* Role Badge */}
              <div className="flex items-center space-x-2 bg-[#F7F7F5] border border-[#E5E5E5] px-3 py-1.5 rounded-full">
                <UserIcon className="w-4 h-4 text-[#B68400]" />
                <span className="text-xs font-semibold text-[#111111]">
                  {user?.name}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    user?.role === 'LANDLORD'
                      ? 'bg-[#B68400]/15 text-[#B68400]'
                      : user?.role === 'TENANT'
                      ? 'bg-[#1B8E13]/15 text-[#1B8E13]'
                      : 'bg-[#505423]/15 text-[#505423]'
                  }`}
                >
                  {user?.role}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-sm font-medium text-[#737373] hover:text-[#DC2626] transition-colors p-2 rounded-lg hover:bg-red-50"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/how-it-works"
                className="text-sm font-medium text-[#737373] hover:text-[#B68400] px-3 py-2 rounded-lg transition-colors"
              >
                How It Works
              </Link>
              <Link
                to="/login"
                className="text-sm font-semibold text-[#505423] hover:text-[#B68400] px-3 py-2 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-sm font-semibold text-white bg-[#B68400] hover:bg-[#966d00] px-4 py-2 rounded-lg shadow-sm transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Brand Top Line Accent */}
      <div className="h-0.5 bg-gradient-to-r from-[#B68400] via-[#505423] to-[#1B8E13]" />
    </header>
  );
};

export default Navbar;
