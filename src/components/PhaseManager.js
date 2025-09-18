import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, CheckCircle, Plus, Trash2, Calendar } from 'lucide-react';
import LocalPhaseService from '../services/LocalPhaseService';

const PhaseManager = ({ project, onPhaseUpdate, credentials }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [availablePhases, setAvailablePhases] = useState([]);
  const [projectPhases, setProjectPhases] = useState([]);
  const [newPhase, setNewPhase] = useState('');
  const [newPhaseDate, setNewPhaseDate] = useState('');

  useEffect(() => {
    if (project) {
      console.log('PhaseManager: Project selected:', project);
      console.log('PhaseManager: Credentials available:', !!credentials?.threeLegToken);
      
      // Load current phase from local storage
      const savedPhase = LocalPhaseService.getProjectPhase(project.id);
      setCurrentPhase(savedPhase);
      
      // Load all phases for this project
      loadProjectPhases();
      loadAvailablePhases();
    }
  }, [project]);

  const loadAvailablePhases = () => {
    try {
      const phases = LocalPhaseService.getAvailablePhases();
      setAvailablePhases(phases);
    } catch (err) {
      console.error('Error loading phases:', err);
      // Continue without phases if loading fails
    }
  };

  const loadProjectPhases = () => {
    try {
      const allPhases = LocalPhaseService.getAllProjectPhases(project.id);
      setProjectPhases(allPhases);
    } catch (err) {
      console.error('Error loading project phases:', err);
      setProjectPhases([]);
    }
  };

  const handleInputChange = (value) => {
    setCurrentPhase(value);
    setError(null);
    setSuccess(false);
  };

  const handleAddPhase = () => {
    console.log('🔄 Add Phase clicked:', { newPhase, newPhaseDate, projectPhasesLength: projectPhases.length });
    
    if (!newPhase || !newPhaseDate) {
      console.log('❌ Validation failed: missing phase or date');
      setError('Please select both phase and date');
      return;
    }

    if (projectPhases.length >= 7) {
      console.log('❌ Validation failed: too many phases');
      setError('Maximum 7 phases allowed per project');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Add new phase with custom date
      const phaseData = {
        phase: newPhase,
        dateSet: newPhaseDate,
        timestamp: new Date().toISOString(),
        isCurrent: false
      };

      console.log('📝 Adding phase data:', phaseData);
      console.log('📝 Project ID:', project.id);

      // Update the service to handle custom dates
      LocalPhaseService.addPhaseWithDate(project.id, phaseData);
      
      console.log('✅ Phase added to service, reloading phases...');
      
      // Reload phases
      loadProjectPhases();
      
      // Clear form
      setNewPhase('');
      setNewPhaseDate('');
      
      setSuccess(true);
      console.log(`✅ Phase added for project ${project.id}: ${newPhase} on ${newPhaseDate}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('❌ Error adding phase:', err);
      setError('Failed to add phase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhase = (index) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      LocalPhaseService.removePhaseByIndex(project.id, index);
      loadProjectPhases();
      
      setSuccess(true);
      console.log(`Phase removed from project ${project.id}`);
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error removing phase:', err);
      setError('Failed to remove phase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!currentPhase) {
      setError('Please select a phase');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Save phase to local storage
      LocalPhaseService.setProjectPhase(project.id, currentPhase);
      
      // Notify parent component
      onPhaseUpdate(project.id, currentPhase);
      
      setSuccess(true);
      console.log(`Phase updated for project ${project.id}: ${currentPhase}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving phase:', err);
      setError('Failed to save phase');
    } finally {
      setIsLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="text-center text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Please select a project to manage its phase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Project Phase Management
        </h3>
        <p className="text-sm text-gray-600">
          Set the current phase for <strong>{project.name}</strong>
        </p>
      </div>

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

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">
                Phase updated successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Current Phase Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Phase
          </label>
          <select
            value={currentPhase}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-autodesk-blue focus:border-transparent"
          >
            <option value="">Select a phase...</option>
            {availablePhases.map((phase) => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </select>
        </div>

        {/* Add New Phase Section */}
        <div className="border-t pt-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Add Phase with Date</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phase
              </label>
              <select
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-autodesk-blue focus:border-transparent"
              >
                <option value="">Select phase...</option>
                {availablePhases.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={newPhaseDate}
                onChange={(e) => setNewPhaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-autodesk-blue focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleAddPhase}
            disabled={isLoading || !newPhase || !newPhaseDate || projectPhases.length >= 7}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Phase ({projectPhases.length}/7)
              </>
            )}
          </button>
        </div>

        {/* Project Phases List */}
        <div className="border-t pt-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Project Phases ({projectPhases.length}/7)</h4>
          {projectPhases.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No phases added yet</p>
          ) : (
            <div className="space-y-2">
              {projectPhases.map((phaseData, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${
                  phaseData.isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      phaseData.isCurrent ? 'bg-blue-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <span className={`font-medium ${
                        phaseData.isCurrent ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {phaseData.phase}
                      </span>
                      {phaseData.isCurrent && (
                        <span className="ml-2 text-xs text-blue-600 font-medium">(Current)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      {phaseData.dateSet}
                    </div>
                    <button
                      onClick={() => handleRemovePhase(index)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Current Phase Button */}
        <div className="border-t pt-4">
          <button
            onClick={handleSave}
            disabled={isLoading || !currentPhase}
            className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-autodesk-blue hover:bg-autodesk-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-autodesk-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Current Phase
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhaseManager;