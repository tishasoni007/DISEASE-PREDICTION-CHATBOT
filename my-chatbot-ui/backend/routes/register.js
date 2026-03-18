const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

// Validation helper functions
const validateName = (name) => {
  if (!name || typeof name !== "string") return false;
  if (name.length < 2 || name.length > 50) return false;
  return /^[a-zA-Z\s]+$/.test(name);
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (!password || password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar;
};

const validatePhone = (phone) => {
  if (!phone) return true;
  return /^\d{10}$/.test(phone);
};

const hasOnlyDigits = (value) => /^\d+$/.test(value);

const validateAge = (age) => {
  if (!age) return true;
  const ageNum = parseInt(age, 10);
  return ageNum >= 1 && ageNum <= 120;
};

const VALID_REGIONS = ["Anand", "Nadiad", "Petlad"];

router.post("/", async (req, res) => {
  const { name, email, password, region, phone, age } = req.body;
  const normalizedName = String(name || "").trim().replace(/\s+/g, " ");
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = phone ? String(phone).trim() : null;

  // Validate required fields
  if (!normalizedName || !normalizedEmail || !password || !region) {
    return res.json({ success: false, message: "All required fields needed" });
  }

  // Validate name
  if (!validateName(normalizedName)) {
    return res.json({
      success: false,
      message: "Name must contain only alphabets and spaces, and be 2-50 characters long",
    });
  }

  // Validate email
  if (!validateEmail(normalizedEmail)) {
    return res.json({ success: false, message: "Invalid email format" });
  }

  // Validate password
  if (!validatePassword(password)) {
    return res.json({
      success: false,
      message: "Password must have minimum 8 characters, 1 uppercase, 1 lowercase, 1 digit, and 1 special character",
    });
  }

  // Validate phone
  if (normalizedPhone && !hasOnlyDigits(normalizedPhone)) {
    return res.json({
      success: false,
      message: "Only digits are allowed in phone number",
    });
  }

  if (!validatePhone(normalizedPhone)) {
    return res.json({
      success: false,
      message: "Phone number must be exactly 10 digits",
    });
  }

  // Validate age
  if (!validateAge(age)) {
    return res.json({
      success: false,
      message: "Age must be between 1 and 120",
    });
  }

  // Validate region
  if (!VALID_REGIONS.includes(region)) {
    return res.json({
      success: false,
      message: "Invalid region selected",
    });
  }

  const duplicateCheckQuery = normalizedPhone
    ? "SELECT id, name, email, phone FROM users WHERE email = ? OR phone = ? OR (name = ? AND phone = ?)"
    : "SELECT id, name, email, phone FROM users WHERE email = ?";

  const duplicateCheckParams = normalizedPhone
    ? [normalizedEmail, normalizedPhone, normalizedName, normalizedPhone]
    : [normalizedEmail];

  db.query(duplicateCheckQuery, duplicateCheckParams, async (err, result) => {
    if (err) {
      console.error("Duplicate check error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    if (result && result.length > 0) {
      const emailExists = result.some((row) => String(row.email).toLowerCase() === normalizedEmail);
      const namePhoneExists = normalizedPhone
        ? result.some(
            (row) =>
              String(row.name).trim().toLowerCase() === normalizedName.toLowerCase() &&
              String(row.phone || "") === normalizedPhone
          )
        : false;
      const phoneExists = normalizedPhone
        ? result.some((row) => String(row.phone || "") === normalizedPhone)
        : false;

      if (emailExists) {
        return res.json({ success: false, message: "Email already exists" });
      }

      if (namePhoneExists) {
        return res.json({
          success: false,
          message: "User already exists with same name and phone number",
        });
      }

      if (phoneExists) {
        return res.json({ success: false, message: "Phone number already exists" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (name, email, password, region, phone, age) VALUES (?, ?, ?, ?, ?, ?)",
      [normalizedName, normalizedEmail, hashedPassword, region, normalizedPhone, age || null],
      (err) => {
        if (err) {
          console.error("Insert error:", err);
          if (err.code === "ER_DUP_ENTRY") {
            if (err.message.includes("email")) {
              return res.json({ success: false, message: "Email already exists" });
            }
            if (err.message.includes("phone") || err.message.includes("uq_users_phone")) {
              return res.json({ success: false, message: "Phone number already exists" });
            }
            if (err.message.includes("uq_users_name_phone")) {
              return res.json({
                success: false,
                message: "User already exists with same name and phone number",
              });
            }
          }
          return res.json({ success: false, message: "Registration failed" });
        }
        res.json({ success: true, message: "User registered successfully" });
      }
    );
  });
});

module.exports = router;
