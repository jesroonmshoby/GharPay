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
} from 'lucide-react';

export const TenantDisputeDetail = () => {
  const { id } = useParams();
  const { showSuccess, showError } = useNotification();
  const [dispute, setDispute] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tenant offer form state
  const [tenantOfferAmount, setTenantOfferAmount] = useState('26000');
  const [tenantOfferMessage, setTenantOfferMessage] = useState('I can agree to ₹26,000 as the deduction.');

  useEffect(() => {
    fetchDisputeDetails();
  }, [id]);

  const fetchDisputeDetails = async () => {
    setLoading(true);
    try {
      const res = await api.tenant.getDispute(id);
      setDispute(res.dispute);

      // Attempt to load settlement if in SETTLEMENT_PENDING or SETTLED
      if (res.dispute.status === 'SETTLEMENT_PENDING' || res.dispute.status === 'SETTLED') {
        const sRes = await api.settlement.getSettlement(id).catch(() => null);
        if (sRes) setSettlement(sRes.settlement);
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
        <div className="flex items-center space-x-3">
          {dispute.status === 'CALCULATED' && (
            <button
              onClick={handleReviewCalculation}
              disabled={submitting}
              className="bg-[#1B8E13] hover:bg-[#15700f] text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              Review Calculation
            </button>
          )}

          {dispute.status === 'TENANT_REVIEW' && (
            <button
              onClick={handleStartNegotiation}
              disabled={submitting}
              className="bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              Start Negotiation
            </button>
          )}
        </div>
      </div>

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
                    {c.approvedAmount !== null && (
                      <span className="text-sm font-bold text-[#1B8E13] block">Engine Approved: {formatINR(c.approvedAmount)}</span>
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

      {/* Settlement & Consent Section */}
      {(dispute.status === 'SETTLEMENT_PENDING' || dispute.status === 'SETTLED') && settlement && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-6 shadow-sm">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 text-[#1B8E13]" />
            <div>
              <h2 className="text-base font-extrabold text-[#111111]">
                {dispute.status === 'SETTLED' ? 'Settlement Completed & Recorded' : 'Settlement Review & Consent'}
              </h2>
              <p className="text-xs text-[#737373]">
                GharPay ODR Agreement Summary
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F7F7F5] p-5 rounded-xl border border-[#E5E5E5]">
            <div>
              <span className="text-xs text-[#737373] block uppercase font-semibold">Agreed Deduction</span>
              <span className="text-2xl font-extrabold text-[#111111] mt-1 block">{formatINR(settlement.agreedDeduction)}</span>
            </div>
            <div>
              <span className="text-xs text-[#737373] block uppercase font-semibold">Refund Amount to Tenant</span>
              <span className="text-2xl font-extrabold text-[#1B8E13] mt-1 block">{formatINR(settlement.refundAmount)}</span>
            </div>
          </div>

          {/* Consent Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${settlement.consentTenant ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <span className="text-xs font-bold text-[#111111] block">Tenant Consent (Aarav Sharma)</span>
              <span className="text-xs mt-1 block">
                {settlement.consentTenant ? '✓ Explicit Consent Recorded' : 'Pending Consent'}
              </span>
            </div>
            <div className={`p-4 rounded-xl border ${settlement.consentLandlord ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <span className="text-xs font-bold text-[#111111] block">Landlord Consent (Ramesh Kumar)</span>
              <span className="text-xs mt-1 block">
                {settlement.consentLandlord ? '✓ Explicit Consent Recorded' : 'Pending Consent'}
              </span>
            </div>
          </div>

          {/* Consent Button for Tenant */}
          {!settlement.consentTenant && dispute.status === 'SETTLEMENT_PENDING' && (
            <div className="pt-2">
              <button
                onClick={handleTenantConsent}
                disabled={submitting}
                className="w-full py-3.5 bg-[#1B8E13] hover:bg-[#15700f] text-white text-xs font-extrabold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>I agree to this settlement</span>
              </button>
            </div>
          )}

          {/* Download Settlement PDF Button */}
          {dispute.status === 'SETTLED' && (
            <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between">
              <div className="text-xs text-[#1B8E13] font-bold flex items-center space-x-2">
                <FileCheck className="w-5 h-5" />
                <span>Both parties have consented. Settlement recorded.</span>
              </div>
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center space-x-2 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Settlement PDF</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TenantDisputeDetail;

