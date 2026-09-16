import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SideNavBar } from './SideNavBar';
import { TopNavBar } from './TopNavBar';
import { DensityProvider } from '../../context/DensityContext';
import { motion, AnimatePresence } from 'framer-motion';

export const AppShell: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <DensityProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100/60">
        {/* Desktop Persistent Left Nav with Collapse support */}
        <div className="hidden md:flex h-full shrink-0">
          <SideNavBar 
            isCollapsed={sidebarCollapsed} 
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
        </div>

        {/* Mobile Drawer Navigation */}
        <AnimatePresence>
          {mobileNavOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileNavOpen(false)}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-64 max-w-[80vw] h-full z-10"
              >
                <SideNavBar onCloseMobile={() => setMobileNavOpen(false)} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Workspace Frame */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <TopNavBar onOpenMobileMenu={() => setMobileNavOpen(true)} />

          {/* Content Area with Fluid Page Transition */}
          <main className="flex-1 overflow-y-auto relative bg-[#f8fafc]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </DensityProvider>
  );
};
