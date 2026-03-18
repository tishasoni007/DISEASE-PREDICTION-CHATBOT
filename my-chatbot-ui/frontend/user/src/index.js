import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Login from "./Login";
import Register from "./Register";
import BookAppointment from "./BookAppointment";
import "./index.css";

/*
  🔒 Protected Route Component
  Prevents access to /chat and /doctors if user not logged in
*/
const ProtectedRoute = ({ children }) => {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const root = ReactDOM.createRoot(document.getElementById("root"));

const basename = process.env.REACT_APP_USER_BASENAME || "/";

root.render(
  <BrowserRouter basename={basename}>
    <Routes>
      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Chatbot Main App (Protected) */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        }
      />

      <Route
        path="/book-appointment"
        element={
          <ProtectedRoute>
            <BookAppointment />
          </ProtectedRoute>
        }
      />

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  </BrowserRouter>
);
