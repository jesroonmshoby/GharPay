import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Home, Calendar, DollarSign, FileText, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export const LandlordIntake = () => {
  const navigate = useNavigate();

  // Form steps: 1=Property, 2=Tenancy, 3=Dispute
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Property State
  const [propertyData, setPropertyData] = useState({
    addressLine1: 'Whitefield Main Rd, Building 4',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560066',
  });
  const [createdPropertyId, setCreatedPropertyId] = useState('');

  // Tenancy State
  const [tenancyData, setTenancyData] = useState({
    tenantId: '',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    monthlyRent: '40000',
    securityDeposit: '200000',
  });
  const [createdTenancyId, setCreatedTenancyId] = useState('');

  // Dispute State
  const [claimedDeduction, setClaimedDeduction] = useState('42000');

  // Handle Step 1: Create Property
  const handleCreateProperty = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.landlord.createProperty(propertyData);
      setCreatedPropertyId(res.property.id);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Create Tenancy
  const handleCreateTenancy = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.landlord.createTenancy({
        propertyId: createdPropertyId,
        tenantId: tenancyData.tenantId,
        startDate: tenancyData.startDate,
        endDate: tenancyData.endDate,
        monthlyRent: parseFloat(tenancyData.monthlyRent),
        securityDeposit: parseFloat(tenancyData.securityDeposit),
      });
      setCreatedTenancyId(res.tenancy.id);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to create tenancy agreement');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 3: Create Dispute
  const handleCreateDispute = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.landlord.createDispute({
        tenancyId: createdTenancyId,
        claimedDeduction: parseFloat(claimedDeduction),
      });
      navigate(`/landlord/dispute/${res.dispute.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#111111]">
          New Rental Deposit Dispute Intake
        </h1>
        <p className="text-xs text-[#737373] mt-1">
          Register the property, tenancy agreement, and initial claimed deduction
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className={`h-2 rounded-full ${
            step >= 1 ? 'bg-[#B68400]' : 'bg-[#E5E5E5]'
          }`}
        />
        <div
          className={`h-2 rounded-full ${
            step >= 2 ? 'bg-[#B68400]' : 'bg-[#E5E5E5]'
          }`}
        />
        <div
          className={`h-2 rounded-full ${
            step >= 3 ? 'bg-[#B68400]' : 'bg-[#E5E5E5]'
          }`}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-[#DC2626] text-xs p-4 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: PROPERTY FORM */}
      {step === 1 && (
        <form onSubmit={handleCreateProperty} className="bg-white p-6 rounded-2xl border border-[#E5E5E5] space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-[#111111] flex items-center space-x-2">
            <Home className="w-5 h-5 text-[#B68400]" />
            <span>Step 1: Property Details</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Address Line 1
            </label>
            <input
              type="text"
              required
              value={propertyData.addressLine1}
              onChange={(e) => setPropertyData({ ...propertyData, addressLine1: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-sm text-[#111111] focus:ring-2 focus:ring-[#B68400] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">City</label>
              <input
                type="text"
                required
                value={propertyData.city}
                onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-sm text-[#111111] focus:ring-2 focus:ring-[#B68400] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">State</label>
              <input
                type="text"
                required
                value={propertyData.state}
                onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-sm text-[#111111] focus:ring-2 focus:ring-[#B68400] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Creating Property...' : 'Save & Continue to Tenancy'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* STEP 2: TENANCY FORM */}
      {step === 2 && (
        <form onSubmit={handleCreateTenancy} className="bg-white p-6 rounded-2xl border border-[#E5E5E5] space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-[#111111] flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-[#B68400]" />
            <span>Step 2: Tenancy Agreement</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Tenant User ID
            </label>
            <input
              type="text"
              required
              value={tenancyData.tenantId}
              onChange={(e) => setTenancyData({ ...tenancyData, tenantId: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-sm text-[#111111] focus:ring-2 focus:ring-[#B68400] focus:outline-none"
              placeholder="UUID of tenant user account"
            />
            <p className="text-[10px] text-[#737373] mt-1">
              Tip: Enter the tenant's user ID from their registered account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Monthly Rent (₹)</label>
              <input
                type="number"
                required
                value={tenancyData.monthlyRent}
                onChange={(e) => setTenancyData({ ...tenancyData, monthlyRent: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-sm text-[#111111] focus:ring-2 focus:ring-[#B68400] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">Security Deposit (₹)</label>
              <input
                type="number"
                required
                value={tenancyData.securityDeposit}
                onChange={(e) => setTenancyData({ ...tenancyData, securityDeposit: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-sm text-[#111111] focus:ring-2 focus:ring-[#B68400] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Creating Tenancy...' : 'Save & Continue to Dispute'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* STEP 3: DISPUTE FORM */}
      {step === 3 && (
        <form onSubmit={handleCreateDispute} className="bg-white p-6 rounded-2xl border border-[#E5E5E5] space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-[#111111] flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#B68400]" />
            <span>Step 3: Initial Disputed Deduction</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Total Disputed Deduction Amount (₹)
            </label>
            <input
              type="number"
              required
              value={claimedDeduction}
              onChange={(e) => setClaimedDeduction(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E5E5] rounded-xl text-sm text-[#111111] focus:ring-2 focus:ring-[#B68400] focus:outline-none"
              placeholder="42000"
            />
            <p className="text-[10px] text-[#737373] mt-1">
              Cannot exceed security deposit of ₹{tenancyData.securityDeposit}.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#B68400] hover:bg-[#966d00] text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Creating Case...' : 'Create Dispute Case'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};

export default LandlordIntake;

