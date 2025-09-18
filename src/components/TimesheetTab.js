import React, { useState, useEffect, useCallback } from 'react';
import AccService from '../services/AccService';

const TimesheetTab = () => {
  const [selectedHub, setSelectedHub] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state for new timesheet
  const [newTimesheet, setNewTimesheet] = useState({
    budgetCode: '',
    startDate: '',
    endDate: '',
    inputQuantity: '',
    outputQuantity: '',
    description: ''
  });

  // Load hubs on component mount
  useEffect(() => {
    loadHubs();
  }, []);

  const loadHubs = async () => {
    try {
      const hubsData = await AccService.getHubs();
      setHubs(hubsData);
    } catch (error) {
      console.error('Error loading hubs:', error);
    }
  };

  const loadProjects = async (hubId) => {
    try {
      setIsLoading(true);
      const projectsData = await AccService.getProjects(hubId);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBudgets = async (projectId) => {
    try {
      setIsLoading(true);
      const budgetsData = await AccService.getBudgets(projectId);
      setBudgets(budgetsData);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimesheets = async (projectId) => {
    try {
      setIsLoading(true);
      const timesheetsData = await AccService.getTimesheets(projectId);
      setTimesheets(timesheetsData);
    } catch (error) {
      console.error('Error loading timesheets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHubChange = (hubId) => {
    const hub = hubs.find(h => h.id === hubId);
    setSelectedHub(hub);
    setSelectedProject(null);
    setProjects([]);
    setBudgets([]);
    setTimesheets([]);
    if (hub) {
      loadProjects(hub.id);
    }
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project);
    setBudgets([]);
    setTimesheets([]);
    if (project) {
      loadBudgets(project.id);
      loadTimesheets(project.id);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTimesheet(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBudgetSelect = (budget) => {
    setNewTimesheet(prev => ({
      ...prev,
      budgetCode: budget.budgetCode || budget.code
    }));
  };

  const submitTimesheet = async (e) => {
    e.preventDefault();
    
    if (!selectedProject) {
      alert('Please select a project');
      return;
    }

    if (!newTimesheet.budgetCode || !newTimesheet.startDate || !newTimesheet.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      await AccService.createTimesheet(selectedProject.id, {
        budgetCode: newTimesheet.budgetCode,
        startDate: newTimesheet.startDate,
        endDate: newTimesheet.endDate,
        inputQuantity: parseFloat(newTimesheet.inputQuantity) || 0,
        outputQuantity: parseFloat(newTimesheet.outputQuantity) || 0,
        description: newTimesheet.description
      });

      // Reload timesheets
      await loadTimesheets(selectedProject.id);
      
      // Reset form
      setNewTimesheet({
        budgetCode: '',
        startDate: '',
        endDate: '',
        inputQuantity: '',
        outputQuantity: '',
        description: ''
      });

      alert('Timesheet created successfully!');
    } catch (error) {
      console.error('Error creating timesheet:', error);
      alert('Error creating timesheet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimesheet = async (timesheetId, updates) => {
    try {
      setIsLoading(true);
      await AccService.updateTimesheet(selectedProject.id, timesheetId, updates);
      await loadTimesheets(selectedProject.id);
      alert('Timesheet updated successfully!');
    } catch (error) {
      console.error('Error updating timesheet:', error);
      alert('Error updating timesheet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTimesheet = async (timesheetId) => {
    if (!window.confirm('Are you sure you want to delete this timesheet?')) {
      return;
    }

    try {
      setIsLoading(true);
      await AccService.deleteTimesheet(selectedProject.id, timesheetId);
      await loadTimesheets(selectedProject.id);
      alert('Timesheet deleted successfully!');
    } catch (error) {
      console.error('Error deleting timesheet:', error);
      alert('Error deleting timesheet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="timesheet-tab">
      <h2>Timesheet Management</h2>
      
      {/* Project Selection */}
      <div className="project-selection">
        <div className="selection-group">
          <label>Select Hub:</label>
          <select 
            value={selectedHub?.id || ''} 
            onChange={(e) => handleHubChange(e.target.value)}
            className="hub-select"
          >
            <option value="">Select Hub</option>
            {hubs.map(hub => (
              <option key={hub.id} value={hub.id}>{hub.name}</option>
            ))}
          </select>
        </div>

        {selectedHub && (
          <div className="selection-group">
            <label>Select Project:</label>
            <select 
              value={selectedProject?.id || ''} 
              onChange={(e) => handleProjectChange(e.target.value)}
              className="project-select"
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedProject && (
        <>
          {/* Create New Timesheet */}
          <div className="create-timesheet">
            <h3>Create New Timesheet</h3>
            <form onSubmit={submitTimesheet} className="timesheet-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Budget Code *</label>
                  <select
                    name="budgetCode"
                    value={newTimesheet.budgetCode}
                    onChange={handleInputChange}
                    required
                    className="budget-select"
                  >
                    <option value="">Select Budget</option>
                    {budgets.map(budget => (
                      <option key={budget.id} value={budget.budgetCode || budget.code}>
                        {budget.name} ({budget.budgetCode || budget.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={newTimesheet.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={newTimesheet.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Input Quantity (Hours)</label>
                  <input
                    type="number"
                    name="inputQuantity"
                    value={newTimesheet.inputQuantity}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Output Quantity</label>
                  <input
                    type="number"
                    name="outputQuantity"
                    value={newTimesheet.outputQuantity}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={newTimesheet.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Enter timesheet description..."
                />
              </div>

              <button type="submit" disabled={isLoading} className="submit-button">
                {isLoading ? 'Creating...' : 'Create Timesheet'}
              </button>
            </form>
          </div>

          {/* Existing Timesheets */}
          <div className="existing-timesheets">
            <h3>Existing Timesheets ({timesheets.length})</h3>
            
            {timesheets.length > 0 ? (
              <div className="timesheets-table">
                <table>
                  <thead>
                    <tr>
                      <th>Budget Code</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Input Qty</th>
                      <th>Output Qty</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.map(timesheet => (
                      <tr key={timesheet.id}>
                        <td>{timesheet.budgetCode}</td>
                        <td>{new Date(timesheet.startDate).toLocaleDateString()}</td>
                        <td>{new Date(timesheet.endDate).toLocaleDateString()}</td>
                        <td>{timesheet.inputQuantity}</td>
                        <td>{timesheet.outputQuantity}</td>
                        <td>{timesheet.creatorId}</td>
                        <td>
                          <button 
                            onClick={() => updateTimesheet(timesheet.id, {
                              inputQuantity: timesheet.inputQuantity + 1
                            })}
                            className="update-button"
                          >
                            Update
                          </button>
                          <button 
                            onClick={() => deleteTimesheet(timesheet.id)}
                            className="delete-button"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No timesheets found for this project.</p>
            )}
          </div>

          {/* Budget Performance Summary */}
          {budgets.length > 0 && (
            <div className="budget-performance">
              <h3>Budget Performance Summary</h3>
              <div className="performance-grid">
                {budgets.map(budget => {
                  const budgetTimesheets = timesheets.filter(t => t.budgetCode === (budget.budgetCode || budget.code));
                  const totalInputQty = budgetTimesheets.reduce((sum, t) => sum + (parseFloat(t.inputQuantity) || 0), 0);
                  const totalOutputQty = budgetTimesheets.reduce((sum, t) => sum + (parseFloat(t.outputQuantity) || 0), 0);
                  
                  return (
                    <div key={budget.id} className="performance-card">
                      <h4>{budget.name}</h4>
                      <p><strong>Code:</strong> {budget.budgetCode || budget.code}</p>
                      <p><strong>Total Input Hours:</strong> {totalInputQty.toFixed(2)}</p>
                      <p><strong>Total Output:</strong> {totalOutputQty.toFixed(2)}</p>
                      <p><strong>Performance Ratio:</strong> {totalInputQty > 0 ? (totalOutputQty / totalInputQty).toFixed(2) : 'N/A'}</p>
                      <p><strong>Timesheet Entries:</strong> {budgetTimesheets.length}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default TimesheetTab;
