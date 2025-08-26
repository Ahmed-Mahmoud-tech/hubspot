# HubSpot OAuth Integration Setup

## Overview

This implementation replaces manual API key entry with secure HubSpot OAuth 2.0 authentication. Users can now connect their HubSpot accounts directly through OAuth, providing better security and user experience.

## Features

✅ **Secure OAuth 2.0 Authentication** - No more manual API key entry
✅ **Automatic Token Refresh** - Handles token expiration automatically  
✅ **Connection Management** - Users can connect/disconnect HubSpot accounts
✅ **Fallback Support** - Still supports API keys for users who prefer them
✅ **Better UX** - Seamless integration flow with status indicators

## Backend Changes

### New Services

- `HubSpotOAuthService` - Handles OAuth flow (auth URL generation, token exchange, refresh)
- `HubSpotConnectionService` - Manages user connections and token lifecycle

### New Controllers

- `HubSpotOAuthController` - OAuth endpoints (`/hubspot/oauth/*`)

### New Entities

- `HubSpotConnection` - Stores OAuth tokens and connection metadata

### New Endpoints

- `GET /hubspot/oauth/authorize` - Initiate OAuth flow
- `GET /hubspot/oauth/callback` - Handle OAuth callback
- `GET /hubspot/oauth/status` - Get connection status
- `GET /hubspot/oauth/disconnect` - Disconnect account
- `POST /hubspot/start-fetch-oauth` - Start integration using OAuth
- `GET /hubspot/properties-oauth` - Get properties using OAuth

## Frontend Changes

### New Components

- `HubSpotOAuth` - Connection management component

### Updated Components

- `Dashboard` - Integrated OAuth flow and conditional API key fields
- `useRequest` - Added OAuth-related API methods

### Features

- OAuth connection status display
- Conditional form fields (API key only when not connected via OAuth)
- Automatic property fetching for connected accounts
- Seamless integration flow

## HubSpot App Setup

### 1. Create HubSpot App

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create a new app or use existing one
3. Navigate to "Auth" tab

### 2. Configure OAuth

- **Redirect URL**: `http://localhost:3000/hubspot/oauth/callback` (development)
- **Scopes Required**:
  - `crm.objects.contacts.read` - Read contacts
  - `crm.objects.contacts.write` - Update/merge contacts
  - `crm.schemas.contacts.read` - Read contact properties
  - `crm.schemas.contacts.write` - Create custom properties

### 3. Get Credentials

- Copy **Client ID** and **Client Secret** from the app settings

## Environment Setup

### Backend (.env)

```env
HUBSPOT_CLIENT_ID=your_client_id_here
HUBSPOT_CLIENT_SECRET=your_client_secret_here
HUBSPOT_REDIRECT_URI=http://localhost:3000/hubspot/oauth/callback
FRONTEND_URL=http://localhost:3001
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Database Migration

Run the migration to create the hubspot_connections table:

```sql
-- See migrations/create-hubspot-connections-table.sql
```

## Testing the Integration

### 1. Start Services

```bash
# Backend
cd marketing-b && npm run start:dev

# Frontend
cd marketing-f && npm run dev
```

### 2. Test OAuth Flow

1. Go to dashboard at http://localhost:3001/dashboard
2. Click "Connect HubSpot" in the HubSpot Connection section
3. Authorize the app in HubSpot
4. Verify connection shows as successful
5. Create a new integration (API key field should be hidden)
6. Verify integration works with OAuth tokens

### 3. Test Fallback

1. Disconnect HubSpot account
2. Verify API key field appears in integration form
3. Test manual API key integration still works

## Security Benefits

1. **No API Key Storage** - Tokens are automatically refreshed
2. **Limited Scope** - Only requested permissions are granted
3. **Revocable Access** - Users can revoke access from HubSpot
4. **Audit Trail** - Connection history and usage tracking
5. **Token Expiration** - Automatic handling of expired tokens

## Troubleshooting

### Common Issues

**"No active HubSpot connection found"**

- User needs to connect their HubSpot account via OAuth

**"HubSpot connection is invalid"**

- Token has expired and refresh failed
- User needs to reconnect their account

**OAuth callback errors**

- Check redirect URI configuration in HubSpot app
- Verify environment variables are set correctly

**Properties not loading**

- Check if user has proper permissions in HubSpot
- Verify OAuth scopes include schema read permissions

## Migration from API Keys

Existing integrations using API keys will continue to work. Users can:

1. Continue using API keys (legacy flow)
2. Connect via OAuth for new integrations
3. Gradually migrate to OAuth-only workflow

The system supports both methods simultaneously for a smooth transition.
