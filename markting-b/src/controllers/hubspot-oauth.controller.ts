import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Request,
  BadRequestException,
  InternalServerErrorException,
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
   * Initiate HubSpot OAuth flow
   */
  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  async authorize(@Request() req: any, @Res() res: Response) {
    const userId = req.user.id as number;

    try {
      const { authUrl, state } =
        this.hubspotOAuthService.generateAuthUrl(userId);

      // Store state in session or temporary storage for validation
      // For now, we'll include it in the redirect URL for the frontend to handle
      const frontendRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard?hubspot_auth=initiated&state=${encodeURIComponent(state)}`;

      // Redirect to HubSpot OAuth page
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
    @Res() res: Response,
  ) {
    if (!code) {
      const errorRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard?hubspot_auth=error&message=${encodeURIComponent('Authorization code not provided')}`;
      return res.redirect(errorRedirect);
    }

    if (!state) {
      const errorRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard?hubspot_auth=error&message=${encodeURIComponent('State parameter missing')}`;
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
      const successRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard?hubspot_auth=success&account=${encodeURIComponent((accountInfo as any)?.accountName || 'HubSpot Account')}`;
      res.redirect(successRedirect);
    } catch (error) {
      const errorRedirect = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard?hubspot_auth=error&message=${encodeURIComponent(error.message)}`;
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
