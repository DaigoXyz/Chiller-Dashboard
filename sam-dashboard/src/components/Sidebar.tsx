import { NavLink, Outlet } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Menu, 
  X 
} from "lucide-react";
import { useState } from "react";


export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      path: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      path: "/admin/logs",
      label: "Error Logs",
      icon: FileText,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#0f1623]">
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/10 bg-[#0b1220] transition-transform lg:translate-x-0 lg:static ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-white/10 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/10 font-bold text-white">
              S
            </div>
            <div>
              <h2 className="font-semibold text-white">SAM Monitor</h2>
              <p className="text-xs text-slate-400">v1.0.0</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="ml-auto lg:hidden"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/admin"}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-white hover:bg-white/10"
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 p-4">
            <div className="rounded-xl bg-white/5 p-3 text-xs">
              <p className="font-medium text-white">System Status</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-white">All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur-sm p-4 lg:hidden">
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-lg p-2 hover:bg-white/5"
          >
            <Menu className="h-6 w-6 text-white" />
          </button>
          <h1 className="font-semibold text-white">SAM Monitoring</h1>
        </div>

        {/* Page content */}
        <main className="flex-1">
        <Outlet />
        </main>
      </div>
    </div>
  );
}