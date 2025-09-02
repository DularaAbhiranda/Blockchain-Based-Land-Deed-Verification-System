// frontend/src/components/Deeds/CreateDeed.js - Create deed component
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import deedService from '../../services/deedService';
import './CreateDeed.css';

const CreateDeed = ({ user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    deed_number: '',
    title: '',
    description: '',
    owner_id: '',
    property_address: '',
    survey_plan_number: '',
    extent: '',
    boundaries: ''
  });
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid file (PDF, JPEG, PNG, or GIF)');
        return;
      }
      
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      
      setDocument(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    const requiredFields = ['deed_number', 'title', 'owner_id', 'property_address', 'extent'];
    const missingFields = requiredFields.filter(field => !formData[field].trim());
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const response = await deedService.createDeed(formData, document);
      
      // Show success message and redirect
      alert('Deed created successfully!');
      navigate(`/deeds/${response.deed.deed_number}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="create-deed">
      <div className="create-header">
        <h1>Create New Deed</h1>
        <p>Register a new land deed in the blockchain system</p>
      </div>

      <div className="create-form-container">
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="deed_number">Deed Number *</label>
                <input
                  type="text"
                  id="deed_number"
                  name="deed_number"
                  value={formData.deed_number}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="e.g., DEED2024001"
                />
              </div>

              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="e.g., Residential Property"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={loading}
                  rows={4}
                  placeholder="Additional details about the property..."
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Property Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="owner_id">Owner ID *</label>
                <input
                  type="text"
                  id="owner_id"
                  name="owner_id"
                  value={formData.owner_id}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Owner's user ID"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="property_address">Property Address *</label>
                <textarea
                  id="property_address"
                  name="property_address"
                  value={formData.property_address}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  rows={3}
                  placeholder="Complete property address..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="survey_plan_number">Survey Plan Number</label>
                <input
                  type="text"
                  id="survey_plan_number"
                  name="survey_plan_number"
                  value={formData.survey_plan_number}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="Survey plan reference"
                />
              </div>

              <div className="form-group">
                <label htmlFor="extent">Property Extent *</label>
                <input
                  type="text"
                  id="extent"
                  name="extent"
                  value={formData.extent}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="e.g., 1000 sq ft"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="boundaries">Boundaries</label>
                <textarea
                  id="boundaries"
                  name="boundaries"
                  value={formData.boundaries}
                  onChange={handleInputChange}
                  disabled={loading}
                  rows={3}
                  placeholder="Property boundary descriptions..."
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Document Upload</h3>
            <div className="file-upload">
              <label htmlFor="document">Deed Document</label>
              <div className="file-input-container">
                <input
                  type="file"
                  id="document"
                  name="document"
                  onChange={handleFileChange}
                  disabled={loading}
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                />
                <div className="file-input-display">
                  {document ? (
                    <div className="file-selected">
                      <span className="file-icon">📄</span>
                      <span className="file-name">{document.name}</span>
                      <span className="file-size">
                        ({(document.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="file-placeholder">
                      <span className="file-icon">📁</span>
                      <span>Click to select document (PDF, JPG, PNG, GIF)</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="file-help">
                Supported formats: PDF, JPEG, PNG, GIF. Maximum size: 50MB
              </p>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="cancel-button" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Creating Deed...' : 'Create Deed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDeed;