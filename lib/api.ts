/**
 * API client for communicating with the backend
 */
class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Upload a file for scanning
   * @param {File} file - The file to upload
   * @returns {Promise<Object>} - Response with scanId
   */
  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('codeFile', file);

    const response = await fetch(`${this.baseUrl}/scan/file`, {
      method: 'POST',
      body: formData,
    });

    return this._handleResponse(response);
  }

  /**
   * Scan a GitHub repository
   * @param {string} repoUrl - GitHub repository URL
   * @returns {Promise<Object>} - Response with scanId
   */
  async scanRepository(repoUrl: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/scan/repo`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ repoUrl }),
    });

    return this._handleResponse(response);
  }

  /**
   * Get the status of a scan
   * @param {string} scanId - The scan ID
   * @returns {Promise<Object>} - Scan status
   */
  async getScanStatus(scanId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/scan/status/${scanId}`, {
      method: 'GET',
      headers: this.headers,
    });

    return this._handleResponse(response);
  }

  /**
   * Get the results of a scan
   * @param {string} scanId - The scan ID
   * @returns {Promise<Object>} - Scan results
   */
  async getScanResults(scanId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/scan/results/${scanId}`, {
      method: 'GET',
      headers: this.headers,
    });

    return this._handleResponse(response);
  }

  /**
   * Get a report for a scan
   * @param {string} scanId - The scan ID
   * @returns {Promise<Object>} - Report data
   */
  async getReport(scanId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/report/${scanId}`, {
      method: 'GET',
      headers: this.headers,
    });

    return this._handleResponse(response);
  }

  /**
   * Get a PDF report for a scan
   * @param {string} scanId - The scan ID
   * @returns {Promise<Blob>} - PDF data as blob
   */
  async getPdfReport(scanId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/report/${scanId}/pdf`, {
      method: 'GET',
      headers: {
        ...this.headers,
        'Accept': 'application/pdf',
      },
    });

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.blob();
  }

  /**
   * Get API usage statistics
   * @returns {Promise<Object>} - Usage statistics
   */
  async getUsageStats() {
    const response = await fetch(`${this.baseUrl}/usage/stats`, {
      method: 'GET',
      headers: this.headers,
    });

    return this._handleResponse(response);
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch API response
   * @returns {Promise<Object>} - Parsed response data
   */
  async _handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      } catch (e) {
        throw new Error(`API error: ${response.status}`);
      }
    }

    return await response.json();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();