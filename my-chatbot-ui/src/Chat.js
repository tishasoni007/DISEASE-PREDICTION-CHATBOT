import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';

function Chat({ messages, onNewMessage }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messageAreaRef = useRef(null);

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // 🔹 Send user input to Node backend (which forwards to Flask ML)
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: "user"
    };
    onNewMessage(userMessage);

    setIsLoading(true);
    setInput('');

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: input   // 🔥 IMPORTANT: matches Flask chat logic
        })
      });

      const data = await response.json();

      const botMessage = {
        id: Date.now() + 1,
        text:
          data.reply ||
          data.message ||
          data.advice ||
          "Unable to process your request.",
        sender: "bot"
      };

      onNewMessage(botMessage);

    } catch (error) {
      onNewMessage({
        id: Date.now() + 2,
        text: "Server error. Please try again later.",
        sender: "bot"
      });
    }

    setIsLoading(false);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="header">
        <h2>Disease Prediction Assistant</h2>
      </div>

      <div className="message-area" ref={messageAreaRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
            <div className={`message ${msg.sender}`}>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-wrapper bot">
            <div className="message bot">
              <p className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Describe your symptoms..."
        />
        <button onClick={handleSend} disabled={isLoading}>
          ▶
        </button>
      </div>
    </div>
  );
}

export default Chat;
