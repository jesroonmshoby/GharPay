import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
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
} from 'lucide-react';

export const LandlordDisputeDetail = () => {
  const { id } = useParams();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Claim Modal Form State
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [newClaim, setNewClaim] = useState({
    category: 'PAINTING',
    description: '',
    claimedAmount: '',
  });

  // Upload Evidence Modal Form State
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [newEvidence, setNewEvidence] = useState({
    type: 'RECEIPT',
    fileUrl: '',
    description: '',
  });

  // Submit Offer Form State
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');

  useEffect(() => {
    fetchDisputeDetails();
  }, [id]);

  const fetchDisputeDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.landlord.getDispute(id);
      setDispute(res.dispute);
    } catch (err) {
      setError(err.message || 'Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.landlord.calculate(id);
      setSuccess('Deterministic GharPay calculation complete!');
      await fetchDisputeDetails();
    } catch (err) {
      setError(err.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleAddClaim = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.landlord.createClaim(id, {
        category: newClaim.category,
        description: newClaim.description,
        claimedAmount: parseFloat(newClaim.claimedAmount),
      });
      setShowClaimForm(false);
      setNewClaim({ category: 'PAINTING', description: '', claimedAmount: '' });
      await fetchDisputeDetails();
    } catch (err) {
      setError(err.message || 'Failed to add claim');
    }
  };

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    if (!selectedClaimId) return;
    setError('');
    try {
      await api.landlord.createEvidence(selectedClaimId, {
        type: newEvidence.type,
        fileUrl: newEvidence.fileUrl,
        description: newEvidence.description,
      });
      setSelectedClaimId(null);
      setNewEvidence({ type: 'RECEIPT', fileUrl: '', description: '' });
      await fetchDisputeDetails();
    } catch (err) {
      setError(err.message || 'Failed to upload evidence');
    }
  };

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.landlord.submitOffer(id, {
        amount: parseFloat(offerAmount),
        message: offerMessage,
      });
      setOfferAmount('');
      setOfferMessage('');
      setSuccess('Offer submitted successfully!');
      await fetchDisputeDetails();
    } catch (err) {
      setError(err.message || 'Failed to submit offer');
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
        <p className="text-xs text-[#737373]">{error || 'The requested case could not be retrieved.'}</p>
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
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs"
                >
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
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs"
                  placeholder="e.g. Wall painting charges"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Claimed Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={newClaim.claimedAmount}
                  onChange={(e) => setNewClaim({ ...newClaim, claimedAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs"
                  placeholder="18000"
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
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#B68400] hover:bg-[#966d00] rounded-xl"
              >
                Save Claim
              </button>
            </div>
          </form>
        )}

        {/* Claims List Table */}
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
                    <span className="text-xs text-[#737373] block">Claimed: {formatINR(c.claimedAmount)}</span>
                    {c.approvedAmount !== null && (
                      <span className="text-sm font-bold text-[#1B8E13] block">Approved: {formatINR(c.approvedAmount)}</span>
                    )}
                  </div>
                </div>

                {c.calculationExplanation && (
                  <div className="bg-[#F7F7F5] border border-[#E5E5E5] p-3 rounded-xl text-xs text-[#505423]">
                    <strong>Engine Evaluation:</strong> {c.calculationExplanation}
                  </div>
                )}

                {/* Evidence Attachments */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-xs text-[#737373]">
                    Supporting Evidence: <strong>{c.evidence?.length || 0} file(s) attached</strong>
                  </div>
                  <button
                    onClick={() => setSelectedClaimId(c.id)}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-[#505423] hover:text-[#B68400]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Evidence</span>
                  </button>
                </div>

                {/* Evidence Modal Inline */}
                {selectedClaimId === c.id && (
                  <form onSubmit={handleAddEvidence} className="bg-white p-4 rounded-xl border border-[#B68400] space-y-3 mt-2">
                    <h4 className="text-xs font-bold text-[#111111]">Attach Evidence URL for {c.category}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#737373]">Type</label>
                        <select
                          value={newEvidence.type}
                          onChange={(e) => setNewEvidence({ ...newEvidence, type: e.target.value })}
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                        >
                          <option value="RECEIPT">RECEIPT</option>
                          <option value="INVOICE">INVOICE</option>
                          <option value="PHOTO">PHOTO</option>
                          <option value="AGREEMENT">AGREEMENT</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#737373]">Evidence File URL</label>
                        <input
                          type="url"
                          required
                          value={newEvidence.fileUrl}
                          onChange={(e) => setNewEvidence({ ...newEvidence, fileUrl: e.target.value })}
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                          placeholder="https://gharpay.in/receipt.pdf"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedClaimId(null)}
                        className="px-3 py-1 text-xs text-[#737373]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs font-bold text-white bg-[#505423] rounded-lg"
                      >
                        Upload
                      </button>
                    </div>
                  </form>
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
                  placeholder="27000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Message Note (Optional)</label>
                <input
                  type="text"
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-xs text-[#111111]"
                  placeholder="I can reduce the deduction to ₹27,000"
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

