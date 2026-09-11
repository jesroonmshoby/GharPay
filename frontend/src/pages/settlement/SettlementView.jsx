import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  Award,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck,
  Shield,
  CreditCard,
  X,
  FileText,
  DollarSign,
} from 'lucide-react';

export const SettlementView = () => {
  const { id } = useParams();
  const { showSuccess, showError, showInfo } = useNotification();
  const [settlement, setSettlement] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingConsent, setSubmittingConsent] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('gharpay_user') || '{}');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch settlement record from backend (source of truth)
      const sRes = await api.settlement.getSettlement(id).catch(() => null);
      if (sRes && sRes.settlement) {
        setSettlement(sRes.settlement);
      } else {
        setSettlement(null);
      }

      // 2. Fetch dispute details based on role
      let dRes = null;
      if (currentUser.role === 'LANDLORD') {
        dRes = await api.landlord.getDispute(id).catch(() => null);
      } else if (currentUser.role === 'TENANT') {
        dRes = await api.tenant.getDispute(id).catch(() => null);
      } else if (currentUser.role === 'MEDIATOR') {
        dRes = await api.mediator.getCase(id).catch(() => null);
      }

      if (dRes && (dRes.dispute || dRes.caseDetails)) {
        setDispute(dRes.dispute || dRes.caseDetails);
      }
    } catch (err) {
      console.error('Error fetching settlement data:', err);
      showError(err.message || 'Failed to load settlement details');
    } finally {
      setLoading(false);
    }
  };

  const handleConsent = async (role) => {
    setSubmittingConsent(true);
    try {
      let res;
      if (role === 'TENANT') {
        res = await api.settlement.tenantConsent(id, true);
      } else {
        res = await api.settlement.landlordConsent(id, true);
      }
      showSuccess(`${role === 'TENANT' ? 'Tenant' : 'Landlord'} consent recorded successfully.`);
      setSettlement(res.settlement);
      await fetchData();
    } catch (err) {
      showError(err.message || 'Failed to record consent');
    } finally {
      setSubmittingConsent(false);
    }
  };

  const handleConfirmMarkAsPaid = async () => {
    setSubmittingPayment(true);
    try {
      const res = await api.settlement.markAsPaid(id);
      showSuccess(res.message || 'Refund payment confirmed and marked as paid.');
      setShowPaymentModal(false);
      await fetchData();
    } catch (err) {
      showError(err.message || 'Failed to mark payment as paid');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    showInfo('Generating settlement PDF document...');
    try {
      const blob = await api.settlement.downloadPdf(id);
      const caseNo = settlement?.caseNumber || dispute?.caseNumber || 'settlement';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${caseNo}_settlement.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Settlement PDF downloaded successfully.');
    } catch (err) {
      showError(err.message || 'Unable to generate the settlement PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-xs text-[#737373]">
        Loading settlement record from backend...
      </div>
    );
  }

  if (!settlement && (!dispute || dispute.status !== 'SETTLEMENT_PENDING')) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto" />
        <h2 className="text-lg font-bold text-[#111111]">Settlement Record Not Found</h2>
        <p className="text-xs text-[#737373]">
          No active or finalized settlement record exists for this dispute case yet.
        </p>
        <Link to="/" className="inline-block text-xs font-bold text-[#B68400]">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isBothConsented = settlement?.consentTenant && settlement?.consentLandlord;
  const isPaid = settlement?.paymentStatus === 'MARKED_PAID';
  const isLandlord = currentUser.role === 'LANDLORD';
  const isTenant = currentUser.role === 'TENANT';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-8 rounded-2xl border border-[#E5E5E5] shadow-lg text-center space-y-3">
        <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center mx-auto shadow-md ${
          isPaid ? 'bg-[#1B8E13]' : isBothConsented ? 'bg-[#B68400]' : 'bg-amber-600'
        }`}>
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#111111]">
          GharPay Online Dispute Resolution Settlement
        </h1>
        <p className="text-xs text-[#737373]">
          Case Number: <strong className="text-[#111111]">{settlement?.caseNumber || dispute?.caseNumber}</strong> | Status:{' '}
          <strong className={isPaid ? 'text-[#1B8E13]' : 'text-[#B68400]'}>
            {settlement?.disputeStatus || dispute?.status}
          </strong>
        </p>
      </div>

      {/* Financial Settlement Terms */}
      {settlement && (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-6">
          <h2 className="text-base font-extrabold text-[#111111] border-b border-[#E5E5E5] pb-3">
            Agreed Financial Settlement Terms
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#F7F7F5] p-5 rounded-xl border border-[#E5E5E5]">
              <span className="text-xs text-[#737373] uppercase font-semibold block">Agreed Deduction</span>
              <span className="text-2xl font-extrabold text-[#111111] mt-1 block">
                {formatINR(settlement.agreedDeduction)}
              </span>
            </div>
            <div className="bg-[#F7F7F5] p-5 rounded-xl border border-[#E5E5E5]">
              <span className="text-xs text-[#737373] uppercase font-semibold block">Calculated Refund to Tenant</span>
              <span className="text-2xl font-extrabold text-[#1B8E13] mt-1 block">
                {formatINR(settlement.refundAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Dual Consents Section */}
      {settlement && (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-[#111111] border-b border-[#E5E5E5] pb-3">
            Explicit Party Consents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tenant Consent Card */}
            <div className={`p-5 rounded-xl border space-y-2 ${
              settlement.consentTenant ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#111111]">Tenant Consent</span>
                {settlement.consentTenant ? (
                  <span className="text-xs font-bold text-[#1B8E13] bg-green-100 px-2 py-0.5 rounded-full">✓ Recorded</span>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>
                )}
              </div>
              <p className="text-xs text-zinc-600">
                {settlement.consentTenant
                  ? `Recorded on ${formatDate(settlement.tenantConsentedAt)}`
                  : 'Awaiting explicit consent from Tenant.'}
              </p>
              {!settlement.consentTenant && isTenant && (
                <button
                  onClick={() => handleConsent('TENANT')}
                  disabled={submittingConsent}
                  className="mt-2 w-full py-2 bg-[#1B8E13] hover:bg-[#15700f] text-white text-xs font-bold rounded-lg shadow transition"
                >
                  {submittingConsent ? 'Recording...' : 'Provide Tenant Consent'}
                </button>
              )}
            </div>

            {/* Landlord Consent Card */}
            <div className={`p-5 rounded-xl border space-y-2 ${
              settlement.consentLandlord ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#111111]">Landlord Consent</span>
                {settlement.consentLandlord ? (
                  <span className="text-xs font-bold text-[#1B8E13] bg-green-100 px-2 py-0.5 rounded-full">✓ Recorded</span>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>
                )}
              </div>
              <p className="text-xs text-zinc-600">
                {settlement.consentLandlord
                  ? `Recorded on ${formatDate(settlement.landlordConsentedAt)}`
                  : 'Awaiting explicit consent from Landlord.'}
              </p>
              {!settlement.consentLandlord && isLandlord && (
                <button
                  onClick={() => handleConsent('LANDLORD')}
                  disabled={submittingConsent}
                  className="mt-2 w-full py-2 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold rounded-lg shadow transition"
                >
                  {submittingConsent ? 'Recording...' : 'Provide Landlord Consent'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Section (Requires Both Consents) */}
      {settlement && isBothConsented && (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-5">
          <h2 className="text-base font-extrabold text-[#111111] border-b border-[#E5E5E5] pb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#B68400]" />
            <span>Refund Payment Confirmation</span>
          </h2>

          <div className="p-5 rounded-xl border bg-zinc-50 border-zinc-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-[#737373] block">Refund Amount Owed to Tenant:</span>
                <span className="text-xl font-extrabold text-[#1B8E13]">{formatINR(settlement.refundAmount)}</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-[#737373] block">Payment Status:</span>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B8E13] bg-green-100 border border-green-200 px-3 py-1 rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    <span>Paid on {formatDate(settlement.paidAt)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-3 py-1 rounded-full">
                    <Clock className="w-4 h-4" />
                    <span>Awaiting landlord payment confirmation</span>
                  </span>
                )}
              </div>
            </div>

            {isPaid && settlement.paidByLandlordName && (
              <p className="text-xs text-zinc-600 border-t border-zinc-200 pt-2">
                Payment confirmation recorded by landlord: <strong>{settlement.paidByLandlordName}</strong>
              </p>
            )}

            {/* Landlord Action Button */}
            {!isPaid && isLandlord && (
              <div className="pt-2">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Mark Refund as Paid</span>
                </button>
              </div>
            )}

            {/* Platform Disclaimer */}
            <p className="text-[11px] text-[#737373] italic pt-1">
              Note: GharPay records payment confirmation but does not process or transfer funds.
            </p>
          </div>
        </div>
      )}

      {/* Settlement Document Hash & Download PDF Section */}
      {settlement && isBothConsented && (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-[#1B8E13]" />
            <span>Official Settlement Document</span>
          </h2>

          {settlement.settlementHash && (
            <div className="bg-[#F7F7F5] p-4 rounded-xl border border-[#E5E5E5] space-y-1">
              <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider block">
                SHA-256 Settlement Hash
              </span>
              <code className="text-xs font-mono text-[#505423] break-all block">
                {settlement.settlementHash}
              </code>
            </div>
          )}

          <div className="pt-2 flex justify-center">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center space-x-2 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-extrabold px-6 py-3 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingPdf ? 'Generating PDF...' : 'Download Official Settlement PDF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Mark Refund as Paid */}
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
                  disabled={submittingPayment}
                  className="px-5 py-2 font-bold text-white bg-[#B68400] hover:bg-[#966d00] rounded-lg shadow transition disabled:opacity-50"
                >
                  {submittingPayment ? 'Confirming...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementView;
