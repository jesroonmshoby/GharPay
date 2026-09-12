import React, { useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { formatINR } from '../../utils/formatters';
import {
  Award,
  Scale,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  AlertCircle,
  X,
  CreditCard,
} from 'lucide-react';

export const SettlementFlowCard = ({ dispute, settlement: initialSettlement, userRole, onRefresh }) => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const settlement = initialSettlement;

  if (!dispute) return null;

  const isEligible = dispute.settlementEligible;
  const isSettlementPending = dispute.status === 'SETTLEMENT_PENDING';
  const isSettled = dispute.status === 'SETTLED';
  const isPaid = settlement?.paymentStatus === 'MARKED_PAID';

  // Continue to Settlement (Direct Transition)
  const handleContinueToSettlement = async () => {
    setSubmitting(true);
    try {
      const agreedDeduction = dispute.landlordOffer || dispute.calculatedDeduction || dispute.claimedDeduction || 0;
      await api.settlement.createSettlement(dispute.id, { agreedDeduction });
      showSuccess('Settlement initialized. Both parties may now record digital consent.');
      if (onRefresh) await onRefresh();
    } catch (err) {
      if (err.code === 'DUPLICATE_SETTLEMENT') {
        if (onRefresh) await onRefresh();
      } else {
        showError(err.message || 'Unable to initialize settlement. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Provide Consent (Tenant / Landlord)
  const handleConsent = async (role) => {
    setSubmitting(true);
    try {
      if (role === 'TENANT') {
        await api.settlement.tenantConsent(dispute.id, true);
      } else {
        await api.settlement.landlordConsent(dispute.id, true);
      }
      showSuccess(`${role === 'TENANT' ? 'Tenant' : 'Landlord'} consent recorded successfully.`);
      if (onRefresh) await onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to record consent');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Mark as Paid
  const handleConfirmMarkAsPaid = async () => {
    setSubmitting(true);
    try {
      const res = await api.settlement.markAsPaid(dispute.id);
      showSuccess(res.message || 'Refund payment confirmed and marked as paid.');
      setShowPaymentModal(false);
      if (onRefresh) await onRefresh();
    } catch (err) {
      showError(err.message || 'Failed to mark payment as paid');
    } finally {
      setSubmitting(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    showInfo('Generating settlement PDF document...');
    try {
      const blob = await api.settlement.downloadPdf(dispute.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dispute.caseNumber || 'settlement'}_settlement.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Settlement PDF downloaded successfully.');
    } catch (err) {
      showError(err.message || 'Unable to generate PDF document');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // STAGE 4: PAID -> Show PDF Download
  if (isSettled && isPaid) {
    return (
      <div className="bg-white p-6 rounded-2xl border-2 border-[#1B8E13] shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-[#1B8E13]">
          <CheckCircle className="w-6 h-6" />
          <h2 className="text-lg font-extrabold uppercase">SETTLEMENT COMPLETE</h2>
        </div>

        <p className="text-sm font-extrabold text-[#1B8E13]">
          ✓ Refund marked as paid
        </p>

        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="px-6 py-3 bg-[#B68400] hover:bg-[#966d00] text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloadingPdf ? 'Generating PDF...' : 'Download Settlement PDF'}</span>
        </button>
      </div>
    );
  }

  // STAGE 3: SETTLED -> Show Consent Badges & Mark as Paid Action
  if (isSettled) {
    return (
      <div className="bg-white p-6 rounded-2xl border-2 border-[#1B8E13] shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-[#1B8E13]">
          <CheckCircle className="w-6 h-6" />
          <h2 className="text-lg font-extrabold uppercase">SETTLEMENT RECORDED</h2>
        </div>

        <div className="space-y-1 text-xs text-[#111111]">
          <p className="font-bold text-[#1B8E13]">✓ Tenant consent recorded</p>
          <p className="font-bold text-[#1B8E13]">✓ Landlord consent recorded</p>
        </div>

        {settlement && (
          <div className="bg-[#F7F7F5] p-4 rounded-xl border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#737373] uppercase block">Refund Amount</span>
            <span className="text-2xl font-extrabold text-[#1B8E13]">
              {formatINR(settlement.refundAmount)}
            </span>
          </div>
        )}

        {userRole === 'LANDLORD' ? (
          <div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-6 py-3 bg-[#B68400] hover:bg-[#966d00] text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>Mark Refund as Paid</span>
            </button>
          </div>
        ) : (
          <p className="text-xs font-semibold text-[#737373] italic">
            Waiting for landlord payment confirmation.
          </p>
        )}

        {/* Modal for Mark Refund as Paid */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-200">
              <div className="bg-gradient-to-r from-amber-700 to-zinc-900 p-5 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-300" />
                  <h3 className="font-bold text-sm">Confirm Refund Payment</h3>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-zinc-300 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs text-zinc-700">
                <p className="text-sm font-semibold text-zinc-900">
                  Confirm that you have paid <span className="text-[#1B8E13] font-bold">{formatINR(settlement?.refundAmount)}</span> to the tenant outside GharPay.
                </p>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
                  <p className="font-bold">Disclaimer Notice:</p>
                  <p>GharPay records payment confirmation but does not process or transfer funds.</p>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 font-medium text-zinc-600 hover:text-zinc-900 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmMarkAsPaid}
                    disabled={submitting}
                    className="px-5 py-2 font-bold text-white bg-[#B68400] hover:bg-[#966d00] rounded-lg shadow transition disabled:opacity-50"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STAGE 2: SETTLEMENT PENDING -> Party Consents
  if (isSettlementPending) {
    return (
      <div className="bg-white p-6 rounded-2xl border-2 border-[#B68400] shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-[#B68400]">
          <Award className="w-6 h-6" />
          <h2 className="text-lg font-extrabold uppercase">SETTLEMENT PENDING</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tenant Consent Card */}
          <div className={`p-4 rounded-xl border space-y-2 ${settlement?.consentTenant ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-xs font-bold block text-[#111111]">Tenant Consent</span>
            {settlement?.consentTenant ? (
              <span className="text-xs font-bold text-[#1B8E13] block">✓ Tenant Consent Recorded</span>
            ) : (
              userRole === 'TENANT' ? (
                <button
                  onClick={() => handleConsent('TENANT')}
                  disabled={submitting}
                  className="mt-2 px-5 py-2.5 bg-[#1B8E13] hover:bg-[#15700f] text-white text-xs font-extrabold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'I Agree'}
                </button>
              ) : (
                <span className="text-xs text-amber-800 block">Awaiting Tenant Consent</span>
              )
            )}
          </div>

          {/* Landlord Consent Card */}
          <div className={`p-4 rounded-xl border space-y-2 ${settlement?.consentLandlord ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-xs font-bold block text-[#111111]">Landlord Consent</span>
            {settlement?.consentLandlord ? (
              <span className="text-xs font-bold text-[#1B8E13] block">✓ Landlord Consent Recorded</span>
            ) : (
              userRole === 'LANDLORD' ? (
                <button
                  onClick={() => handleConsent('LANDLORD')}
                  disabled={submitting}
                  className="mt-2 px-5 py-2.5 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-extrabold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'I Agree'}
                </button>
              ) : (
                <span className="text-xs text-amber-800 block">Awaiting Landlord Consent</span>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // STAGE 1: SETTLEMENT IS ELIGIBLE
  if (isEligible) {
    const landlordOffer = parseFloat(dispute.landlordOffer) || 0;
    const tenantOffer = parseFloat(dispute.tenantOffer) || 0;
    const diff = Math.abs(landlordOffer - tenantOffer);

    return (
      <div className="bg-[#FFFDF5] border-2 border-[#B68400] p-6 rounded-2xl shadow-md space-y-4">
        <div className="flex items-center space-x-2 text-[#B68400]">
          <Award className="w-6 h-6" />
          <h2 className="text-lg font-extrabold tracking-wide uppercase">SETTLEMENT ELIGIBLE</h2>
        </div>
        <p className="text-sm font-semibold text-[#111111]">
          Your negotiation has reached settlement eligibility under configured GharPay rules.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-[#E5E5E5]">
          <div>
            <span className="text-xs text-[#737373] block font-semibold uppercase">Calculated Deduction</span>
            <span className="text-base font-extrabold text-[#1B8E13]">
              {dispute.calculatedDeduction ? formatINR(dispute.calculatedDeduction) : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#737373] block font-semibold uppercase">Latest Landlord Offer</span>
            <span className="text-base font-extrabold text-[#111111]">
              {dispute.landlordOffer ? formatINR(dispute.landlordOffer) : 'None'}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#737373] block font-semibold uppercase">Latest Tenant Offer</span>
            <span className="text-base font-extrabold text-[#111111]">
              {dispute.tenantOffer ? formatINR(dispute.tenantOffer) : 'None'}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#737373] block font-semibold uppercase">Difference</span>
            <span className="text-base font-extrabold text-[#B68400]">
              {diff > 0 ? formatINR(diff) : '₹0'}
            </span>
          </div>
        </div>

        <button
          onClick={handleContinueToSettlement}
          disabled={submitting}
          className="w-full sm:w-auto px-6 py-3 bg-[#B68400] hover:bg-[#966d00] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Award className="w-5 h-5" />
          <span>{submitting ? 'Initializing...' : 'Continue to Settlement'}</span>
        </button>
      </div>
    );
  }

  return null;
};

export default SettlementFlowCard;
