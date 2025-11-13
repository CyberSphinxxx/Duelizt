import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('/'); // Connect to the root for Vercel

function Home() {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreateDuel = async () => {
    if (!nickname) {
      alert('Please enter a nickname.');
      return;
    }
    try {
      const response = await fetch('/api/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      const newRoomId = data.roomId;
      navigate(`/join/${newRoomId}`, { state: { nickname } });
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create duel. Please try again.');
    }
  };

  const handleJoinDuel = () => {
    if (!nickname) {
      alert('Please enter a nickname.');
      return;
    }
    if (!roomId) {
      alert('Please enter a Room ID.');
      return;
    }
    navigate(`/join/${roomId}`, { state: { nickname } });
  };

  return (
    <div className="home-container">
      <h1>Duelizt</h1>
      <input
        type="text"
        placeholder="Enter your nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <button onClick={handleCreateDuel}>Create Duel</button>
      <hr />
      <input
        type="text"
        placeholder="Enter Room ID to join"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <button onClick={handleJoinDuel}>Join Duel</button>
    </div>
  );
}

export default Home;
