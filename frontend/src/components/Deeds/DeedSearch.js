// frontend/src/components/Deeds/DeedSearch.js - Deed search component
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import deedService from '../../services/deedService';
import LoadingSpinner from '../UI/LoadingSpinner';
import './DeedSearch.css';

const DeedSearch = ({ user }) => {
  const [searchParams, setSearchParams] = useState({
    query: '',
    owner_name: '',
    property_address: '',
    verification_status: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const searchData = {
        ...searchParams,
        page,
        limit: pagination.limit
      };

      // Remove empty parameters
      Object.keys(searchData).forEach(key => {
        if (searchData[key] === '') {
          delete searchData[key];
        }
      });

      const response = await deedService.searchDeeds(searchData);
      setSearchResults(response.deeds);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(1);
  };

  const handlePageChange = (newPage) => {
    handleSearch(newPage);
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

  return (
    <div className="deed-search">
      <div className="search-header">
        <h1>Search Land Deeds</h1>
        <p>Find and verify land deed information</p>
      </div>

      <div className="search-container">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-fields">
            <div className="form-group">
              <label htmlFor="query">Search Term</label>
              <input
                type="text"
                id="query"
                name="query"
                value={searchParams.query}
                onChange={handleInputChange}
                placeholder="Deed number or title..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="owner_name">Owner Name</label>
              <input
                type="text"
                id="owner_name"
                name="owner_name"
                value={searchParams.owner_name}
                onChange={handleInputChange}
                placeholder="Owner's full name..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="property_address">Property Address</label>
              <input
                type="text"
                id="property_address"
                name="property_address"
                value={searchParams.property_address}
                onChange={handleInputChange}
                placeholder="Property address..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="verification_status">Verification Status</label>
              <select
                id="verification_status"
                name="verification_status"
                value={searchParams.verification_status}
                onChange={handleInputChange}
              >
                <option value="">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="search-actions">
            <button type="submit" disabled={loading} className="search-button">
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setSearchParams({
                  query: '',
                  owner_name: '',
                  property_address: '',
                  verification_status: ''
                });
                setSearchResults([]);
                setError('');
              }}
              className="clear-button"
            >
              Clear
            </button>
          </div>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading && <LoadingSpinner />}

        {searchResults.length > 0 && (
          <div className="search-results">
            <div className="results-header">
              <h3>Search Results</h3>
              <p>Found {pagination.total} deed(s)</p>
            </div>

            <div className="results-grid">
              {searchResults.map(deed => (
                <div key={deed.id} className="deed-card">
                  <div className="deed-header">
                    <h4>{deed.deed_number}</h4>
                    {getStatusBadge(deed.verification_status)}
                  </div>
                  
                  <div className="deed-content">
                    <p className="deed-title">{deed.title}</p>
                    <p className="deed-address">{deed.property_address}</p>
                    <p className="deed-extent">{deed.extent}</p>
                    {deed.owner_name && (
                      <p className="deed-owner">Owner: {deed.owner_name}</p>
                    )}
                  </div>

                  <div className="deed-footer">
                    <p className="deed-date">
                      Created: {new Date(deed.created_at).toLocaleDateString()}
                    </p>
                    <Link 
                      to={`/deeds/${deed.deed_number}`} 
                      className="view-button"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="page-button"
                >
                  Previous
                </button>
                
                <span className="page-info">
                  Page {pagination.page} of {pagination.pages}
                </span>
                
                <button 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="page-button"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && searchResults.length === 0 && !error && (
          <div className="no-results">
            <p>No deeds found. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeedSearch;