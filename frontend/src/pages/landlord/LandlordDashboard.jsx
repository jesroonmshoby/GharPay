import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { formatINR } from '../../utils/formatters';
import { PlusCircle, Home, FileText, ArrowRight } from 'lucide-react';

const NON_ACTIVE_STATUSES = ['SETTLED', 'REJECTED'];

export const LandlordDashboard = () => {
  const { showError } = useNotification();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await api.landlord.getDisputes();
      if (res && Array.isArray(res.disputes)) {
        setDisputes(res.disputes);
      } else {
        setDisputes([]);
      }
    } catch (err) {
      console.error('Error fetching landlord disputes:', err);
      showError(err.message || 'Unable to load disputes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-full text-xs font-bold">Draft</span>;
      case 'SUBMITTED':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-bold">Submitted</span>;
      case 'EVIDENCE_REVIEW':
        return <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 px-2.5 py-1 rounded-full text-xs font-bold">Evidence Review</span>;
      case 'CALCULATED':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full text-xs font-bold">Calculated</span>;
      case 'TENANT_REVIEW':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">Tenant Review</span>;
      case 'NEGOTIATION':
        return <span className="bg-[#B68400]/15 text-[#B68400] border border-[#B68400]/30 px-2.5 py-1 rounded-full text-xs font-bold">In Negotiation</span>;
      case 'MEDIATOR_REVIEW':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full text-xs font-bold">Mediator Review</span>;
      case 'SETTLEMENT_PENDING':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">Settlement Pending</span>;
      case 'SETTLED':
        return <span className="bg-[#1B8E13]/15 text-[#1B8E13] border border-[#1B8E13]/30 px-2.5 py-1 rounded-full text-xs font-bold">✓ Settled</span>;
      case 'REJECTED':
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-bold">Rejected</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const activeDisputes = disputes.filter((d) => !NON_ACTIVE_STATUSES.includes(d.status));
  const activeDisputesCount = activeDisputes.length;
  const latestDispute = disputes.length > 0 ? disputes[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111111]">
            Landlord ODR Dashboard
          </h1>
          <p className="text-xs text-[#737373] mt-1">
            Manage your rental deposit disputes, claims, evidence, and calculations cleanly
          </p>
        </div>
        <Link
          to="/landlord/intake"
          className="inline-flex items-center justify-center space-x-2 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Dispute Intake</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">
            Active Disputes
          </span>
          <span className="text-2xl font-extrabold text-[#111111] mt-2 block">
            {activeDisputesCount}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">
            {activeDisputesCount > 0 ? 'Active Case' : 'Latest Case'}
          </span>
          <span className="text-xl font-bold text-[#B68400] mt-2 block">
            {latestDispute ? latestDispute.caseNumber : 'None'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">
            Calculated Deduction
          </span>
          <span className="text-2xl font-extrabold text-[#1B8E13] mt-2 block">
            {latestDispute && latestDispute.calculatedDeduction
              ? formatINR(latestDispute.calculatedDeduction)
              : latestDispute
              ? 'Not calculated'
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* Active Disputes Section */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5E5E5] flex justify-between items-center">
          <h2 className="text-lg font-extrabold text-[#111111] flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#B68400]" />
            <span>Active Rental Deposit Disputes</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#737373]">
            Loading disputes...
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Home className="w-10 h-10 text-[#737373] mx-auto opacity-40" />
            <p className="text-sm font-semibold text-[#111111]">
              No disputes yet
            </p>
            <p className="text-xs text-[#737373]">
              Start by creating a property, tenancy agreement, and dispute claim.
            </p>
            <Link
              to="/landlord/intake"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#B68400] hover:text-[#966d00] pt-2"
            >
              <span>Create New Dispute</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5]">
            {disputes.map((d) => (
              <div
                key={d.id}
                className="p-6 hover:bg-[#F7F7F5]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-extrabold text-[#111111]">
                      {d.caseNumber}
                    </span>
                    {getStatusBadge(d.status)}
                  </div>
                  <p className="text-xs text-[#737373]">
                    Security Deposit: <strong className="text-[#111111]">{formatINR(d.totalDeposit)}</strong> | Disputed Deduction: <strong className="text-[#111111]">{formatINR(d.claimedDeduction)}</strong>
                  </p>
                  {d.calculatedDeduction && (
                    <p className="text-xs font-semibold text-[#1B8E13]">
                      GharPay Calculated Deduction: {formatINR(d.calculatedDeduction)}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Link
                    to={`/landlord/dispute/${d.id}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-[#B68400] hover:bg-[#966d00] px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <span>Manage Case</span>
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

export default LandlordDashboard;

