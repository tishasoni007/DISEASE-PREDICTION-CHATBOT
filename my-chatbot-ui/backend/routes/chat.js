const express = require("express");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const response = await fetch("http://127.0.0.1:5001/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error("Error connecting to ML service:", error);
    res.status(500).json({ error: "ML service not available" });
  }
});

module.exports = router;
