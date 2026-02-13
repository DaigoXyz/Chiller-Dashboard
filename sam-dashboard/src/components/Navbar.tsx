import { useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../api/AuthApi";
import { Calendar, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface NavbarProps {
  selectedDateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
}

export default function Navbar({ selectedDateRange, onDateRangeChange }: NavbarProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(selectedDateRange.start);
  const [tempEndDate, setTempEndDate] = useState(selectedDateRange.end);
  const calendarRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleApply = () => {
    onDateRangeChange({ start: tempStartDate, end: tempEndDate });
    setIsCalendarOpen(false);
  };

  const handleCancel = () => {
    setTempStartDate(selectedDateRange.start);
    setTempEndDate(selectedDateRange.end);
    setIsCalendarOpen(false);
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen, selectedDateRange]);

  // Format date for display
  const formatDateDisplay = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${startDate.toLocaleDateString('id-ID', options)} - ${endDate.toLocaleDateString('id-ID', options)}`;
  };

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-slate-400">Real-time monitoring and analytics</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Range Picker */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
          >
            <Calendar className="h-4 w-4" />
            <span>{formatDateDisplay(selectedDateRange.start, selectedDateRange.end)}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isCalendarOpen ? "rotate-180" : ""}`} />
          </button>

          {isCalendarOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-slate-900/98 backdrop-blur-sm shadow-2xl z-50 p-4">
              <div className="space-y-4">
                {/* Start Date */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>

                {/* Quick Select Buttons */}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Quick Select</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        const today = new Date();
                        const weekAgo = new Date(today);
                        weekAgo.setDate(today.getDate() - 7);
                        setTempStartDate(weekAgo.toISOString().split('T')[0]);
                        setTempEndDate(today.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                    >
                      7 Hari
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date();
                        const monthAgo = new Date(today);
                        monthAgo.setDate(today.getDate() - 30);
                        setTempStartDate(monthAgo.toISOString().split('T')[0]);
                        setTempEndDate(today.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                    >
                      30 Hari
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date();
                        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                        setTempStartDate(startOfMonth.toISOString().split('T')[0]);
                        setTempEndDate(today.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                    >
                      Bulan Ini
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="text-sm text-slate-400">
              Welcome, <span className="text-white font-medium">{user.name || user.username}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/25 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}