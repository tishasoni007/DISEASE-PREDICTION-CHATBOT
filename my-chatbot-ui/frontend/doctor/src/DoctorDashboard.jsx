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
  const [datePopup, setDatePopup] = useState({ open: false, dateKey: "" });
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    title: "",
    message: "",
    isError: false,
  });
  const [notePopup, setNotePopup] = useState({
    open: false,
    appointmentId: null,
    status: "",
    note: "",
    submitting: false,
  });
  const [cancellationMessage, setCancellationMessage] = useState("");
  const previousAppointmentsRef = React.useRef([]);
  const statusPopupTimeoutRef = React.useRef(null);

  const loadAppointments = useCallback(() => {
    if (!doctor.id) return;

    fetch(`http://localhost:5000/doctor/appointments/${doctor.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const nextAppointments = data.appointments || [];
          
          const previousIds = new Set(previousAppointmentsRef.current.map((a) => a.id));
          const nextIds = new Set(nextAppointments.map((a) => a.id));
          const cancelledIds = [...previousIds].filter((id) => !nextIds.has(id));
          
          if (cancelledIds.length > 0 && previousAppointmentsRef.current.length > 0) {
            const cancelledAppt = previousAppointmentsRef.current.find((a) => cancelledIds.includes(a.id));
            if (cancelledAppt) {
              setCancellationMessage(
                `${cancelledAppt.user_name || "User"} cancelled their appointment on ${new Date(cancelledAppt.appointment_date).toLocaleDateString()}.`
              );
            }
          }
          
          previousAppointmentsRef.current = nextAppointments;
          setAppointments(nextAppointments);
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
    }, 3000);

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

  useEffect(() => {
    if (statusPopup.open) {
      statusPopupTimeoutRef.current = setTimeout(() => {
        setStatusPopup({ open: false, title: "", message: "", isError: false });
      }, 1000);
    }

    return () => {
      if (statusPopupTimeoutRef.current) {
        clearTimeout(statusPopupTimeoutRef.current);
      }
    };
  }, [statusPopup.open]);

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

  const updateStatus = async (appointmentId, status, doctorNote = "") => {
    try {
      const response = await fetch(`http://localhost:5000/doctor/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: doctor.id, status, doctorNote }),
      });

      const data = await response.json();

      if (data.success) {
        setStatusPopup({
          open: true,
          title: status === "approved" ? "Appointment accepted" : "Appointment rejected",
          message: data.message || `Appointment ${status}.`,
          isError: false,
        });
        loadAppointments();
        loadCalendar();
      } else {
        setStatusPopup({
          open: true,
          title: "Update failed",
          message: data.message || "Unable to update status.",
          isError: true,
        });
      }
    } catch (requestError) {
      setStatusPopup({
        open: true,
        title: "Server error",
        message: "Server error while updating appointment.",
        isError: true,
      });
    }
  };

  const openNotePopup = (appointmentId, status) => {
    setNotePopup({
      open: true,
      appointmentId,
      status,
      note: "",
      submitting: false,
    });
  };

  const closeNotePopup = () => {
    setNotePopup({
      open: false,
      appointmentId: null,
      status: "",
      note: "",
      submitting: false,
    });
  };

  const submitStatusUpdate = async () => {
    if (!notePopup.appointmentId || !notePopup.status || notePopup.submitting) return;

    setNotePopup((prev) => ({ ...prev, submitting: true }));
    await updateStatus(notePopup.appointmentId, notePopup.status, notePopup.note.trim());
    closeNotePopup();
  };

  const handleLogout = () => {
    previousAppointmentsRef.current = [];
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

          {cancellationMessage && (
            <div className="cancellation-notification">
              <div className="cancellation-message">{cancellationMessage}</div>
              <button
                type="button"
                className="cancellation-ok-btn"
                onClick={() => setCancellationMessage("")}
              >
                OK
              </button>
            </div>
          )}

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
                      onClick={() => openNotePopup(item.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="reject"
                      onClick={() => openNotePopup(item.id, "rejected")}
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

      {statusPopup.open ? (
        <div
          className="status-popup-overlay"
          onClick={() => setStatusPopup({ open: false, title: "", message: "", isError: false })}
        >
          <div className="status-popup" onClick={(event) => event.stopPropagation()}>
            <div className="status-popup-head">
              <h4>{statusPopup.title}</h4>
              <button
                type="button"
                className="status-popup-close"
                onClick={() => setStatusPopup({ open: false, title: "", message: "", isError: false })}
              >
                ×
              </button>
            </div>
            <div className={`status-popup-message ${statusPopup.isError ? "error" : "success"}`}>
              {statusPopup.message}
            </div>
            <button
              type="button"
              className="status-popup-ok"
              onClick={() => setStatusPopup({ open: false, title: "", message: "", isError: false })}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      {notePopup.open ? (
        <div className="status-popup-overlay" onClick={closeNotePopup}>
          <div className="status-popup" onClick={(event) => event.stopPropagation()}>
            <div className="status-popup-head">
              <h4>
                {notePopup.status === "approved" ? "Accept appointment" : "Reject appointment"}
              </h4>
              <button type="button" className="status-popup-close" onClick={closeNotePopup}>
                ×
              </button>
            </div>

            <div className="status-note-field">
              <label htmlFor="doctor-note">Note for user (optional)</label>
              <textarea
                id="doctor-note"
                value={notePopup.note}
                onChange={(event) =>
                  setNotePopup((prev) => ({ ...prev, note: event.target.value }))
                }
                placeholder="Add a short note..."
                rows={4}
              />
            </div>

            <div className="status-popup-actions">
              <button
                type="button"
                className="status-popup-cancel"
                onClick={closeNotePopup}
                disabled={notePopup.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="status-popup-ok"
                onClick={submitStatusUpdate}
                disabled={notePopup.submitting}
              >
                {notePopup.submitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DoctorDashboard;
