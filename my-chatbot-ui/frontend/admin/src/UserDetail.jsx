import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function UserDetail() {
  const navigate = useNavigate();
  const { email } = useParams();
  const decodedEmail = decodeURIComponent(email);

  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const admin = localStorage.getItem("admin");
    if (!admin) {
      navigate("/");
      return;
    }

    const loadDetails = async () => {
      try {
        const userRes = await fetch(
          `http://localhost:5000/admin/users/${encodeURIComponent(decodedEmail)}`
        );

        const sessionRes = await fetch(
          `http://localhost:5000/admin/sessions/${encodeURIComponent(decodedEmail)}`
        );

        const userData = await userRes.json();
        const sessionData = await sessionRes.json();

        if (userData.success) setUser(userData.user);
        if (sessionData.success) setSessions(sessionData.sessions || []);

        setStatus("ready");
      } catch (err) {
        setErrorMessage("Unable to load user details.");
        setStatus("error");
      }
    };

    loadDetails();
  }, [decodedEmail, navigate]);

  const loadMessages = async (sessionId) => {
    setSelectedSession(sessionId);

    const res = await fetch(
      `http://localhost:5000/admin/sessions/${sessionId}/messages`
    );
    const data = await res.json();

    if (data.success) {
      setMessages(data.messages || []);
    }
  };

  const handleDeactivate = async () => {
    setActionMessage("");
    const response = await fetch(
      `http://localhost:5000/admin/users/${encodeURIComponent(decodedEmail)}/deactivate`,
      { method: "PATCH" }
    );

    const data = await response.json();
    if (data.success) {
      setUser((prev) => ({ ...prev, is_active: 0 }));
      setActionMessage("User account deactivated.");
    }
  };

  const handleActivate = async () => {
    setActionMessage("");
    const response = await fetch(
      `http://localhost:5000/admin/users/${encodeURIComponent(decodedEmail)}/activate`,
      { method: "PATCH" }
    );

    const data = await response.json();
    if (data.success) {
      setUser((prev) => ({ ...prev, is_active: 1 }));
      setActionMessage("User account activated.");
    }
  };

  if (status === "loading")
    return <div className="card">Loading user details...</div>;

  if (status === "error" || !user)
    return <div className="card">{errorMessage}</div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
        <span className={`pill ${user.is_active ? "active" : "inactive"}`}>
          {user.is_active ? "Active" : "Deactivated"}
        </span>
      </div>

      <div className="split">

        <div className="card">
          <h3>Account status</h3>

          <div className="status-info">
            <div className="status-row">
              <span className="status-label">Status</span>
              <span className={`pill ${user.is_active ? "active" : "inactive"}`}>
                {user.is_active ? "Active" : "Deactivated"}
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Email</span>
              <span className="status-value">{user.email}</span>
            </div>
            {user.phone && (
              <div className="status-row">
                <span className="status-label">Phone</span>
                <span className="status-value">{user.phone}</span>
              </div>
            )}
            {user.age && (
              <div className="status-row">
                <span className="status-label">Age</span>
                <span className="status-value">{user.age}</span>
              </div>
            )}
            {user.region && (
              <div className="status-row">
                <span className="status-label">Region</span>
                <span className="status-value">{user.region}</span>
              </div>
            )}
          </div>

          {user.is_active ? (
            <button className="danger-btn" onClick={handleDeactivate}>
              Deactivate account
            </button>
          ) : (
            <button className="primary-btn" onClick={handleActivate}>
              Activate account
            </button>
          )}

          {actionMessage && <div className="alert">{actionMessage}</div>}
        </div>

        <div className="card">
          <h3>Sessions</h3>

          {sessions.length === 0 && (
            <div className="muted">No chat sessions found.</div>
          )}

          {sessions.map((session) => (
            <div
              key={session.id}
              className="chat-item session-entry"
              onClick={() => loadMessages(session.id)}
            >
              <strong>{session.title}</strong>
              <div className="muted">
                {new Date(session.created_at).toLocaleString()}
              </div>
            </div>
          ))}

          {selectedSession && (
            <>
              <h3 className="section-title">Conversation</h3>

              {/* SCROLLABLE CONVERSATION AREA */}
              <div className="conversation-panel">
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-item ${msg.sender}`}>
                    <div className="chat-meta">
                      <span>{msg.sender}</span>
                      <span>
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p>{msg.message}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDetail;