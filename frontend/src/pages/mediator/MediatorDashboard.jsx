import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { formatINR } from '../../utils/formatters';
import { Scale, FileText, ArrowRight, CheckCircle, Clock, Shield } from 'lucide-react';

export const MediatorDashboard = () => {
  const { showError } = useNotification();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMediatorCases();
  }, []);

  const fetchMediatorCases = async () => {
    setLoading(true);
    try {
      // First try fetching assigned cases, fallback to all mediator cases
      const myRes = await api.mediator.getMyCases().catch(() => null);
      if (myRes && myRes.cases && myRes.cases.length > 0) {
        setCases(myRes.cases);
      } else {
        const allRes = await api.mediator.getCases().catch(() => null);
        setCases(allRes?.cases || []);
      }
    } catch (err) {
      console.error('Error fetching mediator cases:', err);
      showError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm">
        <h1 className="text-2xl font-extrabold text-[#111111] flex items-center space-x-3">
          <Scale className="w-6 h-6 text-[#505423]" />
          <span>Mediator ODR Portal</span>
        </h1>
        <p className="text-xs text-[#737373] mt-1">
          Review security-deposit cases, evaluate structured recommendations, and prepare settlements
        </p>
      </div>

      {/* Cases List Card */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5E5E5]">
          <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#505423]" />
            <span>Assigned Dispute Cases</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#737373]">
            Loading assigned mediator cases...
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Shield className="w-10 h-10 text-[#737373] mx-auto opacity-40" />
            <p className="text-sm font-semibold text-[#111111]">
              No assigned cases requiring mediator action currently.
            </p>
            <p className="text-xs text-[#737373]">
              Cases reaching MEDIATOR_REVIEW or SETTLEMENT_PENDING will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5]">
            {cases.map((c) => (
              <div
                key={c.disputeId}
                className="p-6 hover:bg-[#F7F7F5]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-extrabold text-[#111111]">
                      Case {c.caseNumber}
                    </span>
                    {getStatusBadge(c.status)}
                    {c.settlementEligible && (
                      <span className="bg-[#1B8E13]/15 text-[#1B8E13] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                        ✓ 5% Threshold Met
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#737373]">
                    Landlord: <strong className="text-[#111111]">{c.landlordName}</strong> | Tenant: <strong className="text-[#111111]">{c.tenantName}</strong>
                  </p>
                  <p className="text-xs text-[#737373]">
                    Property: {c.property?.addressLine1}, {c.property?.city}
                  </p>
                  <p className="text-xs font-bold text-[#505423]">
                    Calculated Deduction: {c.calculatedDeduction ? formatINR(c.calculatedDeduction) : 'N/A'} | Landlord Offer: {c.landlordOffer ? formatINR(c.landlordOffer) : 'None'} | Tenant Offer: {c.tenantOffer ? formatINR(c.tenantOffer) : 'None'}
                  </p>
                </div>

                <div>
                  <Link
                    to={`/mediator/dispute/${c.disputeId}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-[#505423] hover:bg-[#3f421b] px-5 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    <span>Review Case</span>
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

export default MediatorDashboard;

