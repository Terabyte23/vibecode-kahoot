import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function HostLobby({ gameCode, players, onStartGame }) {
  const joinUrl = `${window.location.origin}/play?code=${gameCode}`;

  return (
    <div className="host-lobby">
      <header className="top-bar">
        <div className="join-info">
          <p>Liitumiseks skänni QR-kood või mine <strong>kahoot.it</strong></p>
        </div>
        <div className="pin-display">
          <span>Mängu kood:</span>
          <h1>{gameCode}</h1>
        </div>
        <button className="btn-start" onClick={onStartGame}>
          Alusta mängu
        </button>
      </header>

      <main className="lobby-content">
        <div className="qr-box">
          <QRCodeSVG 
            value={joinUrl} 
            size={220}
            bgColor={"#ffffff"}
            fgColor={"#46178f"}
            level={"H"}
            includeMargin={true}
          />
          <p className="qr-text">Skänni ja liitu!</p>
        </div>

        <div className="players-container">
          <h2>Mängijad ({players.length})</h2>
          <div className="players-grid">
            {players.map((player) => (
              <div key={player.id} className="player-chip">
                {player.nickname}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}