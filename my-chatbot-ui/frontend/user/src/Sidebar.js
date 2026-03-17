import React, { useState, useEffect } from "react";
import "./Sidebar.css";

function Sidebar({
  sessions,
  activeSession,
  onSelectSession,
  onNewChat,
  userEmail,
  onProfileClick
}) {

  const [doctors, setDoctors] = useState([]);
  const [showDoctors, setShowDoctors] = useState(false);

  useEffect(() => {
    if (!userEmail) return;

    fetch(`http://localhost:5000/api/doctors/user/${userEmail}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setDoctors(data.doctors);
      });
  }, [userEmail]);

  return (
    <div className="sidebar">

      <button className="new-chat-btn" onClick={onNewChat}>
        + New Chat
      </button>

      <div className="history-section">
        <h4>Chat History</h4>

        <div className="history-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`history-item ${activeSession === session.id ? "active" : ""}`}
              onClick={() => onSelectSession(session.id)}
            >
              <div>{session.title || "New Chat"}</div>
              {session.last_message_time && (
                <div className="history-time">
                  {new Date(session.last_message_time).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="doctor-section">
        <button
          className="doctor-toggle"
          onClick={() => setShowDoctors(!showDoctors)}
        >
          Doctors List ▼
        </button>

        {showDoctors && (
          <div className="doctor-list">
            {doctors.map(doc => (
              <div key={doc.id} className="doctor-item">
                <strong>{doc.name}</strong>
                <div>{doc.specialization}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="profile-section">
        <button className="profile-btn" onClick={onProfileClick}>
          👤 Profile
        </button>
      </div>

    </div>
  );
}

export default Sidebar;