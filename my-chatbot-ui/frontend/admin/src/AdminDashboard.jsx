import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const admin = localStorage.getItem("admin");
    if (!admin) {
      navigate("/");
      return;
    }

    const loadUsers = async () => {
      try {
        const response = await fetch("http://localhost:5000/admin/users");
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
          setStatus("ready");
        } else {
          setErrorMessage(data.message || "Unable to load users right now.");
          setStatus("error");
        }
      } catch (err) {
        setErrorMessage("Unable to load users right now.");
        setStatus("error");
      }
    };

    loadUsers();
  }, [navigate]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      `${user.name} ${user.email}`.toLowerCase().includes(query)
    );
  }, [search, users]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>User Moderation</h2>
          <p>Monitor chat activity and manage user status.</p>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {status === "loading" && <div className="card">Loading users...</div>}
      {status === "error" && <div className="card">{errorMessage}</div>}

      {status === "ready" && (
        <div className="grid">
          {filteredUsers.length === 0 && (
            <div className="card">No users found yet.</div>
          )}

          {filteredUsers.map((user) => (
            <div className="card" key={user.email}>
              <div className="card-row">
                <div>
                  <div className="user-name">{user.name}</div>
                  <div className="muted">{user.email}</div>
                </div>
                <span className={`pill ${user.is_active ? "active" : "inactive"}`}>
                  {user.is_active ? "Active" : "Deactivated"}
                </span>
              </div>

              <div className="card-row">
                <div className="stat">
                  <span className="stat-label">Sessions</span>
                  <span className="stat-value">{user.total_sessions || 0}</span>
                </div>

                <div className="stat">
                  <span className="stat-label">Last activity</span>
                  <span className="stat-value">
                    {user.last_activity
                      ? new Date(user.last_activity).toLocaleString()
                      : "-"}
                  </span>
                </div>
              </div>

              <Link
                className="primary-btn"
                to={`/users/${encodeURIComponent(user.email)}`}
              >
                Review user
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;