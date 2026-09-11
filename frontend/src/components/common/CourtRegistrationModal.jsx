import React, { useState } from 'react';
import { Scale, FileText, CheckCircle2, Copy, ExternalLink, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export default function CourtRegistrationModal({ isOpen, onClose, dispute, onSubmitted }) {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const [formData, setFormData] = useState({
    jurisdiction: `${dispute?.property?.city || 'District'} Rent Authority & e-Courts Portal`,
    petitionerName: dispute?.tenancy?.landlord?.name || '',
    respondentName: dispute?.tenancy?.tenant?.name || '',
    legalNotes: 'ODR negotiation reached 3 rounds without mutual agreement. Filing application for online court case registration.',
  });

  if (!isOpen || !dispute) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.disputeActions.submitCourtApplication(dispute.id, formData);
      setSubmittedData(res.courtApplication);
      showSuccess(`Court case registration application generated! Ref: ${res.courtApplication.courtRefNo}`);
      if (onSubmitted) onSubmitted(res.courtApplication);
    } catch (err) {
      showError(err.message || 'Failed to submit court application');
    } finally {
      setLoading(false);
    }
  };

  const copyRefToClipboard = (ref) => {
    navigator.clipboard.writeText(ref);
    showSuccess('Court Application Reference copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-zinc-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/30">
              <Scale className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Online Court Case Registration</h3>
              <p className="text-xs text-amber-200/80">Application for E-Filing & Legal Petition Preparation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {!submittedData ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-0.5">Conciliation Unresolved (3 Negotiation Rounds Completed)</p>
                  <p>
                    Because agreement was not reached after 3 rounds of GharPay ODR, this utility prepares your official legal filing parameters and ODR Conciliation Failure Certificate for online registration on the official e-Courts portal.
                  </p>
                </div>
              </div>

              {/* Case Summary Card */}
              <div className="bg-zinc-50 dark:bg-zinc-850 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
                <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
                  <span className="text-zinc-500 font-medium">GharPay Case Ref:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{dispute.caseNumber}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
                  <span className="text-zinc-500 font-medium">Security Deposit:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">₹{Number(dispute.totalDeposit).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
                  <span className="text-zinc-500 font-medium">Disputed Deduction Claimed:</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">₹{Number(dispute.claimedDeduction).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">ODR Conciliation Certificate ID:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">ODR-CERT-{dispute.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              {/* Form Inputs */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Court Jurisdiction / Portal
                </label>
                <input
                  type="text"
                  required
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Petitioner Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.petitionerName}
                    onChange={(e) => setFormData({ ...formData, petitionerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Respondent Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.respondentName}
                    onChange={(e) => setFormData({ ...formData, respondentName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Legal Notes / Petition Summary
                </label>
                <textarea
                  rows={3}
                  value={formData.legalNotes}
                  onChange={(e) => setFormData({ ...formData, legalNotes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Generating Application...' : 'Generate & Submit Application'}
                  <Scale className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* Application Generated Success View */
            <div className="space-y-6 text-center py-2">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-950/60 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Online Court Registration Application Prepared
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                  Your court petition reference and ODR Conciliation Failure Certificate are generated and recorded in the audit trail.
                </p>
              </div>

              {/* Reference Box */}
              <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-left max-w-lg mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium">Court Application Ref:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                      {submittedData.courtRefNo}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyRefToClipboard(submittedData.courtRefNo)}
                      className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
                      title="Copy Reference"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-zinc-200 dark:border-zinc-700/60 pt-2">
                  <span className="text-zinc-500 font-medium">Target Jurisdiction:</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium">{submittedData.jurisdiction}</span>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-zinc-200 dark:border-zinc-700/60 pt-2">
                  <span className="text-zinc-500 font-medium">ODR Certificate ID:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{submittedData.odrCertificateId}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                <a
                  href={submittedData.eCourtsPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                >
                  Proceed to e-Courts Registration Portal
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition"
                >
                  Close & Return to Case
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
