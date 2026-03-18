import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DoctorLogin from "./DoctorLogin";
import DoctorDashboard from "./DoctorDashboard";
import "./doctor.css";

const DoctorProtectedRoute = ({ children }) => {
  const doctor = localStorage.getItem("doctor");
  if (!doctor) return <Navigate to="/" replace />;
  return children;
};

const root = ReactDOM.createRoot(document.getElementById("root"));
const basename = process.env.REACT_APP_DOCTOR_BASENAME || "/";

root.render(
  <BrowserRouter basename={basename}>
    <Routes>
      <Route path="/" element={<DoctorLogin />} />
      <Route
        path="/dashboard"
        element={
          <DoctorProtectedRoute>
            <DoctorDashboard />
          </DoctorProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
