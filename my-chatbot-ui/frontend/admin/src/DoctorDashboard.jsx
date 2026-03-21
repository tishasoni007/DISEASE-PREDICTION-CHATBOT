import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function DoctorDashboard() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const admin = localStorage.getItem("admin");
    if (!admin) {
      navigate("/");
      return;
    }

    const loadDoctors = async () => {
      try {
        const response = await fetch("http://localhost:5000/admin/doctors");
        const data = await response.json();
        if (data.success) {
          setDoctors(data.doctors || []);
          setStatus("ready");
        } else {
          setErrorMessage(data.message || "Unable to load doctors right now.");
          setStatus("error");
        }
      } catch (err) {
        setErrorMessage("Unable to load doctors right now.");
        setStatus("error");
      }
    };

    loadDoctors();
  }, [navigate]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return doctors;
    return doctors.filter((doctor) =>
      `${doctor.name} ${doctor.email || ""} ${doctor.specialization || ""} ${doctor.hospital || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [search, doctors]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Doctor Records</h2>
          <p>View doctor profiles, account data, and appointment activity.</p>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search name, email, hospital"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {status === "loading" && <div className="card">Loading doctors...</div>}
      {status === "error" && <div className="card">{errorMessage}</div>}

      {status === "ready" && (
        <div className="grid">
          {filteredDoctors.length === 0 && (
            <div className="card">No doctors found yet.</div>
          )}

          {filteredDoctors.map((doctor) => (
            <div className="card" key={doctor.id}>
              <div className="card-row">
                <div>
                  <div className="user-name">{doctor.name}</div>
                  <div className="muted">{doctor.email || "No account email"}</div>
                </div>
                <span className="pill active">Doctor</span>
              </div>

              <div className="card-row">
                <div className="stat">
                  <span className="stat-label">Specialization</span>
                  <span className="stat-value">{doctor.specialization || "-"}</span>
                </div>

                <div className="stat">
                  <span className="stat-label">Appointments</span>
                  <span className="stat-value">{doctor.total_appointments || 0}</span>
                </div>
              </div>

              <div className="stat">
                <span className="stat-label">Last activity</span>
                <span className="stat-value">
                  {doctor.last_activity
                    ? new Date(doctor.last_activity).toLocaleString()
                    : "-"}
                </span>
              </div>

              <Link className="primary-btn" to={`/doctors/${doctor.id}`}>
                Review doctor
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;
