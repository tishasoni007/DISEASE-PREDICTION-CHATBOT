const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.json({ success: false, message: "Email and password required" });
  }

  const query = `
    SELECT
      da.id AS account_id,
      da.password,
      d.id AS doctor_id,
      d.name,
      d.hospital,
      d.specialization,
      d.region,
      da.email
    FROM doctor_accounts da
    INNER JOIN doctors d ON d.id = da.doctor_id
    WHERE da.email = ?
    LIMIT 1
  `;

  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error("Doctor login error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    if (results.length === 0) {
      return res.json({ success: false, message: "Doctor account not found" });
    }

    const storedPassword = results[0].password || "";
    let match = false;

    if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
      match = await bcrypt.compare(password, storedPassword);
    } else {
      match = password === storedPassword;
    }

    if (!match) {
      return res.json({ success: false, message: "Wrong password" });
    }

    return res.json({
      success: true,
      doctor: {
        id: results[0].doctor_id,
        name: results[0].name,
        email: results[0].email,
        hospital: results[0].hospital,
        specialization: results[0].specialization,
        region: results[0].region,
      },
    });
  });
});

router.post("/register", async (req, res) => {
  const { doctorId, email, password } = req.body || {};

  if (!doctorId || !email || !password) {
    return res.json({
      success: false,
      message: "doctorId, email and password are required",
    });
  }

  db.query(
    "INSERT INTO doctor_accounts (doctor_id, email, password) VALUES (?, ?, ?)",
    [doctorId, email, password],
    (err) => {
      if (err) {
        console.error("Doctor register error:", err);
        return res.json({ success: false, message: "Unable to create doctor account" });
      }

      return res.json({ success: true, message: "Doctor account created" });
    }
  );
});

router.get("/appointments/:doctorId", (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;

  let query = `
    SELECT
      a.id,
      a.user_email,
      a.doctor_id,
      DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
      a.appointment_time,
      a.symptoms,
      a.status,
      a.doctor_note,
      a.created_at,
      u.name AS user_name,
      u.phone AS user_phone,
      u.region AS user_region
    FROM appointments a
    LEFT JOIN users u ON u.email = a.user_email
    WHERE a.doctor_id = ?
  `;

  const params = [doctorId];

  if (date) {
    query += " AND DATE(a.appointment_date) = ?";
    params.push(date);
  }

  query += " ORDER BY a.appointment_date ASC, a.appointment_time ASC";

  db.query(query, params, (err, appointments) => {
    if (err) {
      console.error("Doctor appointments fetch error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    return res.json({ success: true, appointments });
  });
});

router.get("/calendar/:doctorId", (req, res) => {
  const { doctorId } = req.params;

  const query = `
    SELECT
      DATE_FORMAT(appointment_date, '%Y-%m-%d') AS appointment_date,
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
    FROM appointments
    WHERE doctor_id = ?
    GROUP BY DATE_FORMAT(appointment_date, '%Y-%m-%d')
    ORDER BY appointment_date ASC
  `;

  db.query(query, [doctorId], (err, calendarData) => {
    if (err) {
      console.error("Doctor calendar fetch error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    return res.json({ success: true, calendar: calendarData });
  });
});

router.patch("/appointments/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, doctorId, doctorNote } = req.body || {};

  if (!doctorId || !status || !["approved", "rejected", "pending"].includes(status)) {
    return res.json({ success: false, message: "doctorId and valid status are required" });
  }

  db.query(
    `
    UPDATE appointments
    SET status = ?, doctor_note = ?
    WHERE id = ? AND doctor_id = ?
    `,
    [status, doctorNote || null, id, doctorId],
    (err, result) => {
      if (err) {
        console.error("Update appointment status error:", err);
        return res.json({ success: false, message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.json({ success: false, message: "Appointment not found" });
      }

      return res.json({ success: true, message: "Appointment status updated" });
    }
  );
});

module.exports = router;
