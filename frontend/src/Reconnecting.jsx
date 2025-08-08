// src/pages/Reconnecting.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Reconnecting() {
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      if (!navigator.onLine) return;

      fetch(`/api/auth/me`, {
        method: "GET",
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error("Not logged in");
          return res.json();
        })
        .then((data) => {
          navigate("/game");
        })
        .catch(() => navigate("/"));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="centered">
      <h2>Trying to reconnect...</h2>
      <p>We’re waiting for your internet connection to return...</p>
    </div>
  );
}