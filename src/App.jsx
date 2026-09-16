import React, { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';
import './index.css';

const PB_URL = 'http://pocketbase-zgmen67x4abcj44xsuvjlsbf.176.112.158.15.sslip.io';
const pb = new PocketBase(PB_URL);

const HOST_DEFAULT_PASSWORD = 'HostSecretPassword123!';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, '', to);
    setPath(to);
  };

  if (path === '/host') return <HostRoute navigate={navigate} />;
  if (path === '/play') return <PlayRoute navigate={navigate} />;
  return <HomeRoute navigate={navigate} />;
}

// ------------------- 1. MAIN PAGE (/) -------------------
function HomeRoute({ navigate }) {
  return (
    <div className="kahoot-page center-content">
      <h1 className="brand-logo">Kahoot!</h1>
      <div className="main-card">
        <button className="btn-kahoot blue" onClick={() => navigate('/play')}>
          Mängima (Mängija)
        </button>
        <button className="btn-kahoot purple" style={{ marginTop: '15px' }} onClick={() => navigate('/host')}>
          Loo mäng / Õpetaja (Host)
        </button>
      </div>
    </div>
  );
}

// ------------------- 2. HOST VIEW (/host) -------------------
function HostRoute({ navigate }) {
  const [user, setUser] = useState(pb.authStore.model);
  const [nickname, setNickname] = useState('');
  
  const [view, setView] = useState('quizzes');
  const [quizzes, setQuizzes] = useState([]);
  const [activeGame, setActiveGame] = useState(null);
  const [gameQuestions, setGameQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);

  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [questionsList, setQuestionsList] = useState([
    { text: '', options: ['', '', '', ''], correctIndex: 0 }
  ]);

  const loadQuizzes = async () => {
    if (!pb.authStore.isValid) return;
    try {
      const list = await pb.collection('quizzes').getFullList({ sort: '-created' });
      setQuizzes(list);
    } catch (e) { 
      console.error('Viktoriinide laadimise viga:', e); 
    }
  };

  useEffect(() => { 
    if (user && pb.authStore.isValid) {
      loadQuizzes(); 
    }
  }, [user]);

  useEffect(() => {
    if (!activeGame || view !== 'lobby') return;
    
    pb.collection('players').getFullList({ filter: `game="${activeGame.id}"` }).then(setPlayers);

    pb.collection('players').subscribe('*', (e) => {
      if (e.record.game === activeGame.id) {
        setPlayers(prev => [...prev.filter(p => p.id !== e.record.id), e.record]);
      }
    });

    return () => { pb.collection('players').unsubscribe('*'); };
  }, [activeGame, view]);

  useEffect(() => {
    if (!activeGame || view !== 'game' || !activeGame.currentQuestion) return;

    pb.collection('answers')
      .getFullList({ filter: `game="${activeGame.id}" && question="${activeGame.currentQuestion}"` })
      .then(setAnswers);

    const unsubscribe = pb.collection('answers').subscribe('*', (e) => {
      if (e.record.game === activeGame.id && e.record.question === activeGame.currentQuestion) {
        setAnswers(prev => [...prev.filter(a => a.id !== e.record.id), e.record]);
      }
    });

    return () => { pb.collection('answers').unsubscribe('*'); };
  }, [activeGame?.id, activeGame?.currentQuestion, view]);

  const handleHostLogin = async (e) => {
    e.preventDefault();
    const cleanNick = nickname.trim();
    if (!cleanNick) return;

    const safeEmail = `${cleanNick.toLowerCase().replace(/[^a-z0-9]/g, '')}@chat.local`;

    try {
      const authData = await pb.collection('users').authWithPassword(safeEmail, HOST_DEFAULT_PASSWORD);
      setUser(authData.record);
    } catch (err) {
      try {
        await pb.collection('users').create({
          name: cleanNick,
          email: safeEmail,
          password: HOST_DEFAULT_PASSWORD,
          passwordConfirm: HOST_DEFAULT_PASSWORD
        });

        const authData = await pb.collection('users').authWithPassword(safeEmail, HOST_DEFAULT_PASSWORD);
        setUser(authData.record);
      } catch (createErr) {
        alert('Viga sisselogimisel: ' + createErr.message);
      }
    }
  };

  const handleSaveCustomQuiz = async (e) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return alert('Sisesta viktoriini pealkiri!');

    try {
      const quiz = await pb.collection('quizzes').create({
        title: newQuizTitle,
        owner: pb.authStore.model.id,
        isPublished: true
      });

      for (let i = 0; i < questionsList.length; i++) {
        const q = questionsList[i];
        if (q.text.trim()) {
          await pb.collection('questions').create({
            quiz: quiz.id,
            text: q.text,
            options: q.options,
            correctIndex: parseInt(q.correctIndex, 10),
            order: i + 1
          });
        }
      }

      setNewQuizTitle('');
      setQuestionsList([{ text: '', options: ['', '', '', ''], correctIndex: 0 }]);
      setView('quizzes');
      loadQuizzes();
    } catch (err) {
      alert('Viga viktoriini salvestamisel: ' + err.message);
    }
  };

  const handleStartGameSession = async (quiz) => {
    try {
      const qList = await pb.collection('questions').getFullList({
        filter: `quiz="${quiz.id}"`,
        sort: 'order'
      });

      if (qList.length === 0) {
        return alert('Sellel viktoriinil pole küsimusi!');
      }

      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();

      const game = await pb.collection('games').create({
        quiz: quiz.id,
        host: pb.authStore.model.id,
        code: generatedPin,
        status: 'lobby'
      });

      setActiveGame(game);
      setGameQuestions(qList);
      setView('lobby');
    } catch (e) { 
      alert('Mängu alustamine ebaõnnestus: ' + e.message); 
    }
  };

  const handleNextState = async () => {
    if (!activeGame) return;

    try {
      let updateData = {};

      if (activeGame.status === 'lobby') {
        const firstQ = gameQuestions[0];
        updateData = {
          status: 'question',
          currentQuestion: firstQ ? firstQ.id : '',
          questionStartedAt: new Date().toISOString()
        };
      } else if (activeGame.status === 'question') {
        updateData = { status: 'results' };
      } else if (activeGame.status === 'results') {
        const currentIdx = gameQuestions.findIndex(q => q.id === activeGame.currentQuestion);
        if (currentIdx + 1 < gameQuestions.length) {
          const nextQ = gameQuestions[currentIdx + 1];
          updateData = {
            status: 'question',
            currentQuestion: nextQ.id,
            questionStartedAt: new Date().toISOString()
          };
        } else {
          updateData = { status: 'finished' };
        }
      }

      if (updateData.status === 'question') {
        setAnswers([]);
      }

      const updated = await pb.collection('games').update(activeGame.id, updateData);
      setActiveGame(updated);

      if (updateData.status === 'question') {
        setView('game');
      }
    } catch (err) {
      console.error('Mängu oleku muutmise viga:', err);
      alert(`Mängu oleku muutmine ebaõnnestus!\nViga: ${err.message}`);
    }
  };

  if (!user || !pb.authStore.isValid) {
    return (
      <div className="kahoot-page center-content">
        <form className="main-card" onSubmit={handleHostLogin}>
          <h2>Õpetaja sisselogimine</h2>
          <input 
            className="input-field" 
            placeholder="Sinu hüüdnimi (Никнейм)" 
            value={nickname} 
            onChange={e => setNickname(e.target.value)} 
            required 
          />
          <button className="btn-kahoot dark" type="submit">Sisene</button>
          <button type="button" className="btn-kahoot red" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>
            Tagasi
          </button>
        </form>
      </div>
    );
  }

  if (view === 'create_quiz') {
    return (
      <div className="kahoot-page center-content" style={{ padding: '20px 0' }}>
        <form className="main-card" style={{ maxWidth: '600px', width: '90%' }} onSubmit={handleSaveCustomQuiz}>
          <h2>Loo uus viktoriin</h2>
          
          <input 
            className="input-field" 
            placeholder="Viktoriini pealkiri (Название)" 
            value={newQuizTitle} 
            onChange={e => setNewQuizTitle(e.target.value)} 
            required 
          />

          <hr style={{ margin: '15px 0', borderColor: '#eee' }} />

          {questionsList.map((q, qIndex) => (
            <div key={qIndex} style={{ textAlign: 'left', marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
              <h4>Küsimus {qIndex + 1}</h4>
              <input 
                className="input-field" 
                placeholder="Küsimuse tekst" 
                value={q.text} 
                onChange={e => {
                  const updated = [...questionsList];
                  updated[qIndex].text = e.target.value;
                  setQuestionsList(updated);
                }}
                required 
              />
              <p style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>Vastusevariandid:</p>
              {q.options.map((opt, oIndex) => (
                <input 
                  key={oIndex} 
                  className="input-field" 
                  style={{ margin: '3px 0' }}
                  placeholder={`Valik ${oIndex + 1}`} 
                  value={opt} 
                  onChange={e => {
                    const updated = [...questionsList];
                    updated[qIndex].options[oIndex] = e.target.value;
                    setQuestionsList(updated);
                  }}
                  required
                />
              ))}
              <label style={{ fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Õige vastus (0-3):
                <select 
                  style={{ marginLeft: '10px', padding: '5px' }}
                  value={q.correctIndex} 
                  onChange={e => {
                    const updated = [...questionsList];
                    updated[qIndex].correctIndex = e.target.value;
                    setQuestionsList(updated);
                  }}
                >
                  <option value={0}>Valik 1 (▲)</option>
                  <option value={1}>Valik 2 (◆)</option>
                  <option value={2}>Valik 3 (●)</option>
                  <option value={3}>Valik 4 (■)</option>
                </select>
              </label>
            </div>
          ))}

          <button 
            type="button" 
            className="btn-kahoot blue" 
            onClick={() => setQuestionsList([...questionsList, { text: '', options: ['', '', '', ''], correctIndex: 0 }])}
          >
            + Lisa küsimus
          </button>

          <button type="submit" className="btn-kahoot green" style={{ marginTop: '10px' }}>
            Salvesta viktoriin
          </button>

          <button type="button" className="btn-kahoot red" style={{ marginTop: '10px' }} onClick={() => setView('quizzes')}>
            Tühista
          </button>
        </form>
      </div>
    );
  }

  if (view === 'lobby' && activeGame) {
    const joinUrl = encodeURIComponent(`${window.location.origin}/play?code=${activeGame.code}`);
    return (
      <div className="kahoot-page">
        <header className="top-bar">
          <div>PIN: <h1>{activeGame.code}</h1></div>
          <button className="btn-kahoot green" onClick={handleNextState}>Alusta mängu</button>
        </header>
        <main className="lobby-body">
          <div className="qr-card">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${joinUrl}&color=46178f`} alt="QR" />
          </div>
          <div className="players-card">
            <h2>Mängijad ({players.length})</h2>
            <div className="chips-grid">
              {players.map(p => <span key={p.id} className="player-chip">{p.nickname}</span>)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'game' && activeGame) {
    const currentQ = gameQuestions.find(q => q.id === activeGame.currentQuestion);
    return (
      <div className="kahoot-page">
        <header className="top-bar">
          <h2>Küsimus ({gameQuestions.findIndex(q => q.id === currentQ?.id) + 1}/{gameQuestions.length})</h2>
          <div>Vastuseid: {answers.length}</div>
          <button className="btn-kahoot green" onClick={handleNextState}>
            {activeGame.status === 'question' ? 'Tulemused ➔' : 'Järgmine ➔'}
          </button>
        </header>
        <main className="game-body">
          {activeGame.status === 'question' && (
            <div className="question-view">
              <h1 className="q-title">{currentQ?.text}</h1>
              <div className="host-options-grid">
                {currentQ?.options?.map((opt, i) => (
                  <div key={i} className={`host-opt-card opt-${i}`}>
                    <span className="shape">{['▲', '◆', '●', '■'][i]}</span> {opt}
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeGame.status === 'results' && (
            <div className="results-view">
              <h1>Vastuste jaotus</h1>
              <div className="bars-container">
                {[0, 1, 2, 3].map(idx => {
                  const count = answers.filter(a => a.optionIndex === idx).length;
                  return (
                    <div key={idx} className="bar-wrapper">
                      <span>{count}</span>
                      <div className={`bar opt-${idx}`} style={{ height: `${Math.max(count * 30, 15)}px` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeGame.status === 'finished' && (
            <div className="leaderboard-view">
              <h1>Lõpp-edetabel</h1>
              <button className="btn-kahoot dark" onClick={() => setView('quizzes')}>Tagasi menüüsse</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="kahoot-page center-content">
      <div className="main-card">
        <h2>Minu viktoriinid ({user.name || user.email})</h2>
        
        {quizzes.length === 0 ? (
          <p style={{ margin: '15px 0', color: '#666' }}>Viktoriine ei leitud.</p>
        ) : (
          quizzes.map(q => (
            <div key={q.id} className="quiz-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>{q.title}</strong>
              <button className="btn-kahoot green" onClick={() => handleStartGameSession(q)}>Alusta</button>
            </div>
          ))
        )}

        <button className="btn-kahoot purple" style={{ marginTop: '15px' }} onClick={() => setView('create_quiz')}>
          + Loo uus viktoriin
        </button>

        <button className="btn-kahoot red" style={{ marginTop: '10px' }} onClick={() => { pb.authStore.clear(); setUser(null); }}>
          Logi välja
        </button>

        <button className="btn-kahoot dark" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>
          Pealehele
        </button>
      </div>
    </div>
  );
}

// ------------------- 3. PLAYER VIEW (/play) -------------------
function PlayRoute({ navigate }) {
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [currentQuestionData, setCurrentQuestionData] = useState(null);

  useEffect(() => {
    const savedPlayerId = localStorage.getItem('kahoot_player_id');
    if (savedPlayerId) {
      pb.collection('players').getOne(savedPlayerId).then(p => {
        setPlayer(p);
        pb.collection('games').getOne(p.game).then(setGame);
      }).catch(() => localStorage.removeItem('kahoot_player_id'));
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) setCode(params.get('code'));
  }, []);

  useEffect(() => {
    if (!game?.currentQuestion) return;
    
    pb.collection('questions')
      .getOne(game.currentQuestion)
      .then(setCurrentQuestionData)
      .catch(console.error);
  }, [game?.currentQuestion]);

  useEffect(() => {
    if (!game?.id) return;

    pb.collection('games').unsubscribe(game.id);

    pb.collection('games').subscribe(game.id, (e) => {
      if (e.action === 'update') {
        setGame(prevGame => {
          if (
            e.record.currentQuestion !== prevGame?.currentQuestion ||
            (e.record.status === 'question' && prevGame?.status !== 'question')
          ) {
            setHasAnswered(false);
          }
          return e.record;
        });
      }
    });

    return () => { pb.collection('games').unsubscribe(game.id); };
  }, [game?.id]);

  const handleJoin = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanNick = nickname.trim();

    try {
      const g = await pb.collection('games').getFirstListItem(`code="${cleanCode}"`);
      
      const p = await pb.collection('players').create({
        game: g.id,
        nickname: cleanNick,
        score: 0
      });
      
      localStorage.setItem('kahoot_player_id', p.id);
      setGame(g);
      setPlayer(p);
    } catch (err) { 
      console.error('Liitumise viga:', err);
      alert(`Liitumine ebaõnnestus! Veendu, et mäng on ooteruumis (lobby) ja kood on õige.\nViga: ${err.message}`); 
    }
  };

  const handleSendAnswer = async (optionIndex) => {
    if (hasAnswered || !game || !game.currentQuestion || !player) return;

    try {
      await pb.collection('answers').create({
        game: game.id,
        player: player.id,
        question: game.currentQuestion,
        optionIndex
      });
      setHasAnswered(true);
    } catch (e) { 
      alert('Vastuse saatmine ebaõnnestus (aeg sai läbi või küsimus on muutunud): ' + e.message); 
    }
  };

  if (!player || !game) {
    return (
      <div className="kahoot-page center-content">
        <form className="main-card" onSubmit={handleJoin}>
          <h2>Liitu mänguga</h2>
          <input className="input-field" placeholder="PIN Kood" value={code} onChange={e=>setCode(e.target.value)} required />
          <input className="input-field" placeholder="Sinu hüüdnimi" value={nickname} onChange={e=>setNickname(e.target.value)} required />
          <button className="btn-kahoot dark" type="submit">Sisene</button>
          <button type="button" className="btn-kahoot red" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>
            Tagasi
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="kahoot-page">
      {game.status === 'lobby' && (
        <div className="kahoot-page center-content">
          <div className="status-card">
            <h2>Oled mängus, {player.nickname}! 👋</h2>
            <p>Oota, kuni õpetaja alustab mängu...</p>
          </div>
        </div>
      )}

      {game.status === 'question' && (
        hasAnswered ? (
          <div className="kahoot-page center-content">
            <div className="status-card">
              <h2>Vastus edastatud! 👍</h2>
              <p>Oota tulemusi...</p>
            </div>
          </div>
        ) : (
          <div className="kahoot-page">
            <header className="top-bar">
              <h2>Mängija: {player.nickname}</h2>
            </header>
            <main className="game-body">
              <div className="question-view">
                <h1 className="q-title">{currentQuestionData?.text || 'Laen küsimust...'}</h1>
                <div className="host-options-grid">
                  {currentQuestionData?.options?.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`host-opt-card opt-${i}`}
                      onClick={() => handleSendAnswer(i)}
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        font: 'inherit'
                      }}
                    >
                      <span className="shape">{['▲', '◆', '●', '■'][i]}</span> {opt}
                    </button>
                  ))}
                </div>
              </div>
            </main>
          </div>
        )
      )}

      {(game.status === 'results' || game.status === 'finished') && (
        <div className="kahoot-page center-content">
          <div className="status-card">
            <h2>Aeg läbi!</h2>
            <p>Vaata tulemusi suurelt ekraanilt.</p>
          </div>
        </div>
      )}
    </div>
  );
}
