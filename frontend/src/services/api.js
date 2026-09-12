const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('gharpay_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle Blob response (for PDF download)
    if (options.responseType === 'blob') {
      if (!response.ok) {
        throw new Error(`Failed to download document (HTTP ${response.status})`);
      }
      return await response.blob();
    }

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('gharpay_token');
        localStorage.removeItem('gharpay_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expired=true';
        }
      }

      const errorMessage =
        data?.error?.message ||
        getFriendlyErrorMessage(response.status);

      const err = new Error(errorMessage);
      err.status = response.status;
      err.code = data?.error?.code;
      throw err;
    }

    return data;
  } catch (error) {
    if (!error.status) {
      error.message = 'Unable to connect to GharPay server. Please check backend status.';
    }
    throw error;
  }
}

function getFriendlyErrorMessage(status) {
  switch (status) {
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested case or resource was not found.';
    case 409:
      return 'This action conflicts with the current case status.';
    case 500:
      return 'Server error occurred. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
}

export const api = {
  // Auth
  auth: {
    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (data) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMe: () => request('/auth/me'),
  },

  // Landlord
  landlord: {
    getDisputes: () => request('/landlord/disputes'),
    createProperty: (data) =>
      request('/landlord/properties', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createTenancy: (data) =>
      request('/landlord/tenancies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createDispute: (data) =>
      request('/landlord/disputes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getDispute: (disputeId) => request(`/landlord/disputes/${disputeId}`),
    createClaim: (disputeId, data) =>
      request(`/landlord/disputes/${disputeId}/claims`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteClaim: (claimId) =>
      request(`/landlord/claims/${claimId}`, {
        method: 'DELETE',
      }),
    deleteDispute: (disputeId) =>
      request(`/landlord/disputes/${disputeId}`, {
        method: 'DELETE',
      }),
    getClaims: (disputeId) => request(`/landlord/disputes/${disputeId}/claims`),
    uploadEvidenceFile: (data) =>
      request('/landlord/evidence/upload', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    createEvidence: (claimId, data) =>
      request(`/landlord/claims/${claimId}/evidence`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    calculate: (disputeId) =>
      request(`/landlord/disputes/${disputeId}/calculate`, {
        method: 'POST',
      }),
    submitOffer: (disputeId, data) =>
      request(`/landlord/disputes/${disputeId}/offers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Dispute Actions (Outside Agreement, Court Case Application & Mediator Review Request)
  disputeActions: {
    proposeOutsideAgreement: (disputeId) =>
      request(`/disputes/${disputeId}/outside-agreement/propose`, {
        method: 'POST',
      }),
    respondOutsideAgreement: (disputeId, accept) =>
      request(`/disputes/${disputeId}/outside-agreement/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      }),
    submitCourtApplication: (disputeId, data = {}) =>
      request(`/disputes/${disputeId}/court-application`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    requestMediatorReview: (disputeId) =>
      request(`/disputes/${disputeId}/request-mediator-review`, {
        method: 'POST',
      }),
  },

  // Tenant
  tenant: {
    getDisputes: () => request('/tenant/disputes'),
    getDispute: (disputeId) => request(`/tenant/disputes/${disputeId}`),
    reviewDispute: (disputeId) =>
      request(`/tenant/disputes/${disputeId}/review`, {
        method: 'POST',
      }),
    startNegotiation: (disputeId) =>
      request(`/tenant/disputes/${disputeId}/negotiate`, {
        method: 'POST',
      }),
    submitOffer: (disputeId, data) =>
      request(`/tenant/disputes/${disputeId}/offers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    submitClaimComment: (claimId, data) =>
      request(`/tenant/claims/${claimId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getClaimComments: (claimId) => request(`/tenant/claims/${claimId}/comments`),
    uploadProof: (data) =>
      request('/tenant/proof/upload', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Mediator & Admin
  mediator: {
    getCases: () => request('/mediator/cases'),
    getMyCases: () => request('/mediator/my-cases'),
    getCase: (disputeId) => request(`/mediator/cases/${disputeId}`),
    reviewCase: (disputeId) =>
      request(`/mediator/cases/${disputeId}/review`, {
        method: 'POST',
      }),
    reviewClaim: (claimId, data) =>
      request(`/mediator/claims/${claimId}/review`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    submitRecommendation: (disputeId, data) =>
      request(`/mediator/cases/${disputeId}/recommendation`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    assignMediator: (disputeId, mediatorId) =>
      request(`/admin/disputes/${disputeId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ mediatorId }),
      }),
  },

  // Settlement
  settlement: {
    createSettlement: (disputeId, data) =>
      request(`/settlements/${disputeId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getSettlement: (disputeId) => request(`/settlements/${disputeId}`),
    tenantConsent: (disputeId, consent = true) =>
      request(`/settlements/${disputeId}/consent/tenant`, {
        method: 'POST',
        body: JSON.stringify({ consent }),
      }),
    landlordConsent: (disputeId, consent = true) =>
      request(`/settlements/${disputeId}/consent/landlord`, {
        method: 'POST',
        body: JSON.stringify({ consent }),
      }),
    markAsPaid: (disputeId) =>
      request(`/settlements/${disputeId}/mark-paid`, {
        method: 'POST',
      }),
    downloadPdf: (disputeId) =>
      request(`/settlements/${disputeId}/pdf`, {
        responseType: 'blob',
      }),
  },
};
