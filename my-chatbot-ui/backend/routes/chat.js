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

function isTyphoidInfoMessage(message) {
  const text = String(message || "").trim().toLowerCase();
  if (!text) return false;

  const directPatterns = [
    /\bwhat\s+is\s+typhoid\b/,
    /\babout\s+typhoid\b/,
    /\btell\s+me\s+about\s+typhoid\b/,
    /\bexplain\s+typhoid\b/,
  ];

  return directPatterns.some((pattern) => pattern.test(text));
}

function getTyphoidInfoReply() {
  return "Typhoid is a bacterial infection caused by Salmonella Typhi, usually spread through contaminated food or water. Common symptoms include prolonged fever, headache, weakness, stomach pain, diarrhea or constipation, and loss of appetite. It is treated with prescribed antibiotics, rest, and hydration. To prevent typhoid, drink safe water, maintain hand hygiene, eat properly cooked food, and consider vaccination in higher-risk areas.";
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
       3️⃣ AUTO-RENAME SESSION (First message in this session)
    =============================== */
    db.query(
      "SELECT COUNT(*) AS count FROM chat_messages WHERE session_id = ?",
      [activeSessionId],
      (err, result) => {
        if (!err && result[0].count === 1) {
          const shortTitle = message.substring(0, 30);
          db.query(
            "UPDATE chat_sessions SET title = ? WHERE id = ? AND title = 'New Chat'",
            [shortTitle, activeSessionId]
          );
        }
      }
    );

    /* ===============================
       GREETING RESPONSE
    =============================== */
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

    if (isTyphoidInfoMessage(message)) {
      const typhoidInfoReply = getTyphoidInfoReply();

      await new Promise((resolve, reject) => {
        db.query(
          "INSERT INTO chat_messages (session_id, user_email, sender, message) VALUES (?, ?, ?, ?)",
          [activeSessionId, userEmail, "bot", typhoidInfoReply],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return res.json({
        success: true,
        reply: typhoidInfoReply,
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
       6️⃣ UPDATE SESSION TITLE FOR FINAL PREDICTION
       (So chat history headings show the result)
    =============================== */
    const confidence = typeof data.confidence === "number" ? data.confidence : null;
    let titleToUpdate = null;

    // Try to extract prediction from the bot's message text
    const replyLower = botReply.toLowerCase();
    if (replyLower.includes("high possibility")) {
      titleToUpdate = "High possibility of typhoid";
    } else if (replyLower.includes("moderate possibility") || replyLower.includes("medium possibility")) {
      titleToUpdate = "Medium possibility of typhoid";
    } else if (replyLower.includes("moderate chance")) {
      titleToUpdate = "Moderate possibility of typhoid";
    } else if (replyLower.includes("low possibility") || replyLower.includes("no possibility")) {
      titleToUpdate = "Low possibility of typhoid";
    } else if (confidence !== null) {
      // Fall back to confidence-based labeling
      if (confidence >= 75) titleToUpdate = `High possibility of typhoid (${confidence}%)`;
      else if (confidence >= 45) titleToUpdate = `Moderate possibility of typhoid (${confidence}%)`;
      else titleToUpdate = `Low possibility of typhoid (${confidence}%)`;
    }

    if (titleToUpdate) {
      await new Promise((resolve) => {
        db.query(
          "UPDATE chat_sessions SET title = ? WHERE id = ?",
          [titleToUpdate, activeSessionId],
          (err) => {
            if (err) {
              console.warn("Failed to update session title:", err);
            }
            resolve();
          }
        );
      });
    }

    /* ===============================
       7️⃣ RETURN RESPONSE
    =============================== */
    res.json({
      success: true,
      reply: botReply,
      sessionId: activeSessionId,
      confidence: confidence
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