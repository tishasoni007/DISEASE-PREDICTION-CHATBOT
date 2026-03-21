const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

/* =====================================
   ADMIN LOGIN
===================================== */
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.json({ success: false, message: "Email and password required" });
  }

  db.query(
    "SELECT * FROM admins WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error("Admin login error:", err);
        return res.json({ success: false, message: "Database error" });
      }

      if (results.length === 0) {
        return res.json({ success: false, message: "Admin not found" });
      }

      const match = await bcrypt.compare(password, results[0].password);

      if (!match) {
        return res.json({ success: false, message: "Wrong password" });
      }

      res.json({
        success: true,
        admin: {
          name: results[0].name,
          email: results[0].email,
        },
      });
    }
  );
});

/* =====================================
   GET ALL USERS + SESSION + CHAT COUNT
===================================== */
router.get("/users", (req, res) => {
  const query = `
    SELECT 
      u.name,
      u.email,
      u.region,
      u.phone,
      u.age,
      u.is_active,
      COUNT(DISTINCT s.id) AS total_sessions,
      COUNT(m.id) AS total_messages,
      MAX(m.created_at) AS last_activity
    FROM users u
    LEFT JOIN chat_sessions s ON s.user_email = u.email
    LEFT JOIN chat_messages m ON m.session_id = s.id
    GROUP BY u.email
    ORDER BY last_activity DESC
  `;

  db.query(query, (err, users) => {
    if (err) {
      console.error("Admin user list error:", err);
      return res.json({ success: false, message: "DB error" });
    }

    res.json({ success: true, users });
  });
});

/* =====================================
   GET ALL DOCTORS + APPOINTMENT COUNT
===================================== */
router.get("/doctors", (req, res) => {
  const query = `
    SELECT
      d.id,
      d.name,
      d.hospital,
      d.specialization,
      d.contact,
      d.region,
      d.created_at,
      da.email,
      COUNT(a.id) AS total_appointments,
      MAX(a.created_at) AS last_activity
    FROM doctors d
    LEFT JOIN doctor_accounts da ON da.doctor_id = d.id
    LEFT JOIN appointments a ON a.doctor_id = d.id
    GROUP BY d.id
    ORDER BY last_activity DESC, d.created_at DESC
  `;

  db.query(query, (err, doctors) => {
    if (err) {
      console.error("Admin doctor list error:", err);
      return res.json({ success: false, message: "DB error" });
    }

    res.json({ success: true, doctors });
  });
});

/* =====================================
   GET SINGLE USER DETAILS
===================================== */
router.get("/users/:email", (req, res) => {
  db.query(
    "SELECT name, email, region, phone, age, is_active, created_at FROM users WHERE email = ?",
    [req.params.email],
    (err, results) => {
      if (err) {
        return res.json({ success: false, message: "DB error" });
      }

      if (results.length === 0) {
        return res.json({ success: false, message: "User not found" });
      }

      res.json({ success: true, user: results[0] });
    }
  );
});

/* =====================================
   GET SINGLE DOCTOR DETAILS
===================================== */
router.get("/doctors/:id", (req, res) => {
  db.query(
    `
    SELECT
      d.id,
      d.name,
      d.hospital,
      d.specialization,
      d.contact,
      d.region,
      d.created_at,
      da.email
    FROM doctors d
    LEFT JOIN doctor_accounts da ON da.doctor_id = d.id
    WHERE d.id = ?
    LIMIT 1
    `,
    [req.params.id],
    (err, results) => {
      if (err) {
        return res.json({ success: false, message: "DB error" });
      }

      if (results.length === 0) {
        return res.json({ success: false, message: "Doctor not found" });
      }

      res.json({ success: true, doctor: results[0] });
    }
  );
});

/* =====================================
   GET DOCTOR APPOINTMENTS
===================================== */
router.get("/doctors/:id/appointments", (req, res) => {
  db.query(
    `
    SELECT
      a.id,
      a.user_email,
      a.appointment_date,
      a.appointment_time,
      a.status,
      a.symptoms,
      a.doctor_note,
      a.created_at,
      u.name AS user_name
    FROM appointments a
    LEFT JOIN users u ON u.email = a.user_email
    WHERE a.doctor_id = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `,
    [req.params.id],
    (err, appointments) => {
      if (err) {
        return res.json({ success: false, message: "DB error" });
      }

      res.json({ success: true, appointments });
    }
  );
});

/* =====================================
   GET USER SESSIONS
===================================== */
router.get("/sessions/:email", (req, res) => {
  db.query(
    `
    SELECT 
      id,
      title,
      created_at,
      (SELECT COUNT(*) FROM chat_messages WHERE session_id = chat_sessions.id) AS message_count
    FROM chat_sessions
    WHERE user_email = ?
    ORDER BY created_at DESC
    `,
    [req.params.email],
    (err, sessions) => {
      if (err) {
        return res.json({ success: false, message: "DB error" });
      }

      res.json({ success: true, sessions });
    }
  );
});

/* =====================================
   GET SESSION MESSAGES
===================================== */
router.get("/sessions/:sessionId/messages", (req, res) => {
  db.query(
    "SELECT sender, message, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
    [req.params.sessionId],
    (err, messages) => {
      if (err) {
        return res.json({ success: false, message: "DB error" });
      }

      res.json({ success: true, messages });
    }
  );
});

/* =====================================
   ACTIVATE / DEACTIVATE USER
===================================== */
router.patch("/users/:email/deactivate", (req, res) => {
  db.query(
    "UPDATE users SET is_active = 0 WHERE email = ?",
    [req.params.email],
    (err, result) => {
      if (err) return res.json({ success: false, message: "DB error" });
      if (result.affectedRows === 0)
        return res.json({ success: false, message: "User not found" });

      res.json({ success: true });
    }
  );
});

router.patch("/users/:email/activate", (req, res) => {
  db.query(
    "UPDATE users SET is_active = 1 WHERE email = ?",
    [req.params.email],
    (err, result) => {
      if (err) return res.json({ success: false, message: "DB error" });
      if (result.affectedRows === 0)
        return res.json({ success: false, message: "User not found" });

      res.json({ success: true });
    }
  );
});

/* =====================================
   VIEW ALL TABLE RECORDS
===================================== */
router.get("/doctors-list", (req, res) => {
  db.query("SELECT * FROM doctors", (err, doctors) => {
    if (err) {
      return res.json({ success: false, message: "Error fetching doctors", error: err.message });
    }
    
    db.query("SELECT * FROM doctor_accounts", (err, accounts) => {
      if (err) {
        return res.json({ success: false, message: "Error fetching accounts", error: err.message });
      }
      
      db.query("SELECT * FROM appointments", (err, appointments) => {
        if (err) {
          return res.json({ success: false, message: "Error fetching appointments", error: err.message });
        }
        
        res.json({ success: true, doctors, accounts, appointments });
      });
    });
  });
});

module.exports = router;