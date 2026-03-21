import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function DoctorDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const admin = localStorage.getItem("admin");
    if (!admin) {
      navigate("/");
      return;
    }

    const loadDetails = async () => {
      try {
        const doctorRes = await fetch(`http://localhost:5000/admin/doctors/${id}`);
        const appointmentRes = await fetch(
          `http://localhost:5000/admin/doctors/${id}/appointments`
        );

        const doctorData = await doctorRes.json();
        const appointmentData = await appointmentRes.json();

        if (doctorData.success) setDoctor(doctorData.doctor);
        if (appointmentData.success) setAppointments(appointmentData.appointments || []);

        setStatus("ready");
      } catch (err) {
        setErrorMessage("Unable to load doctor details.");
        setStatus("error");
      }
    };

    loadDetails();
  }, [id, navigate]);

  if (status === "loading") {
    return <div className="card">Loading doctor details...</div>;
  }

  if (status === "error" || !doctor) {
    return <div className="card">{errorMessage || "Doctor not found."}</div>;
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{doctor.name}</h2>
          <p>{doctor.email || "No account email"}</p>
        </div>
        <span className="pill active">Doctor #{doctor.id}</span>
      </div>

      <div className="split">
        <div className="card">
          <h3>Profile</h3>

          <div className="status-info">
            <div className="status-row">
              <span className="status-label">Name</span>
              <span className="status-value">{doctor.name}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Email</span>
              <span className="status-value">{doctor.email || "-"}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Hospital</span>
              <span className="status-value">{doctor.hospital || "-"}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Specialization</span>
              <span className="status-value">{doctor.specialization || "-"}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Region</span>
              <span className="status-value">{doctor.region || "-"}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Contact</span>
              <span className="status-value">{doctor.contact || "-"}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Appointments</h3>

          {appointments.length === 0 && (
            <div className="muted">No appointments found.</div>
          )}

          <div className="chat-list">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="chat-item bot">
                <div className="chat-meta">
                  <span>
                    {appointment.user_name || appointment.user_email || "Unknown user"}
                  </span>
                  <span>
                    {appointment.appointment_date
                      ? new Date(appointment.appointment_date).toLocaleDateString()
                      : "-"}
                    {appointment.appointment_time
                      ? ` ${appointment.appointment_time.slice(0, 5)}`
                      : ""}
                  </span>
                </div>
                <div className="muted">Status: {appointment.status || "-"}</div>
                {appointment.symptoms && <p>Symptoms: {appointment.symptoms}</p>}
                {appointment.doctor_note && <p>Doctor note: {appointment.doctor_note}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorDetail;
