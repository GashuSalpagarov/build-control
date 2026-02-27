import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatMoneyInput, parseMoney } from '@/lib/format';

interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** Raw numeric string value, e.g. "1500000" or "1500000.50" */
  value: string;
  /** Called with the raw numeric string */
  onChange: (value: string) => void;
  /** Allow decimal input (for payment amounts) */
  allowDecimals?: boolean;
  /** Show ₽ suffix */
  suffix?: boolean;
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, allowDecimals = false, suffix = false, ...props }, ref) => {
    const displayValue = formatMoneyInput(value, allowDecimals);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseMoney(e.target.value);

      // Validate: allow empty, or valid number
      if (raw === '' || raw === '-') {
        onChange(raw);
        return;
      }

      if (allowDecimals) {
        // Allow partial decimal input like "123."
        if (/^-?\d+\.?\d{0,2}$/.test(raw)) {
          onChange(raw);
        }
      } else {
        if (/^-?\d+$/.test(raw)) {
          onChange(raw);
        }
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      const raw = parseMoney(pasted);

      if (raw === '') return;

      if (allowDecimals) {
        if (/^-?\d+\.?\d{0,2}$/.test(raw)) {
          onChange(raw);
        }
      } else {
        // Strip decimals on paste for integer-only fields
        const intPart = raw.split('.')[0];
        if (/^-?\d+$/.test(intPart)) {
          onChange(intPart);
        }
      }
    };

    return (
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            suffix && 'pr-8',
            className,
          )}
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onPaste={handlePaste}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            ₽
          </span>
        )}
      </div>
    );
  },
);
MoneyInput.displayName = 'MoneyInput';

export { MoneyInput };
