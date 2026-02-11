import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import Register from "./Register";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

const basename = process.env.REACT_APP_USER_BASENAME || "/";

root.render(
  <BrowserRouter basename={basename}>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Chatbot main app */}
      <Route path="/chat" element={<App />} />
    </Routes>
  </BrowserRouter>
);
