import React from 'react';
import './HistorySidebar.css';

function HistorySidebar({ messages }) {
  // Filter for only user messages and remove duplicates
  const userQueries = messages.filter(msg => msg.sender === 'user');
  const uniqueQueries = [...new Map(userQueries.map(item => [item.text.toLowerCase(), item])).values()];

  return (
    <div className="history-sidebar">
      <h3>Chat History</h3>
      <ul>
        {uniqueQueries.map(msg => (
          <li key={msg.id} title={msg.text}>{msg.text}</li>
        ))}
      </ul>
    </div>
  );
}

export default HistorySidebar;
