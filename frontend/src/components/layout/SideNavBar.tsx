import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Users, 
  Package, 
  Warehouse, 
  Factory, 
  Truck, 
  BarChart3, 
  Coins, 
  Palette, 
  Settings, 
  UserCircle, 
  HelpCircle, 
  LogOut, 
  Plus,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

interface SideNavBarProps {
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItemConfig {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string[];
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItemConfig[];
}

export const SideNavBar: React.FC<SideNavBarProps> = ({ 
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Work',
      items: [
        { 
          label: 'Quotations', 
          path: '/quotations', 
          icon: FileText, 
          matchPrefix: ['/quotations', '/quotation'] 
        },
        { 
          label: 'Purchase Orders', 
          path: '/upload', 
          icon: ShoppingCart, 
          matchPrefix: ['/upload', '/review', '/calculation'] 
        },
        { 
          label: 'Customers', 
          path: '/customers', 
          icon: Users,
          matchPrefix: ['/customers'] 
        }
      ]
    },
    {
      title: 'Operations',
      items: [
        { label: 'Procurement', path: '/upload', icon: Package },
        { label: 'Inventory', path: '/rates', icon: Warehouse },
        { label: 'Production', path: '/rates', icon: Factory },
        { label: 'Dispatch', path: '/quotation', icon: Truck }
      ]
    },
    {
      title: 'Insights',
      items: [
        { label: 'Analytics', path: '/analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'Masters',
      items: [
        { label: 'Rates', path: '/rates', icon: Coins, matchPrefix: ['/rates'] },
        { label: 'Templates', path: '/settings', icon: Palette }
      ]
    },
    {
      title: 'Organization',
      items: [
        { label: 'Company Settings', path: '/settings', icon: Settings, matchPrefix: ['/settings'] },
        { label: 'My Profile', path: '/settings', icon: UserCircle }
      ]
    }
  ];

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    navigate('/');
  };

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 68 : 240 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="bg-[#172033] flex flex-col h-full select-none shrink-0 relative z-40 text-white border-r border-[#1f2d47]"
      style={{
        width: isCollapsed ? 68 : 240,
        minWidth: isCollapsed ? 68 : 240,
        maxWidth: isCollapsed ? 68 : 240
      }}
    >
      {/* Brand Header */}
      <div className={`h-[68px] px-3.5 bg-[#102134] border-b border-[#1f2d47] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          {/* Orynza Logo Mark */}
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center shrink-0 shadow-xs border border-[#14b8a6]/30">
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 10H26V26H10V10Z" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18" cy="18" r="3.5" fill="#5EEAD4"/>
              <path d="M18 10V14.5M18 21.5V26M10 18H14.5M21.5 18H26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight uppercase leading-none">
                ORYNZA
              </span>
              <span className="text-[10px] text-[#7f879f] font-medium leading-tight mt-1 truncate">
                Smarter Manufacturing
              </span>
            </div>
          )}
        </div>

        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="p-1 rounded text-[#7f879f] hover:text-white hover:bg-[#172033] transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapse expand trigger if collapsed */}
      {onToggleCollapse && isCollapsed && (
        <div className="p-2 border-b border-[#1f2d47] flex justify-center bg-[#102134]">
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="p-1.5 rounded text-[#7f879f] hover:text-white hover:bg-[#172033] transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Action CTA */}
      <div className="p-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            navigate('/upload');
            onCloseMobile?.();
          }}
          title="New Purchase Order"
          className={`w-full bg-[#B87333] hover:bg-[#A46328] text-white font-medium text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer ${
            isCollapsed ? 'px-0' : ''
          }`}
        >
          <Plus className="w-4 h-4 shrink-0 text-white" />
          {!isCollapsed && <span className="whitespace-nowrap font-medium text-[13px]">New Purchase Order</span>}
        </motion.button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-1 space-y-3.5 overflow-y-auto overflow-x-hidden">
        {navSections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            {!isCollapsed && (
              <div className="px-2.5 font-semibold text-[11px] uppercase tracking-wider text-[#7f879f]">
                {section.title}
              </div>
            )}
            
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.matchPrefix
                  ? item.matchPrefix.some(p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p)))
                  : location.pathname === item.path;

                return (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    onClick={onCloseMobile}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center ${
                      isCollapsed ? 'justify-center py-2 px-1' : 'gap-3 px-3 py-1.5'
                    } rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-[#B87333] text-white font-medium shadow-sm'
                        : 'text-[#bdc6e0] hover:bg-[#1f2d47] hover:text-white font-normal'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#7f879f]'}`} />
                    {!isCollapsed && (
                      <span className="truncate text-[13px]">{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Controls & User Profile */}
      <div className="p-3 bg-[#102134] border-t border-[#1f2d47] flex flex-col gap-2 mt-auto shrink-0">
        <button
          type="button"
          onClick={() => alert("Orynza Platform Documentation: Smarter Manufacturing & Quotation Workflow.")}
          title="Help & Support"
          className={`flex items-center ${
            isCollapsed ? 'justify-center py-1.5' : 'gap-2 px-2 py-1.5'
          } rounded text-[#bdc6e0] hover:text-white hover:bg-[#172033] transition-colors text-xs text-left cursor-pointer w-full`}
        >
          <HelpCircle className="w-4 h-4 text-[#7f879f] shrink-0" />
          {!isCollapsed && <span className="text-[12px]">Help & Support</span>}
        </button>

        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} pt-2 border-t border-[#1f2d47]/60`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#172033] border border-[#1f2d47] text-[#fdad67] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
              {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'RS'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-medium text-white truncate leading-tight">
                  {user?.fullName || 'Rajesh Sharma'}
                </span>
                <span className="text-[10px] text-[#7f879f] truncate leading-tight mt-0.5">
                  {user?.role === 'ADMIN' ? 'Plant Director' : 'Operations VP'}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-1 rounded hover:bg-[#172033] text-[#7f879f] hover:text-[#fdad67] transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default SideNavBar;
