import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import Auth from './components/Auth';
import MeetingScheduler from './components/MeetingScheduler';
import MeetingDashboard from './components/MeetingDashboard';
import Navigation from './components/Navigation';
import './App.css';

const App: React.FC = () => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading Teams Meeting Scheduler...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Teams Meeting Scheduler</h1>
          <p>Automatically join your Microsoft Teams meetings</p>
        </header>
        <Auth />
      </div>
    );
  }

  return (
    <div className="app">
      <Router>
        <Auth />
        <Navigation />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/schedule" element={<MeetingScheduler />} />
            <Route path="/dashboard" element={<MeetingDashboard />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
};

export default App;
