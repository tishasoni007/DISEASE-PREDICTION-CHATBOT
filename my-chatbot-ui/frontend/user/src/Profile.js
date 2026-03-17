import React from "react";

function Profile() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div style={{ padding: "40px" }}>
      <h2>User Profile</h2>
      <p><b>Name:</b> {user?.name}</p>
      <p><b>Email:</b> {user?.email}</p>
      <p><b>Region:</b> {user?.region}</p>

      <button onClick={() => {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }}>
        Logout
      </button>
    </div>
  );
}

export default Profile;
