import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h2>Teams Scheduler</h2>
        </div>
        <div className="nav-links">
          <Link
            to="/dashboard"
            className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            to="/schedule"
            className={`nav-link ${location.pathname === '/schedule' ? 'active' : ''}`}
          >
            Schedule Meeting
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;