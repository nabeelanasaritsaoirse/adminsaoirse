/*******************************
 * REGIONAL CONFIGURATION
 * Supported regions for products and categories
 *******************************/

const SUPPORTED_REGIONS = [
  {
    code: 'india',
    name: 'India',
    currency: 'INR',
    flag: '🇮🇳',
    countryCode: '+91',
    symbol: '₹'
  },
  {
    code: 'usa',
    name: 'United States',
    currency: 'USD',
    flag: '🇺🇸',
    countryCode: '+1',
    symbol: '$'
  },
  {
    code: 'uk',
    name: 'United Kingdom',
    currency: 'GBP',
    flag: '🇬🇧',
    countryCode: '+44',
    symbol: '£'
  },
  {
    code: 'uae',
    name: 'UAE',
    currency: 'AED',
    flag: '🇦🇪',
    countryCode: '+971',
    symbol: 'د.إ'
  },
  {
    code: 'singapore',
    name: 'Singapore',
    currency: 'SGD',
    flag: '🇸🇬',
    countryCode: '+65',
    symbol: 'S$'
  },
  {
    code: 'canada',
    name: 'Canada',
    currency: 'CAD',
    flag: '🇨🇦',
    countryCode: '+1',
    symbol: 'C$'
  },
  {
    code: 'australia',
    name: 'Australia',
    currency: 'AUD',
    flag: '🇦🇺',
    countryCode: '+61',
    symbol: 'A$'
  },
];

// Utility functions
const RegionUtils = {
  /**
   * Get region by code
   */
  getRegionByCode(code) {
    return SUPPORTED_REGIONS.find(r => r.code === code);
  },

  /**
   * Get all region codes
   */
  getAllRegionCodes() {
    return SUPPORTED_REGIONS.map(r => r.code);
  },

  /**
   * Format currency with symbol
   */
  formatCurrency(amount, regionCode) {
    const region = this.getRegionByCode(regionCode);
    if (!region) return amount;

    return `${region.symbol}${amount.toLocaleString()}`;
  },

  /**
   * Simple currency conversion (approximate)
   * For accurate conversion, use a real API in Phase 2
   */
  approximateConversion(amount, fromCurrency, toCurrency) {
    const rates = {
      'USD': 1,
      'INR': 83,
      'GBP': 0.79,
      'AED': 3.67,
      'SGD': 1.35,
      'CAD': 1.36,
      'AUD': 1.52,
    };

    const usdAmount = amount / (rates[fromCurrency] || 1);
    return Math.round(usdAmount * (rates[toCurrency] || 1));
  }
};

// Export globally
window.SUPPORTED_REGIONS = SUPPORTED_REGIONS;
window.RegionUtils = RegionUtils;

console.log('✅ [REGIONS] Regional configuration loaded:', SUPPORTED_REGIONS.length, 'regions');
