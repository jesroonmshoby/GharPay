import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle2, ArrowRight, FileText, Scale, Lock, Calculator, Award } from 'lucide-react';

export const Landing = () => {
  return (
    <div className="space-y-16 py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center space-x-2 bg-[#B68400]/10 border border-[#B68400]/20 px-4 py-1.5 rounded-full text-xs font-extrabold text-[#B68400]">
          <Shield className="w-4 h-4" />
          <span>Karnataka Online Dispute Resolution (ODR) Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#111111] tracking-tight max-w-4xl mx-auto leading-tight">
          Resolve Rental Security-Deposit Disputes <span className="text-[#B68400]">Fairly & Deterministically</span>
        </h1>

        <p className="text-sm sm:text-base text-[#737373] max-w-2xl mx-auto leading-relaxed">
          GharPay transforms deposit disputes through a transparent, evidence-backed workflow:
          <strong className="text-[#111111]"> Claim → Evidence → Calculation → Negotiation → Consent → Settlement PDF</strong>.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/login"
            className="inline-flex items-center space-x-2 bg-[#B68400] hover:bg-[#966d00] text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-md transition-all"
          >
            <span>Launch ODR Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center space-x-2 bg-white hover:bg-[#F7F7F5] border border-[#E5E5E5] text-[#111111] font-bold text-sm px-6 py-3.5 rounded-xl shadow-sm transition-all"
          >
            <span>Create Account</span>
          </Link>
        </div>
      </section>

      {/* Process Flow Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-[#111111]">The GharPay ODR Workflow</h2>
          <p className="text-xs text-[#737373] mt-1">Structured 7-step process ensuring total transparency</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#B68400]/10 text-[#B68400] flex items-center justify-center font-bold text-lg">
              1
            </div>
            <h3 className="text-base font-bold text-[#111111]">Dispute & Evidence Intake</h3>
            <p className="text-xs text-[#737373] leading-relaxed">
              Landlord registers tenancy details, itemizes category claims, and attaches supporting evidence receipts.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#505423]/10 text-[#505423] flex items-center justify-center font-bold text-lg">
              2
            </div>
            <h3 className="text-base font-bold text-[#111111]">Deterministic Calculation</h3>
            <p className="text-xs text-[#737373] leading-relaxed">
              GharPay engine evaluates claims with category rules (Painting, Fixture, Utilities, Rent, Cleaning). Zero AI floating-point money errors.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B8E13]/10 text-[#1B8E13] flex items-center justify-center font-bold text-lg">
              3
            </div>
            <h3 className="text-base font-bold text-[#111111]">Multi-Round Negotiation</h3>
            <p className="text-xs text-[#737373] leading-relaxed">
              Tenant & Landlord submit offers across max 3 rounds. The 5% threshold rule automatically determines settlement eligibility.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
              4
            </div>
            <h3 className="text-base font-bold text-[#111111]">Dual Consent & PDF Hash</h3>
            <p className="text-xs text-[#737373] leading-relaxed">
              Mediator prepares settlement terms, both parties provide explicit consent, and an official PDF with SHA-256 hash is generated.
            </p>
          </div>
        </div>
      </section>

      {/* Non-court Disclaimer Footer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm text-center space-y-2">
          <span className="text-xs font-bold uppercase text-[#505423]">Important Platform Notice</span>
          <p className="text-xs text-[#737373] max-w-3xl mx-auto leading-relaxed">
            GharPay is an Online Dispute Resolution (ODR) platform providing program-policy calculation engines and structured party negotiation. GharPay is NOT a court of law and produces transparent ODR calculation reports, not legal judgments or court orders.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Landing;

