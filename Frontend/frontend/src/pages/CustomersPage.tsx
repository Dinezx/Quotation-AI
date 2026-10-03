import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  ArrowRight,
  Clock,
  Lightbulb,
  X,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  Info,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { customerApi, CustomerDTO, CustomerCreateDTO } from '../api/customerApi';
import { apiClient } from '../api/apiClient';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Real Data State
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerDTO[]>([]);
  const [totalQuotationsCount, setTotalQuotationsCount] = useState<number>(0);
  const [customerQuoteCounts, setCustomerQuoteCounts] = useState<Record<string, { count: number; lastDate?: string }>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bottom tips dismissal state
  const [showTips, setShowTips] = useState(true);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDTO | null>(null);

  const [form, setForm] = useState<CustomerCreateDTO>({
    name: '',
    contact_person: '',
    email: '',
    quotation_email: '',
    phone: '',
    billing_address: '',
    shipping_address: '',
    gstin: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch summary counts (all customers + total quotations)
  const fetchSummaryMetrics = async () => {
    try {
      // 1. Fetch all tenant customers to compute real status totals & location options
      const allRes = await customerApi.listPaginated({ page: 1, page_size: 500, status: 'all' });
      if (allRes?.items) {
        setAllCustomers(allRes.items);
      }

      // 2. Fetch total quotations count across all customers for this company
      const quotesRes = await apiClient.get('/quotations', { params: { page: 1, page_size: 1 } });
      if (typeof quotesRes.data?.total === 'number') {
        setTotalQuotationsCount(quotesRes.data.total);
      } else if (Array.isArray(quotesRes.data)) {
        setTotalQuotationsCount(quotesRes.data.length);
      }
    } catch (err) {
      console.debug('[CustomersPage] Error fetching summary metrics:', err);
    }
  };

  // Fetch paginated customer records
  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerApi.listPaginated({
        page,
        page_size: pageSize,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });

      setCustomers(data.items || []);
      setTotalCount(data.total || 0);

      // Concurrently fetch quotation counts for displayed customers
      if (data.items && data.items.length > 0) {
        const countsMap: Record<string, { count: number; lastDate?: string }> = {};
        await Promise.all(
          data.items.slice(0, 10).map(async (cust) => {
            try {
              const quotes = await customerApi.getQuotations(cust.id);
              if (Array.isArray(quotes)) {
                countsMap[cust.id] = {
                  count: quotes.length,
                  lastDate: quotes[0]?.created_at ? new Date(quotes[0].created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined,
                };
              }
            } catch {
              countsMap[cust.id] = { count: 0 };
            }
          })
        );
        setCustomerQuoteCounts(prev => ({ ...prev, ...countsMap }));
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Unable to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryMetrics();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [page, debouncedSearch, statusFilter]);

  // Extract distinct locations from real customer data
  const distinctLocations = useMemo(() => {
    const locSet = new Set<string>();
    allCustomers.forEach((c) => {
      const addr = c.billing_address || c.shipping_address || '';
      if (addr) {
        const parts = addr.split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          const candidate = parts[parts.length - 2];
          if (candidate && candidate.length > 2) locSet.add(candidate);
        } else if (parts[0]) {
          locSet.add(parts[0]);
        }
      }
    });
    return Array.from(locSet).slice(0, 12);
  }, [allCustomers]);

  // Derived real summary counts
  const totalCustomers = allCustomers.length;
  const activeCustomers = allCustomers.filter((c) => c.is_active).length;
  const inactiveCustomers = allCustomers.filter((c) => !c.is_active).length;

  // Filter customers by location if locationFilter is selected
  const filteredCustomers = useMemo(() => {
    if (locationFilter === 'all') return customers;
    return customers.filter((c) => {
      const combined = `${c.billing_address || ''} ${c.shipping_address || ''}`.toLowerCase();
      return combined.includes(locationFilter.toLowerCase());
    });
  }, [customers, locationFilter]);

  const handleOpenCreateModal = () => {
    setForm({
      name: '',
      contact_person: '',
      email: '',
      quotation_email: '',
      phone: '',
      billing_address: '',
      shipping_address: '',
      gstin: '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (cust: CustomerDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(cust);
    setForm({
      name: cust.name,
      contact_person: cust.contact_person || '',
      email: cust.email || cust.login_email || '',
      quotation_email: cust.quotation_email || '',
      phone: cust.phone || '',
      billing_address: cust.billing_address || '',
      shipping_address: cust.shipping_address || '',
      gstin: cust.gstin || '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await customerApi.create({
        name: form.name.trim(),
        contact_person: form.contact_person?.trim() || undefined,
        email: form.email?.trim() || undefined,
        quotation_email: form.quotation_email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        billing_address: form.billing_address?.trim() || undefined,
        shipping_address: form.shipping_address?.trim() || undefined,
        gstin: form.gstin?.trim().toUpperCase() || undefined,
      });
      setIsCreateModalOpen(false);
      fetchSummaryMetrics();
      fetchCustomers();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await customerApi.update(selectedCustomer.id, {
        name: form.name.trim(),
        contact_person: form.contact_person?.trim() || undefined,
        email: form.email?.trim() || undefined,
        quotation_email: form.quotation_email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        billing_address: form.billing_address?.trim() || undefined,
        shipping_address: form.shipping_address?.trim() || undefined,
        gstin: form.gstin?.trim().toUpperCase() || undefined,
      });
      setIsEditModalOpen(false);
      fetchSummaryMetrics();
      fetchCustomers();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (cust: CustomerDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (cust.is_active) {
        if (confirm(`Deactivate customer ${cust.name}? They will be marked inactive for new POs.`)) {
          await customerApi.delete(cust.id);
          fetchSummaryMetrics();
          fetchCustomers();
        }
      } else {
        await customerApi.reactivate(cust.id);
        fetchSummaryMetrics();
        fetchCustomers();
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || err.message || 'Action failed');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto space-y-6 antialiased font-sans">
      {/* 1. Header Row + Relationship Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Customer Directory
            </h1>
            <button 
              type="button"
              title="Directory of verified customer master accounts, GST details, and quote history."
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
            Manage your verified customers, GST details, communication preferences and quotation history.
          </p>
        </div>

        {/* Center / Right: Relationship Banner & Add Customer Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Subtle Relationship Banner */}
          <div className="hidden lg:flex items-center gap-3 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/50 border border-blue-100 rounded-2xl px-4 py-2.5 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 7C17.8954 7 17 6.10457 17 5C17 3.89543 17.8954 3 19 3C20.1046 3 21 3.89543 21 5C21 6.10457 20.1046 7 19 7Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 11C15.1046 11 16 10.1046 16 9C16 7.89543 15.1046 7 14 7C12.8954 7 12 7.89543 12 9C12 10.1046 12.8954 11 14 11Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 16L12 21L15 18L10 13" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 11L12 6L7 11L11 15" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                Build stronger customer relationships
              </span>
              <span className="text-[11px] text-slate-500 leading-tight mt-0.5 max-w-[280px]">
                Keep all your customer information, quotations and communication in one place.
              </span>
            </div>
          </div>

          {/* Primary + Add Customer Action */}
          <button
            onClick={handleOpenCreateModal}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Customer</span>
            <ChevronDown className="w-3.5 h-3.5 text-blue-200 hidden sm:inline" />
          </button>
        </div>
      </div>

      {/* 2. Customer Summary Cards (Real Tenant Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4 transition-all hover:border-blue-200 hover:shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-100/80">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {totalCustomers}
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md font-mono">
                +0%
              </span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-0.5">Total Customers</div>
            <div className="text-[11px] text-slate-400 truncate">All customer accounts</div>
          </div>
        </div>

        {/* Active Customers */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4 transition-all hover:border-emerald-200 hover:shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {activeCustomers}
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md font-mono">
                +0%
              </span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-0.5">Active Customers</div>
            <div className="text-[11px] text-slate-400 truncate">Currently doing business</div>
          </div>
        </div>

        {/* Inactive Customers */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4 transition-all hover:border-amber-200 hover:shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/80">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {inactiveCustomers}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-0.5">Inactive Customers</div>
            <div className="text-[11px] text-slate-400 truncate">Not active</div>
          </div>
        </div>

        {/* Total Quotations */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4 transition-all hover:border-purple-200 hover:shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/80">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {totalQuotationsCount}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-0.5">Total Quotations</div>
            <div className="text-[11px] text-slate-400 truncate">Generated for customers</div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar (Matching Reference Visual) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Large search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, email, GSTIN, or contact person..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] hover:bg-slate-100/60 focus:bg-white border border-slate-200/90 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all outline-none"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                className="appearance-none bg-[#f8fafc] hover:bg-slate-100/80 border border-slate-200/90 rounded-xl pl-3.5 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#2563EB] cursor-pointer transition-colors"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Locations Dropdown */}
            <div className="relative">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="appearance-none bg-[#f8fafc] hover:bg-slate-100/80 border border-slate-200/90 rounded-xl pl-3.5 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#2563EB] cursor-pointer transition-colors max-w-[150px] truncate"
              >
                <option value="all">All Locations</option>
                {distinctLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Industries Dropdown */}
            <div className="relative">
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="appearance-none bg-[#f8fafc] hover:bg-slate-100/80 border border-slate-200/90 rounded-xl pl-3.5 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#2563EB] cursor-pointer transition-colors"
              >
                <option value="all">All Industries</option>
                <option value="automotive">Automotive</option>
                <option value="aerospace">Aerospace</option>
                <option value="precision">Precision Machining</option>
                <option value="sheet_metal">Sheet Metal</option>
                <option value="heavy_eng">Heavy Engineering</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter Funnel Button */}
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setLocationFilter('all');
                setIndustryFilter('all');
                setSearch('');
              }}
              title="Reset all filters"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#f8fafc] hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Content: Empty State vs. Customer Directory Workspace */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {loading && customers.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB]" />
            <span className="font-medium text-slate-700">Loading Customer Directory...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Unable to load customers</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
            </div>
            <button
              onClick={() => fetchCustomers()}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          /* Large Visually Rich Empty State (Matching Reference Image) */
          <div className="p-12 sm:p-20 text-center flex flex-col items-center justify-center">
            {/* Subtle ID Card + Magnifying Glass Illustration (SVG) */}
            <div className="w-28 h-28 relative mb-6 flex items-center justify-center">
              {/* Back Card */}
              <div className="w-20 h-16 rounded-xl bg-blue-50/60 border-2 border-dashed border-blue-200 absolute -top-1 -right-1 rotate-6 pointer-events-none" />
              
              {/* Front ID Card */}
              <div className="w-24 h-18 rounded-2xl bg-white border border-blue-100 shadow-md shadow-blue-500/10 p-2.5 flex flex-col justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 bg-slate-200 rounded-full w-3/4" />
                    <div className="h-1 bg-slate-100 rounded-full w-1/2" />
                  </div>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="h-1 bg-slate-100 rounded-full w-full" />
                  <div className="h-1 bg-slate-100 rounded-full w-5/6" />
                </div>
              </div>

              {/* Magnifying Glass Accent */}
              <div className="absolute -bottom-2 -right-2 z-20 w-11 h-11 rounded-full bg-blue-500/10 backdrop-blur-xs border-2 border-blue-600 flex items-center justify-center shadow-lg">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              No customer accounts yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              Start by adding your first customer to manage quotations, communication and history in one place.
            </p>

            <button
              onClick={handleOpenCreateModal}
              className="mt-6 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Your First Customer</span>
            </button>
          </div>
        ) : (
          /* Premium Customer Directory Table / Cards */
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8fafc] border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Customer Company</th>
                    <th className="py-3.5 px-4">GSTIN & Verification</th>
                    <th className="py-3.5 px-4">Primary Contact</th>
                    <th className="py-3.5 px-4">Communication</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4 text-center">Quotations</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust) => {
                    const custCode = cust.code || `CUST-${cust.id.slice(0, 6).toUpperCase()}`;
                    const stats = customerQuoteCounts[cust.id] || { count: 0 };
                    const initial = cust.name ? cust.name.slice(0, 2).toUpperCase() : 'CU';

                    return (
                      <tr 
                        key={cust.id} 
                        onClick={() => navigate(`/customers/${cust.id}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Customer Company & Code */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60 font-sans shadow-2xs group-hover:border-blue-400 transition-colors">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors block truncate">
                                {cust.name}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 mt-0.5 block">
                                {custCode}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* GSTIN */}
                        <td className="py-3.5 px-4">
                          {cust.gstin ? (
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-mono font-bold text-slate-800 tracking-wider">
                                {cust.gstin}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic font-mono">—</span>
                          )}
                        </td>

                        {/* Primary Contact Person & Phone */}
                        <td className="py-3.5 px-4 text-slate-700">
                          {cust.contact_person ? (
                            <div className="font-semibold text-slate-900 truncate">
                              {cust.contact_person}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No contact person</span>
                          )}
                          {cust.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{cust.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Communication: Login & Quotation Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 font-mono text-slate-700 truncate max-w-[200px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{cust.email || cust.login_email || '—'}</span>
                          </div>
                          {cust.quotation_email && cust.quotation_email !== cust.email && (
                            <div className="flex items-center gap-1 font-mono text-[11px] text-blue-700 mt-0.5">
                              <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-sans font-bold">
                                QUOTE PREF
                              </span>
                              <span className="truncate">{cust.quotation_email}</span>
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1 truncate max-w-[160px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {cust.billing_address || cust.shipping_address || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Quotations Count & Last Date */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                            {stats.count}
                          </span>
                          {stats.lastDate && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              {stats.lastDate}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={cust.is_active ? 'success' : 'slate'} size="sm">
                            {cust.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/customers/${cust.id}`)}
                              className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(cust, e)}
                              title="Edit Customer"
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleToggleDeactivate(cust, e)}
                              title={cust.is_active ? 'Deactivate Customer' : 'Reactivate Customer'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                cust.is_active 
                                  ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600' 
                                  : 'hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700'
                              }`}
                            >
                              {cust.is_active ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3.5 bg-[#f8fafc] border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing <strong className="text-slate-900 font-mono">{filteredCustomers.length}</strong> of{' '}
                <strong className="text-slate-900 font-mono">{totalCount}</strong> customers
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Page <strong className="text-slate-900 font-mono">{page}</strong> of{' '}
                  <strong className="text-slate-900 font-mono">{totalPages}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    icon={<ChevronLeft className="w-3.5 h-3.5" />}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Bottom Guidance Card: Tips for managing customers (Matching Reference Image) */}
      {showTips && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative transition-all">
          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => setShowTips(false)}
            title="Dismiss tips"
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Row */}
          <div className="flex items-start gap-3 mb-5 pr-8">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Tips for managing customers
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Keep your customer data updated to generate accurate quotations faster.
              </p>
            </div>
          </div>

          {/* 4 Steps Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f8fafc] border border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block">
                  1. Add Customer
                </span>
                <span className="text-[11px] text-slate-500 leading-tight mt-0.5 block">
                  Enter customer name, GSTIN and contact details.
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f8fafc] border border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-200/60">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block">
                  2. Link Quotations
                </span>
                <span className="text-[11px] text-slate-500 leading-tight mt-0.5 block">
                  All quotations will be saved against the customer.
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f8fafc] border border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/60">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block">
                  3. Track Communication
                </span>
                <span className="text-[11px] text-slate-500 leading-tight mt-0.5 block">
                  Maintain communication history in one place.
                </span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f8fafc] border border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block">
                  4. Build Relationships
                </span>
                <span className="text-[11px] text-slate-500 leading-tight mt-0.5 block">
                  View past quotations and repeat orders easily.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Customer Account"
        description="Onboard a new verified customer master record."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Account Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-wider text-[11px]">
              Account Identity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Bharat Heavy Electricals Ltd"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Login Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="purchase@customer.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quotation Communication */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-wider text-[11px]">
              Quotation Communication
            </h4>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Quotation Delivery Email (Optional)</label>
              <input
                type="email"
                value={form.quotation_email}
                onChange={(e) => setForm({ ...form, quotation_email: e.target.value })}
                placeholder="quotes@customer.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Optional. If empty, quotations will default to the customer's login email.
              </span>
            </div>
          </div>

          {/* Commercial & Contact */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-wider text-[11px]">
              Commercial & Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">GSTIN (15 chars)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="27AAACB1234F1Z8"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  placeholder="e.g. Sunil Varma"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98224 00000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-wider text-[11px]">
              Addresses
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={form.billing_address}
                  onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                  placeholder="Registered billing address..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shipping Address</label>
                <textarea
                  rows={2}
                  value={form.shipping_address}
                  onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                  placeholder="Delivery hub / factory address..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer"
        description="Modify verified customer attributes."
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateCustomer} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Login Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Quotation Delivery Email (Optional)</label>
              <input
                type="email"
                value={form.quotation_email}
                onChange={(e) => setForm({ ...form, quotation_email: e.target.value })}
                placeholder="quotes@customer.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Optional. If empty, quotations are sent to the customer's login email.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">GSTIN</label>
              <input
                type="text"
                maxLength={15}
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={form.billing_address}
                  onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shipping Address</label>
                <textarea
                  rows={2}
                  value={form.shipping_address}
                  onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomersPage;
