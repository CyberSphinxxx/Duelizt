import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
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
  margin-bottom: 20px;
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

const OrDivider = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  gap: 10px;
  color: #888;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: #444;
  }
`;

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
      navigate(`/join/${newRoomId}`, { state: { nickname, isCreator: true } });
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

  const handleSinglePlayer = () => {
    if (!nickname) {
      alert('Please enter a nickname.');
      return;
    }
    navigate('/quiz/single-player', { state: { nickname } });
  };

  return (
    <HomeContainer>
      <Title>Duelizt</Title>
      <Input
        type="text"
        placeholder="Enter your nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <Button onClick={handleSinglePlayer}>Single Player</Button>
      <OrDivider>OR</OrDivider>
      <Button onClick={handleCreateDuel}>Create Duel</Button>
      <Input
        type="text"
        placeholder="Enter Room ID to join"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <Button onClick={handleJoinDuel}>Join Duel</Button>
    </HomeContainer>
  );
}

export default Home;