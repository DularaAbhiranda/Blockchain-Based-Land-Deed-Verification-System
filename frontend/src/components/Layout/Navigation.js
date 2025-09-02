// frontend/src/components/Layout/Navigation.js - Navigation component
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navigation.css';

const Navigation = ({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'citizen': 'Citizen',
      'government_official': 'Government Official',
      'bank_official': 'Bank Official',
      'legal_professional': 'Legal Professional',
      'admin': 'Administrator'
    };
    return roleNames[role] || role;
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/dashboard">
            <h2>🏠 Land Registry</h2>
          </Link>
        </div>

        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>
            Dashboard
          </Link>
          
          <Link to="/deeds/search" className="nav-link" onClick={() => setIsMenuOpen(false)}>
            Search Deeds
          </Link>
          
          {(user.role === 'government_official' || user.role === 'legal_professional') && (
            <Link to="/deeds/create" className="nav-link" onClick={() => setIsMenuOpen(false)}>
              Create Deed
            </Link>
          )}
        </div>

        <div className="nav-user">
          <div className="user-info">
            <span className="user-name">{user.full_name}</span>
            <span className="user-role">{getRoleDisplayName(user.role)}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>

        <div className="nav-toggle" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
