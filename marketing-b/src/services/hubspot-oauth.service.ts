import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface HubSpotTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface HubSpotAuthUrl {
  authUrl: string;
  state: string;
}

@Injectable()
export class HubSpotOAuthService {
  private readonly logger = new Logger(HubSpotOAuthService.name);
  private readonly hubspotClientId: string;
  private readonly hubspotClientSecret: string;
  private readonly hubspotRedirectUri: string;

  constructor(private configService: ConfigService) {
    this.hubspotClientId =
      this.configService.get<string>('HUBSPOT_CLIENT_ID') || '';
    this.hubspotClientSecret =
      this.configService.get<string>('HUBSPOT_CLIENT_SECRET') || '';
    this.hubspotRedirectUri =
      this.configService.get<string>('HUBSPOT_REDIRECT_URI') ||
      'http://localhost:8000/hubspot/oauth/callback';
  }

  /**
   * Generate HubSpot OAuth authorization URL
   */
  generateAuthUrl(userId: number): HubSpotAuthUrl {
    const state = `user_${userId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.schemas.contacts.read',
      'crm.schemas.contacts.write',
    ].join(' ');

    const authUrl =
      `https://app.hubspot.com/oauth/authorize?` +
      `client_id=${this.hubspotClientId}&` +
      `redirect_uri=${encodeURIComponent(this.hubspotRedirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;

    this.logger.log(`Generated auth URL for user ${userId}: ${authUrl}`);

    return {
      authUrl,
      state,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(
    code: string,
    state: string,
  ): Promise<HubSpotTokens> {
    try {
      const tokenUrl = 'https://api.hubapi.com/oauth/v1/token';

      const payload = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.hubspotClientId,
        client_secret: this.hubspotClientSecret,
        redirect_uri: this.hubspotRedirectUri,
        code: code,
      });

      this.logger.log(`Exchanging code for tokens with state: ${state}`);

      const response = await axios.post(tokenUrl, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokens: HubSpotTokens = response.data;
      this.logger.log(`Successfully obtained tokens for state: ${state}`);

      return tokens;
    } catch (error) {
      this.logger.error(
        'Error exchanging code for tokens:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to exchange authorization code: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<HubSpotTokens> {
    try {
      const tokenUrl = 'https://api.hubapi.com/oauth/v1/token';

      const payload = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.hubspotClientId,
        client_secret: this.hubspotClientSecret,
        refresh_token: refreshToken,
      });

      this.logger.log('Refreshing access token');

      const response = await axios.post(tokenUrl, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const tokens: HubSpotTokens = response.data;
      this.logger.log('Successfully refreshed access token');

      return tokens;
    } catch (error) {
      this.logger.error(
        'Error refreshing access token:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to refresh access token: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  }

  /**
   * Validate access token by making a test API call
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: { limit: 1 },
      });

      this.logger.log('Access token validation successful');
      return true;
    } catch (error) {
      this.logger.error(
        'Access token validation failed:',
        error.response?.data || error.message,
      );
      return false;
    }
  }

  /**
   * Get account information using access token
   */
  async getAccountInfo(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(
        'https://api.hubapi.com/account-info/v3/details',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        'Error getting account info:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to get account info: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  }
}
