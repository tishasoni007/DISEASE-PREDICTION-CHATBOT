import React, { useState } from "react";
import "./login.css";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // ✅ Store FULL user object (important for region & doctors)
        localStorage.setItem("user", JSON.stringify({
          name: data.user.name,
          email: data.user.email,
          region: data.user.region,   // make sure backend sends this
          phone: data.user.phone,
          age: data.user.age
        }));

        navigate("/chat");
      } else {
        setError(data.message || "Login failed");
      }

    } catch (err) {
      setError("Server error! Please try again.");
    }
  };

  return (
    <div className="login-container">
      <h1>Login to Disease Assistant</h1>

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">

        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>

        <p className="login-extra">
          <Link to="/register">New User? Register</Link>
        </p>

      </form>
    </div>
  );
}

export default Login;
