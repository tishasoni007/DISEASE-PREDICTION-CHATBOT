const express = require("express");
const cors = require("cors");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// existing routes
app.use("/login", require("./routes/login"));
app.use("/register", require("./routes/register"));

// admin routes
app.use("/admin", require("./routes/admin"));

// NEW: chat route (Node → Flask)
app.use("/api/chat", require("./routes/chat"));

// server
const PORT = 5000;
app.listen(PORT, () => {
  console.log("Backend running on port 5000");
});
