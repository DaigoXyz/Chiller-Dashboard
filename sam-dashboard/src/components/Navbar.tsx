import { useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../api/AuthApi";
import { Calendar, Clock, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface NavbarProps {
  selectedDateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
}

export default function Navbar({
  selectedDateRange,
  onDateRangeChange,
}: NavbarProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [tempStartDate, setTempStartDate] = useState(
    selectedDateRange.start.split("T")[0]
  );
  const [tempStartTime, setTempStartTime] = useState(
    selectedDateRange.start.includes("T")
      ? selectedDateRange.start.split("T")[1]
      : "00:00"
  );
  const [tempEndDate, setTempEndDate] = useState(
    selectedDateRange.end.split("T")[0]
  );
  const [tempEndTime, setTempEndTime] = useState(
    selectedDateRange.end.includes("T")
      ? selectedDateRange.end.split("T")[1]
      : "23:59"
  );

  const calendarRef = useRef<HTMLDivElement>(null);

  // 🔥 refs buat auto open picker
  const startDateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleApply = () => {
    onDateRangeChange({
      start: `${tempStartDate}T${tempStartTime}`,
      end: `${tempEndDate}T${tempEndTime}`,
    });
    setIsCalendarOpen(false);
  };

  const handleCancel = () => {
    setTempStartDate(selectedDateRange.start.split("T")[0]);
    setTempStartTime(
      selectedDateRange.start.includes("T")
        ? selectedDateRange.start.split("T")[1]
        : "00:00"
    );
    setTempEndDate(selectedDateRange.end.split("T")[0]);
    setTempEndTime(
      selectedDateRange.end.includes("T")
        ? selectedDateRange.end.split("T")[1]
        : "23:59"
    );
    setIsCalendarOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        handleCancel();
      }
    };

    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  const formatTodayDisplay = () => {
    const today = new Date();
    return today.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Chiller</h2>
        <p className="mt-1 text-sm text-slate-400">
          Dashboard Monitoring
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={calendarRef}>
          <div
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition cursor-pointer min-w-[200px]"
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="flex-1">{formatTodayDisplay()}</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                isCalendarOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          {isCalendarOpen && (
            <div className="absolute right-0 mt-2 w-96 rounded-xl border border-white/10 bg-slate-900/98 backdrop-blur-sm shadow-2xl z-50 p-4">
              <div className="space-y-4">
                {/* START */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Mulai
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      ref={startDateRef}
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      onClick={() => startDateRef.current?.showPicker?.()}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />

                    <div
                      className="relative cursor-pointer"
                      onClick={() => startTimeRef.current?.showPicker?.()}
                    >
                      <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        ref={startTimeRef}
                        type="time"
                        value={tempStartTime}
                        onChange={(e) => setTempStartTime(e.target.value)}
                        onClick={() => startTimeRef.current?.showPicker?.()}
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* END */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Selesai
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      ref={endDateRef}
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      onClick={() => endDateRef.current?.showPicker?.()}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />

                    <div
                      className="relative cursor-pointer"
                      onClick={() => endTimeRef.current?.showPicker?.()}
                    >
                      <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        ref={endTimeRef}
                        type="time"
                        value={tempEndTime}
                        onChange={(e) => setTempEndTime(e.target.value)}
                        onClick={() => endTimeRef.current?.showPicker?.()}
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>
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
                        setTempStartTime('00:00');
                        setTempEndDate(today.toISOString().split('T')[0]);
                        setTempEndTime('23:59');
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
                        setTempStartTime('00:00');
                        setTempEndDate(today.toISOString().split('T')[0]);
                        setTempEndTime('23:59');
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
                        setTempStartTime('00:00');
                        setTempEndDate(today.toISOString().split('T')[0]);
                        setTempEndTime('23:59');
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
                    >
                      Bulan Ini
                    </button>
                  </div>
                </div>

                {/* ACTION */}
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

        {/* USER */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="text-sm text-slate-400">
              Welcome,{" "}
              <span className="text-white font-medium">
                {user.name || user.username}
              </span>
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
