import React, { useState, useEffect, useCallback } from 'react';
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
      const projectsData = await AccService.getProjects(hubId);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
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
          const hubProjects = await AccService.getProjects(hub.id);
          for (const project of hubProjects) {
            const projectResults = await searchProjectDocuments(project.id, searchTerm);
            results = results.concat(projectResults.map(doc => ({
              ...doc,
              hubName: hub.name,
              projectName: project.name
            })));
          }
        }
      } else if (searchScope === 'hub' && selectedHub) {
        // Search within selected hub
        const hubProjects = await AccService.getProjects(selectedHub.id);
        for (const project of hubProjects) {
          const projectResults = await searchProjectDocuments(project.id, searchTerm);
          results = results.concat(projectResults.map(doc => ({
            ...doc,
            hubName: selectedHub.name,
            projectName: project.name
          })));
        }
      } else if (searchScope === 'project' && selectedProjects.length > 0) {
        // Search within selected projects
        for (const project of selectedProjects) {
          const projectResults = await searchProjectDocuments(project.id, searchTerm);
          results = results.concat(projectResults.map(doc => ({
            ...doc,
            hubName: project.hubName || 'Unknown',
            projectName: project.name
          })));
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
    <div className="docs-tab">
      <h2>Document Search</h2>
      
      {/* Search Controls */}
      <div className="search-controls">
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Enter document name to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button 
            onClick={searchDocuments} 
            disabled={isSearching}
            className="search-button"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Scope Selection */}
        <div className="search-scope">
          <label>
            <input
              type="radio"
              value="all"
              checked={searchScope === 'all'}
              onChange={(e) => setSearchScope(e.target.value)}
            />
            Search All Accounts
          </label>
          <label>
            <input
              type="radio"
              value="hub"
              checked={searchScope === 'hub'}
              onChange={(e) => setSearchScope(e.target.value)}
            />
            Search Hub
          </label>
          <label>
            <input
              type="radio"
              value="project"
              checked={searchScope === 'project'}
              onChange={(e) => setSearchScope(e.target.value)}
            />
            Search Projects
          </label>
        </div>

        {/* Hub Selection */}
        {searchScope === 'hub' && (
          <div className="hub-selection">
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
        )}

        {/* Project Selection */}
        {searchScope === 'project' && selectedHub && (
          <div className="project-selection">
            <h4>Select Projects to Search:</h4>
            <div className="project-list">
              {projects.map(project => (
                <label key={project.id} className="project-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedProjects.some(p => p.id === project.id)}
                    onChange={() => handleProjectToggle(project)}
                  />
                  {project.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="search-results">
        <h3>Search Results ({searchResults.length})</h3>
        
        {searchResults.length > 0 ? (
          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Project</th>
                  <th>Hub</th>
                  <th>Created By</th>
                  <th>Last Modified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((doc, index) => (
                  <tr key={`${doc.id}-${index}`}>
                    <td>{doc.displayName || doc.name}</td>
                    <td>{doc.projectName}</td>
                    <td>{doc.hubName}</td>
                    <td>{doc.createUserName}</td>
                    <td>{new Date(doc.lastModifiedTime).toLocaleDateString()}</td>
                    <td>
                      <button 
                        onClick={() => downloadDocument(doc)}
                        className="download-button"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No documents found. Try a different search term.</p>
        )}
      </div>
    </div>
  );
};

export default DocsTab;
