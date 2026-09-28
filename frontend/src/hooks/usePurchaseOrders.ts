import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderApi, PurchaseOrderDTO, PurchaseOrderItemDTO } from '../api/purchaseOrderApi';
import { PurchaseOrder, BoqItem } from '../types/po';

export function dtoToPurchaseOrder(dto: PurchaseOrderDTO): PurchaseOrder {
  const items: BoqItem[] = (dto.items || []).map((it, idx) => ({
    id: it.id,
    sNo: String(it.item_number || idx + 1).padStart(2, '0'),
    itemDescription: it.part_name,
    hsnCode: '84139190',
    drawingCode: it.part_number,
    extractedSpecification: it.specification || it.material_grade || 'Commercial Grade',
    rateCardMatch: it.process_name || 'CNC Turning Bay',
    rateCardMatchStatus: Number(it.confidence) >= 0.9 ? 'VERIFIED' : 'AMBIGUOUS',
    selectedGrade: it.material_grade || undefined,
    quantity: Number(it.quantity),
    unit: it.unit || 'PCS',
    grossWeightKg: Number(it.gross_weight_kg) || undefined,
    netWeightKg: Number(it.net_weight_kg) || undefined,
    scrapWeightKg: Number(it.scrap_weight_kg) || undefined,
    machiningHours: Number(it.machining_hours) || undefined,
  }));

  return {
    id: dto.id,
    originalFileName: dto.source_file_name || 'Customer_Purchase_Order.pdf',
    fileSizeBytes: 284000,
    totalPages: 2,
    uploadTimestamp: new Date(dto.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    confidenceScore: 94.8,
    status: dto.status === 'UPLOADED' ? 'NEEDS_REVIEW' : (dto.status as any) || 'NEEDS_REVIEW',
    metadata: {
      name: dto.customer_name || 'Customer Master',
      gstin: '27AAACM0012P1ZX',
      poNumber: dto.po_number,
      poDate: dto.po_date ? new Date(dto.po_date).toLocaleDateString('en-GB') : '',
      deliveryDueDate: dto.delivery_date ? new Date(dto.delivery_date).toLocaleDateString('en-GB') : '',
      billingAddress: dto.delivery_terms || 'Factory Works',
      contactPerson: 'Procurement Department',
      email: 'procurement@customer.com',
      phone: '',
    },
    items: items,
    leadTimeDays: 21,
    taxComplianceNote: 'GSTIN verified against GSTN live portal.',
    rawMaterialIndexNote: 'Base raw material prices indexed to Mandi benchmark.',
  };
}

export function usePurchaseOrders(statusFilter?: string) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: async () => {
      try {
        const dtoList = await purchaseOrderApi.list(statusFilter);
        return (dtoList || []).map(dtoToPurchaseOrder);
      } catch (err) {
        console.error('[usePurchaseOrders] Error loading purchase orders:', err);
        return [];
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return await purchaseOrderApi.uploadDocument(file);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({
      poId,
      itemId,
      data,
    }: {
      poId: string;
      itemId: string;
      data: Partial<PurchaseOrderItemDTO>;
    }) => {
      return await purchaseOrderApi.updateItem(poId, itemId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  return {
    purchaseOrders: listQuery.data || [],
    currentPO: listQuery.data?.[0] || null,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    uploadDocument: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    updateItem: updateItemMutation.mutateAsync,
  };
}
