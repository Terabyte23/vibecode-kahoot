// src/components/HostGame.jsx
import React, { useState, useEffect } from 'react';

export function HostGame({ quiz, players, answers, onNextQuestion, onFinishGame }) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.questions[0].timeLimit);
  const [gameState, setGameState] = useState('question'); // 'question' | 'results' | 'leaderboard'

  const currentQuestion = quiz.questions[currentQIndex];

  // Таймер обратного отсчета
  useEffect(() => {
    if (gameState !== 'question') return;

    if (timeLeft <= 0) {
      setGameState('results');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameState]);

  // Подсчёт распределения ответов
  const getAnswerDistribution = () => {
    const dist = [0, 0, 0, 0];
    answers[currentQuestion.id]?.forEach((ans) => {
      if (ans.optionIndex !== undefined) {
        dist[ans.optionIndex]++;
      }
    });
    return dist;
  };

  const handleNext = () => {
    if (currentQIndex + 1 < quiz.questions.length) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setTimeLeft(quiz.questions[nextIdx].timeLimit);
      setGameState('question');
      onNextQuestion(nextIdx);
    } else {
      setGameState('finished');
      onFinishGame();
    }
  };

  // Таблица лидеров
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  if (gameState === 'finished') {
    return (
      <div className="join-container" style={{ color: 'white' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>🎉 Mäng on lõppenud! 🎉</h1>
        <div className="leaderboard-card">
          <h2>Lõplik edetabel</h2>
          {sortedPlayers.slice(0, 5).map((p, idx) => (
            <div key={p.id} className="leaderboard-row">
              <span>{idx + 1}. {p.nickname}</span>
              <strong>{p.score || 0} p</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="host-game-screen">
      <header className="top-bar">
        <h2>{quiz.title} ({currentQIndex + 1}/{quiz.questions.length})</h2>
        {gameState === 'question' && <div className="timer-circle">{timeLeft}</div>}
        {gameState === 'results' && (
          <button className="btn-start" onClick={() => setGameState('leaderboard')}>
            Edetabel ➔
          </button>
        )}
        {gameState === 'leaderboard' && (
          <button className="btn-start" onClick={handleNext}>
            {currentQIndex + 1 < quiz.questions.length ? 'Järgmine küsimus ➔' : 'Lõpeta mäng ➔'}
          </button>
        )}
      </header>

      {gameState === 'question' && (
        <main className="question-display">
          <h1 className="question-text">{currentQuestion.text}</h1>
          <div className="host-answers-grid">
            {currentQuestion.options.map((opt, idx) => (
              <div key={idx} className={`host-opt-card opt-${idx}`}>
                <span className="shape">{['▲', '◆', '●', '■'][idx]}</span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        </main>
      )}

      {gameState === 'results' && (
        <main className="results-display">
          <h1>Tulemused</h1>
          <div className="chart-container">
            {getAnswerDistribution().map((count, idx) => (
              <div key={idx} className="chart-bar-wrapper">
                <div className="bar-count">{count}</div>
                <div 
                  className={`chart-bar opt-${idx} ${idx === currentQuestion.correctIndex ? 'correct' : ''}`}
                  style={{ height: `${Math.max(count * 40, 20)}px` }}
                />
                <span className="shape">{['▲', '◆', '●', '■'][idx]}</span>
              </div>
            ))}
          </div>
        </main>
      )}

      {gameState === 'leaderboard' && (
        <main className="leaderboard-display">
          <h1>Edetabel</h1>
          <div className="leaderboard-card">
            {sortedPlayers.slice(0, 5).map((p, idx) => (
              <div key={p.id} className="leaderboard-row">
                <span>{idx + 1}. {p.nickname}</span>
                <strong>{p.score || 0} p</strong>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}