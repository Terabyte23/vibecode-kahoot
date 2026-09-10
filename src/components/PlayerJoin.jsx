import React, { useState, useEffect } from 'react';

export function PlayerJoin({ onJoin }) {
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    if (codeFromUrl) {
      setCode(codeFromUrl.toUpperCase());
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code || !nickname) return;

    const playerData = {
      id: 'local_' + Date.now(),
      gameCode: code,
      nickname: nickname
    };
    localStorage.setItem('kahoot_player', JSON.stringify(playerData));
    
    onJoin(playerData);
  };

  return (
    <div className="join-container">
      <h1 className="brand-logo">Kahoot!</h1>
      <form className="join-card" onSubmit={handleSubmit}>
        <input
          type="text"
          className="kahoot-input"
          placeholder="Mängu kood"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
        <input
          type="text"
          className="kahoot-input"
          placeholder="Mängija nimi"
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
        <button type="submit" className="btn-submit">Sisene</button>
      </form>
    </div>
  );
}