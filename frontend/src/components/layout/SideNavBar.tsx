import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Users, 
  Percent, 
  Palette, 
  Settings, 
  UserCircle, 
  Plus,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  Headphones,
  LogOut
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
      title: 'WORKSPACE',
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
          label: 'Rates & Pricing',
          path: '/rates',
          icon: Percent,
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

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'DK';

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 72 : 252 }}
      transition={{ type: 'spring', damping: 25, stiffness: 240 }}
      className="bg-[#0b1328] flex flex-col h-full select-none shrink-0 relative z-40 text-slate-200 border-r border-[#19243d]"
      style={{
        width: isCollapsed ? 72 : 252,
        minWidth: isCollapsed ? 72 : 252,
        maxWidth: isCollapsed ? 72 : 252
      }}
    >
      {/* Brand Header */}
      <div className={`h-[72px] px-4 bg-[#090f20] border-b border-[#19243d] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => navigate('/dashboard')}>
          {/* Quotation AI Blue Diamond Logo Mark */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 border border-blue-400/30">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-black text-white tracking-wider uppercase leading-none font-sans">
                QUOTATION AI
              </span>
              <span className="text-[11px] text-slate-400 font-medium leading-tight mt-1 truncate">
                Smarter Manufacturing
              </span>
            </div>
          )}
        </div>

        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand trigger when collapsed */}
      {onToggleCollapse && isCollapsed && (
        <div className="p-2 border-b border-[#19243d] flex justify-center bg-[#090f20]">
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Action CTA */}
      <div className="p-3.5 pb-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            navigate('/upload');
            onCloseMobile?.();
          }}
          title="New Purchase Order"
          className={`w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer ${
            isCollapsed ? 'px-0' : ''
          }`}
        >
          <Plus className="w-4 h-4 shrink-0 text-white" />
          {!isCollapsed && <span className="whitespace-nowrap text-[13px]">New Purchase Order</span>}
        </motion.button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-1 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-none">
        {navSections.map((section, idx) => (
          <div key={section.title || `section-${idx}`} className="flex flex-col gap-1">
            {!isCollapsed && section.title && (
              <div className="px-3 pt-2 pb-1 font-semibold text-[10px] uppercase tracking-wider text-slate-400/70 font-mono">
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
                      isCollapsed ? 'justify-center py-2.5 px-1' : 'gap-3 px-3.5 py-2.5'
                    } rounded-xl text-sm transition-all cursor-pointer ${
                      active
                        ? 'bg-[#2563EB] text-white font-semibold shadow-md shadow-blue-600/20'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white font-medium'
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

      {/* Bottom Section: Help Card & User Profile */}
      <div className="p-3 bg-[#090f20]/90 border-t border-[#19243d] flex flex-col gap-2.5 mt-auto shrink-0">
        {/* Need Help Card (matching reference image) */}
        {!isCollapsed ? (
          <div
            onClick={() => {
              alert('Quotation AI Support: Contact our plant support desk at support@quotationai.com or +91 20 4012 8800.');
            }}
            className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-[#13203f] to-[#0f1933] border border-blue-500/20 hover:border-blue-400/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-white leading-tight">Need Help?</span>
                <span className="text-[10px] text-slate-400 leading-tight mt-0.5">Get instant support</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        ) : (
          <button
            onClick={() => {
              alert('Quotation AI Support: Contact our plant support desk at support@quotationai.com or +91 20 4012 8800.');
            }}
            title="Need Help? Get instant support"
            className="w-10 h-10 mx-auto rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 hover:bg-blue-600/30 transition-colors cursor-pointer"
          >
            <Headphones className="w-4 h-4" />
          </button>
        )}

        {/* User Profile & Logout */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'} pt-2 border-t border-[#19243d]/80`}>
          <div
            onClick={() => {
              navigate('/settings?tab=user');
              onCloseMobile?.();
            }}
            title="User Profile"
            className="flex items-center gap-2.5 min-w-0 text-left group cursor-pointer hover:opacity-95 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-xs shrink-0 font-sans shadow-sm ring-2 ring-blue-500/30">
              {userInitials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                  {user?.fullName || 'Dinesh Kumar'}
                </span>
                <span className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                  {user?.role === 'ADMIN' ? 'Plant Director' : user?.role || 'Costing Lead'}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default SideNavBar;
