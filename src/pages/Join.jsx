import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import styled from 'styled-components';

const JoinContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h1`
  font-size: 48px;
  color: #6c5ce7;
`;

const Input = styled.input`
  width: 100%;
`;

const Button = styled.button`
  width: 100%;
  background-color: #6c5ce7;
  color: #fff;

  &:hover {
    background-color: #5a4cdb;
  }
`;

const PlayerList = styled.ul`
  list-style: none;
  width: 100%;
  padding: 0;
`;

const PlayerItem = styled.li`
  padding: 10px;
  background-color: #333;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 18px;
`;

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
    <JoinContainer>
      <Title>Join Duel</Title>
      {!paramRoomId && (
        <Input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
      )}
      {!location.state?.nickname && (
        <Input
          type="text"
          placeholder="Enter your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      )}
      {(!paramRoomId || !location.state?.nickname) && (
        <Button onClick={handleJoin}>Join</Button>
      )}
      <p>{message}</p>
      {players.length > 0 && (
        <div>
          <h2>Players in Room ({roomId}):</h2>
          <PlayerList>
            {players.map((player) => (
              <PlayerItem key={player.id}>{player.nickname}</PlayerItem>
            ))}
          </PlayerList>
        </div>
      )}
    </JoinContainer>
  );
}

export default Join;
