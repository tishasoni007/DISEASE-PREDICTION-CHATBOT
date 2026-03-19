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
  const REGIONS = ["Vadodara", "Anand", "Nadiad", "Petlad", "Ahmedabad", "Surat", "Rajkot"];

  const [doctors, setDoctors] = useState([]);
  const [showDoctors, setShowDoctors] = useState(false);
  const [expandedDoctorId, setExpandedDoctorId] = useState(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [openMenuSessionId, setOpenMenuSessionId] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [profileForm, setProfileForm] = useState({
    name: "",
    region: "",
    phone: "",
    age: "",
  });
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const getDisplayTitle = (session) => {
    if (session.display_title) return session.display_title;
    if (session.title) return session.title;
    return "New Chat";
  };

  const getPredictionInfo = (session) => {
    const title = session.display_title || session.title;
    if (!title) return null;
    
    const match = title.match(/(high|medium|moderate|low|no).*possibility|(\d+)%/i);
    if (match) {
      return {
        text: title,
        hasConfidence: true
      };
    }
    return null;
  };

  useEffect(() => {
    if (!userEmail) return;

    fetch(`http://localhost:5000/api/doctors/user/${userEmail}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDoctors(data.doctors || []);
          setExpandedDoctorId((currentId) =>
            (data.doctors || []).some((doctor) => doctor.id === currentId) ? currentId : null
          );
        }
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

  const openProfilePopup = () => {
    setShowProfilePopup(true);
    setIsEditingProfile(false);
    setProfileError("");
    setProfileMessage("");
    setProfileForm({
      name: user?.name || "",
      region: user?.region || "",
      phone: user?.phone || "",
      age: user?.age ? String(user.age) : "",
    });
  };

  const validateProfileForm = () => {
    const normalizedName = String(profileForm.name || "").trim().replace(/\s+/g, " ");
    const normalizedRegion = String(profileForm.region || "").trim();
    const normalizedPhone = String(profileForm.phone || "").trim();
    const normalizedAge = String(profileForm.age || "").trim();

    if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 50) {
      return "Name must be 2-50 characters long";
    }

    if (!/^[a-zA-Z\s]+$/.test(normalizedName)) {
      return "Name can only contain alphabets and spaces";
    }

    if (!REGIONS.includes(normalizedRegion)) {
      return "Please select a valid region";
    }

    if (normalizedPhone && /[^0-9]/.test(normalizedPhone)) {
      return "Only digits are allowed in phone number";
    }

    if (normalizedPhone && !/^\d{10}$/.test(normalizedPhone)) {
      return "Phone number must be exactly 10 digits";
    }

    if (normalizedAge) {
      const ageNum = parseInt(normalizedAge, 10);
      if (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        return "Age must be between 1 and 120";
      }
    }

    return "";
  };

  const handleProfileUpdate = async () => {
    setProfileError("");
    setProfileMessage("");

    const validationError = validateProfileForm();
    if (validationError) {
      setProfileError(validationError);
      return;
    }

    setSavingProfile(true);

    try {
      const response = await fetch("http://localhost:5000/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          name: String(profileForm.name || "").trim().replace(/\s+/g, " "),
          region: String(profileForm.region || "").trim(),
          phone: String(profileForm.phone || "").trim() || null,
          age: String(profileForm.age || "").trim() || null,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.user) {
        setProfileError(data.message || "Unable to update profile.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setProfileMessage("Profile updated successfully.");
      setIsEditingProfile(false);
    } catch (error) {
      setProfileError("Server error while updating profile.");
    } finally {
      setSavingProfile(false);
    }
  };

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
                    <div className="history-item-content">
                      <div className={`history-title ${getPredictionInfo(session) ? "has-prediction" : ""}`}>
                        {getDisplayTitle(session)}
                      </div>
                      {session.last_message_time && (
                        <div className="history-time">
                          {new Date(session.last_message_time).toLocaleString()}
                        </div>
                      )}
                    </div>

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
              </div>
            ))
          )}
        </div>
      </div>

      <div className="doctor-section">
        <button
          className="doctor-toggle"
          onClick={() => {
            setShowDoctors((previous) => {
              const next = !previous;
              if (!next) {
                setExpandedDoctorId(null);
              }
              return next;
            });
          }}
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
                <div
                  key={doc.id}
                  className={`doctor-item ${expandedDoctorId === doc.id ? "expanded" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setExpandedDoctorId((currentId) => (currentId === doc.id ? null : doc.id))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedDoctorId((currentId) => (currentId === doc.id ? null : doc.id));
                    }
                  }}
                >
                  <div className="doctor-item-head">
                    <strong>{doc.name}</strong>
                    <span className="doctor-expand-icon">{expandedDoctorId === doc.id ? "▲" : "▼"}</span>
                  </div>
                  <div className="doctor-specialization">{doc.specialization || "General"}</div>

                  {expandedDoctorId === doc.id ? (
                    <div className="doctor-details">
                      <div className="doctor-detail-row">
                        <span className="doctor-detail-label">Hospital</span>
                        <span className="doctor-detail-value">{doc.hospital || "Not specified"}</span>
                      </div>
                      <div className="doctor-detail-row">
                        <span className="doctor-detail-label">Specialization</span>
                        <span className="doctor-detail-value">{doc.specialization || "General"}</span>
                      </div>
                      <div className="doctor-detail-row">
                        <span className="doctor-detail-label">Contact</span>
                        <span className="doctor-detail-value">{doc.contact || "Not available"}</span>
                      </div>
                    </div>
                  ) : null}
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
                openProfilePopup();
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
            {profileError ? <div className="profile-popup-message error">{profileError}</div> : null}
            {profileMessage ? <div className="profile-popup-message success">{profileMessage}</div> : null}

            {isEditingProfile ? (
              <div className="profile-edit-form">
                <label className="profile-edit-label">Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />

                <label className="profile-edit-label">Email</label>
                <input type="email" value={user?.email || ""} disabled />

                <label className="profile-edit-label">Region</label>
                <select
                  value={profileForm.region}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, region: event.target.value }))
                  }
                >
                  <option value="">Select region</option>
                  {REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>

                <label className="profile-edit-label">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="10-digit phone number"
                />

                <label className="profile-edit-label">Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={profileForm.age}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, age: event.target.value }))
                  }
                  placeholder="Age"
                />

                <div className="profile-popup-actions">
                  <button
                    type="button"
                    className="popup-secondary-btn"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileError("");
                      setProfileMessage("");
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="popup-primary-btn"
                    onClick={handleProfileUpdate}
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                <div className="profile-popup-item">
                  <span>Phone</span>
                  <strong>{user?.phone || "-"}</strong>
                </div>
                <div className="profile-popup-item">
                  <span>Age</span>
                  <strong>{user?.age || "-"}</strong>
                </div>

                <div className="profile-popup-actions">
                  <button
                    type="button"
                    className="popup-secondary-btn"
                    onClick={() => setShowProfilePopup(false)}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="popup-primary-btn"
                    onClick={() => {
                      setProfileError("");
                      setProfileMessage("");
                      setIsEditingProfile(true);
                    }}
                  >
                    Edit Details
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default Sidebar;