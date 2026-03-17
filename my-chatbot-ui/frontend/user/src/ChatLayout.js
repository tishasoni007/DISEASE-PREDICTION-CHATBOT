import React, { useState, useEffect } from "react";
import Chat from "./Chat";
import "./Sidebar.css";

function ChatLayout() {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [doctors, setDoctors] = useState([]);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Load sessions
  useEffect(() => {
    if (!user) return;

    fetch(`http://localhost:5000/api/sessions/${user.email}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSessions(data.sessions);
        }
      });

    // Load doctors
    fetch(`http://localhost:5000/api/doctors/user/${user.email}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDoctors(data.doctors);
        }
      });
  }, [user]);

  // Create new session
  const handleNewChat = async () => {
    const response = await fetch("http://localhost:5000/api/sessions/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: user.email })
    });

    const data = await response.json();
    if (data.success) {
      setCurrentSessionId(data.sessionId);
      setMessages([]);
    }
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className="sidebar">

        <button className="new-chat-btn" onClick={handleNewChat}>
          + New Chat
        </button>

        <div className="session-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className="session-item"
              onClick={() => setCurrentSessionId(session.id)}
            >
              {session.title}
            </div>
          ))}
        </div>

        <div className="doctor-section">
          <h4>Doctors Near You</h4>
          {doctors.map(doc => (
            <div key={doc.id} className="doctor-item">
              <strong>{doc.name}</strong>
              <p>{doc.hospital}</p>
            </div>
          ))}
        </div>

        <div className="profile">
          👤 {user?.name}
        </div>

      </div>

      {/* Chat Panel */}
      <Chat
        messages={messages}
        setMessages={setMessages}
        currentSessionId={currentSessionId}
      />
    </div>
  );
}

export default ChatLayout;
