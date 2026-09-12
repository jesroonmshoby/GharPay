import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
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
  Check,
  XCircle,
  HelpCircle,
  Edit3,
} from 'lucide-react';

import SettlementFlowCard from '../../components/common/SettlementFlowCard';

export const MediatorCaseDetail = () => {
  const { id } = useParams();
  const { showSuccess, showError } = useNotification();
  const [caseData, setCaseData] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Recommendation State
  const [recommendationNote, setRecommendationNote] = useState('');

  // Individual Claim Review Active Forms State
  const [activeClaimReviewId, setActiveClaimReviewId] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [approvedAmountInput, setApprovedAmountInput] = useState('');
  const [reviewNoteInput, setReviewNoteInput] = useState('');

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    try {
      const res = await api.mediator.getCase(id);
      setCaseData(res.caseDetails);
      const sRes = await api.settlement.getSettlement(id).catch(() => null);
      if (sRes && sRes.settlement) {
        setSettlement(sRes.settlement);
      } else {
        setSettlement(null);
      }
    } catch (err) {
      showError(err.message || 'Failed to load mediator case details');
    } finally {
      setLoading(false);
    }
  };

  const handleLogReview = async () => {
    setSubmitting(true);
    try {
      await api.mediator.reviewCase(id);
      showSuccess('Case review action logged successfully by Priya Menon.');
      await fetchCaseDetails();
    } catch (err) {
      showError(err.message || 'Failed to log review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimReviewSubmit = async (claim) => {
    setSubmitting(true);
    try {
      const payload = {
        status: reviewStatus,
        reviewNote: reviewNoteInput,
      };

      if (reviewStatus === 'PARTIAL') {
        payload.approvedAmount = parseFloat(approvedAmountInput);
      }

      await api.mediator.reviewClaim(claim.id, payload);
      showSuccess(`Claim "${claim.category}" reviewed: ${reviewStatus}`);
      setActiveClaimReviewId(null);
      setReviewNoteInput('');
      setApprovedAmountInput('');
      await fetchCaseDetails();
    } catch (err) {
      showError(err.message || 'Failed to update claim review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecommendation = async (recommendationType) => {
    setSubmitting(true);
    try {
      await api.mediator.submitRecommendation(id, {
        recommendation: recommendationType,
        note: recommendationNote,
      });
      showSuccess(`Mediator recommendation recorded: ${recommendationType}`);
      await fetchCaseDetails();
    } catch (err) {
      showError(err.message || 'Failed to submit recommendation');
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
        <p className="text-xs text-[#737373]">The requested case could not be retrieved.</p>
        <Link to="/mediator" className="inline-block text-xs font-bold text-[#505423]">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { dispute, tenancy, landlord, tenant, claims, offers, mediator } = caseData;
  const mediatorName = mediator ? mediator.name : 'Priya Menon';

  const pendingClaims = claims.filter(
    (c) => c.status === 'PENDING' || c.status === 'NEEDS_CLARIFICATION'
  );
  const reviewedClaims = claims.filter(
    (c) => c.status !== 'PENDING' && c.status !== 'NEEDS_CLARIFICATION'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
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
            Landlord: <strong className="text-[#111111]">{landlord.name}</strong> ({landlord.email}) | Tenant: <strong className="text-[#111111]">{tenant.name}</strong> ({tenant.email})
          </p>
          <p className="text-xs text-[#505423] font-semibold mt-1">
            Assigned Mediator: <strong>{mediatorName}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleLogReview}
            disabled={submitting}
            className="bg-[#505423] hover:bg-[#3f421b] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            Log Mediator Review Timestamp
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">Security Deposit</span>
          <span className="text-xl font-extrabold text-[#111111] mt-1 block">{formatINR(dispute.totalDeposit)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">Claimed Deduction</span>
          <span className="text-xl font-extrabold text-[#B68400] mt-1 block">{formatINR(dispute.claimedDeduction)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">Reviewed Calculated</span>
          <span className="text-xl font-extrabold text-[#1B8E13] mt-1 block">{dispute.calculatedDeduction ? formatINR(dispute.calculatedDeduction) : 'Awaiting Review'}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">Settlement Eligibility</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block mt-1 ${dispute.settlementEligible ? 'bg-[#1B8E13]/15 text-[#1B8E13]' : 'bg-amber-50 text-amber-800'}`}>
            {dispute.settlementEligible ? '✓ Eligible' : 'In Progress'}
          </span>
        </div>
      </div>

      {/* Prominent Settlement Flow Card */}
      <SettlementFlowCard
        dispute={dispute}
        settlement={settlement}
        userRole="MEDIATOR"
        onRefresh={fetchCaseDetails}
      />

      {/* SECTION 1: Claims Awaiting Mediator Review */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-[#E5E5E5] bg-[#F7F7F5] flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
              <Scale className="w-5 h-5 text-[#505423]" />
              <span>Claims Awaiting Review ({pendingClaims.length})</span>
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              Review each claim individually before final calculation can run.
            </p>
          </div>
          {pendingClaims.length === 0 && (
            <span className="text-xs font-bold bg-[#1B8E13]/15 text-[#1B8E13] px-3 py-1 rounded-full">
              ✓ All Claims Reviewed
            </span>
          )}
        </div>

        <div className="divide-y divide-[#E5E5E5]">
          {claims && claims.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#737373]">
              No claims created for this dispute case yet.
            </div>
          ) : (
            claims.map((c) => {
              const isPending = c.status === 'PENDING' || c.status === 'NEEDS_CLARIFICATION';
              const isEditing = activeClaimReviewId === c.id;

              return (
                <div key={c.id} className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-extrabold uppercase text-[#B68400] px-2.5 py-0.5 bg-[#B68400]/10 rounded">
                          {c.category}
                        </span>
                        <h3 className="text-sm font-bold text-[#111111]">{c.description}</h3>
                      </div>
                      <p className="text-xs text-[#737373] mt-1">
                        Claimed Amount: <strong className="text-[#111111]">{formatINR(c.claimedAmount)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                        c.status === 'APPROVED' ? 'bg-[#1B8E13]/15 text-[#1B8E13]' :
                        c.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                        c.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-blue-50 text-blue-800'
                      }`}>
                        {c.status === 'PENDING' ? 'Awaiting Mediator Review' : c.status}
                      </span>

                      {!isEditing && (
                        <button
                          onClick={() => {
                            setActiveClaimReviewId(c.id);
                            setReviewStatus('APPROVED');
                            setApprovedAmountInput(c.claimedAmount);
                            setReviewNoteInput(c.mediatorReviewNote || '');
                          }}
                          className="text-xs font-bold text-[#505423] hover:underline flex items-center space-x-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isPending ? 'Review Claim' : 'Edit Review'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Evidence Section */}
                  {c.evidence && c.evidence.length > 0 ? (
                    <div className="bg-[#F7F7F5] border border-[#E5E5E5] p-3 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-[#111111] block">
                        Supporting Evidence ({c.evidence.length} files attached):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {c.evidence.map((ev) => (
                          <div key={ev.id} className="bg-white border border-[#E5E5E5] p-2.5 rounded-lg flex items-center justify-between text-xs">
                            <div className="truncate pr-2">
                              <span className="text-[9px] font-bold uppercase text-[#505423] block">{ev.type}</span>
                              <span className="font-medium text-[#111111] truncate block">{ev.description || 'Uploaded Document'}</span>
                            </div>
                            {ev.fileUrl && (
                              <a
                                href={ev.fileUrl.startsWith('http') ? ev.fileUrl : `http://localhost:4000${ev.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-[#B68400] hover:underline bg-[#F7F7F5] border border-[#E5E5E5] px-2 py-1 rounded flex-shrink-0"
                              >
                                View Evidence
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#737373] italic">
                      No supporting evidence files attached.
                    </div>
                  )}

                  {/* Mediator Review Status Badge */}
                  {!isPending && !isEditing && (
                    <div className="bg-[#1B8E13]/5 border border-[#1B8E13]/20 p-3 rounded-xl space-y-1">
                      <div className="flex items-center space-x-2 text-xs font-bold text-[#1B8E13]">
                        <Check className="w-4 h-4" />
                        <span>Reviewed by {mediatorName}</span>
                        {c.mediatorReviewedAt && (
                          <span className="text-[#737373] font-normal">on {formatDate(c.mediatorReviewedAt)}</span>
                        )}
                      </div>
                      <p className="text-xs text-[#111111]">
                        Decision: <strong>{c.status}</strong> | Approved Amount: <strong>{formatINR(c.approvedAmount || 0)}</strong>
                      </p>
                      {c.mediatorReviewNote && (
                        <p className="text-xs text-[#737373] italic">
                          Mediator Note: "{c.mediatorReviewNote}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Interactive Claim Review Form */}
                  {isEditing && (
                    <div className="bg-[#505423]/5 border border-[#505423]/20 p-4 rounded-xl space-y-4">
                      <h4 className="text-xs font-extrabold text-[#505423] uppercase tracking-wider">
                        Mediator Claim Review Form
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewStatus('APPROVED');
                            setApprovedAmountInput(c.claimedAmount);
                          }}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            reviewStatus === 'APPROVED' ? 'bg-[#1B8E13] text-white border-[#1B8E13]' : 'bg-white text-[#111111] border-[#E5E5E5]'
                          }`}
                        >
                          Approve ({formatINR(c.claimedAmount)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewStatus('PARTIAL')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            reviewStatus === 'PARTIAL' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-[#111111] border-[#E5E5E5]'
                          }`}
                        >
                          Partially Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewStatus('REJECTED');
                            setApprovedAmountInput('0');
                          }}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            reviewStatus === 'REJECTED' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-[#111111] border-[#E5E5E5]'
                          }`}
                        >
                          Reject (₹0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewStatus('NEEDS_CLARIFICATION')}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            reviewStatus === 'NEEDS_CLARIFICATION' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-[#111111] border-[#E5E5E5]'
                          }`}
                        >
                          Request Clarification
                        </button>
                      </div>

                      {reviewStatus === 'PARTIAL' && (
                        <div>
                          <label className="block text-xs font-semibold text-[#111111] mb-1">
                            Approved Amount (₹)
                          </label>
                          <input
                            type="number"
                            value={approvedAmountInput}
                            onChange={(e) => setApprovedAmountInput(e.target.value)}
                            max={c.claimedAmount}
                            min="0"
                            className="w-full sm:w-1/2 px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
                            placeholder={`Max ₹${c.claimedAmount}`}
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-[#111111] mb-1">
                          Mediator Review Explanation / Note
                        </label>
                        <input
                          type="text"
                          value={reviewNoteInput}
                          onChange={(e) => setReviewNoteInput(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
                          placeholder="Provide mediator review rationale..."
                        />
                      </div>

                      <div className="flex items-center space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleClaimReviewSubmit(c)}
                          disabled={submitting}
                          className="py-2 px-4 bg-[#505423] hover:bg-[#3f421b] text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                        >
                          Save Claim Review
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveClaimReviewId(null)}
                          className="py-2 px-4 bg-white border border-[#E5E5E5] text-[#111111] text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MediatorCaseDetail;
