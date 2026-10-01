import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomersPage } from '../pages/CustomersPage';
import { customerApi } from '../api/customerApi';
import { apiClient } from '../api/apiClient';

vi.mock('../api/customerApi', () => ({
  customerApi: {
    list: vi.fn(),
    listPaginated: vi.fn(),
    getQuotations: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reactivate: vi.fn(),
  },
}));

vi.mock('../api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: 'http://localhost:8000/api/v1' },
  },
}));

describe('Quotation AI — Premium Customer Directory UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders empty company customer directory with 0 statistics and intentional empty workspace', async () => {
    vi.mocked(customerApi.listPaginated).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0 },
    });

    render(
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>
    );

    // Header elements
    expect(screen.getByText('Customer Directory')).toBeInTheDocument();
    expect(screen.getByText(/Manage your verified customers/i)).toBeInTheDocument();
    expect(screen.getByText(/Build stronger customer relationships/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Customer/i })).toBeInTheDocument();

    // Summary cards: Total, Active, Inactive, Total Quotations all display 0
    await waitFor(() => {
      expect(screen.getByText('Total Customers')).toBeInTheDocument();
      expect(screen.getByText('Active Customers')).toBeInTheDocument();
      expect(screen.getByText('Inactive Customers')).toBeInTheDocument();
      expect(screen.getByText('Total Quotations')).toBeInTheDocument();
    });

    // Intentional empty state (matching reference image)
    await waitFor(() => {
      expect(screen.getByText('No customer accounts yet')).toBeInTheDocument();
      expect(screen.getByText(/Start by adding your first customer/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Your First Customer/i })).toBeInTheDocument();
    });

    // Tips for managing customers guidance card
    expect(screen.getByText('Tips for managing customers')).toBeInTheDocument();
    expect(screen.getByText(/1. Add Customer/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Link Quotations/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Track Communication/i)).toBeInTheDocument();
    expect(screen.getByText(/4. Build Relationships/i)).toBeInTheDocument();
  });

  it('2. Renders customer directory list with real accounts and company metrics', async () => {
    const mockCustomers = [
      {
        id: 'cust-101',
        company_id: 'comp-1',
        name: 'Ashok Leyland Ltd',
        code: 'CUST-AL01',
        contact_person: 'Vikram Joshi',
        email: 'purchase@ashokleyland.com',
        quotation_email: 'quotes@ashokleyland.com',
        phone: '+91 22 6655 4400',
        billing_address: '1 Sardar Patel Marg, Chennai, TN',
        shipping_address: 'Ennore Facility, Chennai',
        gstin: '33AAACA1234F1Z9',
        is_active: true,
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      },
      {
        id: 'cust-102',
        company_id: 'comp-1',
        name: 'Bharat Forge Limited',
        code: 'CUST-BF02',
        contact_person: 'Amit Patil',
        email: 'procurement@bharatforge.com',
        phone: '+91 20 6704 2777',
        billing_address: 'Mundhwa, Pune, MH',
        gstin: '27AAACB5678F1Z2',
        is_active: false,
        created_at: '2026-09-02T10:00:00Z',
        updated_at: '2026-09-02T10:00:00Z',
      },
    ];

    vi.mocked(customerApi.listPaginated).mockResolvedValue({
      items: mockCustomers,
      total: 2,
      page: 1,
      page_size: 10,
    });

    vi.mocked(customerApi.getQuotations).mockResolvedValue([
      { id: 'q-1', quotation_number: 'Q-2026-001', created_at: '2026-09-15T10:00:00Z' },
      { id: 'q-2', quotation_number: 'Q-2026-002', created_at: '2026-09-20T10:00:00Z' },
    ]);

    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 18 },
    });

    render(
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ashok Leyland Ltd')).toBeInTheDocument();
      expect(screen.getByText('33AAACA1234F1Z9')).toBeInTheDocument();
      expect(screen.getByText('Vikram Joshi')).toBeInTheDocument();
      expect(screen.getByText('purchase@ashokleyland.com')).toBeInTheDocument();

      expect(screen.getByText('Bharat Forge Limited')).toBeInTheDocument();
      expect(screen.getByText('27AAACB5678F1Z2')).toBeInTheDocument();
    });
  });

  it('3. Error state displays "Unable to load customers" with Retry action', async () => {
    vi.mocked(customerApi.listPaginated).mockRejectedValue(new Error('Network connection refused'));

    render(
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Unable to load customers/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it('4. Opens Add Customer modal when "+ Add Customer" or "+ Add Your First Customer" is clicked', async () => {
    vi.mocked(customerApi.listPaginated).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    });

    render(
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Your First Customer/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Your First Customer/i }));

    await waitFor(() => {
      expect(screen.getByText('Add Customer Account')).toBeInTheDocument();
      expect(screen.getByText('Account Identity')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. Bharat Heavy Electricals Ltd/i)).toBeInTheDocument();
    });
  });
});
