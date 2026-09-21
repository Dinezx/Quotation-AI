import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';

// Route-level code splitting for production bundle optimization
const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PoUploadPage = lazy(() => import('../pages/PoUploadPage').then(m => ({ default: m.PoUploadPage })));
const PoReviewPage = lazy(() => import('../pages/PoReviewPage').then(m => ({ default: m.PoReviewPage })));
const RateManagementPage = lazy(() => import('../pages/RateManagementPage').then(m => ({ default: m.RateManagementPage })));
const CalculationReviewPage = lazy(() => import('../pages/CalculationReviewPage').then(m => ({ default: m.CalculationReviewPage })));
const QuotationHistoryPage = lazy(() => import('../pages/QuotationHistoryPage').then(m => ({ default: m.QuotationHistoryPage })));
const QuotationPreviewPage = lazy(() => import('../pages/QuotationPreviewPage').then(m => ({ default: m.QuotationPreviewPage })));
const CustomersPage = lazy(() => import('../pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() => import('../pages/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
      <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">Loading View...</span>
    </div>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="upload" element={<PoUploadPage />} />
          <Route path="review" element={<PoReviewPage />} />
          <Route path="review/:poId" element={<PoReviewPage />} />
          <Route path="rates" element={<RateManagementPage />} />
          <Route path="calculation" element={<CalculationReviewPage />} />
          <Route path="calculation/:quoteId" element={<CalculationReviewPage />} />
          <Route path="quotation" element={<QuotationPreviewPage />} />
          <Route path="quotation/:quoteId" element={<QuotationPreviewPage />} />
          <Route path="quotations" element={<QuotationHistoryPage />} />

          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
