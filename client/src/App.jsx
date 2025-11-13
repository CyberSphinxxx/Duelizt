import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Join from './pages/Join';
import Quiz from './pages/Quiz';
import Results from './pages/Results';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join/:roomId?" element={<Join />} />
        <Route path="/quiz/:roomId" element={<Quiz />} />
        <Route path="/results/:roomId" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
