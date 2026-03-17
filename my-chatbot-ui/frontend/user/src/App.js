import React, { useState, useEffect } from "react";
import Chat from "./Chat";
import Sidebar from "./Sidebar";
import Profile from "./Profile";
import "./App.css";

function App() {
  const storedUser = JSON.parse(localStorage.getItem("user"));

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const loadSessions = () => {
    if (!storedUser) return;

    fetch(`http://localhost:5000/api/chat/sessions/${storedUser.email}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSessions(data.sessions);
          if (!activeSession && data.sessions.length > 0) {
            setActiveSession(data.sessions[0].id);
          }
        }
      });
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className="app-container">
      <Sidebar
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={(id) => {
          setActiveSession(id);
          setShowProfile(false);
        }}
        onNewChat={async () => {
          const res = await fetch("http://localhost:5000/api/chat/sessions/new", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userEmail: storedUser.email })
          });

          const data = await res.json();
          if (data.success) {
            loadSessions();
            setActiveSession(data.sessionId);
            setShowProfile(false);
          }
        }}
        userEmail={storedUser?.email}
        onProfileClick={() => setShowProfile(true)}
      />

      {showProfile ? (
        <Profile />
      ) : (
        <Chat
          activeSession={activeSession}
          userEmail={storedUser?.email}
          refreshSessions={loadSessions}
        />
      )}
    </div>
  );
}

export default App;