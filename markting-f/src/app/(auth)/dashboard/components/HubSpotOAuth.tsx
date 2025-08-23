'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { getCookie } from 'cookies-next';
import useRequest from '@/app/axios/useRequest';
import { baseURL } from '@/app/constant/main';
import { Link2, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';

interface HubSpotOAuthProps {
  onConnectionChange?: (connected: boolean) => void;
}

interface ConnectionStatus {
  success: boolean;
  connected: boolean;
  accountName?: string;
  portalId?: number;
  lastUsed?: string;
  error?: string;
}

export default function HubSpotOAuth({ onConnectionChange }: HubSpotOAuthProps) {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    success: false,
    connected: false,
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { getHubSpotOAuthStatus, disconnectHubSpot, getCurrentUser } = useRequest();

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const status = await getHubSpotOAuthStatus();
      setConnectionStatus(status);
      onConnectionChange?.(status.connected);
    } catch (error: any) {
      console.error('Error checking HubSpot connection status:', error);

      // Handle different error types
      if (error?.response?.status === 401) {
        // User not authenticated
        setConnectionStatus({ success: false, connected: false });
        onConnectionChange?.(false);
      } else if (error?.response?.status === 404) {
        // OAuth status endpoint not found
        console.warn('OAuth status endpoint not available');
        setConnectionStatus({ success: false, connected: false });
        onConnectionChange?.(false);
      } else {
        // Other errors
        setConnectionStatus({ success: false, connected: false });
        onConnectionChange?.(false);

        // Only show error toast if it's not a 401 (authentication error)
        if (error?.response?.status !== 401) {
          toast.error('Failed to check HubSpot connection status');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();

    // Reset connecting state on mount
    setConnecting(false);

    // Cleanup function to reset connecting state
    return () => {
      setConnecting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hubspotAuth = urlParams.get('hubspot_auth');
    const message = urlParams.get('message');
    const account = urlParams.get('account');

    if (hubspotAuth === 'success') {
      toast.success(`Successfully connected to ${decodeURIComponent(account || 'HubSpot')}`);
      // Refresh connection status and clean up URL
      checkConnectionStatus().then(() => {
        router.replace('/dashboard');
      });
    } else if (hubspotAuth === 'error') {
      toast.error(`Failed to connect to HubSpot: ${decodeURIComponent(message || 'Unknown error')}`);
      // Clean up URL
      router.replace('/dashboard');
    } else if (hubspotAuth === 'initiated') {
      // OAuth flow was initiated, no need for toast but clean up URL
      router.replace('/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);

      // Check if user is authenticated by checking if auth token exists
      const authToken = getCookie('auth_token');

      if (!authToken) {
        toast.error('Please log in first to connect your HubSpot account');
        router.push('/login');
        return;
      }

      // Check if already connected
      if (connectionStatus.connected) {
        toast.info('HubSpot account is already connected');
        return;
      }

      // Get user ID from current user
      const currentUser = getCurrentUser();
      if (!currentUser?.id) {
        toast.error('Unable to get user information. Please try logging in again.');
        router.push('/login');
        return;
      }

      // DIRECT REDIRECT - NO AJAX/FETCH CALLS
      // This avoids CORS issues completely
      window.location.href = `${baseURL}/hubspot/oauth/authorize?user_id=${currentUser.id}`;

    } catch (error: any) {
      console.error('Error initiating HubSpot connection:', error);
      toast.error('Failed to initiate HubSpot connection. Please try again.');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);

      // Confirm with user before disconnecting
      if (!window.confirm('Are you sure you want to disconnect your HubSpot account? You will need to reconnect to continue using the service.')) {
        return;
      }

      const result = await disconnectHubSpot();

      if (result.success) {
        toast.success(result.message || 'HubSpot account disconnected successfully');
        setConnectionStatus({ success: true, connected: false });
        onConnectionChange?.(false);
      } else {
        toast.error('Failed to disconnect HubSpot account');
      }
    } catch (error: any) {
      console.error('Error disconnecting HubSpot:', error);
      // Show more specific error messages
      if (error?.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
        router.push('/login');
      } else if (error?.response?.status === 404) {
        toast.error('Disconnect service not available. Please try again later.');
      } else {
        toast.error(error?.message || 'Failed to disconnect HubSpot account');
      }
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-600">Checking HubSpot connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Link2 className="h-5 w-5 text-orange-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">HubSpot Connection</h3>
        </div>

        <div className="flex items-center space-x-2">
          {connectionStatus.connected ? (
            <div className="flex items-center text-green-600">
              <Check className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <X className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Not Connected</span>
            </div>
          )}

          <button
            onClick={checkConnectionStatus}
            disabled={loading}
            className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            title="Refresh connection status"
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {connectionStatus.connected ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-start">
              <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800">
                  Connected to HubSpot
                </h4>
                {connectionStatus.accountName && (
                  <p className="mt-1 text-sm text-green-700">
                    Account: {connectionStatus.accountName}
                  </p>
                )}
                {connectionStatus.portalId && (
                  <p className="text-sm text-green-700">
                    Portal ID: {connectionStatus.portalId}
                  </p>
                )}
                {connectionStatus.lastUsed && (
                  <p className="text-sm text-green-700">
                    Last used: {new Date(connectionStatus.lastUsed).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Your HubSpot account is connected and ready to use.
            </p>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disconnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <X className="h-4 w-4 mr-1" />
              )}
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">
                  HubSpot Connection Required
                </h4>
                <p className="mt-1 text-sm text-yellow-700">
                  Connect your HubSpot account to start managing duplicate contacts.
                  This is more secure than using API keys and provides better integration.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Secure OAuth 2.0 authentication with HubSpot
              </p>
              <p className="text-xs text-gray-500 mt-1">
                We&apos;ll redirect you to HubSpot to authorize the connection
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting || connectionStatus.connected}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              {connecting ? 'Connecting...' : 'Connect HubSpot'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
