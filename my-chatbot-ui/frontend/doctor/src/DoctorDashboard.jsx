import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function DoctorDashboard() {
  const navigate = useNavigate();
  const doctor = JSON.parse(localStorage.getItem("doctor") || "{}");

  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [appointments, setAppointments] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [message, setMessage] = useState("");
  const [datePopup, setDatePopup] = useState({ open: false, dateKey: "" });

  const loadAppointments = useCallback(() => {
    if (!doctor.id) return;

    fetch(`http://localhost:5000/doctor/appointments/${doctor.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAppointments(data.appointments || []);
        }
      })
      .catch(() => setAppointments([]));
  }, [doctor.id]);

  const loadCalendar = useCallback(() => {
    if (!doctor.id) return;

    fetch(`http://localhost:5000/doctor/calendar/${doctor.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCalendarData(data.calendar || []);
        }
      })
      .catch(() => setCalendarData([]));
  }, [doctor.id]);

  useEffect(() => {
    if (!doctor.id) {
      navigate("/");
      return;
    }

    loadAppointments();
    loadCalendar();
  }, [doctor.id, loadAppointments, loadCalendar, navigate]);

  useEffect(() => {
    if (!doctor.id) return undefined;

    const intervalId = setInterval(() => {
      loadAppointments();
      loadCalendar();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [doctor.id, loadAppointments, loadCalendar]);

  useEffect(() => {
    if (calendarData.length === 0) return;

    const dateKeys = calendarData
      .map((item) => String(item.appointment_date).slice(0, 10))
      .filter(Boolean)
      .sort();

    if (dateKeys.length > 0 && !dateKeys.includes(selectedDate)) {
      setSelectedDate(dateKeys[0]);
    }
  }, [calendarData, selectedDate]);

  const calendarMap = useMemo(() => {
    const map = {};
    calendarData.forEach((item) => {
      const key = String(item.appointment_date).slice(0, 10);
      map[key] = item;
    });
    return map;
  }, [calendarData]);

  const pendingAppointments = useMemo(() => {
    return appointments
      .filter((item) => item.status === "pending")
      .sort((a, b) => {
        const dateA = `${a.appointment_date} ${a.appointment_time}`;
        const dateB = `${b.appointment_date} ${b.appointment_time}`;
        return new Date(dateA) - new Date(dateB);
      });
  }, [appointments]);

  const popupDateAppointments = useMemo(() => {
    if (!datePopup.dateKey) return [];
    return appointments.filter(
      (item) => String(item.appointment_date).slice(0, 10) === datePopup.dateKey
    );
  }, [appointments, datePopup.dateKey]);

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push({ key: `blank-${i}`, isBlank: true });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day);
      const dateKey = toDateKey(date);
      cells.push({
        key: dateKey,
        dateKey,
        day,
        isBlank: false,
        stats: calendarMap[dateKey] || null,
      });
    }

    return cells;
  }, [calendarMap, currentMonth]);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  const handleMonthChange = (offset) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const updateStatus = async (appointmentId, status) => {
    const doctorNote = window.prompt("Optional note for user:") || "";

    try {
      const response = await fetch(`http://localhost:5000/doctor/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: doctor.id, status, doctorNote }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`Appointment ${status}.`);
        loadAppointments();
        loadCalendar();
      } else {
        setMessage(data.message || "Unable to update status.");
      }
    } catch (requestError) {
      setMessage("Server error while updating appointment.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("doctor");
    navigate("/");
  };

  return (
    <div className="doctor-shell">
      <header className="doctor-header">
        <div>
          <h2>Doctor Panel</h2>
          <p>
            {doctor.name} · {doctor.specialization || "General"} · {doctor.hospital || "Hospital"}
          </p>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <div className="doctor-main-grid">
        <section className="doctor-card">
          <div className="card-head">
            <h3>Calendar</h3>
            <div className="month-nav">
              <button type="button" onClick={() => handleMonthChange(-1)}>‹</button>
              <span>{monthLabel}</span>
              <button type="button" onClick={() => handleMonthChange(1)}>›</button>
            </div>
          </div>

          <div className="calendar-weekdays">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="month-grid">
            {monthDays.map((cell) => {
              if (cell.isBlank) {
                return <div key={cell.key} className="month-cell blank" />;
              }

              const stats = cell.stats || {};
              const total = Number(stats.total || 0);
              const pending = Number(stats.pending || 0);
              const approved = Number(stats.approved || 0);
              const rejected = Number(stats.rejected || 0);

              let dayClass = "";
              if (pending > 0) dayClass = "pending";
              else if (approved > 0) dayClass = "approved";
              else if (rejected > 0) dayClass = "rejected";

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={`month-cell ${selectedDate === cell.dateKey ? "active" : ""} ${dayClass}`.trim()}
                  onClick={() => {
                    setSelectedDate(cell.dateKey);
                    setDatePopup({ open: true, dateKey: cell.dateKey });
                  }}
                >
                  <span className="day-number">{cell.day}</span>
                  {total > 0 ? <span className="day-count">{total}</span> : null}
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            <span><i className="dot pending"></i> Pending</span>
            <span><i className="dot approved"></i> Approved</span>
            <span><i className="dot rejected"></i> Rejected</span>
          </div>
        </section>

        <section className="doctor-card">
          <div className="card-head">
            <h3>Appointments</h3>
          </div>

          {message ? <div className="doctor-alert">{message}</div> : null}

          <div className="appointments-section-head">Pending Requests (All dates)</div>
          {pendingAppointments.length === 0 ? (
            <div className="muted">No pending requests.</div>
          ) : (
            <div className="doctor-appointments">
              {pendingAppointments.map((item) => (
                <div className="doctor-appointment-item" key={`pending-${item.id}`}>
                  <div className="row">
                    <strong>{item.user_name || item.user_email}</strong>
                    <span className={`status ${item.status}`}>{item.status}</span>
                  </div>
                  <div className="meta">{new Date(item.appointment_date).toLocaleDateString()} at {String(item.appointment_time).slice(0, 5)}</div>
                  <div className="meta">{item.user_email}</div>
                  {item.user_phone ? <div className="meta">Phone: {item.user_phone}</div> : null}
                  {item.symptoms ? <div className="symptoms">Symptoms: {item.symptoms}</div> : null}

                  <div className="actions">
                    <button
                      className="approve"
                      onClick={() => updateStatus(item.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="reject"
                      onClick={() => updateStatus(item.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>
      </div>

      {datePopup.open ? (
        <div className="date-popup-overlay" onClick={() => setDatePopup({ open: false, dateKey: "" })}>
          <div className="date-popup" onClick={(event) => event.stopPropagation()}>
            <div className="date-popup-head">
              <h4>Appointments on {new Date(datePopup.dateKey).toLocaleDateString()}</h4>
              <button
                type="button"
                className="date-popup-close"
                onClick={() => setDatePopup({ open: false, dateKey: "" })}
              >
                ×
              </button>
            </div>

            {popupDateAppointments.length === 0 ? (
              <div className="muted">No appointments on this date.</div>
            ) : (
              <div className="doctor-appointments popup-list">
                {popupDateAppointments.map((item) => (
                  <div className="doctor-appointment-item" key={`popup-${item.id}`}>
                    <div className="row">
                      <strong>{item.user_name || item.user_email}</strong>
                      <span className={`status ${item.status}`}>{item.status}</span>
                    </div>
                    <div className="meta">Time: {String(item.appointment_time).slice(0, 5)}</div>
                    <div className="meta">Email: {item.user_email}</div>
                    <div className="meta">Contact: {item.user_phone || "Not available"}</div>
                    {item.symptoms ? <div className="symptoms">Symptoms: {item.symptoms}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DoctorDashboard;
