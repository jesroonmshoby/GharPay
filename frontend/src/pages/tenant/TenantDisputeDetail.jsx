import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  FileText,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Download,
  FileCheck,
  Award,
  Scale,
} from 'lucide-react';
import CourtRegistrationModal from '../../components/common/CourtRegistrationModal';
import SettlementFlowCard from '../../components/common/SettlementFlowCard';

export const TenantDisputeDetail = () => {
  const { id } = useParams();
  const { showSuccess, showError } = useNotification();
  const [dispute, setDispute] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCourtModal, setShowCourtModal] = useState(false);

  // Tenant offer form state
  const [tenantOfferAmount, setTenantOfferAmount] = useState('26000');
  const [tenantOfferMessage, setTenantOfferMessage] = useState('I can agree to ₹26,000 as the deduction.');

  const handleProposeOutsideAgreement = async () => {
    if (!window.confirm('Propose an Out-of-Court Settlement? This will request mutual consent from the landlord to withdraw the online dispute.')) {
      return;
    }
    try {
      const res = await api.disputeActions.proposeOutsideAgreement(id);
      showSuccess(res.message);
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Failed to propose outside agreement');
    }
  };

  const handleRespondOutsideAgreement = async (accept) => {
    try {
      const res = await api.disputeActions.respondOutsideAgreement(id, accept);
      showSuccess(res.message);
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Failed to respond to outside agreement');
    }
  };

  useEffect(() => {
    fetchDisputeDetails();
  }, [id]);

  const fetchDisputeDetails = async () => {
    setLoading(true);
    try {
      const res = await api.tenant.getDispute(id);
      setDispute(res.dispute);

      const sRes = await api.settlement.getSettlement(id).catch(() => null);
      if (sRes && sRes.settlement) {
        setSettlement(sRes.settlement);
      } else {
        setSettlement(null);
      }
    } catch (err) {
      showError(err.message || 'Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewCalculation = async () => {
    setSubmitting(true);
    try {
      await api.tenant.reviewDispute(id);
      showSuccess('Case status updated to TENANT_REVIEW');
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Failed to update review status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNegotiation = async () => {
    setSubmitting(true);
    try {
      await api.tenant.startNegotiation(id);
      showSuccess('Negotiation phase started');
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Failed to start negotiation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.tenant.submitOffer(id, {
        amount: parseFloat(tenantOfferAmount),
        message: tenantOfferMessage,
      });
      showSuccess('Offer submitted successfully.');
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Failed to submit offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTenantConsent = async () => {
    setSubmitting(true);
    try {
      const res = await api.settlement.tenantConsent(id, true);
      showSuccess('Tenant consent recorded successfully.');
      setSettlement(res.settlement);
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Failed to record consent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await api.settlement.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dispute.caseNumber}_settlement.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('PDF downloaded successfully.');
    } catch (err) {
      showError(err.message || 'Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs text-[#737373]">
        Loading dispute details...
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto" />
        <h2 className="text-lg font-bold text-[#111111]">Dispute Not Found</h2>
        <p className="text-xs text-[#737373]">The requested case could not be retrieved.</p>
        <Link to="/tenant" className="inline-block text-xs font-bold text-[#1B8E13]">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-[#111111]">
              Case {dispute.caseNumber}
            </h1>
            <span className="bg-[#1B8E13]/15 text-[#1B8E13] text-xs font-extrabold px-3 py-1 rounded-full uppercase">
              {dispute.status}
            </span>
          </div>
          <p className="text-xs text-[#737373] mt-1">
            Property: {dispute.property?.addressLine1}, {dispute.property?.city}
          </p>
        </div>

        {/* Dynamic Actions Based on Status */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={async () => {
              try {
                const res = await api.disputeActions.requestMediatorReview(id);
                showSuccess(res.message || 'Mediator review requested successfully.');
                await fetchDisputeDetails();
              } catch (err) {
                showError(err.message || 'Unable to request mediator review. Please try again.');
              }
            }}
            className="inline-flex items-center space-x-2 bg-[#505423] hover:bg-[#3f421b] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Scale className="w-4 h-4" />
            <span>Request Mediator Review</span>
          </button>

          {dispute.status !== 'DRAFT' && dispute.status !== 'SETTLED' && (
            <button
              onClick={handleProposeOutsideAgreement}
              className="inline-flex items-center space-x-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            >
              <FileText className="w-4 h-4 text-amber-700" />
              <span>Propose Outside Agreement</span>
            </button>
          )}

          {(dispute.currentRound >= 3 || dispute.status === 'MEDIATOR_REVIEW' || dispute.status === 'REJECTED') && (
            <button
              onClick={() => setShowCourtModal(true)}
              className="inline-flex items-center space-x-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Scale className="w-4 h-4 text-amber-300" />
              <span>Apply for Online Court Registration</span>
            </button>
          )}

          {dispute.status === 'CALCULATED' && (
            <button
              onClick={handleReviewCalculation}
              disabled={submitting}
              className="bg-[#1B8E13] hover:bg-[#15700f] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              Review Calculation
            </button>
          )}

          {dispute.status === 'TENANT_REVIEW' && (
            <button
              onClick={handleStartNegotiation}
              disabled={submitting}
              className="bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              Start Negotiation
            </button>
          )}
        </div>
      </div>

      {/* Post-3 Negotiation Round / Deadlock Banner */}
      {(dispute.currentRound >= 3 || dispute.status === 'MEDIATOR_REVIEW') && (
        <div className="bg-gradient-to-r from-amber-900 via-amber-850 to-zinc-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-amber-700/50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-400/30 text-amber-300 shrink-0">
              <Scale className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-amber-200">
                Negotiation Completed (3 Rounds Finished Without Mutual Settlement)
              </h3>
              <p className="text-xs text-zinc-300 max-w-2xl">
                If conciliation could not settle the deposit deduction after 3 rounds, you can generate your formal legal application for Online Registration of a Court Case on the e-Courts portal.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCourtModal(true)}
            className="px-5 py-2.5 text-xs font-bold text-zinc-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow transition-all shrink-0 flex items-center gap-2"
          >
            <span>Apply for Online Court Case</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Outside Agreement Proposal Pending Card */}
      {dispute.outsideAgreement && (
        dispute.outsideAgreement.proposedBy === JSON.parse(localStorage.getItem('gharpay_user') || '{}').id ? (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-700 dark:text-amber-300 shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-900 dark:text-amber-100">
                  Outside Settlement Proposal Pending
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  You have requested an out-of-court settlement for this dispute. Awaiting mutual consent from the Landlord.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3.5 py-2 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-xl border border-amber-300 dark:border-amber-700">
              Awaiting Landlord Consent
            </span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-zinc-900 text-white p-6 rounded-2xl shadow-lg border border-emerald-700/60 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300 shrink-0">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-emerald-200">
                  Out-of-Court Settlement Proposed by Landlord
                </h3>
                <p className="text-xs text-emerald-100/90 max-w-2xl">
                  The landlord has requested to settle this deposit dispute outside of GharPay conciliation. Do you agree to accept mutual outside settlement and close this case?
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-700/50">
              <button
                onClick={() => handleRespondOutsideAgreement(true)}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Accept Outside Agreement & Close Case</span>
              </button>

              <button
                onClick={() => handleRespondOutsideAgreement(false)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-red-300 border border-red-900/60 font-semibold text-xs rounded-xl transition-all"
              >
                <span>Decline & Continue ODR Conciliation</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Court Registration Modal */}
      <CourtRegistrationModal
        isOpen={showCourtModal}
        onClose={() => setShowCourtModal(false)}
        dispute={dispute}
        onSubmitted={() => fetchDisputeDetails()}
      />

      {/* Case Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">
            Total Deposit
          </span>
          <span className="text-xl font-extrabold text-[#111111] mt-1 block">
            {formatINR(dispute.totalDeposit)}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">
            Landlord Claimed
          </span>
          <span className="text-xl font-extrabold text-[#111111] mt-1 block">
            {formatINR(dispute.claimedDeduction)}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">
            GharPay Approved
          </span>
          <span className="text-xl font-extrabold text-[#1B8E13] mt-1 block">
            {dispute.calculatedDeduction ? formatINR(dispute.calculatedDeduction) : 'Pending'}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">
            Negotiation Status
          </span>
          <span className="text-xl font-extrabold text-[#B68400] mt-1 block">
            Round {dispute.currentRound || 0} / 3
          </span>
        </div>
      </div>

      {/* Prominent Settlement Flow Card */}
      <SettlementFlowCard
        dispute={dispute}
        settlement={settlement}
        userRole="TENANT"
        onRefresh={fetchDisputeDetails}
      />

      {/* Claims & ODR Calculation Breakdown */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5E5E5]">
          <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#1B8E13]" />
            <span>Claims Breakdown & Transparent ODR Calculation</span>
          </h2>
        </div>

        <div className="divide-y divide-[#E5E5E5]">
          {dispute.claims && dispute.claims.length > 0 ? (
            dispute.claims.map((c) => (
              <div key={c.id} className="p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-[#B68400] tracking-wider block">
                      {c.category}
                    </span>
                    <p className="text-sm font-semibold text-[#111111] mt-0.5">{c.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#737373] block">Landlord Claimed: {formatINR(c.claimedAmount)}</span>
                    {c.status === 'PENDING' ? (
                      <span className="text-xs font-bold text-[#505423] bg-[#505423]/10 px-2 py-0.5 rounded block mt-0.5">
                        Awaiting Mediator Review
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-[#1B8E13] block">
                        Mediator {c.status}: {formatINR(c.approvedAmount || 0)}
                      </span>
                    )}
                  </div>
                </div>

                {c.calculationExplanation && (
                  <div className="bg-[#F7F7F5] border border-[#E5E5E5] p-3.5 rounded-xl text-xs text-[#505423]">
                    <strong>GharPay ODR Policy Evaluation:</strong> {c.calculationExplanation}
                  </div>
                )}

                {/* Evidence Attachments Display */}
                {c.evidence && c.evidence.length > 0 && (
                  <div className="pt-2 border-t border-[#E5E5E5]/60 space-y-2">
                    <span className="text-xs font-bold text-[#111111] block">
                      Supporting Evidence: <strong>{c.evidence.length} file(s) attached</strong>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {c.evidence.map((ev) => (
                        <div key={ev.id} className="bg-[#F7F7F5] border border-[#E5E5E5] p-2.5 rounded-xl flex items-center justify-between text-xs">
                          <div className="truncate pr-2">
                            <span className="text-[10px] font-extrabold uppercase text-[#B68400] block">
                              {ev.type}
                            </span>
                            <span className="font-semibold text-[#111111] block truncate">
                              {ev.description || 'Evidence Document'}
                            </span>
                          </div>
                          {ev.fileUrl && (
                            <a
                              href={ev.fileUrl.startsWith('http') ? ev.fileUrl : `http://localhost:4000${ev.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-[11px] font-bold text-[#505423] hover:text-[#B68400] bg-white border border-[#E5E5E5] px-2.5 py-1 rounded-lg flex-shrink-0"
                            >
                              <span>View</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))

          ) : (
            <div className="p-6 text-center text-xs text-[#737373]">No claims listed.</div>
          )}
        </div>
      </div>

      {/* Negotiation Section */}
      {(dispute.status === 'NEGOTIATION' || dispute.status === 'TENANT_REVIEW') && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-[#B68400]" />
              <span>Multi-Round Negotiation (Round {dispute.currentRound} / 3)</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F7F7F5] p-4 rounded-xl border border-[#E5E5E5]">
            <div>
              <span className="text-xs text-[#737373] block">Landlord Offer</span>
              <span className="text-lg font-extrabold text-[#111111]">{dispute.landlordOffer ? formatINR(dispute.landlordOffer) : 'None'}</span>
            </div>
            <div>
              <span className="text-xs text-[#737373] block">Your Tenant Offer</span>
              <span className="text-lg font-extrabold text-[#111111]">{dispute.tenantOffer ? formatINR(dispute.tenantOffer) : 'None'}</span>
            </div>
            <div>
              <span className="text-xs text-[#737373] block">Settlement Eligibility</span>
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full inline-block mt-1 ${dispute.settlementEligible ? 'bg-[#1B8E13]/15 text-[#1B8E13]' : 'bg-amber-50 text-amber-800'}`}>
                {dispute.settlementEligible ? '✓ Eligible for Settlement' : 'Outside 5% threshold'}
              </span>
            </div>
          </div>

          {/* Submit Tenant Offer Form */}
          <form onSubmit={handleSubmitOffer} className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-[#111111] uppercase">Submit Revised Tenant Offer</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Your Offered Deduction (₹)</label>
                <input
                  type="number"
                  required
                  value={tenantOfferAmount}
                  onChange={(e) => setTenantOfferAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
                  placeholder="26000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Message Note (Optional)</label>
                <input
                  type="text"
                  value={tenantOfferMessage}
                  onChange={(e) => setTenantOfferMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
                  placeholder="I can agree to ₹26,000 as the deduction."
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#1B8E13] hover:bg-[#15700f] rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              Submit Tenant Offer
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TenantDisputeDetail;

