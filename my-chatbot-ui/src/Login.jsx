import React, { useState } from "react";
import "./login.css";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
    
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user temporarily
        localStorage.setItem("user", JSON.stringify(data.user));

        // REDIRECT TO CHATBOT PAGE
        navigate("/chat");
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Server error! Please try again.");
    }
  };

  return (
    <div className="login-container">
      <h1>Login to College Assistant</h1>

      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      <form onSubmit={handleSubmit} className="login-form">
        
        <label htmlFor="email">Email or Mobile Number</label>
        <input
          type="text"
          id="email"
          placeholder="Enter your email or phone"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>

        <div className="google-login">
          <a href="https://google.com" className="google-btn">
            <img
              src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
              alt="Google Logo"
            />
            Login with Google
          </a>
        </div>

        <p className="login-extra">
          <a href="/register">New User? Register</a>
        </p>
      </form>
    </div>
  );
}

export default Login;
