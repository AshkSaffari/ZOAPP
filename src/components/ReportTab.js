import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';

const ReportTab = ({ projects, credentials }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // State for project selection (using projects passed from parent)
  const [selectedProjects, setSelectedProjects] = useState([]);
  
  // State for phase management (read-only from localStorage)
  const [projectPhases, setProjectPhases] = useState({});
  

  // Load all phases from localStorage
  const loadAllPhases = () => {
    try {
      const stored = localStorage.getItem('cewa_project_phases');
      if (stored) {
        const allPhases = JSON.parse(stored);
        setProjectPhases(allPhases);
        console.log('Loaded all phases:', allPhases);
      } else {
        console.log('No phases found in localStorage');
        setProjectPhases({});
      }
    } catch (err) {
      console.error('Error loading all phases:', err);
      setProjectPhases({});
    }
  };


  // Load phases on component mount
  useEffect(() => {
    loadAllPhases();
  }, []);




  // Handle project selection
  const handleProjectSelect = (projectId, isSelected) => {
    if (isSelected) {
      setSelectedProjects(prev => [...prev, projectId]);
    } else {
      setSelectedProjects(prev => prev.filter(id => id !== projectId));
    }
  };

  // Handle select all projects
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedProjects(projects.map(project => project.id));
    } else {
      setSelectedProjects([]);
    }
  };


  // Get selected project objects
  const selectedProjectObjects = projects.filter(project => selectedProjects.includes(project.id));



  // Filter projects based on search term (show all selected projects, regardless of phase)
  const filteredProjects = selectedProjectObjects.filter(project => {
    if (!searchTerm) return true; // Show all if no search term
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });


  // Generate PDF content
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Report', pageWidth / 2, 30, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 40, { align: 'center' });
    
    // Table headers
    const tableTop = 60;
    const colPositions = [20, 120];
    
    // Header row
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Name', colPositions[0], tableTop);
    doc.text('Phase', colPositions[1], tableTop);
    
    // Draw header line
    doc.line(20, tableTop + 5, pageWidth - 20, tableTop + 5);
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    let currentY = tableTop + 15;
    
    filteredProjects.forEach((project, index) => {
      // Check if we need a new page
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 30;
      }
      
      // Truncate long text for project name (allow more space for phase)
      const projectName = project.name.length > 25 ? project.name.substring(0, 22) + '...' : project.name;
      
      // Get project phase with proper ID matching
      let projectPhase = projectPhases[project.id];
      if (!projectPhase) {
        // Try with "b." prefix
        const withBPrefix = `b.${project.id}`;
        projectPhase = projectPhases[withBPrefix];
      }
      if (!projectPhase) {
        // Try without "b." prefix
        const withoutBPrefix = project.id.startsWith('b.') ? project.id.substring(2) : project.id;
        projectPhase = projectPhases[withoutBPrefix];
      }
      
      // Create 40-character placeholder for phase name
      const phaseText = projectPhase 
        ? (typeof projectPhase === 'string' ? projectPhase : projectPhase.current)
        : 'Not Set';
      const phase = phaseText.length > 40 ? phaseText.substring(0, 37) + '...' : phaseText.padEnd(40, ' ');
      
      doc.text(projectName, colPositions[0], currentY);
      doc.text(phase, colPositions[1], currentY);
      
      currentY += 8;
    });
    
    // Summary
    const summaryY = currentY + 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', 20, summaryY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Projects: ${filteredProjects.length}`, 20, summaryY + 10);
    doc.text(`Projects: ${filteredProjects.length} selected`, 20, summaryY + 20);
    
    return doc;
  };

  // Export to PDF (download only)
  const exportToPDF = () => {
    const doc = generatePDF();
    
    // Generate filename based on selected projects
    let fileName = 'project-report';
    if (selectedProjects.length === 1) {
      const project = projects.find(p => p.id === selectedProjects[0]);
      fileName = `${project?.name || 'project'}-${new Date().toISOString().split('T')[0]}.pdf`;
    } else {
      fileName = `multi-project-report-${new Date().toISOString().split('T')[0]}.pdf`;
    }
    
    doc.save(fileName);
  };






  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="h-6 w-6 text-autodesk-blue mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Project Report</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToPDF}
            disabled={filteredProjects.length === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-autodesk-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>
          
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Project Selection */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Select Projects for Report</h3>
        </div>

        {/* Project Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Projects
            </label>
            {projects.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="text-xs text-autodesk-blue hover:text-autodesk-dark"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
          
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
            {projects.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No projects available. Please select a hub first.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {projects.map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={(e) => handleProjectSelect(project.id, e.target.checked)}
                      className="h-4 w-4 text-autodesk-blue focus:ring-autodesk-blue border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {project.name}
                        </span>
                        {projectPhases[project.id] && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {typeof projectPhases[project.id] === 'string' 
                              ? projectPhases[project.id] 
                              : projectPhases[project.id].current}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {project.description || 'No description'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          {selectedProjects.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Projects
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by project name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-autodesk-blue focus:border-transparent"
              />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}


      {/* Results Summary */}
      {selectedProjects.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-blue-400 mr-2" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Showing {filteredProjects.length} selected projects</strong>
                {filteredProjects.length !== selectedProjects.length && (
                  <span className="text-gray-600 ml-1">
                    (filtered from {selectedProjects.length} selected)
                  </span>
                )}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {searchTerm && `Search: "${searchTerm}"`}
                <span className="text-gray-500"> • All selected projects are included in the report</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Projects Table */}
      {selectedProjects.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phase
                    <span className="text-xs text-gray-400 font-normal ml-1">(set on main page)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="px-6 py-12 text-center text-sm text-gray-500">
                      {searchTerm 
                        ? 'No projects with phases found matching your search.' 
                        : 'No projects with phases set. Please set phases on the main page first.'}
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => {
                    const phaseData = projectPhases[project.id];
                    const projectPhase = phaseData 
                      ? (typeof phaseData === 'string' ? phaseData : phaseData.current)
                      : 'Not Set';
                    return (
                      <tr key={project.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {project.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            projectPhase === 'Not Set' || projectPhase === 'Not Available'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {projectPhase}
                          </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Selected</h3>
          <p className="text-gray-500">
            Please select a hub and choose projects to generate a report.
          </p>
        </div>
      )}


    </div>
  );
};

export default ReportTab;
