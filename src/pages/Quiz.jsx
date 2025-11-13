import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('/'); // Connect to the root for Vercel

function Quiz() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { nickname, players: initialPlayers, currentQuestion: initialQuestion, totalQuestions } = location.state || {};

  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [players, setPlayers] = useState(initialPlayers);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!nickname || !initialQuestion || !initialPlayers) {
      navigate('/');
      return;
    }

    const initialScores = {};
    initialPlayers.forEach(p => initialScores[p.id] = 0);
    setScores(initialScores);

    socket.on('update-score', (newScores) => {
      setScores(newScores);
    });

    socket.on('next-question', (data) => {
      setCurrentQuestion(data.currentQuestion);
      setQuestionIndex(data.currentQuestionIndex);
      setScores(data.scores);
      setSelectedAnswerIndex(null);
      setFeedback('');
    });

    socket.on('game-over', (data) => {
      navigate(`/results/${roomId}`, { state: { scores: data.scores, players: data.players } });
    });

    socket.on('player-left', ({ playerId, nickname: leftNickname, players: updatedPlayers }) => {
      setPlayers(updatedPlayers);
      setFeedback(`${leftNickname} has left the game.`);
    });


    return () => {
      socket.off('update-score');
      socket.off('next-question');
      socket.off('game-over');
      socket.off('player-left');
    };
  }, [roomId, nickname, initialQuestion, initialPlayers, navigate]);

  const handleSubmitAnswer = (answerIndex) => {
    if (selectedAnswerIndex !== null) return;
    setSelectedAnswerIndex(answerIndex);
    socket.emit('submit-answer', { roomId, playerId: socket.id, answerIndex });

    if (answerIndex === currentQuestion.correctAnswerIndex) {
      setFeedback('Correct!');
    } else {
      setFeedback('Incorrect!');
    }
  };

  if (!currentQuestion) {
    return <div>Loading quiz...</div>;
  }

  return (
    <div className="quiz-container">
      <h2>Question {questionIndex + 1} of {totalQuestions}</h2>
      <h3>{currentQuestion.question}</h3>
      <div className="options">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSubmitAnswer(index)}
            disabled={selectedAnswerIndex !== null}
            className={
              selectedAnswerIndex === index
                ? (index === currentQuestion.correctAnswerIndex ? 'correct' : 'incorrect')
                : ''
            }
          >
            {option}
          </button>
        ))}
      </div>
      {feedback && <p className="feedback">{feedback}</p>}
      <div className="scores">
        {players.map(player => (
          <p key={player.id}>{player.nickname}: {scores[player.id] || 0}</p>
        ))}
      </div>
    </div>
  );
}

export default Quiz;
