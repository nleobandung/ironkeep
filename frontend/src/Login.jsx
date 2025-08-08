import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; 
import CookieBanner from './components/CookieBanner.jsx';

export default function Login({ setInputUsername }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (res.ok) {
        alert('Logged in successfully!');
        setInputUsername(username);
        setUsername('');
        setPassword('');
        navigate('/game');
      } else {
        let errorMessage = 'Error trying to login';
        try {
          const data = await res.json();
          if (data && data.error) errorMessage = data.error;
        } catch (_) {
          // ignore JSON parse errors
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Network error, please try again.', error);
      alert('Network error, please try again.');
    }
  };

  return (
      <div className="loginpage">

    <div className="login-container">
      <div>
        < div className="login-card">
        <h2 >Login</h2> </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            
            <label className="signup-link">Username:</label>
            <br></br>
          
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="signup-link">Password:</label>
             <br></br>
             
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <br></br>

          <button type="submit" >Login</button>
        </form>

        <p className="signup-link">
          Don't have an account?{' '}
          <span
            role="button"
            aria-label="Create an account"
            onClick={() => navigate('/signup')}>
            Create an account
          </span>
        </p>
      </div>
    </div>
    <CookieBanner />
    </div>
  );
}
