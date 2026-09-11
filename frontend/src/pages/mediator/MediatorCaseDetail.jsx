import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  Scale,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Award,
  PlusCircle,
} from 'lucide-react';

export const MediatorCaseDetail = () => {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Recommendation State
  const [recommendationNote, setRecommendationNote] = useState('');

  // Create Settlement Form State
  const [agreedDeduction, setAgreedDeduction] = useState('26500');

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.mediator.getCase(id);
      setCaseData(res.caseDetails);
    } catch (err) {
      setError(err.message || 'Failed to load mediator case details');
    } finally {
      setLoading(false);
    }
  };

  const handleLogReview = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.mediator.reviewCase(id);
      setSuccess('Case review action logged in Audit Log!');
      await fetchCaseDetails();
    } catch (err) {
      setError(err.message || 'Failed to log review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecommendation = async (recommendationType) => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.mediator.submitRecommendation(id, {
        recommendation: recommendationType,
        note: recommendationNote,
      });
      setSuccess(`Recommendation ${recommendationType} recorded!`);
      await fetchCaseDetails();
    } catch (err) {
      setError(err.message || 'Failed to submit recommendation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSettlement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.settlement.createSettlement(id, {
        agreedDeduction: parseFloat(agreedDeduction),
      });
      setSuccess(`Settlement created! Agreed Deduction: ${formatINR(res.settlement.agreedDeduction)}, Refund: ${formatINR(res.settlement.refundAmount)}.`);
      await fetchCaseDetails();
    } catch (err) {
      setError(err.message || 'Failed to create settlement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs text-[#737373]">
        Loading mediator case details...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto" />
        <h2 className="text-lg font-bold text-[#111111]">Case Not Found</h2>
        <p className="text-xs text-[#737373]">{error || 'The requested case could not be retrieved.'}</p>
        <Link to="/mediator" className="inline-block text-xs font-bold text-[#505423]">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { dispute, tenancy, landlord, tenant, claims, offers } = caseData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-[#111111]">
              Case {dispute.caseNumber}
            </h1>
            <span className="bg-[#505423]/15 text-[#505423] text-xs font-extrabold px-3 py-1 rounded-full uppercase">
              {dispute.status}
            </span>
          </div>
          <p className="text-xs text-[#737373] mt-1">
            Landlord: <strong className="text-[#111111]">{landlord.name}</strong> | Tenant: <strong className="text-[#111111]">{tenant.name}</strong>
          </p>
        </div>

        {/* Log Review Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleLogReview}
            disabled={submitting}
            className="bg-[#505423] hover:bg-[#3f421b] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            Log Mediator Case Review
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-[#DC2626] text-xs p-4 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-[#1B8E13] text-xs p-4 rounded-xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Case Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">Security Deposit</span>
          <span className="text-xl font-extrabold text-[#111111] mt-1 block">{formatINR(dispute.totalDeposit)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">Calculated Deduction</span>
          <span className="text-xl font-extrabold text-[#1B8E13] mt-1 block">{dispute.calculatedDeduction ? formatINR(dispute.calculatedDeduction) : 'N/A'}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">Offers (L vs T)</span>
          <span className="text-sm font-bold text-[#111111] mt-1 block">
            {dispute.landlordOffer ? formatINR(dispute.landlordOffer) : 'None'} vs {dispute.tenantOffer ? formatINR(dispute.tenantOffer) : 'None'}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">Settlement Threshold</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block mt-1 ${dispute.settlementEligible ? 'bg-[#1B8E13]/15 text-[#1B8E13]' : 'bg-amber-50 text-amber-800'}`}>
            {dispute.settlementEligible ? '✓ Eligible (Within 5%)' : 'Outside 5% threshold'}
          </span>
        </div>
      </div>

      {/* Mediator Structured Recommendation Actions */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
          <Scale className="w-5 h-5 text-[#505423]" />
          <span>Structured Mediator Recommendation</span>
        </h2>

        <div>
          <label className="block text-xs font-semibold text-[#737373] mb-1">
            Recommendation Notes / Summary (Optional)
          </label>
          <input
            type="text"
            value={recommendationNote}
            onChange={(e) => setRecommendationNote(e.target.value)}
            className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
            placeholder="e.g. Parties are within the configured 5% GharPay settlement threshold."
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleRecommendation('READY_FOR_SETTLEMENT')}
            disabled={submitting}
            className="py-2.5 px-3 bg-[#1B8E13] hover:bg-[#15700f] text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 text-center"
          >
            Ready for Settlement
          </button>
          <button
            type="button"
            onClick={() => handleRecommendation('CONTINUE_NEGOTIATION')}
            disabled={submitting}
            className="py-2.5 px-3 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 text-center"
          >
            Continue Negotiation
          </button>
          <button
            type="button"
            onClick={() => handleRecommendation('NEEDS_CLARIFICATION')}
            disabled={submitting}
            className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 text-center"
          >
            Needs Clarification
          </button>
          <button
            type="button"
            onClick={() => handleRecommendation('INSUFFICIENT_EVIDENCE')}
            disabled={submitting}
            className="py-2.5 px-3 bg-gray-700 hover:bg-gray-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 text-center"
          >
            Insufficient Evidence
          </button>
        </div>
      </div>

      {/* Create Settlement Form (When status is SETTLEMENT_PENDING) */}
      {dispute.status === 'SETTLEMENT_PENDING' && (
        <form onSubmit={handleCreateSettlement} className="bg-white rounded-2xl border border-[#1B8E13] p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
            <Award className="w-5 h-5 text-[#1B8E13]" />
            <span>Prepare Settlement Terms (Assigned Mediator)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Agreed Deduction Amount (₹)
              </label>
              <input
                type="number"
                required
                value={agreedDeduction}
                onChange={(e) => setAgreedDeduction(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
                placeholder="26500"
              />
              <p className="text-[10px] text-[#737373] mt-1">
                Must be bounded between Tenant offer ({formatINR(dispute.tenantOffer)}) and Landlord offer ({formatINR(dispute.landlordOffer)}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#737373] mb-1">
                Calculated Tenant Refund Amount
              </label>
              <div className="p-2.5 bg-[#F7F7F5] rounded-xl text-sm font-extrabold text-[#1B8E13] border border-[#E5E5E5]">
                {formatINR(parseFloat(dispute.totalDeposit) - (parseFloat(agreedDeduction) || 0))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="py-3 px-6 bg-[#1B8E13] hover:bg-[#15700f] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            Create Settlement Record
          </button>
        </form>
      )}

      {/* Claims List Breakdown */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5E5E5]">
          <h2 className="text-base font-extrabold text-[#111111]">Claims & Evidence Audit View</h2>
        </div>
        <div className="divide-y divide-[#E5E5E5]">
          {claims && claims.map((c) => (
            <div key={c.id} className="p-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-[#B68400]">{c.category} - {c.description}</span>
                <span className="text-xs font-bold text-[#1B8E13]">Claimed: {formatINR(c.claimedAmount)} | Approved: {c.approvedAmount ? formatINR(c.approvedAmount) : 'N/A'}</span>
              </div>
              {c.calculationExplanation && (
                <p className="text-xs text-[#737373] bg-[#F7F7F5] p-2.5 rounded-lg border border-[#E5E5E5]">
                  {c.calculationExplanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MediatorCaseDetail;

