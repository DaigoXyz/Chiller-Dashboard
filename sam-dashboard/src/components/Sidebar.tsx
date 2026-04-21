import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, BriefcaseBusiness, Menu, ChevronDown, Activity, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { logout } from "../api/AuthApi";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ dashboard: true });
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = useMemo(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        children: [
          { path: "/admin/monitoring", label: "SAM Monitoring", icon: Activity },
        ],
      },
      // {
      //   key: "workers",
      //   label: "Workers",
      //   icon: BriefcaseBusiness,
      //   children: [
      //     { path: "/admin/logs", label: "Publisher Worker", icon: Briefcase },
      //     { path: "/admin/woi", label: "Etl Worker", icon: Briefcase },
      //   ],
      // },
    ],
    []
  );

  useEffect(() => {
    navItems.forEach((item) => {
      if ("children" in item) {
        const isActive = item.children.some((child) =>
          location.pathname.startsWith(child.path)
        );
        if (isActive) {
          setOpenGroups((p) => ({ ...p, [item.key]: true }));
        }
      }
    });
  }, [location.pathname, navItems]);

  const toggleGroup = (key: string) =>
    setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  const handleCollapsedParentClick = (key: string) => {
    setIsCollapsed(false);
    setOpenGroups((p) => ({ ...p, [key]: true }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen border-r border-slate-800 bg-slate-970 transition-all duration-300 lg:static ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        <div className="flex h-full flex-col">
          {/* Header/Logo */}
          <div className={`border-b border-slate-800 py-5 flex items-center transition-all duration-300 ${
            isCollapsed ? "px-0 justify-center" : "px-6 justify-between"
          }`}>
            {!isCollapsed && <h2 className="text-xl font-bold text-slate-50">SAM Dashboard</h2>}
            
            {/* Toggle button untuk desktop */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex rounded-lg p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-50 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const groupOpen = !!openGroups[item.key];
                const GroupIcon = item.icon;
                const isActiveGroup = item.children.some((child) =>
                  location.pathname.startsWith(child.path)
                );

                return (
                  <div key={item.key}>
                    {!isCollapsed ? (
                      <>
                        {/* Parent Button - Normal state */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.key)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-slate-200 bg-slate-900/40 hover:bg-blue-900/30"
                        >
                          <GroupIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                              groupOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {/* Children - Normal state */}
                        {groupOpen && (
                          <div className="mt-1 space-y-0.5 pl-4">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;
                              return (
                                <NavLink
                                  key={child.path}
                                  to={child.path}
                                  onClick={() => setIsOpen(false)}
                                  className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                                      isActive
                                        ? "bg-slate-800 text-slate-50 font-medium"
                                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                                    }`
                                  }
                                >
                                  <ChildIcon className="h-4 w-4" />
                                  {child.label}
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Collapsed state - parent icon aja */}
                        <button
                          type="button"
                          onClick={() => handleCollapsedParentClick(item.key)}
                          title={item.label}
                          className={`flex w-full items-center justify-center rounded-lg p-3 transition-all ${
                            isActiveGroup
                              ? "bg-slate-800 text-slate-50"
                              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                          }`}
                        >
                          <GroupIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
	{!isCollapsed ? (
	  <div className="border-t border-slate-800 p-4 space-y-2">
	    <button
	      onClick={handleLogout}
	      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
	    >
	      <LogOut style={{ width: "16px", height: "16px", minWidth: "16px" }} />
	      <span>Logout</span>
	    </button>
	  </div>
	) : (
	  <div className="border-t border-slate-800 p-4 flex flex-col items-center gap-3">
	    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
	    <button
	      onClick={handleLogout}
	      title="Logout"
	      className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
	    >
	      <LogOut style={{ width: "16px", height: "16px", minWidth: "16px" }} />
	    </button>
	  </div>
	)}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm p-4 lg:hidden">
          <button onClick={() => setIsOpen(true)} className="rounded-lg p-2 hover:bg-slate-800">
            <Menu className="h-6 w-6 text-slate-50" />
          </button>
          <h1 className="font-semibold text-slate-50">SAM Monitoring</h1>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
