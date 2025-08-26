import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Request,
  BadRequestException,
  InternalServerErrorException,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HubSpotOAuthService } from '../services/hubspot-oauth.service';
import { HubSpotConnectionService } from '../services/hubspot-connection.service';

@Controller('hubspot/oauth')
export class HubSpotOAuthController {
  constructor(
    private readonly hubspotOAuthService: HubSpotOAuthService,
    private readonly hubspotConnectionService: HubSpotConnectionService,
  ) {}

  /**
   * Test endpoint to verify controller is working
   */
  @Get('test')
  async test() {
    return {
      message: 'HubSpot OAuth controller is working!',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate OAuth URL without authentication (for testing)
   */
  @Get('auth-url')
  async generateAuthUrl(@Query('user_id') userId: string) {
    if (!userId) {
      throw new BadRequestException('user_id query parameter is required');
    }

    try {
      const { authUrl, state } = this.hubspotOAuthService.generateAuthUrl(
        parseInt(userId, 10),
      );

      return {
        success: true,
        authUrl,
        state,
        instructions: 'Visit the authUrl in your browser to start OAuth flow',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to generate auth URL: ${error.message}`,
      );
    }
  }

  /**
   * Initiate HubSpot OAuth flow - NO AUTHENTICATION REQUIRED
   * Frontend calls this with user_id as query param
   */
  @Get('authorize')
  async authorize(@Query('user_id') userId: string, @Res() res: Response) {
    if (!userId) {
      throw new BadRequestException('user_id query parameter is required');
    }

    try {
      const { authUrl } = this.hubspotOAuthService.generateAuthUrl(
        parseInt(userId, 10),
      );

      // Direct redirect to HubSpot - NO CORS issues
      res.redirect(authUrl);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to initiate OAuth: ${error.message}`,
      );
    }
  }

  /**
   * Handle OAuth callback from HubSpot
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    // Handle OAuth errors from HubSpot
    if (error) {
      console.error('HubSpot OAuth Error:', error, errorDescription);
      const errorRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?hubspot_auth=error&message=${encodeURIComponent(errorDescription || error)}`;
      return res.redirect(errorRedirect);
    }

    if (!code) {
      const errorRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?hubspot_auth=error&message=${encodeURIComponent('Authorization code not provided')}`;
      return res.redirect(errorRedirect);
    }

    if (!state) {
      const errorRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?hubspot_auth=error&message=${encodeURIComponent('State parameter missing')}`;
      return res.redirect(errorRedirect);
    }

    try {
      // Extract user ID from state
      const stateMatch = state.match(/^user_(\d+)_/);
      if (!stateMatch) {
        throw new BadRequestException('Invalid state parameter');
      }

      const userId = parseInt(stateMatch[1], 10);

      // Exchange code for tokens
      const tokens = await this.hubspotOAuthService.exchangeCodeForTokens(
        code,
        state,
      );

      // Get account information
      let accountInfo = null;
      try {
        accountInfo = await this.hubspotOAuthService.getAccountInfo(
          tokens.access_token,
        );
      } catch (error) {
        // Account info is optional, continue without it
        console.warn('Failed to fetch account info:', error.message);
      }

      // Save connection
      await this.hubspotConnectionService.saveConnection(
        userId,
        tokens,
        accountInfo,
      );

      // Redirect to frontend with success
      const successRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?hubspot_auth=success&account=${encodeURIComponent((accountInfo as any)?.accountName || 'HubSpot Account')}`;
      res.redirect(successRedirect);
    } catch (error) {
      const errorRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?hubspot_auth=error&message=${encodeURIComponent(error.message)}`;
      res.redirect(errorRedirect);
    }
  }

  /**
   * Get current HubSpot connection status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getConnectionStatus(@Request() req: any) {
    const userId = req.user.id as number;

    try {
      const status =
        await this.hubspotConnectionService.getConnectionStatus(userId);
      return {
        success: true,
        ...status,
      };
    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Disconnect HubSpot account
   */
  @Get('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@Request() req: any) {
    const userId = req.user.id as number;

    try {
      await this.hubspotConnectionService.disconnectUser(userId);
      return {
        success: true,
        message: 'HubSpot account disconnected successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to disconnect: ${error.message}`,
      );
    }
  }
}
