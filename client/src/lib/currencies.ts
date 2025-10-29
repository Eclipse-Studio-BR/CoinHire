// Currency configuration and utilities

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  countries: string[];
  priceMultiplier: number; // Relative to USD base price
}

// Base price in USD cents
const BASE_PRICE_USD = 200; // $2.00 (TEMPORARY FOR TESTING - normally 5000)

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    countries: ['US', 'PR', 'GU', 'VI'],
    priceMultiplier: 1.0,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR', 'SK', 'SI', 'EE', 'LV', 'LT', 'LU', 'MT', 'CY'],
    priceMultiplier: 0.92, // 1 USD = 0.92 EUR (approximate)
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    countries: ['GB'],
    priceMultiplier: 0.79, // 1 USD = 0.79 GBP (approximate)
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    countries: ['BR'],
    priceMultiplier: 5.0, // 1 USD = 5 BRL (approximate)
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    countries: ['CA'],
    priceMultiplier: 1.35, // 1 USD = 1.35 CAD (approximate)
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    countries: ['AU'],
    priceMultiplier: 1.52, // 1 USD = 1.52 AUD (approximate)
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    countries: ['JP'],
    priceMultiplier: 149.0, // 1 USD = 149 JPY (approximate)
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    countries: ['CH'],
    priceMultiplier: 0.88, // 1 USD = 0.88 CHF (approximate)
  },
  MXN: {
    code: 'MXN',
    symbol: 'MX$',
    name: 'Mexican Peso',
    countries: ['MX'],
    priceMultiplier: 17.0, // 1 USD = 17 MXN (approximate)
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    countries: ['IN'],
    priceMultiplier: 83.0, // 1 USD = 83 INR (approximate)
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    countries: ['SG'],
    priceMultiplier: 1.34, // 1 USD = 1.34 SGD (approximate)
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    countries: ['AE'],
    priceMultiplier: 3.67, // 1 USD = 3.67 AED (approximate)
  },
};

/**
 * Detect user's currency based on their location
 */
export async function detectUserCurrency(): Promise<string> {
  try {
    // Try to get user's country from various sources
    
    // 1. PRIORITY: Check timezone first (most reliable for location)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('Detected timezone:', timezone);
    
    // Brazilian timezones
    if (timezone.includes('Sao_Paulo') || 
        timezone.includes('Fortaleza') || 
        timezone.includes('Recife') ||
        timezone.includes('Manaus') ||
        timezone.includes('Belem') ||
        timezone.includes('America/Brazil') ||
        timezone.includes('Brasilia')) {
      console.log('Detected Brazil from timezone');
      return 'BRL';
    }
    
    // European timezones
    if (timezone.includes('Europe/')) {
      console.log('Detected Europe from timezone');
      return 'EUR';
    }
    
    // UK timezone
    if (timezone.includes('London')) {
      return 'GBP';
    }
    
    // Asian timezones
    if (timezone.includes('Asia/Tokyo')) {
      return 'JPY';
    }
    if (timezone.includes('Asia/Singapore')) {
      return 'SGD';
    }
    if (timezone.includes('Asia/Kolkata') || timezone.includes('Asia/Mumbai')) {
      return 'INR';
    }
    if (timezone.includes('Asia/Dubai')) {
      return 'AED';
    }
    
    // Australian timezone
    if (timezone.includes('Australia/')) {
      return 'AUD';
    }
    
    // Canadian timezone
    if (timezone.includes('America/Toronto') || 
        timezone.includes('America/Vancouver') ||
        timezone.includes('America/Montreal')) {
      return 'CAD';
    }
    
    // Mexican timezone
    if (timezone.includes('America/Mexico')) {
      return 'MXN';
    }
    
    // Swiss timezone
    if (timezone.includes('Europe/Zurich')) {
      return 'CHF';
    }
    
    // 2. FALLBACK: Try browser language/locale
    const locale = navigator.language || 'en-US';
    console.log('Detected locale:', locale);
    const countryCode = locale.split('-')[1]?.toUpperCase();
    
    if (countryCode) {
      // Find currency for this country
      for (const [currencyCode, config] of Object.entries(SUPPORTED_CURRENCIES)) {
        if (config.countries.includes(countryCode)) {
          console.log(`Detected ${currencyCode} from locale country code: ${countryCode}`);
          return currencyCode;
        }
      }
    }
    
    // 3. Final fallback - US timezone means USD
    if (timezone.includes('America/')) {
      console.log('Detected Americas, defaulting to USD');
      return 'USD';
    }

    // 4. Ultimate fallback
    console.log('No detection worked, defaulting to USD');
    return 'USD';
  } catch (error) {
    console.error('Error detecting currency:', error);
    return 'USD';
  }
}

/**
 * Get price in specific currency
 */
export function getPriceInCurrency(currency: string): number {
  const config = SUPPORTED_CURRENCIES[currency];
  if (!config) {
    return BASE_PRICE_USD; // Fallback to USD
  }
  
  // Calculate price based on multiplier
  const price = Math.round(BASE_PRICE_USD * config.priceMultiplier);
  
  // For JPY and other zero-decimal currencies, return as-is
  if (currency === 'JPY') {
    return price;
  }
  
  return price;
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string): string {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
  
  // For zero-decimal currencies (JPY), don't divide by 100
  const displayAmount = currency === 'JPY' ? amount : amount / 100;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(displayAmount);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const config = SUPPORTED_CURRENCIES[currency];
  return config?.symbol || '$';
}

/**
 * Get currency name
 */
export function getCurrencyName(currency: string): string {
  const config = SUPPORTED_CURRENCIES[currency];
  return config?.name || 'US Dollar';
}
