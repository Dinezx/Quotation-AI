import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileUp, 
  Layers, 
  History, 
  Settings, 
  Users, 
  HelpCircle, 
  LogOut, 
  Plus,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SideNavBarProps {
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({ 
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'PO to Quotation', path: '/upload', icon: FileUp, matchPrefix: ['/upload', '/review', '/calculation', '/quotation'] },
    { label: 'Rates & Pricing', path: '/rates', icon: Layers },
    { label: 'Quotation History', path: '/quotations', icon: History, badge: '342' },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 76 : 256 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="bg-white border-r border-slate-200/80 flex flex-col h-full select-none shrink-0 shadow-xs relative z-20"
    >
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-200/80 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs shrink-0">
            BP
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                Quotation AI
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200">
                  v4.8
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Enterprise Precision</div>
            </motion.div>
          )}
        </div>

        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapse expand trigger if already collapsed */}
      {onToggleCollapse && isCollapsed && (
        <div className="p-2 border-b border-slate-100 flex justify-center">
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Upload CTA */}
      <div className="p-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            navigate('/upload');
            onCloseMobile?.();
          }}
          title="Upload Customer PO"
          className={`w-full bg-slate-950 hover:bg-slate-900 text-white font-medium text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer border border-slate-900 ${
            isCollapsed ? 'px-0' : ''
          }`}
        >
          <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap font-semibold">Upload PO</span>}
        </motion.button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPrefix 
            ? item.matchPrefix.some(p => location.pathname.startsWith(p))
            : location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              title={isCollapsed ? item.label : undefined}
              className={`relative flex items-center ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'} rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-blue-200 text-blue-800 font-bold' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Live Base Rates Widget (Visible when expanded) */}
      {!isCollapsed && (
        <div className="px-3 py-2">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Live Mandi Rates
              </span>
              <span className="text-[9px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1 rounded border border-emerald-200">
                SYNCED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-slate-700 text-[11px]">
              <div>CI: <span className="font-bold text-slate-900">₹95/kg</span></div>
              <div>MS: <span className="font-bold text-slate-900">₹68/kg</span></div>
              <div>EN8: <span className="font-bold text-slate-900">₹110/kg</span></div>
              <div>SS: <span className="font-bold text-slate-900">₹218/kg</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Controls & ERP Sync Badge */}
      <div className={`p-3 border-t border-slate-200/80 space-y-1 bg-white ${isCollapsed ? 'text-center' : ''}`}>
        <button
          type="button"
          onClick={() => alert("Quotation AI Manual: Precision engineering quotation workflow v4.8.")}
          title="Help & Docs"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-1.5'} text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-md transition-colors text-left cursor-pointer`}
        >
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
          {!isCollapsed && <span>Help & Docs</span>}
        </button>

        <button
          type="button"
          onClick={() => alert("Session lock / Switch operator profile.")}
          title="Operator Logout"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-1.5'} text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-md transition-colors text-left cursor-pointer`}
        >
          <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
          {!isCollapsed && <span>Operator Logout</span>}
        </button>

        {!isCollapsed && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-[11px] text-slate-600">
              <div className="font-bold text-slate-900 truncate">Bharat Precision Eng.</div>
              <div className="font-mono text-[10px] text-slate-400 truncate">GSTIN: 27AABCB2018Q1Z2</div>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">ERP SYNC</span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SAP & Tally
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
};
