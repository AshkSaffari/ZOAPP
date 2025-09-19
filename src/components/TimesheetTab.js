import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, FileText, Building2, ChevronDown, ChevronRight, Download } from 'lucide-react';
import AccService from '../services/AccService';
import jsPDF from 'jspdf';

const TimesheetTab = ({ selectedHub, projects }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [memberFilter, setMemberFilter] = useState('');
  const [filteredTimesheets, setFilteredTimesheets] = useState([]);
  const [localTimesheetData, setLocalTimesheetData] = useState({});
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Form state for new timesheet
  const [newTimesheet, setNewTimesheet] = useState({
    budgetCode: '',
    memberId: '',
    startDate: '',
    endDate: '',
    inputQuantity: '',
    outputQuantity: '',
    description: ''
  });

  // Initialize filtered projects when projects prop changes
  useEffect(() => {
    setFilteredProjects(projects);
  }, [projects]);

  // Filter projects based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [searchTerm, projects]);

  // Filter timesheets based on member
  useEffect(() => {
    if (!memberFilter.trim()) {
      setFilteredTimesheets(timesheets);
    } else {
      const filtered = timesheets.filter(timesheet => {
        const member = projectMembers.find(m => m.id === timesheet.memberId);
        const memberName = member ? (member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'Unknown') : 'Not assigned';
        return memberName.toLowerCase().includes(memberFilter.toLowerCase());
      });
      setFilteredTimesheets(filtered);
    }
  }, [memberFilter, timesheets, projectMembers]);

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

  const loadProjectMembers = async (projectId) => {
    try {
      const membersData = await AccService.getProjectMembers(projectId);
      setProjectMembers(membersData);
    } catch (error) {
      console.error('Error loading project members:', error);
    }
  };

  const loadTimesheets = async (projectId) => {
    try {
      setIsLoading(true);
      const timesheetsData = await AccService.getTimesheets(projectId);
      console.log('📊 Loaded timesheets data:', timesheetsData);
      if (timesheetsData && timesheetsData.length > 0) {
        console.log('📊 First timesheet structure:', timesheetsData[0]);
        console.log('📊 Available fields:', Object.keys(timesheetsData[0] || {}));
      }
      setTimesheets(timesheetsData);
      setFilteredTimesheets(timesheetsData);
    } catch (error) {
      console.error('Error loading timesheets:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project);
    setBudgets([]);
    setTimesheets([]);
    setProjectMembers([]);
    if (project) {
      loadBudgets(project.id);
      loadTimesheets(project.id);
      loadProjectMembers(project.id);
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

    // Validate that end date is not before start date
    if (new Date(newTimesheet.endDate) < new Date(newTimesheet.startDate)) {
      alert('End date cannot be before start date');
      return;
    }

    try {
      setIsLoading(true);
      const timesheetData = {
        budgetCode: newTimesheet.budgetCode,
        memberId: newTimesheet.memberId,
        startDate: newTimesheet.startDate,
        endDate: newTimesheet.endDate,
        inputQuantity: parseFloat(newTimesheet.inputQuantity) || 0,
        outputQuantity: parseFloat(newTimesheet.outputQuantity) || 0,
        description: newTimesheet.description
      };
      console.log('📤 Sending timesheet data to ACC:', timesheetData);
      const result = await AccService.createTimesheet(selectedProject.id, timesheetData);
      
      // Store the form data locally with the timesheet ID
      if (result && result.id) {
        setLocalTimesheetData(prev => ({
          ...prev,
          [result.id]: {
            budgetCode: newTimesheet.budgetCode,
            memberId: newTimesheet.memberId,
            description: newTimesheet.description
          }
        }));
      }

      // Reload timesheets
      await loadTimesheets(selectedProject.id);
      
      // Reset form
      setNewTimesheet({
        budgetCode: '',
        memberId: '',
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

  const handleEditTimesheet = (timesheet) => {
    setEditingTimesheet(timesheet);
    setShowUpdateModal(true);
  };

  const handleUpdateTimesheet = async (updatedData) => {
    try {
      setIsLoading(true);
      console.log('🔄 Updating timesheet:', { timesheetId: editingTimesheet.id, updates: updatedData, projectId: selectedProject.id });
      
      await AccService.updateTimesheet(selectedProject.id, editingTimesheet.id, updatedData);
      
      // Update local data if budget code or member changed
      if (updatedData.budgetCode || updatedData.memberId) {
        setLocalTimesheetData(prev => ({
          ...prev,
          [editingTimesheet.id]: {
            ...prev[editingTimesheet.id],
            budgetCode: updatedData.budgetCode || prev[editingTimesheet.id]?.budgetCode,
            memberId: updatedData.memberId || prev[editingTimesheet.id]?.memberId
          }
        }));
      }
      
      await loadTimesheets(selectedProject.id);
      setShowUpdateModal(false);
      setEditingTimesheet(null);
      alert('Timesheet updated successfully!');
    } catch (error) {
      console.error('Error updating timesheet:', error);
      alert('Error updating timesheet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTimesheet = async (timesheetId, updates) => {
    try {
      setIsLoading(true);
      console.log('🔄 Quick updating timesheet:', { timesheetId, updates, projectId: selectedProject.id });
      
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

  const exportTimesheetToPDF = () => {
    if (!selectedProject || timesheets.length === 0) {
      alert('No timesheet data to export');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Timesheet Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Project Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${selectedProject.name}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Project ID: ${selectedProject.id}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 15;

    // Table Headers
    const headers = ['Budget Code', 'Start Date', 'End Date', 'Input Qty (Hours)', 'Output Qty', 'Description'];
    const columnWidths = [30, 25, 25, 30, 25, 35];
    let xPosition = 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    headers.forEach((header, index) => {
      doc.text(header, xPosition, yPosition);
      xPosition += columnWidths[index];
    });
    yPosition += 8;

    // Table Data
    doc.setFont('helvetica', 'normal');
    timesheets.forEach((timesheet) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }

      xPosition = 20;
      const rowData = [
        timesheet.budgetCode || '',
        timesheet.startDate || '',
        timesheet.endDate || '',
        timesheet.inputQuantity || '0',
        timesheet.outputQuantity || '0',
        timesheet.description || ''
      ];

      rowData.forEach((data, index) => {
        const text = String(data).substring(0, 20); // Truncate long text
        doc.text(text, xPosition, yPosition);
        xPosition += columnWidths[index];
      });
      yPosition += 8;
    });

    // Summary
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', 20, yPosition);
    yPosition += 8;

    const totalInput = timesheets.reduce((sum, t) => sum + (parseFloat(t.inputQuantity) || 0), 0);
    const totalOutput = timesheets.reduce((sum, t) => sum + (parseFloat(t.outputQuantity) || 0), 0);

    doc.setFont('helvetica', 'normal');
    doc.text(`Total Input Hours: ${totalInput.toFixed(2)}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Total Output: ${totalOutput.toFixed(2)}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Productivity Rate: ${totalInput > 0 ? (totalOutput / totalInput).toFixed(2) : 'N/A'} units/hour`, 20, yPosition);

    // Save the PDF
    doc.save(`timesheet-${selectedProject.name.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Timesheet Management
          </h2>
        </div>
        
        <div className="p-6">
          {/* Project Search */}
          <div className="mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Projects
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Projects Table */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-gray-600" />
              Projects ({filteredProjects.length})
            </h3>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProjects.map((project) => (
                        <tr 
                          key={project.id}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedProject?.id === project.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleProjectChange(project.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-gray-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {project.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {project.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {project.type?.split(':').pop() || 'Project'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {selectedProject?.id === project.id ? (
                              <span className="text-blue-600 font-medium">Selected</span>
                            ) : (
                              <span className="text-gray-400">Click to select</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredProjects.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchTerm ? 'Try adjusting your search terms' : 'No projects available in this hub'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>

      {selectedProject && (
        <>
          {/* Create New Timesheet */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Create New Timesheet
              </h3>
            </div>
            <div className="p-6">
              <form onSubmit={submitTimesheet} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Code *</label>
                  <select
                    name="budgetCode"
                    value={newTimesheet.budgetCode}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Budget</option>
                    {budgets.map(budget => {
                      const unit = budget.unit || budget.unitOfMeasure || 'units';
                      return (
                        <option key={budget.id} value={budget.budgetCode || budget.code}>
                          {budget.name} ({budget.budgetCode || budget.code}) - {unit}
                        </option>
                      );
                    })}
                  </select>
                  {newTimesheet.budgetCode && (
                    <p className="mt-1 text-sm text-gray-500">
                      Unit of Output: {(() => {
                        const selectedBudget = budgets.find(b => (b.budgetCode || b.code) === newTimesheet.budgetCode);
                        return selectedBudget?.unit || selectedBudget?.unitOfMeasure || 'units';
                      })()}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Member</label>
                  <select
                    name="memberId"
                    value={newTimesheet.memberId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Member (Optional)</option>
                    {projectMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'Unknown Member'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={newTimesheet.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={newTimesheet.endDate}
                    onChange={handleInputChange}
                    min={newTimesheet.startDate || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {newTimesheet.startDate && newTimesheet.endDate && new Date(newTimesheet.endDate) < new Date(newTimesheet.startDate) && (
                    <p className="mt-1 text-sm text-red-600">End date cannot be before start date</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Input Quantity (Hours)</label>
                  <input
                    type="number"
                    name="inputQuantity"
                    value={newTimesheet.inputQuantity}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Output Quantity {newTimesheet.budgetCode ? `(${(() => {
                      const selectedBudget = budgets.find(b => (b.budgetCode || b.code) === newTimesheet.budgetCode);
                      return selectedBudget?.unit || selectedBudget?.unitOfMeasure || 'units';
                    })()})` : ''}
                  </label>
                  <input
                    type="number"
                    name="outputQuantity"
                    value={newTimesheet.outputQuantity}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={newTimesheet.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Enter timesheet description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button 
                  type="button" 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to save this timesheet data to ACC performance tracking?')) {
                      document.querySelector('form').requestSubmit();
                    }
                  }}
                  disabled={isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Confirm & Save to ACC
                    </>
                  )}
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? 'Creating...' : 'Create Timesheet'}
                </button>
              </div>
              </form>
            </div>
          </div>

          {/* Existing Timesheets */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Existing Timesheets ({filteredTimesheets.length})
                </h3>
                {timesheets.length > 0 && (
                  <button
                    onClick={exportTimesheetToPDF}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export to PDF
                  </button>
                )}
              </div>
              
              {/* Member Filter */}
              {timesheets.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Member
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={memberFilter}
                      onChange={(e) => setMemberFilter(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6">
            
            {filteredTimesheets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Input Qty (Hours)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Output Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit of Output</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productivity Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTimesheets.map(timesheet => {
                      const inputQty = parseFloat(timesheet.inputQuantity) || 0;
                      const outputQty = parseFloat(timesheet.outputQuantity) || 0;
                      const productivityRate = inputQty > 0 ? (outputQty / inputQty).toFixed(2) : 'N/A';
                      
                      // Get local data as fallback
                      const localData = localTimesheetData[timesheet.id] || {};
                      const displayBudgetCode = timesheet.budgetCode || localData.budgetCode || 'No Budget Code';
                      const displayMemberId = timesheet.memberId || localData.memberId;
                      
                      // Find the budget to get unit of output
                      const budget = budgets.find(b => (b.budgetCode || b.code) === displayBudgetCode);
                      const unitOfOutput = budget?.unit || budget?.unitOfMeasure || 'units';
                      
                      return (
                        <tr key={timesheet.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div>
                              <div className="font-medium">{displayBudgetCode}</div>
                              {budget && (
                                <div className="text-xs text-gray-500">{budget.name}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(() => {
                              const member = projectMembers.find(m => m.id === displayMemberId);
                              return member ? (member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'Unknown') : 'Not assigned';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(timesheet.startDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(timesheet.endDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {inputQty.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {outputQty.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {unitOfOutput}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {productivityRate} {unitOfOutput}/hour
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleEditTimesheet(timesheet)}
                                className="text-blue-600 hover:text-blue-900 text-xs"
                              >
                                Update
                              </button>
                              <button 
                                onClick={() => {
                                  if (timesheet.id) {
                                    deleteTimesheet(timesheet.id);
                                  } else {
                                    alert('Invalid timesheet ID. Please refresh the page and try again.');
                                  }
                                }}
                                className="text-red-600 hover:text-red-900 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {memberFilter ? 'No timesheets found for selected member' : 'No timesheets found'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {memberFilter ? 'Try adjusting your member filter' : 'Create a new timesheet to get started with performance tracking'}
                </p>
              </div>
            )}
            </div>
          </div>

        </>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}

      {/* Update Timesheet Modal */}
      {showUpdateModal && editingTimesheet && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Update Timesheet</h3>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const updatedData = {
                  budgetCode: formData.get('budgetCode'),
                  memberId: formData.get('memberId'),
                  startDate: formData.get('startDate'),
                  endDate: formData.get('endDate'),
                  inputQuantity: parseFloat(formData.get('inputQuantity')) || 0,
                  outputQuantity: parseFloat(formData.get('outputQuantity')) || 0,
                  description: formData.get('description')
                };
                handleUpdateTimesheet(updatedData);
              }} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Code</label>
                  <select
                    name="budgetCode"
                    defaultValue={editingTimesheet.budgetCode || localTimesheetData[editingTimesheet.id]?.budgetCode || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Budget</option>
                    {budgets.map(budget => {
                      const unit = budget.unit || budget.unitOfMeasure || 'units';
                      return (
                        <option key={budget.id} value={budget.budgetCode || budget.code}>
                          {budget.name} ({budget.budgetCode || budget.code}) - {unit}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Member</label>
                  <select
                    name="memberId"
                    defaultValue={editingTimesheet.memberId || localTimesheetData[editingTimesheet.id]?.memberId || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Member (Optional)</option>
                    {projectMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'Unknown Member'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      defaultValue={editingTimesheet.startDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      defaultValue={editingTimesheet.endDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Input Quantity (Hours)</label>
                    <input
                      type="number"
                      name="inputQuantity"
                      defaultValue={editingTimesheet.inputQuantity || 0}
                      step="0.1"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Output Quantity</label>
                    <input
                      type="number"
                      name="outputQuantity"
                      defaultValue={editingTimesheet.outputQuantity || 0}
                      step="0.1"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    defaultValue={editingTimesheet.description || localTimesheetData[editingTimesheet.id]?.description || ''}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpdateModal(false);
                      setEditingTimesheet(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Updating...' : 'Update Timesheet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetTab;
