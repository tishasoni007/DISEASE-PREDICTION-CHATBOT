import React, { useState } from "react";
import "./login.css";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Validation functions
  const validateName = (value) => {
    if (!value || value.length < 2 || value.length > 50) {
      return "Name must be 2-50 characters long";
    }
    if (!/^[a-zA-Z\s]+$/.test(value)) {
      return "Name can only contain alphabets and spaces";
    }
    return "";
  };

  const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const validatePassword = (value) => {
    if (!value || value.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(value)) {
      return "Password must contain at least 1 uppercase letter";
    }
    if (!/[a-z]/.test(value)) {
      return "Password must contain at least 1 lowercase letter";
    }
    if (!/[0-9]/.test(value)) {
      return "Password must contain at least 1 digit";
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      return "Password must contain at least 1 special character";
    }
    return "";
  };

  const validatePhone = (value) => {
    if (value && /[^0-9]/.test(value)) {
      return "Only digits are allowed in phone number";
    }
    if (value && !/^\d{10}$/.test(value)) {
      return "Phone number must be exactly 10 digits";
    }
    return "";
  };

  const validateAge = (value) => {
    if (value) {
      const ageNum = parseInt(value, 10);
      if (ageNum < 1 || ageNum > 120) {
        return "Age must be between 1 and 120";
      }
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Validate all fields
    let error = "";

    if (!name) {
      error = "Name is required";
    } else {
      error = validateName(name);
    }

    if (!error && !email) {
      error = "Email is required";
    } else if (!error) {
      error = validateEmail(email);
    }

    if (!error && !password) {
      error = "Password is required";
    } else if (!error) {
      error = validatePassword(password);
    }

    if (!error && password !== confirmPassword) {
      error = "Passwords do not match";
    }

    if (!error && phone) {
      error = validatePhone(phone);
    }

    if (!error && age) {
      error = validateAge(age);
    }

    if (!error && !region) {
      error = "Please select your region";
    }

    if (error) {
      setErrorMessage(error);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          region,
          phone: phone || null,
          age: age || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(data.message || "Registration successful! Redirecting...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setErrorMessage(data.message || "Registration failed.");
      }
    } catch (err) {
      setErrorMessage("Server error! Try again.");
    }
  };

  return (
    <div className="register-page">
      <div className="login-container register-container">
        <h1>Create Account</h1>

      {errorMessage && <div className="auth-message error">{errorMessage}</div>}

      {successMessage && <div className="auth-message success">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="login-form register-form">

        {/* Name */}
        <div className="register-field">
          <label>Name *</label>
          <input
            type="text"
            placeholder="Enter full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div className="register-field">
          <label>Email *</label>
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Password */}
        <div className="register-field">
          <label>Password *</label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        </div>

        {/* Confirm Password */}
        <div className="register-field">
          <label>Confirm Password *</label>
          <div className="password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              title={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
        </div>

        {/* Region */}
        <div className="register-field">
          <label>Region *</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            required
          >
            <option value="">Select your region</option>
            <option value="Anand">Anand</option>
            <option value="Nadiad">Nadiad</option>
            <option value="Petlad">Petlad</option>
          </select>
        </div>

        {/* Phone */}
        <div className="register-field">
          <label>Phone Number (optional)</label>
          <input
            type="tel"
            placeholder="10-digit phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* Age */}
        <div className="register-field">
          <label>Age (optional)</label>
          <input
            type="number"
            placeholder="Age (1-120)"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min="1"
            max="120"
          />
        </div>

        <button type="submit" className="register-submit">Register</button>

          <p className="login-extra register-extra">
            <Link to="/login">Already have an account? Login</Link>
          </p>

        </form>
      </div>
    </div>
  );
}

export default Register;
