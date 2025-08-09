import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { HubSpotPropertiesService } from '../services/hubspot-properties.service';
import { HubSpotService } from '../services/hubspot.service';

@Controller('hubspot-properties')
export class HubSpotPropertiesController {
  constructor(
    private readonly hubspotPropertiesService: HubSpotPropertiesService,
    private readonly hubspotService: HubSpotService,
  ) {}

  @Get('contact-properties')
  async getContactProperties(
    @Request() req: any,
    @Query('apiKey') apiKey?: string,
  ) {
    try {
      if (!apiKey) {
        throw new HttpException(
          'HubSpot API key is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const properties =
        await this.hubspotPropertiesService.getContactProperties(apiKey);
      return { success: true, data: properties };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch contact properties',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('contact-properties/grouped')
  async getGroupedContactProperties(
    @Request() req: any,
    @Query('apiKey') apiKey?: string,
  ) {
    try {
      if (!apiKey) {
        // Return empty data to trigger fallback on frontend
        return {
          success: false,
          message: 'HubSpot API key is required',
          data: {},
        };
      }

      const groupedProperties =
        await this.hubspotPropertiesService.getGroupedContactProperties(apiKey);
      return { success: true, data: groupedProperties };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch grouped contact properties',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('contact-properties/search')
  async searchContactProperties(
    @Request() req: any,
    @Query('term') searchTerm: string,
    @Query('apiKey') apiKey?: string,
  ) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        throw new HttpException(
          'Search term is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!apiKey) {
        return {
          success: false,
          message: 'HubSpot API key is required',
          data: [],
        };
      }

      const properties =
        await this.hubspotPropertiesService.searchContactProperties(
          apiKey,
          searchTerm,
        );
      return { success: true, data: properties };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to search contact properties',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('validate-properties')
  async validateProperties(
    @Request() req: any,
    @Body() body: { propertyNames: string[]; apiKey?: string },
  ) {
    try {
      const { propertyNames, apiKey } = body;
      if (!propertyNames || !Array.isArray(propertyNames)) {
        throw new HttpException(
          'Property names array is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!apiKey) {
        throw new HttpException(
          'HubSpot API key is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const validation = await this.hubspotPropertiesService.validateProperties(
        apiKey,
        propertyNames,
      );
      return { success: true, data: validation };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to validate properties',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
