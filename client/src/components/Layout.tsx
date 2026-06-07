import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { MenuIcon } from "lucide-react";

import Sidebar from "./Sidebar";

// Page titles based on current route
const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/accounts": "Social Accounts",
  "/schedule": "Post Scheduler",
  "/ai-composer": "AI Composer",
};

const Layout = () => {
  const location = useLocation();
  const title =
    pageTitles[location.pathname] || "SocialAI";

  // Mobile sidebar state
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* =========================
          Mobile Overlay
      ========================== */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
          onClick={() =>
            setIsMobileMenuOpen(false)
          }
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
      />

      {/* =========================
          Main Content Area
      ========================== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 md:px-8">
          {/* Mobile Menu Button */}
          <button
            className="p-2 -ml-2 text-slate-500 md:hidden"
            onClick={() =>
              setIsMobileMenuOpen(true)
            }
          >
            <MenuIcon className="size-6" />
          </button>

          {/* Page Title */}
          <div>
            <h1 className="text-slate-900">
              {title}
            </h1>

            <p className="hidden text-sm text-slate-400 sm:block">
              Manage and automate your social
              presence
            </p>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 xl:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;