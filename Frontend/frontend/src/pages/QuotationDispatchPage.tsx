import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/**
 * QuotationDispatchPage redirects to the primary QuotationPreviewPage
 * where official immutable PDF preview, finalization, download, and Resend email dispatch are handled.
 */
export const QuotationDispatchPage: React.FC = () => {
  const { quoteId } = useParams<{ quoteId?: string }>();
  return <Navigate to={quoteId ? `/quotation/${quoteId}` : '/quotations'} replace />;
};

export default QuotationDispatchPage;
