import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import AccService from '../services/AccService';

const HubSelector = ({ onHubSelect, selectedHub, credentials }) => {
  const [hubs, setHubs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (credentials && credentials.threeLegToken) {
      loadHubs();
    }
  }, [credentials]);

  const loadHubs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      AccService.initialize(credentials);
      const hubsData = await AccService.getHubs();
      setHubs(hubsData || []);
    } catch (err) {
      setError(err.message || 'Failed to load hubs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHubSelect = (hub) => {
    onHubSelect(hub);
    setIsOpen(false);
  };


  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-autodesk-blue animate-spin mr-2" />
          <span className="text-sm text-gray-600">Loading hubs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Hub Selection</h3>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <p className="text-xs text-red-600 mt-1">
                Check the browser console for detailed debugging information
              </p>
            </div>
          </div>
        </div>
      )}


      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-autodesk-blue focus:border-transparent"
        >
          <div className="flex items-center">
            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-900">
              {selectedHub ? selectedHub.name : 'Select a hub...'}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
        {hubs.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">
            <div className="text-center py-4">
              <Building2 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="font-medium">No hubs available</p>
              <p className="text-xs text-gray-400 mt-1">
                This might be due to insufficient permissions or no hub access
              </p>
            </div>
          </div>
        ) : (
              hubs.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => handleHubSelect(hub)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    selectedHub?.id === hub.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{hub.name}</div>
                      <div className="text-xs text-gray-500">
                        {hub.region} • {hub.type}
                      </div>
                    </div>
                    {selectedHub?.id === hub.id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedHub && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <Building2 className="h-4 w-4 text-blue-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Selected: {selectedHub.name}
              </p>
              <p className="text-xs text-blue-600">
                {selectedHub.region} • {selectedHub.type}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HubSelector;

