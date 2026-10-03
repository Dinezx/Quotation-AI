import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RateManagementPage } from '../pages/RateManagementPage';
import * as useRatesModule from '../hooks/useRates';

vi.mock('../hooks/useRates');

describe('RateManagementPage - Rebuilt Rates & Pricing Master', () => {
  it('renders exact empty states for new company with zero rates and unconfigured rules', () => {
    vi.spyOn(useRatesModule, 'useRates').mockReturnValue({
      materials: [],
      processes: [],
      pricingRules: {
        is_configured: false,
        overhead_percentage: null,
        profit_percentage: null,
        gst_type: null,
        default_gst_rate: null,
        rounding_method: null,
      },
      isLoading: false,
      isError: false,
      createMaterial: vi.fn(),
      updateMaterial: vi.fn(),
      deleteMaterial: vi.fn(),
      reactivateMaterial: vi.fn(),
      createProcess: vi.fn(),
      updateProcess: vi.fn(),
      deleteProcess: vi.fn(),
      reactivateProcess: vi.fn(),
      updatePricingRules: vi.fn(),
      refetch: vi.fn(),
    });

    render(<RateManagementPage />);

    // 1. Materials Tab empty state
    expect(screen.getByText('No material rates added yet')).toBeInTheDocument();
    expect(screen.getAllByText('+ Add Material').length).toBeGreaterThan(0);

    // 2. Click Cost Components tab
    const costCompTab = screen.getByRole('button', { name: /cost components/i });
    expect(costCompTab).toBeInTheDocument();
    fireEvent.click(costCompTab);

    expect(screen.getByText('No process rates added yet')).toBeInTheDocument();
    expect(screen.getAllByText('+ Add Cost Component').length).toBeGreaterThan(0);

    // 3. Click Overhead & Pricing Rules tab
    const pricingRulesTab = screen.getByRole('button', { name: /overhead & pricing rules/i });
    expect(pricingRulesTab).toBeInTheDocument();
    fireEvent.click(pricingRulesTab);

    expect(screen.getByText('No pricing rules configured yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configure Pricing Rules' })).toBeInTheDocument();
  });

  it('displays scrap credit as positive credit and never negative, with unit and net material rate', () => {
    vi.spyOn(useRatesModule, 'useRates').mockReturnValue({
      materials: [
        {
          id: 'mat-1',
          name: 'Medium Carbon Steel',
          grade: 'EN8D',
          gradeAndSpec: 'EN8D',
          category: 'Ferrous',
          baseRatePerKg: 320.0,
          scrapCreditPerKg: 110.0,
          densityGPerCm3: 7.85,
          unit: 'kg',
          primarySupplier: 'Direct Rate Master',
          mandiHub: 'Master Hub',
          aiMatchStatus: 'VERIFIED',
          is_active: true,
          lastUpdated: '01 Oct 2026',
        },
      ],
      processes: [],
      pricingRules: {
        is_configured: false,
        overhead_percentage: null,
        profit_percentage: null,
        gst_type: null,
        default_gst_rate: null,
      },
      isLoading: false,
      isError: false,
      createMaterial: vi.fn(),
      updateMaterial: vi.fn(),
      deleteMaterial: vi.fn(),
      reactivateMaterial: vi.fn(),
      createProcess: vi.fn(),
      updateProcess: vi.fn(),
      deleteProcess: vi.fn(),
      reactivateProcess: vi.fn(),
      updatePricingRules: vi.fn(),
      refetch: vi.fn(),
    });

    render(<RateManagementPage />);

    // Check material name and grade
    expect(screen.getByText('Medium Carbon Steel')).toBeInTheDocument();
    expect(screen.getByText('EN8D')).toBeInTheDocument();

    // Base Rate ₹320.00/kg
    expect(screen.getByText('₹320.00/kg')).toBeInTheDocument();

    // Scrap Credit displayed positively: ₹110.00/kg
    expect(screen.getByText('₹110.00/kg')).toBeInTheDocument();

    // Net Material Rate ₹210.00/kg
    expect(screen.getByText('₹210.00/kg')).toBeInTheDocument();

    // Verify negative scrap credit string never appears
    expect(screen.queryByText('-₹110.00/kg')).toBeNull();
    expect(screen.queryByText('-₹110')).toBeNull();
  });

  it('displays cost components with custom rate basis, rates, and unit', () => {
    vi.spyOn(useRatesModule, 'useRates').mockReturnValue({
      materials: [],
      processes: [
        {
          id: 'proc-1',
          workstationName: 'Garment Stitching',
          code: 'CC-PROC',
          category: 'Garment Stitching',
          rate_basis: 'Per Piece',
          rate: 35.0,
          hourlyRate: 35.0,
          setupCost: 200.0,
          unit: 'piece',
          is_active: true,
          lastCalibrated: '01 Oct 2026',
        },
        {
          id: 'proc-2',
          workstationName: 'Dynamic Balancing',
          code: 'CC-BAL',
          category: 'Dynamic Balancing',
          rate_basis: 'Per Operation',
          rate: 75.0,
          hourlyRate: 75.0,
          setupCost: 0.0,
          unit: 'op',
          is_active: true,
          lastCalibrated: '01 Oct 2026',
        },
      ],
      pricingRules: {
        is_configured: true,
        overhead_percentage: 10.0,
        profit_percentage: 15.0,
        gst_type: 'CGST_SGST',
        default_gst_rate: 18.0,
        rounding_method: 'ROUND_HALF_UP',
      },
      isLoading: false,
      isError: false,
      createMaterial: vi.fn(),
      updateMaterial: vi.fn(),
      deleteMaterial: vi.fn(),
      reactivateMaterial: vi.fn(),
      createProcess: vi.fn(),
      updateProcess: vi.fn(),
      deleteProcess: vi.fn(),
      reactivateProcess: vi.fn(),
      updatePricingRules: vi.fn(),
      refetch: vi.fn(),
    });

    render(<RateManagementPage />);

    // Switch to Cost Components tab
    const costCompTab = screen.getByRole('button', { name: /cost components/i });
    fireEvent.click(costCompTab);

    // Verify Garment Stitching and Dynamic Balancing rows
    expect(screen.getByText('Garment Stitching')).toBeInTheDocument();
    expect(screen.getByText('Per Piece')).toBeInTheDocument();
    expect(screen.getByText('₹35.00')).toBeInTheDocument();

    expect(screen.getByText('Dynamic Balancing')).toBeInTheDocument();
    expect(screen.getByText('Per Operation')).toBeInTheDocument();
    expect(screen.getByText('₹75.00')).toBeInTheDocument();
  });
});
