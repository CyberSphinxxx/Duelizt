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

  &:disabled {
    background-color: #444;
    cursor: not-allowed;
  }
`;

const PlayerList = styled.ul`
  list-style: none;
  width: 100%;
  padding: 0;
`;

const PlayerItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #333;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 18px;
`;

const ReadyStatus = styled.span`
  color: ${props => (props.ready ? '#2ecc71' : '#e74c3c')};
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
  const isCreator = location.state?.isCreator || false;

  useEffect(() => {
    socketRef.current = io('/');

    if (nickname && roomId) {
      socketRef.current.emit('join-duel', { roomId, nickname, isCreator });
    }

    socketRef.current.on('player-update', (currentPlayers) => {
      setPlayers(currentPlayers);
      if (currentPlayers.length < 2) {
        setMessage('Waiting for opponent...');
      } else {
        setMessage('Ready up!');
      }
    });

    socketRef.current.on('room-not-found', () => {
      setMessage('Room not found. Please check the ID.');
    });

    socketRef.current.on('room-full', () => {
      setMessage('Room is full. Cannot join.');
    });

    socketRef.current.on('start-quiz', (data) => {
      navigate(`/quiz/${roomId}`, { state: { ...data, nickname } });
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [navigate, roomId, nickname, isCreator]);

  const handleReady = () => {
    if (socketRef.current) {
      socketRef.current.emit('player-ready', { roomId, playerId: socketRef.current.id });
    }
  };

  const handleStartGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('start-game', { roomId });
    }
  };

  const allPlayersReady = players.length > 1 && players.every(p => p.ready);
  const currentPlayer = players.find(p => p.id === socketRef.current?.id);

  return (
    <JoinContainer>
      <Title>Waiting Room</Title>
      <p>Room ID: {roomId}</p>
      <p>{message}</p>
      <PlayerList>
        {players.map((player) => (
          <PlayerItem key={player.id}>
            <span>{player.nickname}</span>
            <ReadyStatus ready={player.ready}>{player.ready ? 'Ready' : 'Not Ready'}</ReadyStatus>
          </PlayerItem>
        ))}
      </PlayerList>
      {!isCreator && !currentPlayer?.ready && (
        <Button onClick={handleReady}>Ready</Button>
      )}
      {isCreator && (
        <Button onClick={handleStartGame} disabled={!allPlayersReady}>
          Start Duel
        </Button>
      )}
    </JoinContainer>
  );
}

export default Join;