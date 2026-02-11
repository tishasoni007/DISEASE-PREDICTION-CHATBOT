import React, { useState } from 'react';
import Chat from './Chat';
import HistorySidebar from './HistorySidebar';
import './App.css'; // Main layout styles

function App() {
  // The complete chat history is managed here in the main App component
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: "bot" },
  ]);

  // This function adds a new message to the history
  const handleNewMessage = (newMessage) => {
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  return (
    <div className="app-container">
      {/* The sidebar receives the full message history to display it */}
      <HistorySidebar messages={messages} />
      
      {/* The chat component receives the history and the function to add new messages */}
      <Chat messages={messages} onNewMessage={handleNewMessage} />
    </div>
  );
}

export default App;
