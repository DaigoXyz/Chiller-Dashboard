import { useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../api/AuthApi";

export default function LogoutButton() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
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
  );
}