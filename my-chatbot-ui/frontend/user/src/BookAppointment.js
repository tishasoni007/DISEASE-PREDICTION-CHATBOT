import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./BookAppointment.css";

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const CLINIC_OPEN_TIME = "09:00";
const CLINIC_CLOSE_TIME = "18:00";

function getCurrentLocalTimeInputValue(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseTimeToMinutes(timeString) {
  const [rawHours, rawMinutes] = String(timeString || "").split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function getMinAllowedTimeForDate(selectedDate) {
  const today = getLocalDateInputValue();

  if (selectedDate !== today) {
    return CLINIC_OPEN_TIME;
  }

  const clinicOpenInMinutes = parseTimeToMinutes(CLINIC_OPEN_TIME);
  const currentTimeInMinutes = parseTimeToMinutes(getCurrentLocalTimeInputValue());

  if (clinicOpenInMinutes === null || currentTimeInMinutes === null) {
    return CLINIC_OPEN_TIME;
  }

  if (currentTimeInMinutes <= clinicOpenInMinutes) {
    return CLINIC_OPEN_TIME;
  }

  return getCurrentLocalTimeInputValue();
}

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
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState(null);
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

    const today = getLocalDateInputValue();
    if (appointmentDate < today) {
      setError("You cannot book an appointment for a past date.");
      return;
    }

    const selectedDateObj = new Date(`${appointmentDate}T00:00:00`);
    if (selectedDateObj.getDay() === 0) {
      setError("Bookings are not available on Sundays.");
      return;
    }

    const selectedTimeInMinutes = parseTimeToMinutes(appointmentTime);
    const clinicOpenInMinutes = parseTimeToMinutes(CLINIC_OPEN_TIME);
    const clinicCloseInMinutes = parseTimeToMinutes(CLINIC_CLOSE_TIME);

    if (
      selectedTimeInMinutes === null ||
      clinicOpenInMinutes === null ||
      clinicCloseInMinutes === null
    ) {
      setError("Invalid appointment time.");
      return;
    }

    if (
      selectedTimeInMinutes < clinicOpenInMinutes ||
      selectedTimeInMinutes > clinicCloseInMinutes
    ) {
      setError("Appointments can only be booked between 09:00 and 18:00.");
      return;
    }

    if (appointmentDate === today) {
      const currentTimeInMinutes = parseTimeToMinutes(getCurrentLocalTimeInputValue());

      if (
        currentTimeInMinutes === null ||
        selectedTimeInMinutes < currentTimeInMinutes
      ) {
        setError("You cannot book an appointment for a past time today.");
        return;
      }
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

  const handleCancelAppointment = async (appointmentId) => {
    const shouldCancel = window.confirm("Are you sure you want to cancel this appointment?");
    if (!shouldCancel) {
      return;
    }

    setMessage("");
    setError("");
    setCancellingAppointmentId(appointmentId);

    try {
      const response = await fetch(
        `http://localhost:5000/api/appointments/${appointmentId}?userEmail=${encodeURIComponent(user.email)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail: user.email }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Unable to cancel appointment.");
        return;
      }

      setMessage("Appointment cancelled successfully.");
      setAppointments((prevItems) => prevItems.filter((item) => item.id !== appointmentId));

      if (previousStatusMapRef.current[appointmentId]) {
        delete previousStatusMapRef.current[appointmentId];
      }
    } catch (requestError) {
      setError("Server error while cancelling appointment.");
    } finally {
      setCancellingAppointmentId(null);
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
              min={getLocalDateInputValue()}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
            />

            <label>Appointment Time</label>
            <input
              type="time"
              value={appointmentTime}
              min={getMinAllowedTimeForDate(appointmentDate)}
              max={CLINIC_CLOSE_TIME}
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
            {appointments.map((item) => {
              const normalizedStatus = String(item.status || "").trim().toLowerCase();
              const canCancel = normalizedStatus === "pending" || normalizedStatus === "approved";

              return (
                <div className="appointment-item" key={item.id}>
                  <div className="appointment-row">
                    <strong>{item.doctor_name}</strong>
                    <span className={`status ${normalizedStatus}`}>{item.status}</span>
                  </div>
                  <div className="appointment-meta">
                    {new Date(item.appointment_date).toLocaleDateString()} at {String(item.appointment_time).slice(0, 5)}
                  </div>
                  <div className="appointment-meta">{item.hospital || "Hospital not specified"}</div>
                  {item.doctor_note ? <div className="doctor-note">Doctor note: {item.doctor_note}</div> : null}

                  {canCancel ? (
                    <div className="appointment-actions">
                      <button
                        type="button"
                        className="cancel-appointment-btn"
                        onClick={() => handleCancelAppointment(item.id)}
                        disabled={cancellingAppointmentId === item.id}
                      >
                        {cancellingAppointmentId === item.id ? "Cancelling..." : "Cancel Appointment"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookAppointment;
