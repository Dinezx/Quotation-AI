import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { PoUploadPage } from '../pages/PoUploadPage';
import { PoReviewPage } from '../pages/PoReviewPage';
import { RateManagementPage } from '../pages/RateManagementPage';
import { CalculationReviewPage } from '../pages/CalculationReviewPage';
import { QuotationHistoryPage } from '../pages/QuotationHistoryPage';
import { QuotationPreviewPage } from '../pages/QuotationPreviewPage';
import { CustomersPage } from '../pages/CustomersPage';
import { SettingsPage } from '../pages/SettingsPage';

export const AppRoutes: React.FC = () => {
  return (
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
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
