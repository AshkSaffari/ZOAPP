import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  LogOut, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  FileText,
  Key,
  AlertTriangle,
  ImageIcon
} from 'lucide-react';
import AccService from './services/AccService';
import ProjectList from './components/ProjectList';
import ProjectDetails from './components/ProjectDetails';
import PhaseManager from './components/PhaseManager';
import ReportTab from './components/ReportTab';
import ExpenseTab from './components/ExpenseTab';
import HubSelector from './components/HubSelector';
import ImageTab from './components/ImageTab';
import DocsTab from './components/DocsTab';
import TimesheetTab from './components/TimesheetTab';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedHub, setSelectedHub] = useState(null);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'reports', 'expenses', 'images', 'docs', or 'timesheets'
  const [credentials, setCredentials] = useState({
    accountId: 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2',
    clientId: 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo',
    clientSecret: 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa',
    threeLegToken: '',
    refreshToken: '',
    twoLeggedToken: ''
  });

  // Load stored credentials on app startup
  useEffect(() => {
    const loadStoredCredentials = () => {
      try {
        const stored = localStorage.getItem('cewa_credentials');
        if (stored) {
          const storedCredentials = JSON.parse(stored);
          console.log('📦 Loading stored credentials:', storedCredentials);
          setCredentials(storedCredentials);
          
          // Initialize AccService with stored credentials
          AccService.initialize(storedCredentials);
        }
      } catch (error) {
        console.error('Error loading stored credentials:', error);
        // Clear invalid credentials
        AccService.clearCredentials();
        setCredentials({
          accountId: 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2',
          clientId: 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo',
          clientSecret: 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa',
          threeLegToken: '',
          refreshToken: '',
          twoLeggedToken: ''
        });
      }
    };

    loadStoredCredentials();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('🔍 Checking for OAuth callback...');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 Current origin:', window.location.origin);
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      console.log('🔍 URL params:', {
        code: code ? code.substring(0, 20) + '...' : 'none',
        error: error || 'none',
        errorDescription: errorDescription || 'none'
      });
      
      if (error) {
        console.error('❌ OAuth Error:', error, errorDescription);
        console.error('❌ Full error details:', { error, errorDescription, url: window.location.href });
        setError(`OAuth Error: ${error}${errorDescription ? ' - ' + errorDescription : ''}`);
        return;
      }
      
      if (code) {
        console.log('✅ OAuth code received, exchanging for token...');
        setIsLoading(true);
        setError(null);
        
        try {
          // Initialize service with credentials
          AccService.initialize(credentials);
          
          // Exchange code for token
          const tokenData = await AccService.exchangeCodeForToken(code);
          
          // Log the token data for easy copying
          console.log('🔑 TOKEN DATA RECEIVED:');
          console.log('Access Token:', tokenData.access_token);
          console.log('Refresh Token:', tokenData.refresh_token);
          console.log('Expires In:', tokenData.expires_in);
          console.log('Copy this refresh token for Postman:', tokenData.refresh_token);
          
          // Get 2-legged token automatically
          console.log('🔑 Getting 2-legged token automatically...');
          let twoLeggedToken = '';
          try {
            twoLeggedToken = await AccService.getTwoLeggedToken();
            console.log('✅ 2-legged token obtained automatically:', twoLeggedToken ? `${twoLeggedToken.substring(0, 20)}...` : 'EMPTY');
          } catch (twoLegError) {
            console.error('❌ Failed to get 2-legged token automatically:', twoLegError);
            console.log('ℹ️ You can get it manually in the Images tab if needed');
            console.log('ℹ️ Error details:', twoLegError.message);
          }
          
          // Update credentials with the new tokens
          const updatedCredentials = {
            ...credentials,
            threeLegToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            twoLeggedToken: twoLeggedToken
          };
          
          setCredentials(updatedCredentials);
          
          // Re-initialize service with new token
          AccService.initialize(updatedCredentials);
          
          // Test authentication by getting hubs (no projects loaded initially)
          const hubsData = await AccService.getHubs();
          if (hubsData.length === 0) {
            throw new Error('No hubs found. Please check your permissions.');
          }
          
          // Clear projects initially - user must select a hub first
          setProjects([]);
          setSelectedProject(null);
          setSelectedHub(null);
          
          // Set as authenticated
          setIsAuthenticated(true);
          
          // Show success message
          setError(null);
          console.log('🎉 Sign-in complete! Both 3-legged and 2-legged tokens obtained automatically.');
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
        } catch (err) {
          setError(`Failed to exchange code for token: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    handleOAuthCallback();
  }, [credentials]);


  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we already have a valid 3-legged token
      if (credentials.threeLegToken && credentials.refreshToken) {
        console.log('🔑 Using existing 3-legged token...');
        // Initialize ACC service with existing credentials
        AccService.initialize(credentials);
        
        // Test authentication by getting hubs
        const hubsData = await AccService.getHubs();
        if (hubsData.length === 0) {
          throw new Error('No hubs found. Please check your permissions.');
        }
        
        // Clear projects initially - user must select a hub first
        setProjects([]);
        setSelectedProject(null);
        setSelectedHub(null);
        setIsAuthenticated(true);
        return;
      }
      
      // If no token, redirect to OAuth
      console.log('🔑 No existing token, redirecting to OAuth...');
      const authUrl = AccService.getAuthUrl();
      console.log('🔑 OAuth URL:', authUrl);
      console.log('🔑 Redirecting to:', authUrl);
      window.location.href = authUrl;
      
    } catch (err) {
      // Handle authentication errors specifically
      if (err.message.includes('invalid_grant') || err.message.includes('expired')) {
        console.log('🔄 Token expired, redirecting to OAuth...');
        const authUrl = AccService.getAuthUrl();
        window.location.href = authUrl;
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleHubSelect = async (hub) => {
    setSelectedHub(hub);
    setSelectedProject(null); // Clear selected project when switching hubs
    setIsLoading(true);
    setError(null);
    
    try {
      // Get projects from selected hub
      const projectsData = await AccService.getProjects(hub.id);
      
      // Filter out Component Library projects
      const filteredProjects = projectsData.filter(project => 
        !project.name?.toLowerCase().includes('component library')
      );
      
      console.log(`📊 Loaded ${projectsData.length} projects, filtered to ${filteredProjects.length} (removed Component Library projects)`);
      setProjects(filteredProjects);
    } catch (err) {
      // Handle authentication errors specifically
      if (err.message.includes('invalid_grant') || err.message.includes('expired')) {
        setError('Your session has expired. Please sign in again.');
        // Clear invalid credentials
        AccService.clearCredentials();
        setCredentials({
          accountId: 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2',
          clientId: 'ilzOKY6UAvIWTzwnOIC73cjd3rRxy5CfFx0S6a01Mzc4VKWo',
          clientSecret: 'fwAMvFSSo7TsrYA1TVzqRnxt2j7j2kCNtmbOkgO2rau4HBjfaUXUn0u3FsQbpOBa',
          threeLegToken: '',
          refreshToken: '',
          twoLeggedToken: ''
        });
        setIsAuthenticated(false);
      } else {
      setError(err.message || 'Failed to load projects from selected hub');
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedProject(null);
    setProjects([]);
    setSelectedHub(null);
    setCredentials(prev => ({
      ...prev,
      threeLegToken: ''
    }));
  };


  const handleProjectSelect = async (project) => {
    try {
      // Get detailed project information
      const projectDetails = await AccService.getProjectDetails(project.id);
      if (projectDetails) {
        setSelectedProject(projectDetails);
      } else {
        // Use basic project info if details not found
        setSelectedProject(project);
      }
    } catch (err) {
      setError(err.message || 'Failed to load project details');
      setSelectedProject(project); // Fallback to basic project info
    }
  };

  const handlePhaseUpdate = (projectId, phaseData) => {
    // Phase is now saved locally, no need to refresh from ACC
    // The ReportTab will automatically pick up the updated phase from local storage
    console.log(`Phase updated for project ${projectId}:`, phaseData);
  };

  // Generate OAuth URL for manual token generation
  const oauthUrl = React.useMemo(() => {
    AccService.initialize(credentials);
    return AccService.getOAuthUrl();
  }, [credentials]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-autodesk-blue" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Autodesk Construction Cloud
              <br />
              <span className="text-2xl">SMART BUILDZ</span>
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your BIM360 Account
            </p>
          </div>

          {isLoading && window.location.search.includes('code=') && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 text-blue-400 animate-spin mr-3" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Processing OAuth callback...</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Exchanging authorization code for access token...
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sign In</h3>
            
            <div className="text-center">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Sign In to Autodesk
              </h4>
              
              {/* Two-column layout for OAuth and Manual entry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* OAuth Method */}
                <div className="border rounded-lg p-4">
                  <h5 className="text-md font-medium text-gray-900 mb-2">
                    Sign In with Autodesk
                  </h5>
                  <p className="text-sm text-gray-600 mb-4">
                    Click the button below to authenticate with Autodesk and get your access token automatically.
                  </p>
                  <a
                    href={oauthUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    disabled={!oauthUrl}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-autodesk-blue hover:bg-autodesk-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-autodesk-blue ${
                      !oauthUrl ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => {
                      console.log('🔗 Opening OAuth URL:', oauthUrl);
                      console.log('🔗 Current origin:', window.location.origin);
                      console.log('🔗 Make sure this redirect URI is configured in your Autodesk app');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Sign In with Autodesk
                  </a>
                </div>

                {/* Manual Token Entry */}
                <div className="border rounded-lg p-4">
                  <h5 className="text-md font-medium text-gray-900 mb-2">
                    Enter Token Manually
                  </h5>
                  <p className="text-sm text-gray-600 mb-4">
                    Paste your access token from Postman or Autodesk API.
                  </p>
                  <div>
                    <input
                      type="text"
                      placeholder="Enter your access token here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-autodesk-blue focus:border-autodesk-blue text-sm"
                      onChange={(e) => {
                        const token = e.target.value.trim();
                        if (token) {
                          setCredentials(prev => ({
                            ...prev,
                            threeLegToken: token
                          }));
                          AccService.initialize({
                            ...credentials,
                            threeLegToken: token
                          });
                          console.log('✅ Access token set manually');
                          console.log('Access Token:', token.substring(0, 20) + '...');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoading || !credentials.threeLegToken}
              className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-autodesk-blue hover:bg-autodesk-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-autodesk-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Sign In with 3-Leg Token
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-5 pointer-events-none" 
           style={{
             backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="%23007ACC" stroke-width="1" opacity="0.1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/><circle cx="200" cy="200" r="100" fill="%23007ACC" opacity="0.1"/><circle cx="800" cy="400" r="150" fill="%23007ACC" opacity="0.1"/><circle cx="1000" cy="600" r="80" fill="%23007ACC" opacity="0.1"/></svg>')`
           }}>
      </div>
      
      {/* Header */}
      <header className="bg-white shadow relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-autodesk-blue" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">
                Arkance ANZ Build Smart
                <br />
                <span className="text-xl text-autodesk-blue">Construction Cloud</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                3-Leg Token
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => {
                    console.log('🖱️ Projects tab clicked');
                    setActiveTab('projects');
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'projects'
                      ? 'border-autodesk-blue text-autodesk-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Projects ({projects.length})
                  </div>
                </button>
                <button
              onClick={() => {
                console.log('🖱️ Reports tab clicked');
                setActiveTab('reports');
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-autodesk-blue text-autodesk-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Phase Report
              </div>
            </button>
                <button
                  onClick={() => {
                    console.log('🖱️ Expenses tab clicked');
                    setActiveTab('expenses');
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'expenses'
                      ? 'border-autodesk-blue text-autodesk-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Expenses
                  </div>
                </button>
                <button
                  onClick={() => {
                    console.log('🖱️ Image tab clicked');
                    setActiveTab('image');
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'image'
                      ? 'border-autodesk-blue text-autodesk-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Image
                  </div>
                </button>
              </nav>
            </div>
          </div>


          {/* Hub Selection */}
            <div className="mb-6">
              <HubSelector 
                onHubSelect={handleHubSelect}
                selectedHub={selectedHub}
                credentials={credentials}
              />
            </div>

          {/* Tab Content */}
          {activeTab === 'projects' ? (
            <div className="space-y-6">

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Projects List */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Projects ({projects.length})
                      {selectedHub && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          in {selectedHub.name}
                        </span>
                      )}
                    </h3>
                    <ProjectList 
                      projects={projects}
                      selectedProject={selectedProject}
                      onProjectSelect={handleProjectSelect}
                    />
                  </div>
                </div>

                {/* Project Details & Phase Management */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    {selectedProject ? (
                      <div>
                        <ProjectDetails project={selectedProject} />
                        <div className="mt-6">
                          <PhaseManager 
                            project={selectedProject}
                            onPhaseUpdate={handlePhaseUpdate}
                            credentials={credentials}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No project selected</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Select a project from the list to view details and manage phases.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'reports' ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <ReportTab projects={projects} credentials={credentials} />
              </div>
            </div>
          ) : activeTab === 'expenses' ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <ExpenseTab projects={projects} credentials={credentials} />
              </div>
            </div>
          ) : activeTab === 'image' ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <ImageTab projects={projects} credentials={credentials} />
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default App;
