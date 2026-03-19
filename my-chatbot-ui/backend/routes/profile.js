const express = require("express");
const db = require("../db");

const router = express.Router();

const VALID_REGIONS = ["Vadodara", "Anand", "Nadiad", "Petlad", "Ahmedabad", "Surat", "Rajkot"];

const validateName = (name) => {
  if (!name || typeof name !== "string") return false;
  if (name.length < 2 || name.length > 50) return false;
  return /^[a-zA-Z\s]+$/.test(name);
};

const hasOnlyDigits = (value) => /^\d+$/.test(value);

const validatePhone = (phone) => {
  if (!phone) return true;
  return /^\d{10}$/.test(phone);
};

const validateAge = (age) => {
  if (!age && age !== 0) return true;
  const ageNum = parseInt(age, 10);
  return ageNum >= 1 && ageNum <= 120;
};

router.put("/update", (req, res) => {
  const { email, name, region, phone, age } = req.body || {};

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim().replace(/\s+/g, " ");
  const normalizedRegion = String(region || "").trim();
  const normalizedPhone = phone ? String(phone).trim() : null;
  const normalizedAge = age ? Number(age) : null;

  if (!normalizedEmail || !normalizedName || !normalizedRegion) {
    return res.json({
      success: false,
      message: "Email, name and region are required",
    });
  }

  if (!validateName(normalizedName)) {
    return res.json({
      success: false,
      message: "Name must contain only alphabets and spaces, and be 2-50 characters long",
    });
  }

  if (!VALID_REGIONS.includes(normalizedRegion)) {
    return res.json({
      success: false,
      message: "Invalid region selected",
    });
  }

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

  if (!validateAge(age)) {
    return res.json({
      success: false,
      message: "Age must be between 1 and 120",
    });
  }

  const duplicateQuery = normalizedPhone
    ? "SELECT id, name, email, phone FROM users WHERE email <> ? AND (phone = ? OR (name = ? AND phone = ?))"
    : "SELECT id FROM users WHERE 1 = 0";

  const duplicateParams = normalizedPhone
    ? [normalizedEmail, normalizedPhone, normalizedName, normalizedPhone]
    : [];

  db.query(duplicateQuery, duplicateParams, (duplicateErr, duplicates) => {
    if (duplicateErr) {
      console.error("Profile duplicate check error:", duplicateErr);
      return res.json({ success: false, message: "Database error" });
    }

    if (duplicates && duplicates.length > 0) {
      const phoneExists = duplicates.some((row) => String(row.phone || "") === normalizedPhone);
      const namePhoneExists = duplicates.some(
        (row) =>
          String(row.name || "").trim().toLowerCase() === normalizedName.toLowerCase() &&
          String(row.phone || "") === normalizedPhone
      );

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

    const updateQuery = `
      UPDATE users
      SET name = ?, region = ?, phone = ?, age = ?
      WHERE email = ?
    `;

    db.query(
      updateQuery,
      [normalizedName, normalizedRegion, normalizedPhone, normalizedAge, normalizedEmail],
      (updateErr, updateResult) => {
        if (updateErr) {
          console.error("Profile update error:", updateErr);
          if (updateErr.code === "ER_DUP_ENTRY") {
            if (updateErr.message.includes("phone") || updateErr.message.includes("uq_users_phone")) {
              return res.json({ success: false, message: "Phone number already exists" });
            }
            if (updateErr.message.includes("uq_users_name_phone")) {
              return res.json({
                success: false,
                message: "User already exists with same name and phone number",
              });
            }
          }
          return res.json({ success: false, message: "Unable to update profile" });
        }

        if (!updateResult || updateResult.affectedRows === 0) {
          return res.json({ success: false, message: "User not found" });
        }

        db.query(
          "SELECT name, email, region, phone, age FROM users WHERE email = ?",
          [normalizedEmail],
          (selectErr, rows) => {
            if (selectErr) {
              console.error("Profile fetch error:", selectErr);
              return res.json({ success: false, message: "Database error" });
            }

            return res.json({
              success: true,
              message: "Profile updated successfully",
              user: rows && rows[0] ? rows[0] : null,
            });
          }
        );
      }
    );
  });
});

module.exports = router;