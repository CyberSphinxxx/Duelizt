import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import styled from 'styled-components';

const QuizContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 800px;
`;

const Question = styled.h2`
  font-size: 24px;
  text-align: center;
`;

const OptionsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
`;

const OptionButton = styled.button`
  background-color: #444;
  color: #fff;
  padding: 20px;
  font-size: 18px;

  &:hover {
    background-color: #555;
  }

  &.correct {
    background-color: #2ecc71;
  }

  &.incorrect {
    background-color: #e74c3c;
  }
`;

const Scoreboard = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  font-size: 18px;
`;

const generateQuizQuestions = () => {
  return [
      {
          question: "What is the capital of France?",
          options: ["Berlin", "Madrid", "Paris", "Rome"],
          correctAnswerIndex: 2
      },
      {
          question: "Which planet is known as the Red Planet?",
          options: ["Earth", "Mars", "Jupiter", "Venus"],
          correctAnswerIndex: 1
      },
      {
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correctAnswerIndex: 1
      },
      {
          question: "Who painted the Mona Lisa?",
          options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
          correctAnswerIndex: 2
      },
      {
          question: "What is the largest ocean on Earth?",
          options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
          correctAnswerIndex: 3
      }
  ];
};

function Quiz() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { nickname, players: initialPlayers, currentQuestion: initialQuestion, totalQuestions: initialTotalQuestions } = location.state || {};

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [players, setPlayers] = useState(initialPlayers || []);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null);
  const [feedback, setFeedback] = useState('');
  const socketRef = useRef(null);
  const isSinglePlayer = roomId === 'single-player';

  useEffect(() => {
    if (!isSinglePlayer) {
      if (!nickname || !initialQuestion || !initialPlayers) {
        navigate('/');
        return;
      }

      socketRef.current = io('/');

      const initialScores = {};
      initialPlayers.forEach(p => initialScores[p.id] = 0);
      setScores(initialScores);
      setCurrentQuestion(initialQuestion);
      setPlayers(initialPlayers);

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
    } else {
      const generatedQuestions = generateQuizQuestions();
      setQuestions(generatedQuestions);
      setCurrentQuestion(generatedQuestions[0]);
      setScores({ [nickname]: 0 });
      setPlayers([{ id: nickname, nickname }]);
    }
  }, [roomId, nickname, initialQuestion, initialPlayers, navigate, isSinglePlayer]);

  const handleSubmitAnswer = (answerIndex) => {
    if (selectedAnswerIndex !== null) return;
    setSelectedAnswerIndex(answerIndex);

    const isCorrect = answerIndex === currentQuestion.correctAnswerIndex;

    if (isCorrect) {
      setFeedback('Correct!');
      if (isSinglePlayer) {
        setScores(prevScores => ({ ...prevScores, [nickname]: prevScores[nickname] + 1 }));
      }
    } else {
      setFeedback('Incorrect!');
    }

    if (!isSinglePlayer && socketRef.current) {
      socketRef.current.emit('submit-answer', { roomId, playerId: socketRef.current.id, answerIndex });
    }

    setTimeout(() => {
      if (isSinglePlayer) {
        const nextQuestionIndex = questionIndex + 1;
        if (nextQuestionIndex < questions.length) {
          setQuestionIndex(nextQuestionIndex);
          setCurrentQuestion(questions[nextQuestionIndex]);
          setSelectedAnswerIndex(null);
          setFeedback('');
        } else {
          navigate(`/results/single-player`, { state: { scores, players } });
        }
      }
    }, 2000);
  };

  if (!currentQuestion) {
    return <div>Loading quiz...</div>;
  }

  return (
    <QuizContainer>
      <Question>{currentQuestion.question}</Question>
      <OptionsContainer>
        {currentQuestion.options.map((option, index) => (
          <OptionButton
            key={index}
            onClick={() => handleSubmitAnswer(index)}
            disabled={selectedAnswerIndex !== null}
            className={
              selectedAnswerIndex !== null && index === currentQuestion.correctAnswerIndex
                ? 'correct'
                : selectedAnswerIndex === index
                ? 'incorrect'
                : ''
            }
          >
            {option}
          </OptionButton>
        ))}
      </OptionsContainer>
      {feedback && <p>{feedback}</p>}
      <Scoreboard>
        {players.map(player => (
          <div key={player.id}>{player.nickname}: {scores[player.id] || 0}</div>
        ))}
      </Scoreboard>
    </QuizContainer>
  );
}

export default Quiz;
