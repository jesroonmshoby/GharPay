import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Calculator, MessageSquare, Scale, CheckCircle2, Award, ArrowRight, HelpCircle } from 'lucide-react';

export const HowItWorks = () => {
  const steps = [
    {
      number: '1',
      title: 'Dispute & Property Intake',
      role: 'LANDLORD',
      color: '#B68400',
      description: 'The landlord registers the tenancy details, security deposit amount, and itemizes deductions by category (Painting, Fixtures, Utilities, Unpaid Rent, Cleaning).',
      icon: FileText,
    },
    {
      number: '2',
      title: 'Evidence Upload',
      role: 'LANDLORD & TENANT',
      color: '#505423',
      description: 'Parties upload supporting receipts, move-in inspection checklists, repair invoices, and photo evidence to substantiate claimed deductions.',
      icon: Shield,
    },
    {
      number: '3',
      title: 'Deterministic Engine Calculation',
      role: 'GHARPAY ENGINE',
      color: '#1B8E13',
      description: 'GharPay ODR calculation engine evaluates claims against policy guidelines (e.g., standard depreciation for painting, proportional fixture wear). Zero floating-point rounding errors.',
      icon: Calculator,
    },
    {
      number: '4',
      title: 'Tenant Review',
      role: 'TENANT',
      color: '#B68400',
      description: 'The tenant inspects the calculated deductions and itemized explanations, then chooses to accept or initiate party negotiation.',
      icon: CheckCircle2,
    },
    {
      number: '5',
      title: 'Multi-Round Negotiation',
      role: 'TENANT & LANDLORD',
      color: '#505423',
      description: 'Parties exchange counter-offers across a maximum of 3 structured rounds. The 5% threshold rule dynamically checks settlement eligibility.',
      icon: MessageSquare,
    },
    {
      number: '6',
      title: 'Mediator Review & Term Preparation',
      role: 'MEDIATOR',
      color: '#1B8E13',
      description: 'An impartial GharPay Mediator reviews case history, audit logs, and offers, then prepares structured settlement terms.',
      icon: Scale,
    },
    {
      number: '7',
      title: 'Dual Consent & Hash PDF',
      role: 'ALL PARTIES',
      color: '#B68400',
      description: 'Both tenant and landlord explicitly record consent. The system generates an official ODR Settlement PDF with a cryptographic SHA-256 hash.',
      icon: Award,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 bg-[#B68400]/10 border border-[#B68400]/20 px-4 py-1.5 rounded-full text-xs font-extrabold text-[#B68400]">
          <HelpCircle className="w-4 h-4" />
          <span>GharPay ODR Platform Workflow</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
          How GharPay Resolves Security Deposit Disputes
        </h1>
        <p className="text-sm text-[#737373] leading-relaxed">
          GharPay provides a structured 7-step Online Dispute Resolution framework designed specifically for Karnataka rental security deposit disputes.
        </p>
      </div>

      {/* 7-Step Grid */}
      <div className="space-y-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[#B68400]/50 transition-all"
            >
              <div className="flex items-start space-x-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg text-white shadow-md flex-shrink-0"
                  style={{ backgroundColor: step.color }}
                >
                  {step.number}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-[#111111]">{step.title}</h2>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#F7F7F5] border border-[#E5E5E5] text-[#505423]">
                      {step.role}
                    </span>
                  </div>
                  <p className="text-xs text-[#737373] max-w-3xl leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-[#737373] self-end md:self-center">
                <Icon className="w-6 h-6" style={{ color: step.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legal Disclaimer Box */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] text-center space-y-2 shadow-sm">
        <span className="text-xs font-bold uppercase text-[#505423]">ODR Policy Statement</span>
        <p className="text-xs text-[#737373] max-w-3xl mx-auto leading-relaxed">
          GharPay is an Online Dispute Resolution platform and not a court of law. GharPay generates policy-based calculations and facilitates party agreements, producing deterministic settlement reports rather than legal judgments or judicial decrees.
        </p>
        <div className="pt-4">
          <Link
            to="/signup"
            className="inline-flex items-center space-x-2 bg-[#B68400] hover:bg-[#966d00] text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all"
          >
            <span>Get Started with GharPay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
