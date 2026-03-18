import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Chat.css";

function Chat({ activeSession, userEmail, refreshSessions, onSessionResolved, resetToken }) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAppointmentPrompt, setShowAppointmentPrompt] = useState(false);
  const [nearbyDoctors, setNearbyDoctors] = useState([]);
  const messageAreaRef = useRef(null);

  const shouldSuggestAppointment = (text) => {
    if (!text) return false;
    const normalized = String(text).toLowerCase();

    const hasImmediateDoctorRecommendation =
      normalized.includes("strongly recommend consulting a doctor immediately") ||
      (normalized.includes("strongly recommend") && normalized.includes("doctor") && normalized.includes("immediately"));

    const hasPossibleSeriousCondition =
      normalized.includes("high possibility") ||
      normalized.includes("possibility of") ||
      normalized.includes("likely");

    return (
      (normalized.includes("book") && normalized.includes("appointment")) ||
      normalized.includes("consult doctor") ||
      normalized.includes("consulting a doctor") ||
      normalized.includes("see a doctor") ||
      (hasImmediateDoctorRecommendation && hasPossibleSeriousCondition)
    );
  };

  const isYesResponse = (text) => {
    const normalized = String(text || "").trim().toLowerCase();
    return ["yes", "y", "yeah", "yep", "ok", "okay", "sure", "book", "book now"].includes(normalized);
  };

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    fetch(`http://localhost:5000/api/chat/sessions/messages/${activeSession}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessages(data.messages || []);
        } else {
          setMessages([]);
        }
      })
      .catch(() => setMessages([]));
  }, [activeSession]);

  useEffect(() => {
    setMessages([]);
    setShowAppointmentPrompt(false);
    setInput("");
  }, [resetToken]);

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop =
        messageAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!userEmail) return;

    fetch(`http://localhost:5000/api/doctors/user/${userEmail}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNearbyDoctors(data.doctors || []);
        }
      })
      .catch(() => setNearbyDoctors([]));
  }, [userEmail]);

  const handleSend = async () => {
    if (!input.trim() || !userEmail) return;

    const text = input;

    if (showAppointmentPrompt && isYesResponse(text)) {
      setInput("");
      navigate("/book-appointment");
      return;
    }

    setInput("");

    setMessages(prev => [
      ...prev,
      { sender: "user", message: text }
    ]);

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userEmail,
          sessionId: activeSession
        })
      });

      const data = await response.json();
      if (data.sessionId && data.sessionId !== activeSession && onSessionResolved) {
        onSessionResolved(data.sessionId);
      }

      const botMessage = data.reply || "Unable to process request.";

      if (shouldSuggestAppointment(botMessage)) {
        setShowAppointmentPrompt(true);
      }

      setMessages(prev => [
        ...prev,
        { sender: "bot", message: botMessage }
      ]);

      if (refreshSessions) {
        refreshSessions();
      }

    } catch {
      setMessages(prev => [
        ...prev,
        { sender: "bot", message: "Server error" }
      ]);
    }

    setIsLoading(false);
  };

  return (
    <div className="chat-container">
      <div className="header">
        <h2>Disease Prediction Assistant</h2>
      </div>

      <div className="message-area" ref={messageAreaRef}>

        <div className="message-wrapper bot">
          <div className="message bot">
            Hello 👋 How can I help you today?
          </div>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`message-wrapper ${msg.sender}`}>
            <div className={`message ${msg.sender}`}>
              {msg.message}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-wrapper bot">
            <div className="message bot typing-loader" aria-label="Model is typing">
              <span className="loading-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        )}

        {showAppointmentPrompt && (
          <div className="appointment-prompt">
            <h4>Nearby doctors are available</h4>
            <p>
              {nearbyDoctors.length > 0
                ? `Found ${nearbyDoctors.length} doctor(s) near your region. Do you want to book an appointment?`
                : "Do you want to book an appointment with a nearby doctor?"}
            </p>
            <div className="appointment-prompt-actions">
              <button onClick={() => navigate("/book-appointment")}>Yes, Book Appointment</button>
              <button className="secondary" onClick={() => setShowAppointmentPrompt(false)}>
                Not Now
              </button>
            </div>
          </div>
        )}

      </div>

      <div className="input-area">
        <input
          value={input}
          placeholder="Write message..."
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend} disabled={isLoading}>▶</button>
      </div>
    </div>
  );
}

export default Chat;