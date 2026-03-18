import React, { useState, useEffect } from "react";
import Chat from "./Chat";
import Sidebar from "./Sidebar";
import "./App.css";

function App() {
  const storedUser = JSON.parse(localStorage.getItem("user"));

  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [chatResetToken, setChatResetToken] = useState(0);

  const loadSessions = (preferredSessionId = null, options = { selectFallback: true }) => {
    if (!storedUser) return;

    fetch(`http://localhost:5000/api/chat/sessions/${storedUser.email}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const nextSessions = data.sessions || [];
          setSessions(nextSessions);

          setActiveSession((currentActive) => {
            if (preferredSessionId && nextSessions.some((item) => item.id === preferredSessionId)) {
              return preferredSessionId;
            }

            if (currentActive && nextSessions.some((item) => item.id === currentActive)) {
              return currentActive;
            }

            if (options.selectFallback) {
              return nextSessions.length > 0 ? nextSessions[0].id : null;
            }

            return null;
          });
        }
      });
  };

  useEffect(() => {
    if (!storedUser?.email) return;
    setActiveSession(null);
    setChatResetToken((prev) => prev + 1);
    loadSessions(null, { selectFallback: false });
  }, [storedUser?.email]);

  return (
    <div className="app-container">
      <Sidebar
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={(id) => {
          setActiveSession(id);
        }}
        onNewChat={() => {
          setActiveSession(null);
          setChatResetToken((prev) => prev + 1);
          loadSessions(null, { selectFallback: false });
        }}
        onDeleteSession={async (sessionId) => {
          const deleteUrl = `http://localhost:5000/api/chat/sessions/${sessionId}?userEmail=${encodeURIComponent(storedUser.email)}`;

          const res = await fetch(deleteUrl, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userEmail: storedUser.email })
          });

          const data = await res.json();
          if (data.success) {
            setSessions((prevSessions) => {
              const remaining = prevSessions.filter((session) => session.id !== sessionId);

              setActiveSession((currentActive) => {
                if (currentActive !== sessionId) return currentActive;
                return remaining.length > 0 ? remaining[0].id : null;
              });

              return remaining;
            });

            loadSessions();
          }
        }}
        userEmail={storedUser?.email}
      />

      <Chat
        activeSession={activeSession}
        userEmail={storedUser?.email}
        refreshSessions={loadSessions}
        resetToken={chatResetToken}
        onSessionResolved={(sessionId) => {
          if (sessionId) {
            setActiveSession(sessionId);
          }
        }}
      />
    </div>
  );
}

export default App;