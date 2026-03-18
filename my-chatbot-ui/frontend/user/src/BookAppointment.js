import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./BookAppointment.css";

function BookAppointment() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statusToast, setStatusToast] = useState("");
  const previousStatusMapRef = useRef({});
  const hasLoadedAppointmentsRef = useRef(false);
  const toastTimeoutRef = useRef(null);

  const loadDoctors = useCallback(() => {
    if (!user.email) return;

    fetch(`http://localhost:5000/api/doctors/user/${user.email}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDoctors(data.doctors || []);
          if (data.doctors?.length > 0) {
            setDoctorId(String(data.doctors[0].id));
          }
        }
      })
      .catch(() => setDoctors([]));
  }, [user.email]);

  const loadAppointments = useCallback(() => {
    if (!user.email) return;

    fetch(`http://localhost:5000/api/appointments/user/${encodeURIComponent(user.email)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const nextAppointments = data.appointments || [];
          const nextStatusMap = {};

          nextAppointments.forEach((item) => {
            nextStatusMap[item.id] = item.status;
          });

          if (hasLoadedAppointmentsRef.current) {
            const changedAppointment = nextAppointments.find((item) => {
              const previousStatus = previousStatusMapRef.current[item.id];
              return previousStatus && previousStatus !== item.status;
            });

            if (changedAppointment) {
              const doctorName = changedAppointment.doctor_name || "Doctor";
              const nextStatus = changedAppointment.status;
              setStatusToast(`${doctorName} has ${nextStatus} your appointment request.`);

              if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
              }

              toastTimeoutRef.current = setTimeout(() => {
                setStatusToast("");
              }, 3500);
            }
          }

          previousStatusMapRef.current = nextStatusMap;
          hasLoadedAppointmentsRef.current = true;
          setAppointments(nextAppointments);
        }
      })
      .catch(() => setAppointments([]));
  }, [user.email]);

  useEffect(() => {
    loadDoctors();
    loadAppointments();
  }, [loadDoctors, loadAppointments]);

  useEffect(() => {
    if (!user.email) return undefined;

    const intervalId = setInterval(() => {
      loadAppointments();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [loadAppointments, user.email]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!doctorId || !appointmentDate || !appointmentTime) {
      setError("Please choose doctor, date and time.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user.email,
          doctorId,
          appointmentDate,
          appointmentTime,
          symptoms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Appointment request submitted. Doctor will approve or reject it.");
        setSymptoms("");
        loadAppointments();
      } else {
        setError(data.message || "Unable to book appointment.");
      }
    } catch (requestError) {
      setError("Server error while booking appointment.");
    }
  };

  return (
    <div className="booking-page">
      {statusToast ? <div className="status-toast">{statusToast}</div> : null}

      <div className="booking-head">
        <h1>Book Appointment</h1>
        <button className="back-btn" onClick={() => navigate("/chat")}>Back to Chat</button>
      </div>

      <div className="booking-grid">
        <div className="booking-card">
          <h3>Request New Appointment</h3>

          {error && <div className="booking-alert error">{error}</div>}
          {message && <div className="booking-alert success">{message}</div>}

          <form className="booking-form" onSubmit={handleSubmit}>
            <label>Nearby Doctors</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} ({doctor.specialization || "General"})
                </option>
              ))}
            </select>

            <label>Appointment Date</label>
            <input
              type="date"
              value={appointmentDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
            />

            <label>Appointment Time</label>
            <input
              type="time"
              value={appointmentTime}
              onChange={(e) => setAppointmentTime(e.target.value)}
              required
            />

            <label>Symptoms / Notes</label>
            <textarea
              rows={4}
              placeholder="Describe symptoms briefly"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />

            <button type="submit">Submit Request</button>
          </form>
        </div>

        <div className="booking-card">
          <h3>My Appointment Updates</h3>

          {appointments.length === 0 && (
            <div className="booking-empty">No appointment requests yet.</div>
          )}

          <div className="appointment-list">
            {appointments.map((item) => (
              <div className="appointment-item" key={item.id}>
                <div className="appointment-row">
                  <strong>{item.doctor_name}</strong>
                  <span className={`status ${item.status}`}>{item.status}</span>
                </div>
                <div className="appointment-meta">
                  {new Date(item.appointment_date).toLocaleDateString()} at {String(item.appointment_time).slice(0, 5)}
                </div>
                <div className="appointment-meta">{item.hospital || "Hospital not specified"}</div>
                {item.doctor_note ? <div className="doctor-note">Doctor note: {item.doctor_note}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookAppointment;
