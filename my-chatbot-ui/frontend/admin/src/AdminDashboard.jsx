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
          setErrorMessage(data.error || data.message || "Unable to load users right now.");
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

      {status === "loading" ? (
        <div className="card">Loading users...</div>
      ) : null}

      {status === "error" ? (
        <div className="card">{errorMessage}</div>
      ) : null}

      {status === "ready" ? (
        <div className="grid">
          {filteredUsers.length === 0 ? (
            <div className="card">No users found yet.</div>
          ) : null}
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
                  <span className="stat-label">Chats</span>
                  <span className="stat-value">{user.chat_count || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Last message</span>
                  <span className="stat-value">
                    {user.last_message_at ? new Date(user.last_message_at).toLocaleString() : "-"}
                  </span>
                </div>
              </div>
              <Link className="primary-btn" to={`/users/${encodeURIComponent(user.email)}`}>
                Review user
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboard;
