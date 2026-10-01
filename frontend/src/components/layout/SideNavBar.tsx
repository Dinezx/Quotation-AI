import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Users, 
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
import { motion } from 'framer-motion';
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
  isActive: (pathname: string, search: string) => boolean;
}

interface NavSection {
  title?: string;
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
      items: [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
          isActive: (pathname) => pathname === '/dashboard' || pathname === '/',
        },
        {
          label: 'Purchase Orders',
          path: '/upload',
          icon: ShoppingCart,
          isActive: (pathname) =>
            ['/upload', '/review', '/calculation'].some(
              (p) => pathname === p || pathname.startsWith(p + '/')
            ),
        },
        {
          label: 'Quotations',
          path: '/quotations',
          icon: FileText,
          isActive: (pathname) =>
            ['/quotations', '/quotation', '/dispatch'].some(
              (p) => pathname === p || pathname.startsWith(p + '/')
            ),
        },
        {
          label: 'Customers',
          path: '/customers',
          icon: Users,
          isActive: (pathname) =>
            pathname === '/customers' || pathname.startsWith('/customers/'),
        },
      ],
    },
    {
      title: 'MASTERS',
      items: [
        {
          label: 'Rates',
          path: '/rates',
          icon: Coins,
          isActive: (pathname) =>
            pathname === '/rates' || pathname.startsWith('/rates/'),
        },
        {
          label: 'Templates',
          path: '/settings?tab=templates',
          icon: Palette,
          isActive: (pathname, search) =>
            pathname === '/settings' && search.includes('tab=templates'),
        },
      ],
    },
    {
      title: 'ORGANIZATION',
      items: [
        {
          label: 'Company Settings',
          path: '/settings?tab=profile',
          icon: Settings,
          isActive: (pathname, search) =>
            pathname === '/settings' &&
            !search.includes('tab=templates') &&
            !search.includes('tab=user'),
        },
        {
          label: 'My Profile',
          path: '/settings?tab=user',
          icon: UserCircle,
          isActive: (pathname, search) =>
            pathname === '/settings' && search.includes('tab=user'),
        },
      ],
    },
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
          {/* Quotation AI Logo Mark */}
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0 shadow-sm border border-blue-400/30">
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 10H26V26H10V10Z" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18" cy="18" r="3.5" fill="#93C5FD"/>
              <path d="M18 10V14.5M18 21.5V26M10 18H14.5M21.5 18H26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight uppercase leading-none">
                QUOTATION AI
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight mt-1 truncate">
                Smarter Manufacturing
              </span>
            </div>
          )}
        </div>

        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#172033] transition-colors cursor-pointer"
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
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#172033] transition-colors cursor-pointer"
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
          className={`w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer ${
            isCollapsed ? 'px-0' : ''
          }`}
        >
          <Plus className="w-4 h-4 shrink-0 text-white" />
          {!isCollapsed && <span className="whitespace-nowrap text-[13px]">New Purchase Order</span>}
        </motion.button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-1 space-y-3 overflow-y-auto overflow-x-hidden">
        {navSections.map((section, idx) => (
          <div key={section.title || `section-${idx}`} className="flex flex-col gap-1">
            {!isCollapsed && section.title && (
              <div className="px-3 pt-2 pb-0.5 font-semibold text-[10px] uppercase tracking-wider text-slate-400/80">
                {section.title}
              </div>
            )}
            
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.isActive(location.pathname, location.search);

                return (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    onClick={onCloseMobile}
                    title={isCollapsed ? item.label : undefined}
                    className={`group flex items-center ${
                      isCollapsed ? 'justify-center py-2 px-1' : 'gap-3 px-3 py-2'
                    } rounded-lg text-sm transition-all cursor-pointer ${
                      active
                        ? 'bg-[#2563EB] text-white font-medium shadow-sm'
                        : 'text-slate-300 hover:bg-[#2563EB]/15 hover:text-white font-normal'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
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
          onClick={() => {
            alert("Quotation AI Support: Contact our plant support desk at support@quotationai.com or +91 20 4012 8800.");
          }}
          title="Help & Support"
          className={`group flex items-center ${
            isCollapsed ? 'justify-center py-2' : 'gap-3 px-3 py-2'
          } rounded-lg text-slate-300 hover:text-white hover:bg-[#2563EB]/15 transition-colors text-[13px] font-medium text-left cursor-pointer w-full`}
        >
          <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-blue-300 shrink-0 transition-colors" />
          {!isCollapsed && <span>Help & Support</span>}
        </button>

        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'} pt-2 border-t border-[#1f2d47]/70`}>
          <button
            type="button"
            onClick={() => {
              navigate('/settings?tab=user');
              onCloseMobile?.();
            }}
            title="User Profile"
            className="flex items-center gap-2.5 min-w-0 text-left group cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="w-7 h-7 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-xs group-hover:border-blue-400 transition-colors">
              {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'RS'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                  {user?.fullName || 'Rajesh Sharma'}
                </span>
                <span className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                  {user?.role === 'ADMIN' ? 'Plant Director' : user?.role || 'Operations VP'}
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default SideNavBar;
