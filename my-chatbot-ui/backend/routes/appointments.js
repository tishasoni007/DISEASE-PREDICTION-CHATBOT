const express = require("express");
const db = require("../db");

const router = express.Router();

router.post("/request", (req, res) => {
  const { userEmail, doctorId, appointmentDate, appointmentTime, symptoms } = req.body || {};

  if (!userEmail || !doctorId || !appointmentDate || !appointmentTime) {
    return res.json({
      success: false,
      message: "userEmail, doctorId, appointmentDate and appointmentTime are required",
    });
  }

  const insertWithConflictGuardQuery = `
    INSERT INTO appointments (user_email, doctor_id, appointment_date, appointment_time, symptoms)
    SELECT ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1
      FROM appointments
      WHERE doctor_id = ?
        AND DATE(appointment_date) = DATE(?)
        AND TIME(appointment_time) = TIME(?)
        AND status IN ('pending', 'approved')
    )
  `;

  const params = [
    userEmail,
    doctorId,
    appointmentDate,
    appointmentTime,
    symptoms || null,
    doctorId,
    appointmentDate,
    appointmentTime,
  ];

  db.query(insertWithConflictGuardQuery, params, (err, result) => {
    if (err) {
      console.error("Appointment request error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    if (!result || result.affectedRows === 0) {
      return res.json({
        success: false,
        message:
          "Select any other time slot, as the doctor has an appointment in this particular time",
      });
    }

    return res.json({
      success: true,
      appointmentId: result.insertId,
      message: "Appointment requested successfully",
    });
  });
});

router.get("/user/:email", (req, res) => {
  const query = `
    SELECT
      a.id,
      a.user_email,
      a.doctor_id,
      a.appointment_date,
      a.appointment_time,
      a.symptoms,
      a.status,
      a.doctor_note,
      a.created_at,
      d.name AS doctor_name,
      d.hospital,
      d.specialization,
      d.contact,
      d.region
    FROM appointments a
    INNER JOIN doctors d ON d.id = a.doctor_id
    WHERE a.user_email = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `;

  db.query(query, [req.params.email], (err, appointments) => {
    if (err) {
      console.error("User appointments fetch error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    return res.json({ success: true, appointments });
  });
});

module.exports = router;
