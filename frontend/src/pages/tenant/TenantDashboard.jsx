import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { formatINR } from '../../utils/formatters';
import { Key, FileText, ArrowRight, CheckCircle, Clock, AlertTriangle, Shield } from 'lucide-react';

export const TenantDashboard = () => {
  const { showError } = useNotification();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenantDisputes();
  }, []);

  const fetchTenantDisputes = async () => {
    setLoading(true);
    try {
      const res = await api.tenant.getDisputes();
      setDisputes(res.disputes || []);
    } catch (err) {
      console.error('Error loading tenant disputes:', err);
      showError(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CALCULATED':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full text-xs font-bold">Calculated</span>;
      case 'TENANT_REVIEW':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">Review Needed</span>;
      case 'NEGOTIATION':
        return <span className="bg-[#B68400]/15 text-[#B68400] border border-[#B68400]/30 px-2.5 py-1 rounded-full text-xs font-bold">In Negotiation</span>;
      case 'MEDIATOR_REVIEW':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-bold">Mediator Review</span>;
      case 'SETTLEMENT_PENDING':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">Settlement Pending</span>;
      case 'SETTLED':
        return <span className="bg-[#1B8E13]/15 text-[#1B8E13] border border-[#1B8E13]/30 px-2.5 py-1 rounded-full text-xs font-bold">✓ Settled</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const getPrimaryCtaText = (status) => {
    switch (status) {
      case 'CALCULATED':
        return 'Review Calculation';
      case 'TENANT_REVIEW':
        return 'Start Negotiation';
      case 'NEGOTIATION':
        return 'View Negotiation';
      case 'SETTLEMENT_PENDING':
        return 'Review Settlement';
      case 'SETTLED':
        return 'View Settlement & PDF';
      default:
        return 'View Dispute Details';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm">
        <h1 className="text-2xl font-extrabold text-[#111111] flex items-center space-x-3">
          <Key className="w-6 h-6 text-[#1B8E13]" />
          <span>Tenant ODR Portal</span>
        </h1>
        <p className="text-xs text-[#737373] mt-1">
          Review landlord deductions, evaluate transparent calculations, negotiate, and consent to settlements
        </p>
      </div>

      {/* Disputes Overview Card */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5E5E5] flex justify-between items-center">
          <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#1B8E13]" />
            <span>Your Security Deposit Disputes</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#737373]">
            Loading your dispute records...
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Shield className="w-10 h-10 text-[#737373] mx-auto opacity-40" />
            <p className="text-sm font-semibold text-[#111111]">
              You don't have any active deposit disputes yet.
            </p>
            <p className="text-xs text-[#737373]">
              Dispute cases initiated by your landlord will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5]">
            {disputes.map((d) => (
              <div
                key={d.id}
                className="p-6 hover:bg-[#F7F7F5]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-extrabold text-[#111111]">
                      Case {d.caseNumber}
                    </span>
                    {getStatusBadge(d.status)}
                  </div>
                  <p className="text-xs text-[#737373]">
                    Property: <strong className="text-[#111111]">{d.property?.addressLine1}, {d.property?.city}</strong>
                  </p>
                  <p className="text-xs text-[#737373]">
                    Security Deposit: <strong className="text-[#111111]">{formatINR(d.totalDeposit)}</strong> | Claimed Deduction: <strong className="text-[#111111]">{formatINR(d.claimedDeduction)}</strong>
                  </p>
                  {d.calculatedDeduction && (
                    <p className="text-xs font-bold text-[#1B8E13]">
                      GharPay Approved Deduction: {formatINR(d.calculatedDeduction)}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Link
                    to={`/tenant/dispute/${d.id}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-[#1B8E13] hover:bg-[#15700f] px-5 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    <span>{getPrimaryCtaText(d.status)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantDashboard;

