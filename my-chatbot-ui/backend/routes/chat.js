const express = require("express");
const db = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message, userEmail } = req.body || {};

    const response = await fetch("http://127.0.0.1:5001/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (userEmail && message) {
      db.query(
        "INSERT INTO chat_messages (user_email, sender, message) VALUES (?, ?, ?)",
        [userEmail, "user", message]
      );
    }

    const botText = data.reply || data.message || data.advice || null;
    if (userEmail && botText) {
      db.query(
        "INSERT INTO chat_messages (user_email, sender, message) VALUES (?, ?, ?)",
        [userEmail, "bot", botText]
      );
    }

    res.json(data);

  } catch (error) {
    console.error("Error connecting to ML service:", error);
    res.status(500).json({ error: "ML service not available" });
  }
});

module.exports = router;
