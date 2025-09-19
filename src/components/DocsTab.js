import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, FileText, Building2, Download, Eye, File, FileImage, FileSpreadsheet } from 'lucide-react';
import AccService from '../services/AccService';

const DocsTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHub, setSelectedHub] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [searchScope, setSearchScope] = useState('all'); // 'all', 'project', 'hub'
  const [projectSearchTerm, setProjectSearchTerm] = useState(''); // For filtering projects
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Load hubs on component mount
  useEffect(() => {
    loadHubs();
  }, []);

  // Filter projects based on search term
  useEffect(() => {
    if (!projectSearchTerm.trim()) {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [projectSearchTerm, projects]);

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
      // Try to detect and set the correct region for this hub
      await AccService.detectRegion(hubId);
      const projectsData = await AccService.getProjects(hubId);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      // If the first attempt fails, try with different regions
      try {
        console.log('🔄 Trying alternative region detection for hub:', hubId);
        await AccService.debugAPACHubAccess(hubId);
        const projectsData = await AccService.getProjects(hubId);
        setProjects(projectsData);
        setFilteredProjects(projectsData);
      } catch (retryError) {
        console.error('❌ Failed to load projects after retry:', retryError);
        throw retryError;
      }
    }
  };

  const searchDocuments = async () => {
    if (!searchTerm.trim()) {
      alert('Please enter a search term');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      let results = [];

      if (searchScope === 'all') {
        // Search across all hubs
        for (const hub of hubs) {
          try {
            // Try to detect and set the correct region for this hub
            await AccService.detectRegion(hub.id);
            const hubProjects = await AccService.getProjects(hub.id);
            for (const project of hubProjects) {
              const projectResults = await searchProjectDocuments(project.id, searchTerm);
              results = results.concat(projectResults.map(doc => ({
                ...doc,
                hubName: hub.name,
                projectName: project.name
              })));
            }
          } catch (error) {
            console.warn(`⚠️ Failed to search hub ${hub.name} (${hub.id}):`, error.message);
            // Continue with other hubs even if one fails
          }
        }
      } else if (searchScope === 'hub' && selectedHub) {
        // Search within selected hub
        try {
          await AccService.detectRegion(selectedHub.id);
          const hubProjects = await AccService.getProjects(selectedHub.id);
          for (const project of hubProjects) {
            const projectResults = await searchProjectDocuments(project.id, searchTerm);
            results = results.concat(projectResults.map(doc => ({
              ...doc,
              hubName: selectedHub.name,
              projectName: project.name
            })));
          }
        } catch (error) {
          console.error('Error searching selected hub:', error);
          throw error;
        }
      } else if (searchScope === 'project' && selectedProjects.length > 0) {
        // Search within selected projects
        for (const project of selectedProjects) {
          try {
            const projectResults = await searchProjectDocuments(project.id, searchTerm);
            results = results.concat(projectResults.map(doc => ({
              ...doc,
              hubName: project.hubName || 'Unknown',
              projectName: project.name
            })));
          } catch (error) {
            console.warn(`⚠️ Failed to search project ${project.name}:`, error.message);
            // Continue with other projects even if one fails
          }
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching documents:', error);
      alert('Error searching documents: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const searchProjectDocuments = async (projectId, searchTerm) => {
    try {
      // Get project folders
      const topFolders = await AccService.getTopFolders(projectId);
      let allDocuments = [];

      // Search in each folder
      for (const folder of topFolders) {
        const folderContents = await searchFolderContents(projectId, folder.id, searchTerm);
        allDocuments = allDocuments.concat(folderContents);
      }

      return allDocuments;
    } catch (error) {
      console.error(`Error searching project ${projectId}:`, error);
      return [];
    }
  };

  const searchFolderContents = async (projectId, folderId, searchTerm) => {
    try {
      const contents = await AccService.getFolderContents(projectId, folderId);
      let documents = [];

      for (const item of contents) {
        if (item.type === 'items') {
          // Check if item name contains search term
          if (item.attributes.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.attributes.displayName.toLowerCase().includes(searchTerm.toLowerCase())) {
            documents.push({
              id: item.id,
              name: item.attributes.name,
              displayName: item.attributes.displayName,
              createTime: item.attributes.createTime,
              lastModifiedTime: item.attributes.lastModifiedTime,
              createUserName: item.attributes.createUserName,
              lastModifiedUserName: item.attributes.lastModifiedUserName,
              folderId: folderId,
              projectId: projectId
            });
          }
        } else if (item.type === 'folders') {
          // Recursively search subfolders
          const subFolderContents = await searchFolderContents(projectId, item.id, searchTerm);
          documents = documents.concat(subFolderContents);
        }
      }

      return documents;
    } catch (error) {
      console.error(`Error searching folder ${folderId}:`, error);
      return [];
    }
  };

  const handleHubChange = (hubId) => {
    const hub = hubs.find(h => h.id === hubId);
    setSelectedHub(hub);
    if (hub) {
      loadProjects(hub.id);
    }
    setProjects([]);
    setSelectedProjects([]);
  };

  const handleProjectToggle = (project) => {
    setSelectedProjects(prev => {
      const isSelected = prev.some(p => p.id === project.id);
      if (isSelected) {
        return prev.filter(p => p.id !== project.id);
      } else {
        return [...prev, { ...project, hubName: selectedHub?.name }];
      }
    });
  };

  const downloadDocument = async (document) => {
    try {
      // Get document versions
      const versions = await AccService.getDocumentVersions(document.projectId, document.id);
      if (versions.length > 0) {
        // Get download URL for the latest version
        const downloadUrl = await AccService.getDocumentDownloadUrl(document.projectId, versions[0].id);
        if (downloadUrl) {
          // Open download URL in new tab
          window.open(downloadUrl, '_blank');
        } else {
          alert('Download URL not available for this document');
        }
      } else {
        alert('No versions available for this document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Document Search
          </h2>
        </div>
        
        <div className="p-6">
          {/* Search Controls */}
          <div className="space-y-6">
            {/* Search Input */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents by name (partial matching)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button 
                onClick={searchDocuments} 
                disabled={isSearching || !searchTerm.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>

            {/* Search Scope and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Search Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Search Scope</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="all"
                      checked={searchScope === 'all'}
                      onChange={(e) => setSearchScope(e.target.value)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">All Accounts</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="hub"
                      checked={searchScope === 'hub'}
                      onChange={(e) => setSearchScope(e.target.value)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Specific Hub</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="project"
                      checked={searchScope === 'project'}
                      onChange={(e) => setSearchScope(e.target.value)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Specific Projects</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Hub Selection */}
            {searchScope === 'hub' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Hub</label>
                <select 
                  value={selectedHub?.id || ''} 
                  onChange={(e) => handleHubChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Hub</option>
                  {hubs.map(hub => (
                    <option key={hub.id} value={hub.id}>{hub.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Project Selection */}
            {searchScope === 'project' && selectedHub && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Projects to Search from {selectedHub.name}
                </label>
                
                {/* Project Search Filter */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={projectSearchTerm}
                      onChange={(e) => setProjectSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-2">
                  {filteredProjects.map(project => (
                    <label key={project.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedProjects.some(p => p.id === project.id)}
                        onChange={() => handleProjectToggle(project)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{project.name}</span>
                        <div className="text-xs text-gray-500">
                          Hub: {selectedHub.name} | Type: {project.type?.split(':').pop() || 'Project'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-600" />
              Search Results ({searchResults.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hub
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map((doc, index) => {
                  const fileName = doc.displayName || doc.name || 'Unknown';
                  const fileExtension = fileName.split('.').pop()?.toLowerCase();
                  
                  const getFileIcon = (ext) => {
                    switch (ext) {
                      case 'pdf':
                        return <FileText className="h-4 w-4 text-red-500" />;
                      case 'xlsx':
                      case 'xls':
                        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
                      case 'docx':
                      case 'doc':
                        return <FileText className="h-4 w-4 text-blue-500" />;
                      case 'jpg':
                      case 'jpeg':
                      case 'png':
                      case 'gif':
                      case 'bmp':
                      case 'svg':
                        return <FileImage className="h-4 w-4 text-purple-500" />;
                      default:
                        return <File className="h-4 w-4 text-gray-500" />;
                    }
                  };

                  return (
                    <tr key={`${doc.id}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getFileIcon(fileExtension)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {fileName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {fileExtension?.toUpperCase() || 'FILE'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.projectName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.hubName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.createUserName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.lastModifiedTime ? new Date(doc.lastModifiedTime).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => downloadDocument(doc)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {searchResults.length === 0 && (
              <div className="text-center py-8">
                <Filter className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search terms or project selection
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {searchResults.length === 0 && searchTerm && (
        <div className="bg-white shadow rounded-lg">
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms or check different hubs/projects
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocsTab;
