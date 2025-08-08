// src/App.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import GameCanvas from "./components/GameCanvas.jsx";
import Progress from "./components/Progress.jsx"

export default function App({ username: propUsername, setInputUsername }) {
  const [username, setUsername] = useState(propUsername || null);
  const navigate = useNavigate();

  useEffect(() => {
    // If no username passed in props, try to fetch from /me
    if (!propUsername) {
      if (!navigator.onLine) {
        navigate("/reconnecting");
        return;
      }
      fetch(`/api/auth/me`, {
        method: "GET",
        credentials: "include", // important to send cookie
      })
        .then(res => {
          if (!res.ok) throw new Error("Not logged in");
          return res.json();
        })
        .then(data => {
          setUsername(data.username);
          if (setInputUsername) setInputUsername(data.username); // update parent if needed
        })
        .catch(() => {
          console.error("Not authenticated, redirecting to login");
          navigate("/"); // redirect to login if not authenticated
        });
    }
  }, [propUsername]);

  if (!username) return null; // Optionally show a loading spinner

  return (
    <div>
      <div style={{ backgroundColor: "#222", padding: "0px 0" }}>
        <header className="logo-header">IRONKEEP</header>
      </div>

      <div className="canvas-leaderboard-container">
        <GameCanvas username={username} />
      </div>
    </div>
  );
}
