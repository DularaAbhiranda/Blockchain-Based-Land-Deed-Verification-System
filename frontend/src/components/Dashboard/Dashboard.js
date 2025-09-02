// frontend/src/components/Dashboard/Dashboard.js - Dashboard component
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import deedService from '../../services/deedService';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalDeeds: 0,
    verifiedDeeds: 0,
    pendingDeeds: 0,
    recentDeeds: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // For now, we'll use mock data since we don't have stats endpoints yet
      // In a real implementation, you'd call an API endpoint for dashboard stats
      const mockStats = {
        totalDeeds: 1250,
        verifiedDeeds: 1180,
        pendingDeeds: 70,
        recentDeeds: [
          { id: 1, deed_number: 'DEED001', title: 'Residential Property', status: 'verified', created_at: '2024-01-15' },
          { id: 2, deed_number: 'DEED002', title: 'Commercial Building', status: 'pending', created_at: '2024-01-14' },
          { id: 3, deed_number: 'DEED003', title: 'Agricultural Land', status: 'verified', created_at: '2024-01-13' }
        ]
      };
      setStats(mockStats);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleSpecificContent = () => {
    switch (user.role) {
      case 'citizen':
        return (
          <div className="role-section">
            <h3>Citizen Dashboard</h3>
            <p>View and manage your land deeds. Search for property information and track verification status.</p>
            <div className="quick-actions">
              <Link to="/deeds/search" className="action-card">
                <h4>🔍 Search Deeds</h4>
                <p>Find property information</p>
              </Link>
            </div>
          </div>
        );

      case 'government_official':
        return (
          <div className="role-section">
            <h3>Government Official Dashboard</h3>
            <p>Manage land registry operations, verify deeds, and oversee the system.</p>
            <div className="quick-actions">
              <Link to="/deeds/create" className="action-card">
                <h4>📝 Create Deed</h4>
                <p>Register new land deeds</p>
              </Link>
              <Link to="/deeds/search" className="action-card">
                <h4>🔍 Search & Verify</h4>
                <p>Review and verify deeds</p>
              </Link>
            </div>
          </div>
        );

      case 'legal_professional':
        return (
          <div className="role-section">
            <h3>Legal Professional Dashboard</h3>
            <p>Access legal documents, verify deeds, and provide legal consultation.</p>
            <div className="quick-actions">
              <Link to="/deeds/create" className="action-card">
                <h4>📝 Create Deed</h4>
                <p>Register new land deeds</p>
              </Link>
              <Link to="/deeds/search" className="action-card">
                <h4>🔍 Search & Verify</h4>
                <p>Review and verify deeds</p>
              </Link>
            </div>
          </div>
        );

      case 'bank_official':
        return (
          <div className="role-section">
            <h3>Bank Official Dashboard</h3>
            <p>Access deed information for loan processing and property verification.</p>
            <div className="quick-actions">
              <Link to="/deeds/search" className="action-card">
                <h4>🔍 Search Deeds</h4>
                <p>Verify property ownership</p>
              </Link>
            </div>
          </div>
        );

      default:
        return (
          <div className="role-section">
            <h3>Welcome to Land Registry</h3>
            <p>Access the system features based on your role.</p>
          </div>
        );
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user.full_name}!</h1>
        <p>Role: {user.role.replace('_', ' ').toUpperCase()}</p>
      </div>

      <div className="dashboard-content">
        <div className="stats-section">
          <h2>System Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.totalDeeds}</h3>
              <p>Total Deeds</p>
            </div>
            <div className="stat-card">
              <h3>{stats.verifiedDeeds}</h3>
              <p>Verified Deeds</p>
            </div>
            <div className="stat-card">
              <h3>{stats.pendingDeeds}</h3>
              <p>Pending Verification</p>
            </div>
          </div>
        </div>

        {getRoleSpecificContent()}

        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {stats.recentDeeds.map(deed => (
              <div key={deed.id} className="activity-item">
                <div className="activity-content">
                  <h4>{deed.deed_number}</h4>
                  <p>{deed.title}</p>
                  <span className={`status ${deed.status}`}>{deed.status}</span>
                </div>
                <div className="activity-date">
                  {new Date(deed.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
