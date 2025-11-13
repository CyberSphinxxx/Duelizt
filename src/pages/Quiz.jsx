import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

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
  const socketRef = useRef(null);

  useEffect(() => {
    if (!nickname || !initialQuestion || !initialPlayers) {
      navigate('/');
      return;
    }

    socketRef.current = io('/');

    const initialScores = {};
    initialPlayers.forEach(p => initialScores[p.id] = 0);
    setScores(initialScores);

    socketRef.current.on('update-score', (newScores) => {
      setScores(newScores);
    });

    socketRef.current.on('next-question', (data) => {
      setCurrentQuestion(data.currentQuestion);
      setQuestionIndex(data.currentQuestionIndex);
      setScores(data.scores);
      setSelectedAnswerIndex(null);
      setFeedback('');
    });

    socketRef.current.on('game-over', (data) => {
      navigate(`/results/${roomId}`, { state: { scores: data.scores, players: data.players } });
    });

    socketRef.current.on('player-left', ({ playerId, nickname: leftNickname, players: updatedPlayers }) => {
      setPlayers(updatedPlayers);
      setFeedback(`${leftNickname} has left the game.`);
    });


    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, nickname, initialQuestion, initialPlayers, navigate]);

  const handleSubmitAnswer = (answerIndex) => {
    if (selectedAnswerIndex !== null) return;
    setSelectedAnswerIndex(answerIndex);
    if (socketRef.current) {
      socketRef.current.emit('submit-answer', { roomId, playerId: socketRef.current.id, answerIndex });
    }

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