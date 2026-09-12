export type UserRole = 'TENANT' | 'LANDLORD' | 'ADMIN';

export type DisputeStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'EVIDENCE_REVIEW'
  | 'CALCULATED'
  | 'TENANT_REVIEW'
  | 'NEGOTIATION'
  | 'SETTLEMENT_PENDING'
  | 'SETTLED'
  | 'REJECTED';

export type ClaimCategory = 'PAINTING' | 'FIXTURE' | 'UTILITIES' | 'UNPAID_RENT' | 'CLEANING';

export type ClaimStatus = 'PENDING' | 'SUPPORTED' | 'PARTIAL' | 'INSUFFICIENT' | 'APPROVED' | 'REJECTED';

export type EvidenceType = 'PHOTO' | 'INVOICE' | 'RECEIPT' | 'AGREEMENT' | 'METER_READING' | 'MESSAGE' | 'OTHER';

export type VerificationStatus = 'PENDING' | 'SUPPORTED' | 'PARTIAL' | 'INSUFFICIENT';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt?: string;
}

export interface Property {
  id: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
}

export interface Tenancy {
  id: string;
  propertyId: string;
  property?: Property;
  landlordId: string;
  landlord?: User;
  tenantId: string;
  tenant?: User;
  startDate: string;
  endDate?: string;
  monthlyRent: number | string;
  securityDeposit: number | string;
  agreementUrl?: string;
}

export interface Evidence {
  id: string;
  claimId: string;
  uploadedBy: string;
  type: EvidenceType;
  fileUrl: string;
  description?: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface Claim {
  id: string;
  disputeId: string;
  category: ClaimCategory;
  description: string;
  claimedAmount: number | string;
  approvedAmount?: number | string | null;
  status: ClaimStatus;
  calculationExplanation?: string;
  evidence?: Evidence[];
}

export interface Offer {
  id: string;
  disputeId: string;
  createdBy: string;
  amount: number | string;
  roundNumber: number;
  message?: string;
  status: OfferStatus;
  createdAt: string;
}

export interface Settlement {
  id: string;
  disputeId: string;
  caseNumber?: string;
  disputeStatus?: string;
  agreedDeduction: number | string;
  refundAmount: number | string;
  consentTenant: boolean;
  consentLandlord: boolean;
  tenantConsentedAt?: string;
  landlordConsentedAt?: string;
  pdfUrl?: string;
  settlementHash?: string;
}

export interface Dispute {
  id: string;
  caseNumber: string;
  tenancyId: string;
  tenancy?: Tenancy;
  property?: Property;
  status: DisputeStatus;
  initiatedBy: string;
  totalDeposit: number | string;
  claimedDeduction: number | string;
  calculatedDeduction?: number | string | null;
  tenantOffer?: number | string | null;
  landlordOffer?: number | string | null;
  currentRound: number;
  settlementEligible: boolean;
  claims?: Claim[];
  offers?: Offer[];
  settlement?: Settlement | null;
}
