import React, { useState, useEffect, useRef } from "react";
import "./Chat.css";

function Chat({ activeSession, userEmail, refreshSessions }) {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messageAreaRef = useRef(null);

  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
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
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop =
        messageAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !userEmail) return;

    const text = input;
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

      setMessages(prev => [
        ...prev,
        { sender: "bot", message: data.reply || "Unable to process request." }
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

        {messages.length === 0 && (
          <div className="message-wrapper bot">
            <div className="message bot">
              Hello 👋 How can I help you today?
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message-wrapper ${msg.sender}`}>
            <div className={`message ${msg.sender}`}>
              {msg.message}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-wrapper bot">
            <div className="message bot">...</div>
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