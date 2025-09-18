import React, { useState } from 'react';
import { Search, Building2, Calendar, User, MapPin, CheckCircle } from 'lucide-react';

const ProjectList = ({ projects, selectedProject, onProjectSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  

  const filteredProjects = projects.filter(project =>
    project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-autodesk-blue focus:border-autodesk-blue"
        />
      </div>


      {/* Projects List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm ? 'No projects found matching your search.' : 'No projects available.'}
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => onProjectSelect && onProjectSelect(project)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedProject?.id === project.id
                  ? 'border-autodesk-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {project.name || 'Unnamed Project'}
                  </h4>
                  {project.jobNumber && (
                    <p className="mt-1 text-sm text-gray-500">
                      Job #: {project.jobNumber}
                    </p>
                  )}
                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    {project.type && (
                      <span className="inline-flex items-center">
                        <Building2 className="h-3 w-3 mr-1" />
                        {project.type}
                      </span>
                    )}
                    {project.status && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        project.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {project.status}
                      </span>
                    )}
                    {project.createdAt && (
                      <span className="inline-flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {project.currentPhase && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-600">
                        Current Phase: <span className="font-medium">{project.currentPhase}</span>
                      </span>
                    </div>
                  )}
                </div>
                {selectedProject?.id === project.id && (
                  <CheckCircle className="h-5 w-5 text-autodesk-blue flex-shrink-0 ml-2" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectList;



