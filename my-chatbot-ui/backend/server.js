const express = require("express");
const cors = require("cors");
const initializeDatabase = require("./dbInit");

const app = express();

app.use(cors());
app.use(express.json());

initializeDatabase();

app.use("/login", require("./routes/login"));
app.use("/register", require("./routes/register"));

app.use("/api/chat", require("./routes/chat"));
app.use("/api/chat/sessions", require("./routes/sessions"));
app.use("/api/doctors", require("./routes/doctors"));
app.use("/api/appointments", require("./routes/appointments"));

app.use("/admin", require("./routes/admin"));
app.use("/doctor", require("./routes/doctor"));

const PORT = 5000;

app.listen(PORT, () => {
  console.log("Backend running on port 5000");
});
