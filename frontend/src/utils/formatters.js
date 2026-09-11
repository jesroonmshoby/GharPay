/**
 * Formats monetary amounts as INR currency strings for display only
 * Does NOT perform float business calculations
 */
export const formatINR = (value) => {
  if (value === null || value === undefined || value === '') return '₹0';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '₹0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
};

/**
 * Formats ISO date string into readable Indian date format
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch (err) {
    return dateString;
  }
};
