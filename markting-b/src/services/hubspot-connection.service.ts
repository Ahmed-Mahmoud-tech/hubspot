import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HubSpotConnection } from '../entities/hubspot-connection.entity';
import { HubSpotOAuthService, HubSpotTokens } from './hubspot-oauth.service';

@Injectable()
export class HubSpotConnectionService {
  private readonly logger = new Logger(HubSpotConnectionService.name);

  constructor(
    @InjectRepository(HubSpotConnection)
    private readonly connectionRepository: Repository<HubSpotConnection>,
    private readonly hubspotOAuthService: HubSpotOAuthService,
  ) {}

  /**
   * Store or update HubSpot connection for a user
   */
  async saveConnection(
    userId: number,
    tokens: HubSpotTokens,
    accountInfo?: any,
  ): Promise<HubSpotConnection> {
    try {
      // Calculate expiration time
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Deactivate existing connections for this user
      await this.connectionRepository.update(
        { userId, isActive: true },
        { isActive: false },
      );

      // Create new connection
      const connection = this.connectionRepository.create({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        tokenType: tokens.token_type,
        portalId: accountInfo?.portalId,
        hubDomain: accountInfo?.hubDomain,
        accountName: accountInfo?.accountName,
        isActive: true,
        lastUsedAt: new Date(),
      });

      const savedConnection = await this.connectionRepository.save(connection);
      this.logger.log(
        `Saved HubSpot connection for user ${userId} with portal ID ${accountInfo?.portalId}`,
      );

      return savedConnection;
    } catch (error) {
      this.logger.error(
        `Error saving HubSpot connection for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get active HubSpot connection for a user
   */
  async getActiveConnection(userId: number): Promise<HubSpotConnection> {
    const connection = await this.connectionRepository.findOne({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!connection) {
      throw new NotFoundException(
        'No active HubSpot connection found for this user',
      );
    }

    return connection;
  }

  /**
   * Get valid access token for a user (refreshing if necessary)
   */
  async getValidAccessToken(userId: number): Promise<string> {
    const connection = await this.getActiveConnection(userId);

    // Check if token is expired or expires soon
    if (connection.isExpired() || connection.expiresSoon()) {
      this.logger.log(
        `Token for user ${userId} is expired or expires soon, refreshing...`,
      );

      try {
        // Refresh the token
        const newTokens = await this.hubspotOAuthService.refreshAccessToken(
          connection.refreshToken,
        );

        // Update the connection with new tokens
        const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
        await this.connectionRepository.update(connection.id, {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt,
          lastUsedAt: new Date(),
        });

        this.logger.log(`Successfully refreshed token for user ${userId}`);
        return newTokens.access_token;
      } catch (error) {
        this.logger.error(
          `Failed to refresh token for user ${userId}:`,
          error,
        );
        // Mark connection as inactive
        await this.connectionRepository.update(connection.id, {
          isActive: false,
        });
        throw new NotFoundException(
          'HubSpot connection is invalid. Please reconnect your HubSpot account.',
        );
      }
    }

    // Update last used time
    await this.connectionRepository.update(connection.id, {
      lastUsedAt: new Date(),
    });

    return connection.accessToken;
  }

  /**
   * Disconnect HubSpot for a user
   */
  async disconnectUser(userId: number): Promise<void> {
    await this.connectionRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );

    this.logger.log(`Disconnected HubSpot for user ${userId}`);
  }

  /**
   * Get all connections for a user
   */
  async getUserConnections(userId: number): Promise<HubSpotConnection[]> {
    return this.connectionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check if user has an active HubSpot connection
   */
  async hasActiveConnection(userId: number): Promise<boolean> {
    const count = await this.connectionRepository.count({
      where: { userId, isActive: true },
    });
    return count > 0;
  }

  /**
   * Get connection status for a user
   */
  async getConnectionStatus(userId: number): Promise<{
    connected: boolean;
    accountName?: string;
    portalId?: number;
    lastUsed?: Date;
  }> {
    try {
      const connection = await this.getActiveConnection(userId);
      return {
        connected: true,
        accountName: connection.accountName,
        portalId: connection.portalId,
        lastUsed: connection.lastUsedAt,
      };
    } catch (error) {
      return { connected: false };
    }
  }
}
