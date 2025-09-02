// frontend/src/services/deedService.js - Deed management service
class DeedService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  async createDeed(deedData, document) {
    const formData = new FormData();
    
    // Append text fields
    Object.keys(deedData).forEach(key => {
      formData.append(key, deedData[key]);
    });
    
    // Append document if provided
    if (document) {
      formData.append('document', document);
    }

    const response = await fetch(`${this.baseURL}/api/deeds/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create deed');
    }

    return data;
  }

  async getDeedByNumber(deedNumber) {
    const response = await fetch(`${this.baseURL}/api/deeds/number/${deedNumber}`, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch deed');
    }

    return data;
  }

  async searchDeeds(searchParams) {
    const queryString = new URLSearchParams(searchParams).toString();
    
    const response = await fetch(`${this.baseURL}/api/deeds/search?${queryString}`, {
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Search failed');
    }

    return data;
  }

  async verifyDeed(deedId, verificationData) {
    const response = await fetch(`${this.baseURL}/api/deeds/${deedId}/verify`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Verification failed');
    }

    return data;
  }

  async downloadDocument(deedId) {
    const response = await fetch(`${this.baseURL}/api/deeds/${deedId}/document`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Download failed');
    }

    return response.blob();
  }
}

export default new DeedService();
