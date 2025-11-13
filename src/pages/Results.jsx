import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

function Results() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { scores, players } = location.state || {};

  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (!scores || !players) {
      navigate('/');
      return;
    }

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
      setWinner({ nickname: 'It\'s a Tie!' });
    } else {
      setWinner(winningPlayer);
    }

  }, [scores, players, navigate]);

  const handlePlayAgain = () => {
    navigate('/');
  };

  return (
    <div className="results-container">
      <h1>Game Over!</h1>
      {winner && (
        <h2>{winner.nickname === 'It\'s a Tie!' ? winner.nickname : `${winner.nickname} Wins!`}</h2>
      )}
      <h3>Final Scores:</h3>
      <ul>
        {players && players.map(player => (
          <li key={player.id}>{player.nickname}: {scores[player.id] || 0}</li>
        ))}
      </ul>
      <button onClick={handlePlayAgain}>Play Again</button>
    </div>
  );
}

export default Results;
