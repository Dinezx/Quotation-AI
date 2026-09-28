import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Menu, 
  Layers,
  LayoutGrid,
  ListFilter,
  Plus
} from 'lucide-react';
import { useDensity } from '../../context/DensityContext';
import { useAuth } from '../../context/AuthContext';

interface TopNavBarProps {
  onOpenMobileMenu?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { density, setDensity } = useDensity();
  const { user } = useAuth();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Manufacturing Console';
    if (path.startsWith('/upload')) return 'Purchase Order Ingestion';
    if (path.startsWith('/review')) return 'AI Extraction Review';
    if (path.startsWith('/calculation')) return 'Quotation Costing & Calculation';
    if (path.startsWith('/quotations')) return 'Quotation Registry';
    if (path.startsWith('/quotation')) return 'Quotation Output & Dispatch';
    if (path.startsWith('/rates')) return 'Rate Management Master';
    if (path.startsWith('/customers')) return 'OEM Customer Management';
    if (path.startsWith('/settings')) return 'Company Configuration';
    return 'Manufacturing Console';
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
            Plant 01 (Pune)
          </span>
          <span className="text-[#c6c6cd] text-xs">/</span>
          <span className="text-sm font-semibold text-[#1b1c19] tracking-tight truncate">
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-sm xl:max-w-md mx-2">
        <div className="flex items-center bg-[#f5f3ee] border border-transparent focus-within:border-[#B87333]/40 focus-within:bg-white rounded-lg px-3 py-1.5 w-full transition-all">
          <Search className="w-4 h-4 text-[#76777d] mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search PO, quotation, component... ⌘K"
            className="bg-transparent w-full text-xs text-[#1b1c19] placeholder-[#76777d] focus:outline-none"
          />
          <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-[9px] font-mono text-[#76777d] bg-white border border-[#E5E1D8] rounded shadow-2xs shrink-0">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Telemetry Indicators & Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Telemetry Pill 1: OEE Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#eae8e3]/60 rounded-full text-xs border border-[#e4e2dd]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00bcd4] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00bcd4]"></span>
          </span>
          <span className="text-[11px] font-semibold text-[#1b1c19]">OEE 88.4%</span>
        </div>

        {/* Telemetry Pill 2: Lots Active */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f3ee] rounded-full text-xs border border-[#e4e2dd]">
          <Layers className="w-3.5 h-3.5 text-[#45474c]" />
          <span className="text-[11px] font-medium text-[#45474c]">14 Lots Active</span>
        </div>

        {/* Density Mode Switcher (Comfortable vs Compact) */}
        <div className="hidden sm:flex items-center bg-[#f5f3ee] p-0.5 rounded-lg border border-[#E5E1D8] text-xs">
          <button
            onClick={() => setDensity('comfortable')}
            title="Comfortable view"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all cursor-pointer ${
              density === 'comfortable'
                ? 'bg-white text-[#1b1c19] shadow-2xs font-semibold'
                : 'text-[#45474c] hover:text-[#1b1c19]'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden xl:inline">Comfortable</span>
          </button>
          <button
            onClick={() => setDensity('compact')}
            title="Compact high-density view"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all cursor-pointer ${
              density === 'compact'
                ? 'bg-white text-[#1b1c19] shadow-2xs font-semibold'
                : 'text-[#45474c] hover:text-[#1b1c19]'
            }`}
          >
            <ListFilter className="w-3 h-3" />
            <span className="hidden xl:inline">Compact</span>
          </button>
        </div>

        {/* Create PO / Quote CTA */}
        <button
          onClick={() => navigate('/upload')}
          className="bg-[#B87333] hover:bg-[#A46328] text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
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
          <span className="w-2 h-2 bg-[#B87333] rounded-full absolute top-1 right-1 ring-2 ring-white" />
        </button>

        {/* User Profile Avatar */}
        <div 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 pl-1 cursor-pointer group"
          title="User Profile"
        >
          <div className="w-8 h-8 rounded-full bg-[#172033] border border-[#1f2d47] text-[#ffdcc2] font-semibold text-xs flex items-center justify-center font-mono shadow-2xs">
            {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'RS'}
          </div>
          <div className="hidden 2xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#1b1c19] leading-tight group-hover:text-[#B87333] transition-colors">
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
