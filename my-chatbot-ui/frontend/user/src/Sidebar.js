import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar({
  sessions,
  activeSession,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  userEmail
}) {
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [showDoctors, setShowDoctors] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  useEffect(() => {
    if (!userEmail) return;

    fetch(`http://localhost:5000/api/doctors/user/${userEmail}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setDoctors(data.doctors);
      });
  }, [userEmail]);

  useEffect(() => {
    const handleWindowClick = () => {
      setOpenMenuSessionId(null);
      setShowSettingsMenu(false);
    };
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  return (
    <div className="sidebar">

      <button className="new-chat-btn" onClick={onNewChat}>
        + New Chat
      </button>

      <div className="history-section">
        <h4>Chat History</h4>

        <div className="history-list">
          {sessions.length === 0 ? (
            <div className="history-empty">No chats yet. Start a new one.</div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={`history-item ${activeSession === session.id ? "active" : ""}`}
                onClick={() => onSelectSession(session.id)}
              >
                  <div className="history-item-top">
                    <div className="history-title">{session.title || "New Chat"}</div>

                    <div className="history-actions" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className="history-menu-btn"
                        onClick={() => {
                          setOpenMenuSessionId((prev) => (prev === session.id ? null : session.id));
                        }}
                      >
                        ⋯
                      </button>

                      {openMenuSessionId === session.id ? (
                        <div className="history-menu-popover">
                          <button
                            type="button"
                            className="history-delete-btn"
                            onClick={() => {
                              setOpenMenuSessionId(null);
                              if (onDeleteSession) {
                                onDeleteSession(session.id);
                              }
                            }}
                          >
                            Delete chat
                          </button>
                        </div>
                      ) : null}
                  </div>
                  </div>

                  {session.last_message_time && (
                    <div className="history-time">
                      {new Date(session.last_message_time).toLocaleString()}
                    </div>
                  )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="doctor-section">
        <button
          className="doctor-toggle"
          onClick={() => setShowDoctors(!showDoctors)}
        >
          <span>Doctors List</span>
          <span>{showDoctors ? "▲" : "▼"}</span>
        </button>

        {showDoctors && (
          <div className="doctor-list">
            {doctors.length === 0 ? (
              <div className="doctor-empty">No doctors found for your region.</div>
            ) : (
              doctors.map(doc => (
                <div key={doc.id} className="doctor-item">
                  <strong>{doc.name}</strong>
                  <div>{doc.specialization}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="profile-section">
        <button
          className="settings-btn"
          onClick={(event) => {
            event.stopPropagation();
            setShowSettingsMenu((prev) => !prev);
          }}
        >
          ⚙ Settings
        </button>

        {showSettingsMenu ? (
          <div className="settings-menu" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="settings-item"
              onClick={() => {
                setShowSettingsMenu(false);
                setShowProfilePopup(true);
              }}
            >
              Profile
            </button>

            <button
              type="button"
              className="settings-item"
              onClick={() => {
                setShowSettingsMenu(false);
                navigate("/book-appointment");
              }}
            >
              Appointment Requests
            </button>

            <button
              type="button"
              className="settings-item logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>

      {showProfilePopup && (
        <div className="profile-popup-overlay" onClick={() => setShowProfilePopup(false)}>
          <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
            <div className="profile-popup-head">
              <h4>User Details</h4>
              <button
                type="button"
                className="popup-cross-btn"
                aria-label="Close profile popup"
                onClick={() => setShowProfilePopup(false)}
              >
                ×
              </button>
            </div>
            <div className="profile-popup-item">
              <span>Name</span>
              <strong>{user?.name || "-"}</strong>
            </div>
            <div className="profile-popup-item">
              <span>Email</span>
              <strong>{user?.email || "-"}</strong>
            </div>
            <div className="profile-popup-item">
              <span>Region</span>
              <strong>{user?.region || "-"}</strong>
            </div>

            <button
              className="popup-close-btn"
              onClick={() => setShowProfilePopup(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Sidebar;