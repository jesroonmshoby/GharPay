import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, Phone, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('TENANT');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setSubmitting(true);

    try {
      await register({
        name,
        email,
        phone,
        password,
        role,
      });

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
            Create a GharPay Account
          </h2>
          <p className="mt-1 text-center text-xs text-[#737373]">
            Register as a Tenant or Landlord to participate in ODR
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-[#DC2626] text-xs p-3 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-[#1B8E13] text-xs p-3 rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('TENANT')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  role === 'TENANT'
                    ? 'border-[#1B8E13] bg-[#1B8E13]/10 text-[#1B8E13] shadow-sm'
                    : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#1B8E13]'
                }`}
              >
                <span>🔑 Tenant</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('LANDLORD')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  role === 'LANDLORD'
                    ? 'border-[#B68400] bg-[#B68400]/10 text-[#B68400] shadow-sm'
                    : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#B68400]'
                }`}
              >
                <span>🏠 Landlord</span>
              </button>
            </div>
            <p className="text-[10px] text-[#737373] mt-1 text-center">
              Note: Mediator accounts are assigned by system administrators.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737373]">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-[#E5E5E5] rounded-xl text-sm placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B68400] focus:border-transparent text-[#111111]"
                placeholder="e.g. Aarav Sharma"
              />
            </div>
          </div>

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
                placeholder="e.g. aarav@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737373]">
                <Phone className="h-4 w-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-[#E5E5E5] rounded-xl text-sm placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B68400] focus:border-transparent text-[#111111]"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Password (Min 8 characters)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#737373]">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-[#E5E5E5] rounded-xl text-sm placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B68400] focus:border-transparent text-[#111111]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#B68400] hover:bg-[#966d00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B68400] transition-all disabled:opacity-50 mt-4"
          >
            {submitting ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Register Account</span>
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-[#737373]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-[#B68400] hover:text-[#966d00]"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

