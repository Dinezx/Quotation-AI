import React, { useState } from 'react';
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
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TabularNumber } from '../../components/common/TabularNumber';
import { mockCustomersList } from '../../services/mockData';
import { Customer } from '../../types/customer';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filteredCustomers = mockCustomersList.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.gstin.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Customer Directory & Commercial Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain verified customer GSTINs, delivery hubs, and historical RFQ conversion records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => alert("Add customer account modal")}
          >
            Add Customer Account
          </Button>
        </div>
      </div>

      {/* Search toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name, GSTIN, contact..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map(cust => (
          <div 
            key={cust.id} 
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{cust.name}</h3>
                  <div className="text-[11px] text-slate-500">{cust.tradeName}</div>
                </div>
                <Badge variant="success" size="sm">
                  {cust.rating}
                </Badge>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 space-y-0.5">
                <div>GSTIN: <strong className="text-slate-900">{cust.gstin}</strong></div>
                <div>PAN: <span className="text-slate-600">{cust.pan}</span> (State: {cust.stateCode})</div>
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{cust.contactPerson} ({cust.designation})</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{cust.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{cust.email}</span>
                </div>
                <div className="flex items-start gap-1.5 text-slate-500 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-tight truncate">{cust.billingAddress}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-medium">Lifetime Quoted</div>
                <div className="font-bold font-mono text-slate-900">
                  <TabularNumber value={cust.lifetimeValueInr} />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/upload')}
                icon={<ArrowRight className="w-3 h-3" />}
                iconPosition="right"
              >
                Create RFQ
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
