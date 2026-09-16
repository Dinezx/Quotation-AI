import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PoUploadPage } from './features/po-upload/PoUploadPage';
import { PoReviewPage } from './features/po-review/PoReviewPage';
import { RateManagementPage } from './features/rates/RateManagementPage';
import { CalculationReviewPage } from './features/calculation/CalculationReviewPage';
import { QuotationHistoryPage } from './features/quotations/QuotationHistoryPage';
import { QuotationDispatchPage } from './features/quotation-dispatch/QuotationDispatchPage';
import { CustomersPage } from './features/customers/CustomersPage';
import { SettingsPage } from './features/settings/SettingsPage';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="upload" element={<PoUploadPage />} />
          <Route path="review" element={<PoReviewPage />} />
          <Route path="review/:poId" element={<PoReviewPage />} />
          <Route path="rates" element={<RateManagementPage />} />
          <Route path="calculation" element={<CalculationReviewPage />} />
          <Route path="calculation/:quoteId" element={<CalculationReviewPage />} />
          <Route path="quotation" element={<QuotationDispatchPage />} />
          <Route path="quotation/:quoteId" element={<QuotationDispatchPage />} />
          <Route path="quotations" element={<QuotationHistoryPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
