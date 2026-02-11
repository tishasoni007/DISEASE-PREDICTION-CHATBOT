import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import UserDetail from "./UserDetail";
import "./admin.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

const basename = process.env.REACT_APP_ADMIN_BASENAME || "/";

root.render(
  <BrowserRouter basename={basename}>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<AdminLogin />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users/:email" element={<UserDetail />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
