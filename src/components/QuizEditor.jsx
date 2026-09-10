
// src/components/QuizEditor.jsx
import React, { useState } from 'react';

export function QuizEditor({ onSaveQuiz, onCancel }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { text: '', timeLimit: 20, options: ['', '', '', ''], correctIndex: 0 }
  ]);

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { text: '', timeLimit: 20, options: ['', '', '', ''], correctIndex: 0 }
    ]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Sisesta viktoriini pealkiri!');
    
    const newQuiz = {
      id: 'quiz_' + Date.now(),
      title,
      questions
    };
    onSaveQuiz(newQuiz);
  };

  return (
    <div className="join-container" style={{ justifyContent: 'flex-start', paddingTop: '40px' }}>
      <div className="quiz-editor-card">
        <h2>Loo uus viktoriin</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="kahoot-input"
            placeholder="Viktoriini pealkiri"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ marginBottom: '20px' }}
          />

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="question-box">
              <h3>Küsimus {qIndex + 1}</h3>
              <input
                type="text"
                className="kahoot-input"
                placeholder="Küsimuse tekst"
                value={q.text}
                onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                required
              />
              
              <div className="options-grid-inputs">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className={`option-input-wrapper opt-${oIndex}`}>
                    <input
                      type="text"
                      className="kahoot-input small"
                      placeholder={`Vastus ${oIndex + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                      required
                    />
                    <label>
                      <input
                        type="radio"
                        name={`correct_${qIndex}`}
                        checked={q.correctIndex === oIndex}
                        onChange={() => handleQuestionChange(qIndex, 'correctIndex', oIndex)}
                      />
                      Õige
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="editor-buttons">
            <button type="button" className="btn-submit secondary" onClick={addQuestion}>
              + Lisa küsimus
            </button>
            <button type="submit" className="btn-submit">
              Salvesta viktoriin
            </button>
            <button type="button" className="btn-submit danger" onClick={onCancel}>
              Tühista
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}