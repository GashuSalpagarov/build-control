const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
});

const numberFormatterWithDecimals = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Format a number as currency for display: 1500000 → "1 500 000 ₽"
 * Returns "—" for null/undefined, but correctly handles 0.
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '—';
  return currencyFormatter.format(amount);
}

/**
 * Format a raw numeric string for display inside an input field: "1500000" → "1 500 000"
 * With allowDecimals: "1500000.50" → "1 500 000,50"
 */
export function formatMoneyInput(value: string, allowDecimals = false): string {
  if (!value) return '';

  if (allowDecimals) {
    // Split integer and decimal parts
    const parts = value.split('.');
    const intPart = parts[0];
    const decPart = parts[1];

    const num = parseInt(intPart, 10);
    if (isNaN(num)) return '';

    const formatted = numberFormatter.format(num);

    if (decPart !== undefined) {
      // Keep the decimal part as-is (user is still typing)
      return formatted + ',' + decPart;
    }
    return formatted;
  }

  const num = parseInt(value, 10);
  if (isNaN(num)) return '';
  return numberFormatter.format(num);
}

/**
 * Parse a formatted money string back to a raw numeric string: "1 500 000" → "1500000"
 * Handles both spaces (non-breaking and regular) and comma as decimal separator.
 */
export function parseMoney(formatted: string): string {
  // Remove all whitespace (including non-breaking spaces \u00A0)
  let cleaned = formatted.replace(/[\s\u00A0]/g, '');

  // Replace comma with dot for decimal separator
  cleaned = cleaned.replace(',', '.');

  // Remove any non-numeric characters except dot and minus
  cleaned = cleaned.replace(/[^\d.\-]/g, '');

  // Ensure only one dot
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1) {
    cleaned = cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, '');
  }

  return cleaned;
}
