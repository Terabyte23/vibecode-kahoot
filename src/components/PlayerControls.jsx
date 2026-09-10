// src/components/PlayerControls.jsx
import React, { useState, useEffect } from 'react';

const BUTTONS = [
  { index: 0, color: 'red', shape: '▲' },
  { index: 1, color: 'blue', shape: '◆' },
  { index: 2, color: 'yellow', shape: '●' },
  { index: 3, color: 'green', shape: '■' }
];

export function PlayerControls({ currentQuestion, onSendAnswer, playerAnswer }) {
  const [startTime] = useState(Date.now());

  const handleAnswerSelect = (optionIndex) => {
    if (playerAnswer) return; // Запрет повторного ответа

    const elapsed = (Date.now() - startTime) / 1000;
    const isCorrect = optionIndex === currentQuestion.correctIndex;
    
    // Формула рассчёта очков из ТЗ
    let points = 0;
    if (isCorrect) {
      const calc = 1000 * (1 - elapsed / currentQuestion.timeLimit / 2);
      points = Math.max(500, Math.round(calc));
    }

    onSendAnswer({
      questionId: currentQuestion.id,
      optionIndex,
      isCorrect,
      points
    });
  };

  if (playerAnswer) {
    return (
      <div className="join-container">
        <div className="waiting-card">
          {playerAnswer.isCorrect ? (
            <h2 style={{ color: '#26890c' }}>Õige! 🎉 +{playerAnswer.points} p</h2>
          ) : (
            <h2 style={{ color: '#e21b3c' }}>Vale! ❌</h2>
          )}
          <p>Ootame teisi mängijaid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="controls-screen">
      <div className="answers-grid">
        {BUTTONS.map((btn) => (
          <button
            key={btn.index}
            className={`btn-answer ${btn.color}`}
            onClick={() => handleAnswerSelect(btn.index)}
          >
            <span className="shape-icon">{btn.shape}</span>
          </button>
        ))}
      </div>
    </div>
  );
}