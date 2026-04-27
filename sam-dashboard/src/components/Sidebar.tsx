import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Menu, ChevronDown, Activity, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { logout } from "../api/AuthApi";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ dashboard: true });
  const location = useLocation();
  const navigate = useNavigate();

  // ── Theme sync ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("theme");
    return (stored === "dark" || stored === "light") ? stored : "light";
  });
  const isDark = theme === "dark";

  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem("theme");
      setTheme((stored === "dark" || stored === "light") ? stored : "light");
    };
    window.addEventListener("themechange", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("themechange", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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
          { path: "/admin/overview", label: "Overview", icon: Activity },
        ],
      },
    ],
    []
  );

  useEffect(() => {
    navItems.forEach((item) => {
      if ("children" in item) {
        const isActive = item.children.some((child) =>
          location.pathname.startsWith(child.path)
        );
        if (isActive) setOpenGroups((p) => ({ ...p, [item.key]: true }));
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
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Sidebar — selalu dark style seperti date picker ── */}
      <aside
        style={{ background: "#1e293b", borderRight: "1px solid #334155" }}
        className={`fixed left-0 top-0 z-50 h-screen transition-all duration-300 lg:static ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        <div className="flex h-full flex-col">

          {/* Header */}
          <div
            style={{ borderBottom: "1px solid #334155" }}
            className={`py-5 flex items-center transition-all duration-300 ${
              isCollapsed ? "px-3 justify-center" : "px-6 justify-between"
            }`}
          >
            {!isCollapsed && (
              <h2 className="text-xl font-bold text-white">
                SAM Dashboard
              </h2>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex rounded-lg p-1.5 transition-colors text-slate-400 hover:text-white"
              style={{ background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          </div>

          {/* Nav */}
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
                        {/* Parent button */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.key)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-slate-200"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                        >
                          <GroupIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${groupOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Children */}
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
                                        ? "text-white font-medium"
                                        : "text-slate-400 hover:text-white"
                                    }`
                                  }
                                  style={({ isActive }) => ({
                                    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                                  })}
                                  onMouseEnter={(e) => {
                                    const el = e.currentTarget;
                                    if (!el.classList.contains("font-medium")) {
                                      el.style.background = "rgba(255,255,255,0.07)";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    const el = e.currentTarget;
                                    if (!el.classList.contains("font-medium")) {
                                      el.style.background = "transparent";
                                    }
                                  }}
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
                      /* Collapsed icon */
                      <button
                        type="button"
                        onClick={() => handleCollapsedParentClick(item.key)}
                        title={item.label}
                        className="flex w-full items-center justify-center rounded-lg p-3 transition-all text-slate-400 hover:text-white"
                        style={{ background: isActiveGroup ? "rgba(255,255,255,0.12)" : "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isActiveGroup ? "rgba(255,255,255,0.12)" : "transparent")}
                      >
                        <GroupIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          {!isCollapsed ? (
            <div style={{ borderTop: "1px solid #334155" }} className="p-4 space-y-2">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-slate-400 hover:text-rose-400"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut style={{ width: "16px", height: "16px", minWidth: "16px" }} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ borderTop: "1px solid #334155" }} className="p-4 flex flex-col items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <button
                onClick={handleLogout}
                title="Logout"
                className="rounded-lg p-2 transition-colors text-slate-400 hover:text-rose-400"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut style={{ width: "16px", height: "16px", minWidth: "16px" }} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className={`sticky top-0 z-30 flex items-center gap-4 border-b backdrop-blur-sm p-4 lg:hidden ${
          isDark ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white/80"
        }`}>
          <button
            onClick={() => setIsOpen(true)}
            className={`rounded-lg p-2 ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
          >
            <Menu className={`h-6 w-6 ${isDark ? "text-slate-50" : "text-slate-800"}`} />
          </button>
          <h1 className={`font-semibold ${isDark ? "text-slate-50" : "text-slate-800"}`}>SAM Monitoring</h1>
        </div>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}