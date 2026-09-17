import { QuotationDocument, QuotationStatus } from '../types/quotation';
import { mockQuotationsList } from './mockData';

let quotations: QuotationDocument[] = [...mockQuotationsList];

export const quotationService = {
  getAllQuotations: (): QuotationDocument[] => [...quotations],

  getQuotationById: (id: string): QuotationDocument | undefined => {
    return quotations.find(q => q.id === id || q.quotationNumber === id);
  },

  createQuotation: (newQuote: QuotationDocument): QuotationDocument => {
    quotations.unshift(newQuote);
    return newQuote;
  },

  updateStatus: (id: string, newStatus: QuotationStatus): QuotationDocument | undefined => {
    const quote = quotations.find(q => q.id === id);
    if (quote) {
      quote.status = newStatus;
      quote.auditTrail.push({
        id: `aud-${Date.now()}`,
        timestamp: 'Just now',
        title: `Status changed to ${newStatus}`,
        actor: 'Operator (Current User)',
        status: 'COMPLETED',
        description: `Lifecycle transition to ${newStatus}`
      });
    }
    return quote;
  },

  recordDispatch: (id: string, channel: 'WhatsApp' | 'Email', recipient: string): QuotationDocument | undefined => {
    const quote = quotations.find(q => q.id === id);
    if (quote) {
      quote.status = 'SENT';
      quote.auditTrail.push({
        id: `aud-${Date.now()}`,
        timestamp: 'Just now',
        title: `Dispatched via ${channel}`,
        actor: 'System Dispatcher',
        status: 'COMPLETED',
        description: `Sent official engineering quotation to ${recipient}`
      });
    }
    return quote;
  }
};
