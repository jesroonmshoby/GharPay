import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { formatINR, formatDate } from '../../utils/formatters';
import {
  FileText,
  Calculator,
  Plus,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield,
  MessageSquare,
  Scale,
  Paperclip,
  ExternalLink,
  File,
  Trash2,
} from 'lucide-react';

const EVIDENCE_TYPES = [
  { value: 'PHOTO', label: 'Photo' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'AGREEMENT', label: 'Rental Agreement' },
  { value: 'METER_READING', label: 'Meter Reading' },
  { value: 'MESSAGE', label: 'Message' },
  { value: 'OTHER', label: 'Other' },
];

export const LandlordDisputeDetail = () => {
  const { id } = useParams();
  const { showSuccess, showError } = useNotification();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Add Claim Modal Form State
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [newClaim, setNewClaim] = useState({
    category: '',
    description: '',
    claimedAmount: '',
  });

  // Upload Evidence Modal Form State
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [evidenceType, setEvidenceType] = useState('RECEIPT');
  const [selectedFile, setSelectedFile] = useState(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');

  // Submit Offer Form State
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');

  // Delete Claim State
  const [deletingClaimId, setDeletingClaimId] = useState(null);

  const handleDeleteClaim = async (claimId) => {
    if (!window.confirm('Are you sure you want to delete this claim item? Any attached evidence will also be removed.')) {
      return;
    }
    setDeletingClaimId(claimId);
    try {
      await api.landlord.deleteClaim(claimId);
      showSuccess('Claim deleted successfully.');
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Failed to delete claim');
    } finally {
      setDeletingClaimId(null);
    }
  };

  useEffect(() => {
    fetchDisputeDetails();
  }, [id]);

  const fetchDisputeDetails = async () => {
    setLoading(true);
    try {
      const res = await api.landlord.getDispute(id);
      setDispute(res.dispute);
    } catch (err) {
      showError(err.message || 'Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const res = await api.landlord.calculate(id);
      showSuccess('Calculation completed successfully.');
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleAddClaim = async (e) => {
    e.preventDefault();

    if (!newClaim.category) {
      showError('Please select a claim category.');
      return;
    }

    const desc = newClaim.description.trim();
    const amount = parseFloat(newClaim.claimedAmount);

    if (!desc) {
      showError('Please enter a claim description.');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      showError('Claimed amount must be greater than ₹0.');
      return;
    }

    try {
      await api.landlord.createClaim(id, {
        category: newClaim.category,
        description: desc,
        claimedAmount: amount,
      });
      setShowClaimForm(false);
      setNewClaim({ category: '', description: '', claimedAmount: '' });
      showSuccess('Claim added successfully.');
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Failed to add claim');
    }
  };

  const handleFileChange = (e) => {
    setEvidenceError('');
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];

    if (!allowedExts.includes(ext)) {
      setEvidenceError('File type is not supported. Please select a PDF, JPG, JPEG, or PNG file.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEvidenceError('File is too large. Maximum allowed size is 5MB.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    if (!selectedClaimId) return;
    setEvidenceError('');

    if (!selectedFile) {
      setEvidenceError('Please select a file.');
      return;
    }

    setUploadingEvidence(true);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(selectedFile);
      });

      const uploadRes = await api.landlord.uploadEvidenceFile({
        fileName: selectedFile.name,
        fileData: base64Data,
      });

      await api.landlord.createEvidence(selectedClaimId, {
        type: evidenceType,
        fileUrl: uploadRes.fileUrl,
        description: evidenceDescription.trim() || selectedFile.name,
      });

      const uploadedName = selectedFile.name;
      setSelectedClaimId(null);
      setSelectedFile(null);
      setEvidenceDescription('');
      setEvidenceType('RECEIPT');
      showSuccess(`Evidence file "${uploadedName}" uploaded successfully.`);
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Evidence upload failed. Please try again.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    const amt = parseFloat(offerAmount);
    if (isNaN(amt) || amt < 0) {
      showError('Please enter a valid offer deduction amount.');
      return;
    }

    try {
      await api.landlord.submitOffer(id, {
        amount: amt,
        message: offerMessage,
      });
      setOfferAmount('');
      setOfferMessage('');
      showSuccess('Offer submitted successfully.');
      await fetchDisputeDetails();
    } catch (err) {
      showError(err.message || 'Failed to submit offer');
    }
  };

  const getEvidenceTypeLabel = (typeKey) => {
    const found = EVIDENCE_TYPES.find((t) => t.value === typeKey);
    return found ? found.label : typeKey;
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
        <Link to="/landlord" className="inline-block text-xs font-bold text-[#B68400]">
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
            <span className="bg-[#B68400]/15 text-[#B68400] text-xs font-extrabold px-3 py-1 rounded-full uppercase">
              {dispute.status}
            </span>
          </div>
          <p className="text-xs text-[#737373] mt-1">
            Rental Security Deposit ODR Case
          </p>
        </div>

        {/* Calculate Action Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="inline-flex items-center space-x-2 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            <Calculator className="w-4 h-4" />
            <span>{calculating ? 'Calculating...' : 'Run GharPay Calculation Engine'}</span>
          </button>
        </div>
      </div>

      {/* Case Overview Metrics */}
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
            Claimed Deduction
          </span>
          <span className="text-xl font-extrabold text-[#111111] mt-1 block">
            {formatINR(dispute.claimedDeduction)}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">
            Calculated Deduction
          </span>
          <span className="text-xl font-extrabold text-[#1B8E13] mt-1 block">
            {dispute.calculatedDeduction ? formatINR(dispute.calculatedDeduction) : 'Pending'}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] shadow-sm">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider block">
            Negotiation Round
          </span>
          <span className="text-xl font-extrabold text-[#B68400] mt-1 block">
            Round {dispute.currentRound || 0} / 3
          </span>
        </div>
      </div>

      {/* Claims Breakdown */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5E5E5] flex justify-between items-center">
          <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#B68400]" />
            <span>Disputed Claims ({dispute.claims?.length || 0})</span>
          </h2>
          <button
            onClick={() => setShowClaimForm(true)}
            className="inline-flex items-center space-x-1 text-xs font-bold text-[#B68400] hover:text-[#966d00]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Claim</span>
          </button>
        </div>

        {/* Add Claim Form Modal */}
        {showClaimForm && (
          <form onSubmit={handleAddClaim} className="p-6 bg-[#F7F7F5] border-b border-[#E5E5E5] space-y-4">
            <h3 className="text-xs font-bold uppercase text-[#505423]">Add New Claim Item</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Category</label>
                <select
                  value={newClaim.category}
                  onChange={(e) => setNewClaim({ ...newClaim, category: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs bg-white text-[#111111]"
                  required
                >
                  <option value="" disabled>Select category...</option>
                  <option value="PAINTING">PAINTING</option>
                  <option value="FIXTURE">FIXTURE</option>
                  <option value="UTILITIES">UTILITIES</option>
                  <option value="UNPAID_RENT">UNPAID_RENT</option>
                  <option value="CLEANING">CLEANING</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={newClaim.description}
                  onChange={(e) => setNewClaim({ ...newClaim, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs bg-white text-[#111111]"
                  placeholder="e.g. Bedroom wall repainting charges"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Claimed Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={newClaim.claimedAmount}
                  onChange={(e) => setNewClaim({ ...newClaim, claimedAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs bg-white text-[#111111]"
                  placeholder="e.g. 18000"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowClaimForm(false)}
                className="px-3 py-1.5 text-xs text-[#737373] hover:text-[#111111]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#B68400] hover:bg-[#966d00] rounded-xl shadow-sm"
              >
                Save Claim
              </button>
            </div>
          </form>
        )}

        {/* Claims List */}
        <div className="divide-y divide-[#E5E5E5]">
          {dispute.claims && dispute.claims.length > 0 ? (
            dispute.claims.map((c) => (
              <div key={c.id} className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-[#B68400] tracking-wider block">
                      {c.category}
                    </span>
                    <p className="text-sm font-semibold text-[#111111] mt-0.5">{c.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-xs text-[#737373] block">Claimed: {formatINR(c.claimedAmount)}</span>
                      {c.approvedAmount !== null && c.approvedAmount !== undefined && (
                        <span className="text-sm font-bold text-[#1B8E13] block">Engine Approved: {formatINR(c.approvedAmount)}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteClaim(c.id)}
                      disabled={deletingClaimId === c.id}
                      className="p-2 text-[#737373] hover:text-[#DC2626] hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                      title="Delete claim item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {c.calculationExplanation && (
                  <div className="bg-[#F7F7F5] border border-[#E5E5E5] p-3 rounded-xl text-xs text-[#505423]">
                    <strong>Engine Evaluation:</strong> {c.calculationExplanation}
                  </div>
                )}

                {/* Evidence Attachments Header */}
                <div className="pt-2 border-t border-[#E5E5E5]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-[#111111] flex items-center space-x-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#505423]" />
                    <span>Supporting Evidence: <strong>{c.evidence?.length || 0} file(s) attached</strong></span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClaimId(c.id);
                      setEvidenceError('');
                      setSelectedFile(null);
                      setEvidenceDescription('');
                      setEvidenceType('RECEIPT');
                    }}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-[#505423] hover:text-[#B68400]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Attach Evidence File</span>
                  </button>
                </div>

                {/* List Attached Evidence Files */}
                {c.evidence && c.evidence.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {c.evidence.map((ev) => (
                      <div key={ev.id} className="bg-[#F7F7F5] border border-[#E5E5E5] p-3 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                        <div className="space-y-0.5 truncate pr-2">
                          <span className="text-[10px] font-extrabold uppercase text-[#B68400] block">
                            {getEvidenceTypeLabel(ev.type)}
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
                            className="inline-flex items-center space-x-1 text-[11px] font-bold text-[#505423] hover:text-[#B68400] bg-white border border-[#E5E5E5] px-2.5 py-1 rounded-lg shadow-2xs flex-shrink-0"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Evidence Upload Form Modal / Inline */}
                {selectedClaimId === c.id && (
                  <form onSubmit={handleAddEvidence} className="bg-white p-4 rounded-2xl border border-[#B68400] space-y-3 mt-3 shadow-sm">
                    <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                      Attach Evidence File for {c.category} ({c.description})
                    </h4>

                    {evidenceError && (
                      <div className="bg-red-50 border border-red-200 text-[#DC2626] text-xs p-2.5 rounded-lg flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{evidenceError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#737373] uppercase mb-1">Evidence Type</label>
                        <select
                          value={evidenceType}
                          onChange={(e) => setEvidenceType(e.target.value)}
                          className="w-full px-2.5 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111] bg-white"
                        >
                          {EVIDENCE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[#737373] uppercase mb-1">Evidence File (PDF, JPG, PNG)</label>
                        <input
                          type="file"
                          required
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="w-full text-xs text-[#737373] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#B68400]/15 file:text-[#B68400] cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[#737373] uppercase mb-1">Description (Optional)</label>
                        <input
                          type="text"
                          value={evidenceDescription}
                          onChange={(e) => setEvidenceDescription(e.target.value)}
                          className="w-full px-2.5 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
                          placeholder="e.g. Repair receipt"
                        />
                      </div>
                    </div>

                    {selectedFile && (
                      <div className="text-xs font-semibold text-[#1B8E13] flex items-center space-x-1 pt-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Selected file: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedClaimId(null)}
                        className="px-3 py-1.5 text-xs text-[#737373] hover:text-[#111111]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploadingEvidence}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-[#505423] hover:bg-[#3f421b] rounded-xl shadow-sm disabled:opacity-50"
                      >
                        {uploadingEvidence ? 'Uploading...' : 'Upload & Attach'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Tenant Response View for Landlord */}
                {c.tenantComments && c.tenantComments.length > 0 && (
                  <div className="pt-2 border-t border-[#E5E5E5]/60 space-y-1.5">
                    <span className="text-xs font-bold text-[#505423] uppercase tracking-wider flex items-center space-x-1">
                      <MessageSquare className="w-3.5 h-3.5 text-[#B68400]" />
                      <span>Tenant Response</span>
                    </span>
                    {c.tenantComments.map((tc) => (
                      <div key={tc.id} className="bg-[#FFFDF5] border border-[#B68400]/30 p-3.5 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-[11px] text-[#737373]">
                          <span className="font-bold text-[#111111]">{tc.createdBy?.name || 'Tenant'}</span>
                          <span>{formatDate(tc.createdAt)}</span>
                        </div>
                        <p className="text-[#111111] font-medium leading-relaxed">
                          "{tc.message}"
                        </p>
                        {tc.attachments && tc.attachments.length > 0 && (
                          <div className="pt-1.5 flex flex-wrap gap-2">
                            <span className="text-[11px] font-bold text-[#737373]">Proof attached:</span>
                            {tc.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.fileUrl.startsWith('http') ? att.fileUrl : `http://localhost:4000${att.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-[11px] font-bold text-[#505423] hover:text-[#B68400] bg-white border border-[#E5E5E5] px-2.5 py-1 rounded-md"
                              >
                                <Paperclip className="w-3 h-3 text-[#B68400]" />
                                <span>{att.fileName}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-[#737373]">No claims added yet. Click "Add Claim" above.</div>
          )}
        </div>
      </div>

      {/* Negotiation Section */}
      {dispute.status === 'NEGOTIATION' && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-6 shadow-sm">
          <h2 className="text-base font-extrabold text-[#111111] flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-[#B68400]" />
            <span>Negotiation Round {dispute.currentRound} / 3</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F7F7F5] p-4 rounded-xl border border-[#E5E5E5]">
            <div>
              <span className="text-xs text-[#737373] block">Landlord Offer</span>
              <span className="text-lg font-extrabold text-[#111111]">{dispute.landlordOffer ? formatINR(dispute.landlordOffer) : 'None'}</span>
            </div>
            <div>
              <span className="text-xs text-[#737373] block">Tenant Offer</span>
              <span className="text-lg font-extrabold text-[#111111]">{dispute.tenantOffer ? formatINR(dispute.tenantOffer) : 'None'}</span>
            </div>
            <div>
              <span className="text-xs text-[#737373] block">Settlement Eligibility</span>
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full inline-block mt-1 ${dispute.settlementEligible ? 'bg-[#1B8E13]/15 text-[#1B8E13]' : 'bg-amber-50 text-amber-800'}`}>
                {dispute.settlementEligible ? '✓ Eligible for Settlement' : 'Outside 5% threshold'}
              </span>
            </div>
          </div>

          {/* Submit Landlord Offer Form */}
          <form onSubmit={handleSubmitOffer} className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-[#111111] uppercase">Submit Revised Landlord Offer</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Offer Deduction Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
                  placeholder="Enter offered amount (e.g. 27000)"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Message Note (Optional)</label>
                <input
                  type="text"
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
                  placeholder="e.g. I can agree to ₹27,000 as the final deduction"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#B68400] hover:bg-[#966d00] rounded-xl shadow-sm"
            >
              Submit Landlord Offer
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default LandlordDisputeDetail;
