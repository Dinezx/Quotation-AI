import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  Bell, 
  HelpCircle, 
  Plus, 
  Menu, 
  ChevronDown,
  LayoutGrid,
  ListFilter
} from 'lucide-react';
import { useDensity } from '../../context/DensityContext';

interface TopNavBarProps {
  onOpenMobileMenu?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const { density, setDensity, isComfortable } = useDensity();

  return (
    <header className="h-15 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-10">
      {/* Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search POs, quotations, customers, HSN..."
            className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all font-sans"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Center & Right Badges & Controls */}
      <div className="flex items-center gap-2.5 md:gap-3">
        {/* Density Mode Switcher (Comfortable vs Compact) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setDensity('comfortable')}
            title="Comfortable spacious mode"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
              density === 'comfortable'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Comfortable</span>
          </button>
          <button
            onClick={() => setDensity('compact')}
            title="Compact high-density mode"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
              density === 'compact'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compact</span>
          </button>
        </div>

        {/* FY Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>FY 2024-25</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>

        {/* Plant Hub Indicator */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800">Bharat Precision Eng.</span>
          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
            Pune Plant 1
          </span>
        </div>

        {/* Create Quote Button */}
        <button
          onClick={() => navigate('/upload')}
          className="bg-black hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Create Quote</span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

        {/* Alerts */}
        <button 
          title="Notifications"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-amber-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-lg bg-blue-700 text-white font-bold text-xs flex items-center justify-center font-mono shadow-xs cursor-pointer">
            PM
          </div>
          <div className="hidden 2xl:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">R. Deshmukh</div>
            <div className="text-[10px] text-slate-400">Sr. Costing Head</div>
          </div>
        </div>
      </div>
    </header>
  );
};
