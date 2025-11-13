import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

function Join() {
  const { roomId: paramRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(location.state?.nickname || '');
  const [roomId, setRoomId] = useState(paramRoomId || '');
  const [players, setPlayers] = useState([]);
  const [message, setMessage] = useState('Waiting for opponent...');
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('/');

    socketRef.current.on('player-joined', (currentPlayers) => {
      setPlayers(currentPlayers);
      if (currentPlayers.length === 1) {
        setMessage('Waiting for opponent...');
      } else if (currentPlayers.length === 2) {
        setMessage('Both players connected! Starting quiz...');
      }
    });

    socketRef.current.on('room-not-found', () => {
      setMessage('Room not found. Please check the ID.');
    });

    socketRef.current.on('room-full', () => {
      setMessage('Room is full. Cannot join.');
    });

    socketRef.current.on('start-quiz', (data) => {
      console.log('Quiz starting with data:', data);
      navigate(`/quiz/${roomId}`, { state: { nickname, players: data.players, currentQuestion: data.currentQuestion, totalQuestions: data.totalQuestions } });
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [navigate, roomId, nickname]);

  useEffect(() => {
    if (nickname && roomId && socketRef.current) {
      socketRef.current.emit('join-duel', { roomId, nickname });
    }
  }, [nickname, roomId]);

  const handleJoin = () => {
    if (!nickname || !roomId) {
      alert('Please enter both nickname and Room ID.');
      return;
    }
    if (socketRef.current) {
      socketRef.current.emit('join-duel', { roomId, nickname });
    }
  };

  return (
    <div className="join-container">
      <h1>Join Duel</h1>
      {!paramRoomId && (
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
      )}
      {!location.state?.nickname && (
        <input
          type="text"
          placeholder="Enter your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      )}
      {(!paramRoomId || !location.state?.nickname) && (
        <button onClick={handleJoin}>Join</button>
      )}
      <p>{message}</p>
      {players.length > 0 && (
        <div>
          <h2>Players in Room ({roomId}):</h2>
          <ul>
            {players.map((player) => (
              <li key={player.id}>{player.nickname}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Join;