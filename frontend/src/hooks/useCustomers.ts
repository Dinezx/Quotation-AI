import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi, CustomerDTO, CustomerCreateDTO } from '../services/api/customerApi';
import { mockCustomersList } from '../services/mockData';
import { Customer } from '../types/customer';

// Adapter to convert between backend CustomerDTO and frontend Customer model
export function dtoToCustomer(dto: CustomerDTO): Customer {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code || `CUST-${dto.id.slice(0, 6).toUpperCase()}`,
    tradeName: dto.name,
    gstin: dto.gstin || '',
    pan: dto.gstin && dto.gstin.length >= 12 ? dto.gstin.slice(2, 12) : '',
    contactPerson: dto.contact_person || '',
    designation: 'Procurement Contact',
    phone: dto.phone || '',
    email: dto.email || '',
    loginEmail: dto.login_email || dto.email || '',
    quotationEmail: dto.quotation_email || '',
    billingAddress: dto.billing_address || '',
    shippingAddress: dto.shipping_address || dto.billing_address || '',
    state: 'Maharashtra',
    stateCode: '27',
    activeQuotationsCount: 0,
    totalQuotationsCount: 0,
    lifetimeValueInr: 0,
    creditDays: 30,
    rating: 'Active',
    isActive: dto.is_active,
    lastQuotedDate: new Date(dto.updated_at || dto.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  };
}

export function useCustomers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const dtoList = await customerApi.list();
        if (dtoList && dtoList.length > 0) {
          return dtoList.map(dtoToCustomer);
        }
        return mockCustomersList;
      } catch (err) {
        console.warn('[useCustomers] Falling back to local customer dataset:', err);
        return mockCustomersList;
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newCust: CustomerCreateDTO) => {
      return await customerApi.create(newCust);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerCreateDTO> }) => {
      return await customerApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await customerApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return {
    customers: query.data || mockCustomersList,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createCustomer: createMutation.mutateAsync,
    updateCustomer: updateMutation.mutateAsync,
    deleteCustomer: deleteMutation.mutateAsync,
  };
}
