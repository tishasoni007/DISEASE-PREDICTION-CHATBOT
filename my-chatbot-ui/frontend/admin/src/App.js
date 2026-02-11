import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = localStorage.getItem("admin");

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/");
  };

  const showNav = admin && location.pathname !== "/";

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div>
            <div className="brand-title">Admin</div>
            <div className="brand-sub">Moderation console</div>
          </div>
        </div>

        {showNav ? (
          <div className="admin-actions">
            <Link className="ghost-btn" to="/dashboard">Dashboard</Link>
            <button className="ghost-btn" onClick={handleLogout}>Logout</button>
          </div>
        ) : null}
      </header>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
