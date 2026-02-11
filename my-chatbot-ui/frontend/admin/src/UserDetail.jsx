import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function UserDetail() {
  const navigate = useNavigate();
  const { email } = useParams();
  const decodedEmail = decodeURIComponent(email);

  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
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
        const [userRes, chatRes] = await Promise.all([
          fetch(`http://localhost:5000/admin/users/${encodeURIComponent(decodedEmail)}`),
          fetch(`http://localhost:5000/admin/users/${encodeURIComponent(decodedEmail)}/chats`),
        ]);

        const userData = await userRes.json();
        const chatData = await chatRes.json();

        if (userData.success) {
          setUser(userData.user);
        }
        if (chatData.success) {
          setChats(chatData.chats || []);
        }

        if (!userData.success) {
          setErrorMessage(userData.error || userData.message || "Unable to load user details.");
        }

        setStatus("ready");
      } catch (err) {
        setErrorMessage("Unable to load user details.");
        setStatus("error");
      }
    };

    loadDetails();
  }, [decodedEmail, navigate]);

  const handleDeactivate = async () => {
    setActionMessage("");
    try {
      const response = await fetch(
        `http://localhost:5000/admin/users/${encodeURIComponent(decodedEmail)}/deactivate`,
        { method: "PATCH" }
      );

      const data = await response.json();
      if (data.success) {
        setUser((prev) => ({ ...prev, is_active: 0 }));
        setActionMessage("User account deactivated.");
      } else {
        setActionMessage(data.message || "Failed to deactivate user.");
      }
    } catch (err) {
      setActionMessage("Failed to deactivate user.");
    }
  };

  const handleActivate = async () => {
    setActionMessage("");
    try {
      const response = await fetch(
        `http://localhost:5000/admin/users/${encodeURIComponent(decodedEmail)}/activate`,
        { method: "PATCH" }
      );

      const data = await response.json();
      if (data.success) {
        setUser((prev) => ({ ...prev, is_active: 1 }));
        setActionMessage("User account activated.");
      } else {
        setActionMessage(data.message || "Failed to activate user.");
      }
    } catch (err) {
      setActionMessage("Failed to activate user.");
    }
  };

  if (status === "loading") {
    return <div className="card">Loading user details...</div>;
  }

  if (status === "error" || !user) {
    return <div className="card">{errorMessage || "Unable to load user details."}</div>;
  }

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
          <p className="muted">
            {user.is_active ? "Deactivate the user account if needed." : "Reactivate the user account."}
          </p>
          {user.is_active ? (
            <button className="danger-btn" onClick={handleDeactivate}>
              Deactivate account
            </button>
          ) : (
            <button className="primary-btn" onClick={handleActivate}>
              Activate account
            </button>
          )}
          {actionMessage ? <div className="alert">{actionMessage}</div> : null}
        </div>

        <div className="card">
          <h3>Chat history</h3>
          <div className="chat-list">
            {chats.length === 0 ? (
              <div className="muted">No chat history stored yet.</div>
            ) : (
              chats.map((chat) => (
                <div key={chat.id} className={`chat-item ${chat.sender}`}>
                  <div className="chat-meta">
                    <span>{chat.sender}</span>
                    <span>{new Date(chat.created_at).toLocaleString()}</span>
                  </div>
                  <p>{chat.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDetail;
