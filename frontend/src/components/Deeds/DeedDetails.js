// frontend/src/components/Deeds/DeedDetails.js - Deed details component
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import deedService from '../../services/deedService';
import LoadingSpinner from '../UI/LoadingSpinner';
import './DeedDetails.css';

const DeedDetails = ({ user }) => {
  const { deedNumber } = useParams();
  const navigate = useNavigate();
  const [deed, setDeed] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);

  useEffect(() => {
    loadDeedDetails();
  }, [deedNumber]);

  const loadDeedDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await deedService.getDeedByNumber(deedNumber);
      setDeed(response.deed);
      setBlockchainData(response.blockchain);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (verificationResult) => {
    if (!deed || (user.role !== 'government_official' && user.role !== 'legal_professional')) {
      return;
    }

    setVerificationLoading(true);
    try {
      const verificationData = {
        verification_result: verificationResult,
        notes: `Verified by ${user.full_name} (${user.role})`
      };

      await deedService.verifyDeed(deed.id, verificationData);
      await loadDeedDetails(); // Reload to get updated data
    } catch (err) {
      setError(err.message);
    } finally {
      setVerificationLoading(false);
    }
  };

  const downloadDocument = async () => {
    if (!deed || !deed.ipfs_hash) {
      setError('Document not available for download');
      return;
    }

    try {
      const blob = await deedService.downloadDocument(deed.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deed-${deed.deed_number}-document.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download document');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'verified': 'status-verified',
      'pending': 'status-pending',
      'rejected': 'status-rejected'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-default'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="deed-details">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/deeds/search')} className="back-button">
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  if (!deed) {
    return (
      <div className="deed-details">
        <div className="error-container">
          <h2>Deed Not Found</h2>
          <p>The requested deed could not be found.</p>
          <button onClick={() => navigate('/deeds/search')} className="back-button">
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="deed-details">
      <div className="deed-header">
        <div className="header-content">
          <h1>Deed Details</h1>
          <p>Deed Number: {deed.deed_number}</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/deeds/search')} className="back-button">
            ← Back to Search
          </button>
        </div>
      </div>

      <div className="deed-content">
        <div className="deed-info">
          <div className="info-section">
            <h3>Basic Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Deed Number</label>
                <span>{deed.deed_number}</span>
              </div>
              <div className="info-item">
                <label>Title</label>
                <span>{deed.title}</span>
              </div>
              <div className="info-item">
                <label>Property Address</label>
                <span>{deed.property_address}</span>
              </div>
              <div className="info-item">
                <label>Extent</label>
                <span>{deed.extent}</span>
              </div>
              {deed.survey_plan_number && (
                <div className="info-item">
                  <label>Survey Plan Number</label>
                  <span>{deed.survey_plan_number}</span>
                </div>
              )}
              {deed.boundaries && (
                <div className="info-item">
                  <label>Boundaries</label>
                  <span>{deed.boundaries}</span>
                </div>
              )}
            </div>
          </div>

          <div className="info-section">
            <h3>Ownership Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Owner</label>
                <span>{deed.owner_name || 'Not specified'}</span>
              </div>
              <div className="info-item">
                <label>Owner Email</label>
                <span>{deed.owner_email || 'Not specified'}</span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Status & Verification</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Verification Status</label>
                <span>{getStatusBadge(deed.verification_status)}</span>
              </div>
              {deed.verified_by_name && (
                <div className="info-item">
                  <label>Verified By</label>
                  <span>{deed.verified_by_name}</span>
                </div>
              )}
              {deed.verified_at && (
                <div className="info-item">
                  <label>Verified At</label>
                  <span>{formatDate(deed.verified_at)}</span>
                </div>
              )}
              <div className="info-item">
                <label>Created At</label>
                <span>{formatDate(deed.created_at)}</span>
              </div>
              <div className="info-item">
                <label>Last Updated</label>
                <span>{formatDate(deed.updated_at)}</span>
              </div>
            </div>
          </div>

          {deed.description && (
            <div className="info-section">
              <h3>Description</h3>
              <p className="description">{deed.description}</p>
            </div>
          )}
        </div>

        <div className="deed-actions">
          <div className="action-section">
            <h3>Actions</h3>
            
            {deed.ipfs_hash && (
              <button onClick={downloadDocument} className="action-button download">
                📄 Download Document
              </button>
            )}

            {(user.role === 'government_official' || user.role === 'legal_professional') && 
             deed.verification_status === 'pending' && (
              <div className="verification-actions">
                <h4>Verification Actions</h4>
                <div className="verification-buttons">
                  <button 
                    onClick={() => handleVerification('verified')}
                    disabled={verificationLoading}
                    className="action-button verify"
                  >
                    {verificationLoading ? 'Verifying...' : '✓ Verify Deed'}
                  </button>
                  <button 
                    onClick={() => handleVerification('rejected')}
                    disabled={verificationLoading}
                    className="action-button reject"
                  >
                    {verificationLoading ? 'Processing...' : '✗ Reject Deed'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {blockchainData && (
            <div className="action-section">
              <h3>Blockchain Information</h3>
              <div className="blockchain-info">
                <div className="info-item">
                  <label>Blockchain Status</label>
                  <span className="blockchain-status">Connected</span>
                </div>
                {blockchainData.transactionId && (
                  <div className="info-item">
                    <label>Transaction ID</label>
                    <span className="transaction-id">{blockchainData.transactionId}</span>
                  </div>
                )}
                {blockchainData.blockNumber && (
                  <div className="info-item">
                    <label>Block Number</label>
                    <span>{blockchainData.blockNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeedDetails;