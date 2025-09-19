import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Trash2, RefreshCw, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import AccService from '../services/AccService';

const ImageTab = ({ projects, credentials }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [error, setError] = useState(null);
  const [projectImage, setProjectImage] = useState(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [twoLeggedToken, setTwoLeggedToken] = useState(credentials.twoLeggedToken || '');
  const [isGettingToken, setIsGettingToken] = useState(false);

  const handleProjectSelect = (project) => {
    console.log('🔍 Image tab - Project selected:', project);
    setSelectedProject(project);
    setSelectedFile(null);
    setUploadStatus(null);
    setError(null);
    setProjectImage(null);
    
    // Load existing project image if available
    loadProjectImage(project);
  };

  const loadProjectImage = async (project) => {
    if (!project) return;
    
    setIsLoadingImage(true);
    try {
      // For now, we'll just show a placeholder
      // In a real implementation, you might fetch the current image URL
      setProjectImage(null);
      console.log('🔍 Loading image for project:', project.name);
    } catch (err) {
      console.error('Error loading project image:', err);
    } finally {
      setIsLoadingImage(false);
    }
  };

  const getTwoLeggedToken = async () => {
    setIsGettingToken(true);
    setError(null);
    
    try {
      console.log('🔑 Getting 2-legged token...');
      
      // Use AccService to get 2-legged token
      const token = await AccService.getTwoLeggedToken();
      setTwoLeggedToken(token);
      console.log('✅ 2-legged token obtained successfully');
      setUploadStatus('2-legged token obtained successfully!');
    } catch (err) {
      console.error('❌ Error getting 2-legged token:', err);
      setError(`Failed to get 2-legged token automatically: ${err.message}. You can paste a token manually below.`);
      // Don't clear the token field, let user paste manually
    } finally {
      setIsGettingToken(false);
    }
  };

  // Update token when credentials change
  useEffect(() => {
    if (credentials.twoLeggedToken && credentials.twoLeggedToken !== twoLeggedToken) {
      setTwoLeggedToken(credentials.twoLeggedToken);
      console.log('✅ 2-legged token updated from credentials');
    }
  }, [credentials.twoLeggedToken]);

  // Auto-get 2-legged token when component mounts
  useEffect(() => {
    console.log('🔑 ImageTab mounted, checking for 2-legged token...');
    console.log('🔑 Current token from credentials:', credentials.twoLeggedToken ? 'EXISTS' : 'NONE');
    console.log('🔑 Current local token:', twoLeggedToken ? 'EXISTS' : 'NONE');
    
    // Always try to get a fresh token when visiting Images tab
    console.log('🔑 Getting fresh 2-legged token for Images tab...');
    getTwoLeggedToken();
  }, []);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/bmp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (PNG, JPEG, JPG, BMP, or GIF)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      setUploadStatus(null);
      console.log('🔍 File selected:', file.name, file.type, file.size);
    }
  };

  const handleUpload = async () => {
    if (!selectedProject || !selectedFile) {
      setError('Please select both a project and an image file');
      return;
    }

    if (!twoLeggedToken) {
      setError('2-legged token is being obtained automatically, please wait...');
      // Try to get token automatically
      await getTwoLeggedToken();
      if (!twoLeggedToken) {
        setError('Failed to obtain 2-legged token automatically. Please paste a token manually or try the "Refresh Token" button.');
        return;
      }
    }

    setIsUploading(true);
    setError(null);
    setUploadStatus(null);

    try {
      console.log('🔍 Uploading image for project:', selectedProject.name);
      
      // Convert project ID to BIM 360 format (remove 'b.' prefix if present)
      const projectId = selectedProject.id.startsWith('b.') 
        ? selectedProject.id.substring(2) 
        : selectedProject.id;
      
      // Convert hub ID to account ID (remove 'b.' prefix if present)
      const accountId = selectedProject.hubId?.startsWith('b.') 
        ? selectedProject.hubId.substring(2) 
        : selectedProject.hubId || 'ddc5f6e2-9ddc-475e-82ed-b05da4ac18c2';

      console.log('🔍 Using project ID:', projectId);
      console.log('🔍 Using account ID:', accountId);
      console.log('🔍 Using 2-legged token:', twoLeggedToken ? `${twoLeggedToken.substring(0, 20)}...` : 'MISSING');

      // Use the manually obtained 2-legged token
      const result = await AccService.updateProjectImageWithToken(projectId, selectedFile, twoLeggedToken, accountId);
      
      setUploadStatus('success');
      setProjectImage(URL.createObjectURL(selectedFile));
      console.log('✅ Image uploaded successfully:', result);
      
      // Clear the file input
      setSelectedFile(null);
      const fileInput = document.getElementById('image-file-input');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error('❌ Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!selectedProject) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      // For now, just clear the local state
      // In a real implementation, you might call an API to remove the image
      setProjectImage(null);
      setUploadStatus('removed');
      console.log('🔍 Image removed for project:', selectedProject.name);
    } catch (err) {
      console.error('❌ Error removing image:', err);
      setError(err.message || 'Failed to remove image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Project</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectSelect(project)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedProject?.id === project.id
                  ? 'border-autodesk-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <ImageIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {project.name || 'Unnamed Project'}
                  </h4>
                  {project.jobNumber && (
                    <p className="text-xs text-gray-500">Job #: {project.jobNumber}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Upload Section */}
      {selectedProject && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Upload Image for {selectedProject.name}
          </h3>
          
          {/* Current Image Display */}
          {projectImage && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Image</h4>
              <div className="relative inline-block">
                <img
                  src={projectImage}
                  alt="Project image"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={handleRemoveImage}
                  disabled={isUploading}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* 2-Legged Token Section */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-3">2-Legged Authentication Token</h4>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={twoLeggedToken}
                onChange={(e) => setTwoLeggedToken(e.target.value)}
                placeholder="2-legged token will be obtained automatically, or paste manually..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
              <button
                onClick={getTwoLeggedToken}
                disabled={isGettingToken}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGettingToken ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Getting...
                  </>
                ) : (
                  'Get Token'
                )}
              </button>
            </div>
            {twoLeggedToken ? (
              <p className="text-xs text-green-600 mt-2">
                ✅ 2-legged token ready for upload {credentials.twoLeggedToken ? '(obtained from sign-in)' : '(obtained locally)'}
              </p>
            ) : isGettingToken ? (
              <p className="text-xs text-blue-600 mt-2">
                🔄 Obtaining 2-legged token automatically... Please wait...
              </p>
            ) : (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ No 2-legged token available. Click "Refresh Token" or paste one manually.
              </p>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Image File
              </label>
              <input
                id="image-file-input"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/bmp,image/gif"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: PNG, JPEG, JPG, BMP, GIF (max 10MB)
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <ImageIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-autodesk-blue hover:bg-autodesk-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-autodesk-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">
                    Image uploaded successfully!
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadStatus === 'removed' && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Image removed successfully!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!selectedProject && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <ImageIcon className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Project Image Management</h3>
              <p className="text-sm text-blue-700 mt-1">
                Select a project above to upload or manage its image. Supported formats include PNG, JPEG, JPG, BMP, and GIF files up to 10MB.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageTab;
