import React from "react";
import "./App.css";

function Profile() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="profile-panel">
      <div className="profile-head">
        <h2>User Profile</h2>
        <p className="profile-subtitle">Manage your account information</p>
      </div>

      <div className="profile-grid">
        <div className="profile-item">
          <span className="profile-label">Name</span>
          <span className="profile-value">{user?.name || "-"}</span>
        </div>

        <div className="profile-item">
          <span className="profile-label">Email</span>
          <span className="profile-value">{user?.email || "-"}</span>
        </div>

        <div className="profile-item">
          <span className="profile-label">Region</span>
          <span className="profile-value">{user?.region || "-"}</span>
        </div>
      </div>

      <div className="profile-actions">
        <button
          className="profile-logout"
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Profile;
