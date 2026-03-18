const express = require("express");
const db = require("../db");

const router = express.Router();

function isGreetingMessage(message) {
  const text = String(message || "").trim().toLowerCase();
  if (!text) return false;

  const greetingPatterns = [
    /^(hi|hello|hey)\b/,
    /^good\s*(morning|afternoon|evening)\b/,
    /^namaste\b/,
  ];

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return wordCount <= 6 && greetingPatterns.some((pattern) => pattern.test(text));
}

/* =================================
   CHAT ROUTE (Session Based)
================================= */
router.post("/", async (req, res) => {
  try {
    const { message, userEmail, sessionId } = req.body;

    if (!message || !userEmail) {
      return res.json({ success: false, message: "Message and user required" });
    }

    let activeSessionId = sessionId;

    /* ===============================
       1️⃣ CREATE SESSION IF NOT PROVIDED
    =============================== */
    if (!activeSessionId) {
      const newSession = await new Promise((resolve, reject) => {
        db.query(
          "INSERT INTO chat_sessions (user_email, title) VALUES (?, ?)",
          [userEmail, "New Chat"],
          (err, result) => {
            if (err) reject(err);
            else resolve(result.insertId);
          }
        );
      });

      activeSessionId = newSession;
    }

    /* ===============================
       2️⃣ SAVE USER MESSAGE
    =============================== */
    await new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO chat_messages (session_id, user_email, sender, message) VALUES (?, ?, ?, ?)",
        [activeSessionId, userEmail, "user", message],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    /* ===============================
       3️⃣ AUTO-RENAME SESSION (First message)
    =============================== */
    db.query(
      "SELECT COUNT(*) AS count FROM chat_messages WHERE session_id = ?",
      [activeSessionId],
      (err, result) => {
        if (!err && result[0].count === 1) {
          const shortTitle = message.substring(0, 30);
          db.query(
            "UPDATE chat_sessions SET title = ? WHERE id = ?",
            [shortTitle, activeSessionId]
          );
        }
      }
    );

    if (isGreetingMessage(message)) {
      const greetingReply =
        "Hello 👋 I’m here to help. Please share your symptoms so I can assist you better.";

      await new Promise((resolve, reject) => {
        db.query(
          "INSERT INTO chat_messages (session_id, user_email, sender, message) VALUES (?, ?, ?, ?)",
          [activeSessionId, userEmail, "bot", greetingReply],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return res.json({
        success: true,
        reply: greetingReply,
        sessionId: activeSessionId,
        confidence: null,
      });
    }

    /* ===============================
       4️⃣ CALL FLASK ML BACKEND
    =============================== */
    const mlResponse = await fetch("http://127.0.0.1:5001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await mlResponse.json();

    const botReply =
      data.reply ||
      data.message ||
      data.advice ||
      "Sorry, I could not process that.";

    /* ===============================
       5️⃣ SAVE BOT MESSAGE
    =============================== */
    await new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO chat_messages (session_id, user_email, sender, message) VALUES (?, ?, ?, ?)",
        [activeSessionId, userEmail, "bot", botReply],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    /* ===============================
       6️⃣ RETURN RESPONSE
    =============================== */
    res.json({
      success: true,
      reply: botReply,
      sessionId: activeSessionId,
      confidence: data.confidence || null
    });

  } catch (error) {
    console.error("Chat route error:", error);
    res.status(500).json({
      success: false,
      message: "ML service not available"
    });
  }
});

module.exports = router;
