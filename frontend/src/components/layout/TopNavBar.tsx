import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Menu, 
  Home, 
  ChevronRight, 
  Building2, 
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopNavBarProps {
  onOpenMobileMenu?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, company } = useAuth();

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return { title: 'Dashboard', path: '/dashboard' };
    if (path.startsWith('/upload') || path.startsWith('/review')) return { title: 'Purchase Orders', path: '/upload' };
    if (path.startsWith('/quotations') || path.startsWith('/quotation') || path.startsWith('/calculation') || path.startsWith('/dispatch')) {
      return { title: 'Quotations', path: '/quotations' };
    }
    if (path.startsWith('/rates')) return { title: 'Rates & Pricing', path: '/rates' };
    if (path.startsWith('/customers')) return { title: 'Customers', path: '/customers' };
    if (path.startsWith('/settings')) {
      if (location.search.includes('tab=user')) return { title: 'My Profile', path: '/settings?tab=user' };
      if (location.search.includes('tab=templates')) return { title: 'Templates', path: '/settings?tab=templates' };
      return { title: 'Company Settings', path: '/settings' };
    }
    return { title: 'Overview', path: '/dashboard' };
  };

  const breadcrumb = getBreadcrumb();

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'DK';

  return (
    <header className="h-[68px] bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 z-30 shadow-xs">
      {/* Left: Mobile Menu Trigger + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Go to Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="font-semibold text-slate-900 tracking-tight">
            {breadcrumb.title}
          </span>
        </nav>
      </div>

      {/* Center: Large Global Search Bar (matching reference image) */}
      <div className="hidden md:flex items-center flex-1 max-w-lg lg:max-w-xl mx-4">
        <div className="flex items-center bg-[#f8fafc] border border-slate-200/90 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#2563EB]/10 rounded-xl px-3.5 py-2 w-full transition-all shadow-2xs">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search PO, quotation, customer, or anything..."
            className="bg-transparent w-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs shrink-0 select-none">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right Controls: Notifications, Authenticated Company Badge, User Avatar */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications with red indicator dot */}
        <button 
          title="Notifications"
          className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
        </button>

        {/* Authenticated Company Selector / Badge */}
        <div 
          onClick={() => navigate('/settings?tab=profile')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-colors cursor-pointer"
          title="Company Settings"
        >
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-800 max-w-[160px] truncate">
            {company?.name || 'ABC Manufacturing Pvt Ltd'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* User Avatar Circle */}
        <div 
          onClick={() => navigate('/settings?tab=user')}
          className="flex items-center cursor-pointer group"
          title="My Profile"
        >
          <div className="w-8 h-8 rounded-full bg-[#1e293b] text-white font-bold text-xs flex items-center justify-center font-sans shadow-xs ring-2 ring-slate-200/80 group-hover:ring-blue-500 transition-all">
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
