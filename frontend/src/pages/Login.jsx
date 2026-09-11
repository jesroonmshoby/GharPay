import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Shield, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const { showError, showSuccess } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const loggedUser = await login(email, password);
      showSuccess(`Welcome back, ${loggedUser.name}!`);
      if (loggedUser.role === 'LANDLORD') {
        navigate('/landlord');
      } else if (loggedUser.role === 'TENANT') {
        navigate('/tenant');
      } else if (loggedUser.role === 'MEDIATOR' || loggedUser.role === 'ADMIN') {
        navigate('/mediator');
      } else {
        navigate('/');
      }
    } catch (err) {
      showError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword = 'password123') => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setSubmitting(true);

    try {
      const loggedUser = await login(demoEmail, demoPassword);
      showSuccess(`Signed in as demo ${loggedUser.role.toLowerCase()}: ${loggedUser.name}`);
      if (loggedUser.role === 'LANDLORD') {
        navigate('/landlord');
      } else if (loggedUser.role === 'TENANT') {
        navigate('/tenant');
      } else if (loggedUser.role === 'MEDIATOR' || loggedUser.role === 'ADMIN') {
        navigate('/mediator');
      }
    } catch (err) {
      showError(err.message || 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#F7F7F5]">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-[#E5E5E5] shadow-lg">
        <div>
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-[#B68400] to-[#505423] flex items-center justify-center text-white shadow-md">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-center text-2xl font-extrabold text-[#111111]">
            Sign in to GharPay
          </h2>
          <p className="mt-1 text-center text-xs text-[#737373]">
            Online Dispute Resolution Platform for Karnataka Security Deposits
          </p>
        </div>

        {sessionExpired && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Your session has expired. Please sign in again.</span>
          </div>
        )}

        {/* Default Mediator Quick Sign-In */}
        <div className="bg-[#F7F7F5] border border-[#E5E5E5] p-4 rounded-xl space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#505423] block">
            Default Mediator Quick Sign-In
          </span>
          <div>
            <button
              type="button"
              onClick={() => handleDemoLogin('priya.mediator@gharpay.in')}
              className="w-full text-xs font-semibold py-2.5 px-3 bg-white border border-[#E5E5E5] hover:border-[#505423] text-[#111111] rounded-lg transition-all flex items-center justify-between hover:bg-[#505423]/5 shadow-sm"
            >
              <div className="flex items-center space-x-2">
                <span>⚖️ Mediator Account</span>
                <span className="text-[#505423] font-bold">(Priya Menon)</span>
              </div>
              <span className="text-[10px] text-[#737373]">priya.mediator@gharpay.in</span>
            </button>
          </div>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737373]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#E5E5E5] rounded-xl text-sm placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B68400] focus:border-transparent text-[#111111]"
                  placeholder="e.g. user@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737373]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#E5E5E5] rounded-xl text-sm placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B68400] focus:border-transparent text-[#111111]"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#B68400] hover:bg-[#966d00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B68400] transition-all disabled:opacity-50"
          >
            {submitting ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-[#737373]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-[#B68400] hover:text-[#966d00]"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

