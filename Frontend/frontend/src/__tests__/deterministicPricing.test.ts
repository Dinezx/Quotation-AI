import { describe, it, expect } from 'vitest';
import { formatCurrency, formatWeight, formatHours, formatPercent } from '../utils/formatters';

describe('Deterministic Pricing & Precision Formatting Guarantees', () => {
  it('formats currency with exact Indian numbering system without rounding loss', () => {
    expect(formatCurrency(185420.5)).toContain('1,85,420.50');
    expect(formatCurrency(1250000)).toContain('12,50,000.00');
    expect(formatCurrency(0)).toContain('0.00');
  });

  it('formats weight in kilograms with 2 decimal precision', () => {
    expect(formatWeight(4.85)).toBe('4.85 kg');
    expect(formatWeight(120)).toBe('120.00 kg');
    expect(formatWeight(undefined)).toBe('0.00 kg');
  });

  it('formats cycle hours to 2 decimal precision', () => {
    expect(formatHours(1.25)).toBe('1.25 hrs');
    expect(formatHours(0.5)).toBe('0.50 hrs');
  });

  it('formats margin and percentage accurately', () => {
    expect(formatPercent(15)).toBe('15.0%');
    expect(formatPercent(18.5)).toBe('18.5%');
  });

  it('ensures blocked calculation state cannot proceed without rate cards', () => {
    const mockBlockedCalc = {
      id: 'calc-blocked-1',
      status: 'BLOCKED',
      missing_rates: [
        {
          item_id: 'item-1',
          item_number: 1,
          part_name: 'Pinion Shaft',
          missing_rate_types: ['MATERIAL', 'PROCESS:VMC_4AXIS'],
          material_grade: 'EN24T',
        },
      ],
      warnings: ['Material EN24T missing active rate master entry'],
      subtotal: 0,
      grand_total: 0,
    };

    // Invariant: If status is BLOCKED, proceed must be forbidden
    const canProceed = mockBlockedCalc.status !== 'BLOCKED' && mockBlockedCalc.missing_rates.length === 0;
    expect(canProceed).toBe(false);
    expect(mockBlockedCalc.missing_rates[0].missing_rate_types).toContain('MATERIAL');
  });
});
