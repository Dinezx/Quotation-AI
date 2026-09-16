import { PurchaseOrder, TelemetryLog, BoqItem } from '../types/po';
import { mockSamplePurchaseOrder } from './mockData';

let currentPO: PurchaseOrder = JSON.parse(JSON.stringify(mockSamplePurchaseOrder));

export const poService = {
  getCurrentPO: (): PurchaseOrder => {
    return currentPO;
  },

  updateMetadata: (metadata: Partial<PurchaseOrder['metadata']>): PurchaseOrder => {
    currentPO.metadata = { ...currentPO.metadata, ...metadata };
    return currentPO;
  },

  updateBoqItem: (itemId: string, updates: Partial<BoqItem>): PurchaseOrder => {
    currentPO.items = currentPO.items.map(item => {
      if (item.id === itemId) {
        return { ...item, ...updates };
      }
      return item;
    });
    return currentPO;
  },

  resolveItemGrade: (itemId: string, grade: string): PurchaseOrder => {
    currentPO.items = currentPO.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          selectedGrade: grade,
          rateCardMatch: `${grade} @ ₹68/kg + Laser Cut`,
          rateCardMatchStatus: 'VERIFIED',
          ambiguityReason: undefined
        };
      }
      return item;
    });
    return currentPO;
  },

  addCustomItem: (item: Omit<BoqItem, 'id' | 'sNo'>): PurchaseOrder => {
    const nextSNo = String(currentPO.items.length + 1).padStart(2, '0');
    const newItem: BoqItem = {
      ...item,
      id: `item-${Date.now()}`,
      sNo: nextSNo
    };
    currentPO.items.push(newItem);
    return currentPO;
  },

  resetSamplePO: (): PurchaseOrder => {
    currentPO = JSON.parse(JSON.stringify(mockSamplePurchaseOrder));
    return currentPO;
  }
};
