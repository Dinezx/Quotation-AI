import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Menu, 
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopNavBarProps {
  onOpenMobileMenu?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, company } = useAuth();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/upload')) return 'Purchase Orders';
    if (path.startsWith('/review')) return 'PO Review';
    if (path.startsWith('/calculation')) return 'Quotation Calculation';
    if (path.startsWith('/quotations')) return 'Quotations';
    if (path.startsWith('/quotation')) return 'Quotation Details';
    if (path.startsWith('/rates')) return 'Rates';
    if (path.startsWith('/customers')) return 'Customers';
    if (path.startsWith('/settings')) return 'Company Settings';
    return 'Quotation AI';
  };

  return (
    <header className="h-[68px] bg-white border-b border-[#E5E1D8] px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 z-30 shadow-[0_1px_4px_rgba(23,32,51,0.03)]">
      {/* Mobile Menu & Left Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 rounded-md text-[#45474c] hover:text-[#1b1c19] hover:bg-[#f5f3ee] transition-colors"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 truncate">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
            {company?.name || 'Quotation AI'}
          </span>
          <span className="text-[#c6c6cd] text-xs">/</span>
          <span className="text-sm font-semibold text-[#1b1c19] tracking-tight truncate">
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-sm xl:max-w-md mx-2">
        <div className="flex items-center bg-[#f5f3ee] border border-transparent focus-within:border-[#2563EB]/40 focus-within:bg-white rounded-lg px-3 py-1.5 w-full transition-all">
          <Search className="w-4 h-4 text-[#76777d] mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search PO, quotation, customer... ⌘K"
            className="bg-transparent w-full text-xs text-[#1b1c19] placeholder-[#76777d] focus:outline-none"
          />
          <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[9px] font-mono text-[#76777d] bg-white border border-[#E5E1D8] rounded shadow-2xs shrink-0">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Create PO / Quote CTA */}
        <button
          onClick={() => navigate('/upload')}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline">New PO</span>
        </button>

        {/* Notifications */}
        <button 
          title="Notifications"
          className="relative p-1.5 rounded-lg text-[#45474c] hover:bg-[#f5f3ee] hover:text-[#1b1c19] transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-[#2563EB] rounded-full absolute top-1 right-1 ring-2 ring-white" />
        </button>

        {/* User Profile Avatar */}
        <div 
          onClick={() => navigate('/settings?tab=user')}
          className="flex items-center gap-2 pl-1 cursor-pointer group"
          title="User Profile"
        >
          <div className="w-8 h-8 rounded-full bg-[#172033] border border-[#1f2d47] text-blue-400 font-semibold text-xs flex items-center justify-center font-mono shadow-2xs group-hover:border-blue-500/40 transition-colors">
            {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'RS'}
          </div>
          <div className="hidden 2xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#1b1c19] leading-tight group-hover:text-[#2563EB] transition-colors">
              {user?.fullName || 'Rajesh Sharma'}
            </span>
            <span className="text-[10px] text-[#64748B] leading-tight mt-0.5">
              {user?.role === 'ADMIN' ? 'Plant Director' : 'Operations VP'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
