import {
  CalendarDaysIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UserIcon,
  Wand2Icon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const Sidebar = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) => {
  // Temporary user data
  const { logout, user } = {
    logout: () => {
      window.location.href = "/";
    },
    user: {
      name: "Vivek Singh",
      email: "vivek@test.com",
    },
  };

  const location = useLocation();

  // Sidebar navigation items
  const navItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboardIcon,
      path: "/dashboard",
    },
    {
      name: "Accounts",
      icon: UserIcon,
      path: "/accounts",
    },
    {
      name: "Scheduler",
      icon: CalendarDaysIcon,
      path: "/schedule",
    },
    {
      name: "AI Composer",
      icon: Wand2Icon,
      path: "/ai-composer",
    },
  ];

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-slate-200 bg-white transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* =========================
          Logo Section
      ========================== */}
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-xl tracking-tight text-slate-800">
          <img
            src="/logo.svg"
            alt="logo"
            className="size-4"
          />
          Scheduler
        </div>
      </div>

      {/* =========================
          Menu Label
      ========================== */}
      <div className="mb-2">
        <span className="pl-4 text-xs uppercase tracking-wider text-slate-500">
          Menu
        </span>
      </div>

      {/* =========================
          Navigation Links
      ========================== */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/dashboard"}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 rounded border px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive
                  ? "border-red-100 bg-red-50 text-red-600"
                  : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {/* Nav Icon */}
              <item.icon
                className={`size-4 shrink-0 ${
                  isActive
                    ? "text-red-500"
                    : "text-slate-500"
                }`}
              />

              {/* Nav Text */}
              {item.name}

              {/* Active Indicator */}
              {isActive && (
                <span className="ml-auto h-5 w-[5px] rounded-full bg-red-500" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* =========================
          User Footer
      ========================== */}
      <div className="border-t border-slate-100 p-4">
        {/* User Info */}
        <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-red-400 to-pink-400 text-sm font-medium text-white">
            {user.name.charAt(0).toUpperCase() || "U"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-slate-800">
              {user.name}
            </div>

            <div className="truncate text-sm text-slate-400">
              {user.email}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-slate-500 transition-all duration-150 hover:bg-red-50 hover:text-red-500"
        >
          <LogOutIcon className="size-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;