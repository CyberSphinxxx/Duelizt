import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const ResultsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 600px;
`;

const Title = styled.h1`
  font-size: 48px;
  color: #6c5ce7;
`;

const Winner = styled.h2`
  font-size: 32px;
`;

const ScoreList = styled.ul`
  list-style: none;
  width: 100%;
  padding: 0;
`;

const ScoreItem = styled.li`
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: #333;
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 18px;
`;

const Button = styled.button`
  background-color: #6c5ce7;
  color: #fff;

  &:hover {
    background-color: #5a4cdb;
  }
`;

function Results() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { scores, players } = location.state || {};
  const isSinglePlayer = roomId === 'single-player';

  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (!scores || !players) {
      navigate('/');
      return;
    }

    if (isSinglePlayer) {
      setWinner(players[0]);
    } else {
      let maxScore = -1;
      let winningPlayer = null;
      let isTie = false;

      players.forEach(player => {
        const playerScore = scores[player.id] || 0;
        if (playerScore > maxScore) {
          maxScore = playerScore;
          winningPlayer = player;
          isTie = false;
        } else if (playerScore === maxScore) {
          isTie = true;
        }
      });

      if (isTie) {
        setWinner({ nickname: "It's a Tie!" });
      } else {
        setWinner(winningPlayer);
      }
    }
  }, [scores, players, navigate, isSinglePlayer]);

  const handlePlayAgain = () => {
    navigate('/');
  };

  return (
    <ResultsContainer>
      <Title>Game Over!</Title>
      {winner && !isSinglePlayer && (
        <Winner>{winner.nickname === "It's a Tie!" ? winner.nickname : `${winner.nickname} Wins!`}</Winner>
      )}
      <h3>Final Scores:</h3>
      <ScoreList>
        {players && players.map(player => (
          <ScoreItem key={player.id}>
            <span>{player.nickname}</span>
            <span>{scores[player.id] || 0}</span>
          </ScoreItem>
        ))}
      </ScoreList>
      <Button onClick={handlePlayAgain}>Play Again</Button>
    </ResultsContainer>
  );
}

export default Results;