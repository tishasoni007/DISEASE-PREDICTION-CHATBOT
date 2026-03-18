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
  const isUsersRoute = location.pathname === "/dashboard" || location.pathname.startsWith("/users/");

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
            <nav className="admin-nav" aria-label="Admin navigation">
              <Link
                className={`nav-link ${isUsersRoute ? "active" : ""}`}
                to="/dashboard"
              >
                Users
              </Link>
            </nav>

            <button className="ghost-btn logout-btn" onClick={handleLogout}>
              Logout
            </button>
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
