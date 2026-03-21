const express = require("express");
const db = require("../db");

const router = express.Router();
const CLINIC_OPEN_MINUTES = 9 * 60;
const CLINIC_CLOSE_MINUTES = 18 * 60;

function parseLocalDateOnly(dateString) {
  const parsedDate = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function parseTimeToMinutes(timeString) {
  const [rawHours, rawMinutes] = String(timeString || "").split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}


// ✅ REQUEST APPOINTMENT
router.post("/request", (req, res) => {
  const { userEmail, doctorId, appointmentDate, appointmentTime, symptoms } = req.body || {};

  if (!userEmail || !doctorId || !appointmentDate || !appointmentTime) {
    return res.json({
      success: false,
      message: "userEmail, doctorId, appointmentDate and appointmentTime are required",
    });
  }

  const selectedDate = parseLocalDateOnly(appointmentDate);
  if (!selectedDate) {
    return res.json({ success: false, message: "Invalid appointment date" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return res.json({
      success: false,
      message: "You cannot book an appointment for a past date.",
    });
  }

  if (selectedDate.getDay() === 0) {
    return res.json({
      success: false,
      message: "Bookings are not available on Sundays.",
    });
  }

  const selectedTimeInMinutes = parseTimeToMinutes(appointmentTime);
  if (selectedTimeInMinutes === null) {
    return res.json({ success: false, message: "Invalid appointment time" });
  }

  if (
    selectedTimeInMinutes < CLINIC_OPEN_MINUTES ||
    selectedTimeInMinutes > CLINIC_CLOSE_MINUTES
  ) {
    return res.json({
      success: false,
      message: "Appointments can only be booked between 09:00 and 18:00.",
    });
  }

  if (selectedDate.getTime() === today.getTime()) {
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    if (selectedTimeInMinutes < currentTimeInMinutes) {
      return res.json({
        success: false,
        message: "You cannot book an appointment for a past time today.",
      });
    }
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


// ✅ USER APPOINTMENTS
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

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const userEmail = (req.query && req.query.userEmail) || (req.body && req.body.userEmail);

  if (!id || !userEmail) {
    return res.json({ success: false, message: "appointment id and userEmail are required" });
  }

  const cancelQuery = `
    DELETE FROM appointments
    WHERE id = ?
      AND user_email = ?
      AND status IN ('pending', 'approved')
  `;

  db.query(cancelQuery, [id, userEmail], (err, result) => {
    if (err) {
      console.error("Cancel appointment error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    if (!result || result.affectedRows === 0) {
      return res.json({
        success: false,
        message: "Appointment not found or cannot be cancelled",
      });
    }

    return res.json({ success: true, message: "Appointment cancelled successfully" });
  });
});


// ✅ 🔥 DOCTOR CALENDAR (FIXED QUERY)
router.get("/doctor/:id/calendar", (req, res) => {
  const doctorId = req.params.id;

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

  db.query(query, [doctorId], (err, result) => {
    if (err) {
      console.error("Doctor calendar fetch error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    return res.json({ success: true, calendar: result });
  });
});


module.exports = router;