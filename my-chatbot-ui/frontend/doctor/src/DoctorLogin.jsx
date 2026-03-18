import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function DoctorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:5000/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("doctor", JSON.stringify(data.doctor));
        navigate("/dashboard");
      } else {
        setError(data.message || "Unable to login");
      }
    } catch (requestError) {
      setError("Server error. Try again.");
    }
  };

  return (
    <div className="doctor-login-page">
      <div className="doctor-login-card">
        <h1>Doctor Login</h1>
        <p>Manage appointment requests and calendar schedule.</p>

        {error ? <div className="doctor-alert error">{error}</div> : null}

        <form className="doctor-form" onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            required
          />

          <label>Password</label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

export default DoctorLogin;
