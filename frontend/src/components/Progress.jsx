import React, { useEffect, useState } from 'react';

const Leaderboard = () => {
  const [players, setPlayers] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const fetchData = () => {
    fetch('/api/gameProgress/viewPlayerProgressAll')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        return res.json();
      })
      .then(data => setPlayers(data))
      .catch(() => setPlayers([])); 
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 30000);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!players.length) return null;

  return (
    <div className="leaderboard-box">
      <h2 className="leaderboard-title">Leaderboard</h2>
      {!isOnline && (
        <p style={{ color: 'gray', fontStyle: 'italic', marginBottom: '10px' }}>
          You're offline — trying to fetch leaderboard data…
        </p>
      )}
      <ul className="leaderboard-list">
        {players.map(({ username, levelFinished, timePlayed }, index) => (
          <li key={username} className="leaderboard-entry">
            <div className="leaderboard-rank">
              {index + 1}. {username}
            </div>
            <div>Level Finished: {levelFinished}</div>
            <div>Time Played: {Math.floor(timePlayed / 60)}m {timePlayed % 60}s</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;