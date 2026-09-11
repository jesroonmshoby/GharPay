import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { formatINR, formatDate } from '../../utils/formatters';
import { Award, Download, CheckCircle, Clock, AlertCircle, FileCheck, Shield } from 'lucide-react';

export const SettlementView = () => {
  const { id } = useParams();
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettlement();
  }, [id]);

  const fetchSettlement = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.settlement.getSettlement(id);
      setSettlement(res.settlement);
    } catch (err) {
      setError(err.message || 'Failed to load settlement details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await api.settlement.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${settlement.caseNumber}_settlement.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Failed to download PDF document');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-xs text-[#737373]">
        Loading settlement document...
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto" />
        <h2 className="text-lg font-bold text-[#111111]">Settlement Document Not Found</h2>
        <p className="text-xs text-[#737373]">{error || 'The requested settlement record could not be retrieved.'}</p>
        <Link to="/" className="inline-block text-xs font-bold text-[#B68400]">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-8 rounded-2xl border border-[#E5E5E5] shadow-lg text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1B8E13] to-[#505423] text-white flex items-center justify-center mx-auto shadow-md">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#111111]">
          GharPay Online Dispute Resolution Settlement
        </h1>
        <p className="text-xs text-[#737373]">
          Case Number: <strong className="text-[#111111]">{settlement.caseNumber}</strong> | Status: <strong className="text-[#1B8E13]">{settlement.disputeStatus}</strong>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-[#DC2626] text-xs p-4 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Financial Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-6">
        <h2 className="text-base font-extrabold text-[#111111] border-b border-[#E5E5E5] pb-3">
          Agreed Financial Settlement Terms
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#F7F7F5] p-5 rounded-xl border border-[#E5E5E5]">
            <span className="text-xs text-[#737373] uppercase font-semibold block">Agreed Deduction</span>
            <span className="text-2xl font-extrabold text-[#111111] mt-1 block">{formatINR(settlement.agreedDeduction)}</span>
          </div>
          <div className="bg-[#F7F7F5] p-5 rounded-xl border border-[#E5E5E5]">
            <span className="text-xs text-[#737373] uppercase font-semibold block">Refund Amount to Tenant</span>
            <span className="text-2xl font-extrabold text-[#1B8E13] mt-1 block">{formatINR(settlement.refundAmount)}</span>
          </div>
        </div>
      </div>

      {/* Party Consents */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-4">
        <h2 className="text-base font-extrabold text-[#111111] border-b border-[#E5E5E5] pb-3">
          Explicit Party Consents
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border ${settlement.consentTenant ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-xs font-bold text-[#111111] block">Tenant Consent</span>
            <span className="text-xs mt-1 block">
              {settlement.consentTenant ? `✓ Recorded on ${formatDate(settlement.tenantConsentedAt)}` : 'Pending Consent'}
            </span>
          </div>
          <div className={`p-4 rounded-xl border ${settlement.consentLandlord ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-xs font-bold text-[#111111] block">Landlord Consent</span>
            <span className="text-xs mt-1 block">
              {settlement.consentLandlord ? `✓ Recorded on ${formatDate(settlement.landlordConsentedAt)}` : 'Pending Consent'}
            </span>
          </div>
        </div>
      </div>

      {/* Cryptographic Verification & PDF Download */}
      {settlement.settlementHash && (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-[#1B8E13]" />
            <span>Cryptographic Integrity Verification</span>
          </h2>

          <div className="bg-[#F7F7F5] p-4 rounded-xl border border-[#E5E5E5] space-y-1">
            <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider block">
              SHA-256 Settlement Hash
            </span>
            <code className="text-xs font-mono text-[#505423] break-all block">
              {settlement.settlementHash}
            </code>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center space-x-2 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-extrabold px-6 py-3 rounded-xl shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Official Settlement PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementView;

