const API_BASE_URL = 'http://127.0.0.1:5000/api';

class FlowchartAPI {
  /**
   * Get all flowcharts from the server
   * @returns {Promise} Promise with flowchart list
   */
  static async getAllFlowcharts() {
    try {
      const response = await fetch(`${API_BASE_URL}/flowcharts`);
      if (!response.ok) {
        throw new Error('Failed to fetch flowcharts');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching flowcharts:', error);
      throw error;
    }
  }

  /**
   * Get a specific flowchart by ID
   * @param {string} id - The flowchart ID
   * @returns {Promise} Promise with flowchart data
   */
  static async getFlowchart(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/flowcharts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch flowchart');
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching flowchart with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new flowchart
   * @param {Object} flowchartData - The flowchart data
   * @returns {Promise} Promise with the created flowchart ID
   */
  static async createFlowchart(flowchartData) {
    try {
      const response = await fetch(`${API_BASE_URL}/flowcharts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flowchartData),
      });
      if (!response.ok) {
        throw new Error('Failed to create flowchart');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating flowchart:', error);
      throw error;
    }
  }

  /**
   * Update an existing flowchart
   * @param {string} id - The flowchart ID
   * @param {Object} flowchartData - The updated flowchart data
   * @returns {Promise} Promise with success status
   */
  static async updateFlowchart(id, flowchartData) {
    try {
      const response = await fetch(`${API_BASE_URL}/flowcharts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flowchartData),
      });
      if (!response.ok) {
        throw new Error('Failed to update flowchart');
      }
      return await response.json();
    } catch (error) {
      console.error(`Error updating flowchart with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a flowchart
   * @param {string} id - The flowchart ID to delete
   * @returns {Promise} Promise with success status
   */
  static async deleteFlowchart(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/flowcharts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete flowchart');
      }
      return await response.json();
    } catch (error) {
      console.error(`Error deleting flowchart with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Validate a flowchart
   * @param {string} id - The flowchart ID to validate
   * @returns {Promise} Promise with validation results
   */
}

export default FlowchartAPI;