import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login.jsx';
import SignUp from './SignUp.jsx';
import App from './App.jsx';
import Reconnecting from './Reconnecting.jsx';

export default function Root() {
  const [username, setUsername] = useState('');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login setInputUsername={setUsername} />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/game"
          element={<App username={username} setInputUsername={setUsername} />}
        />
        <Route path="/reconnecting" element={<Reconnecting />} />
      </Routes>
    </BrowserRouter>
  );
}
