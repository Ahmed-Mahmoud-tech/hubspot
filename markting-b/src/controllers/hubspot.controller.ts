import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { HubSpotService } from '../services/hubspot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  StartHubSpotFetchDto,
  GetDuplicatesDto,
  SubmitMergeDto,
  FinishProcessDto,
  ResetMergeDto,
} from '../dto/hubspot.dto';

@Controller('hubspot')
@UseGuards(JwtAuthGuard)
export class HubSpotController {
  constructor(private readonly hubspotService: HubSpotService) {}

  @Post('start-fetch')
  async startFetch(
    @Request() req: any,
    @Body() startHubSpotFetchDto: StartHubSpotFetchDto,
  ) {
    const userId = req.user.id as number;
    const result = await this.hubspotService.startFetch(
      userId,
      startHubSpotFetchDto,
    );

    return {
      message: result.message,
      actionId: result.action.id,
      status: result.action.status,
    };
  }

  @Get('actions/:actionId')
  async getActionStatus(@Param('actionId') actionId: number) {
    const action = await this.hubspotService.getActionStatus(actionId);

    if (!action) {
      return { error: 'Action not found' };
    }

    return {
      actionId: action.id,
      status: action.status,
      count: action.count,
      createdAt: action.created_at,
    };
  }

  @Post('actions/:actionId/retry')
  async retryFailedAction(@Param('actionId') actionId: number) {
    try {
      const result = await this.hubspotService.retryFailedAction(actionId);
      return result;
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  @Post('actions/auto-retry')
  async triggerAutoRetry() {
    try {
      await this.hubspotService.autoRetryFailedActions();
      return { message: 'Auto-retry process completed successfully' };
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  @Get('actions')
  async getUserActions(@Request() req: any) {
    const userId = req.user.id as number;
    const actions = await this.hubspotService.getUserActions(userId);

    return actions.map((action) => ({
      id: action.id,
      name: action.name,
      process_name: action.process_name,
      status: action.status,
      count: action.count,
      api_key: action.api_key,
      excel_link: action.excel_link,
      created_at: action.created_at,
    }));
  }

  @Get('matching')
  async getMatchingGroups(
    @Request() req: any,
    @Query('apiKey') apiKey?: string,
  ) {
    const userId = req.user.id as number;
    const matchingGroups = await this.hubspotService.getMatchingGroups(
      userId,
      apiKey,
    );

    return matchingGroups.map((group) => ({
      id: group.id,
      group: group.group,
      apiKey: group.apiKey,
      createdAt: group.createdAt,
    }));
  }

  @Get('duplicates')
  @UseGuards(JwtAuthGuard)
  async getDuplicates(
    @Request() req: any,
    @Query() getDuplicatesDto: GetDuplicatesDto,
  ) {
    const userId = req.user.id as number;
    return this.hubspotService.getDuplicatesWithPagination(
      userId,
      getDuplicatesDto,
    );
  }

  @Post('submit-merge')
  @UseGuards(JwtAuthGuard)
  async submitMerge(
    @Request() req: any,
    @Body() submitMergeDto: SubmitMergeDto,
  ) {
    const userId = req.user.id as number;
    return this.hubspotService.submitMerge(userId, submitMergeDto);
  }

  @Post('debug-duplicates')
  @UseGuards(JwtAuthGuard)
  async debugDuplicates(@Request() req: any, @Query('apiKey') apiKey: string) {
    const userId = req.user.id as number;
    return this.hubspotService.debugDuplicateDetection(userId, apiKey);
  }

  @Post('test-find-duplicates')
  @UseGuards(JwtAuthGuard)
  async testFindDuplicates(
    @Request() req: any,
    @Query('apiKey') apiKey: string,
  ) {
    const userId = req.user.id as number;

    try {
      // Run the duplicate detection process
      await this.hubspotService.findAndSaveDuplicates(apiKey, userId);

      // Get the results
      const matchingGroups = await this.hubspotService.getMatchingGroups(
        userId,
        apiKey,
      );

      return {
        success: true,
        message: 'Duplicate detection completed successfully',
        totalGroups: matchingGroups.length,
        groups: matchingGroups.map((group) => ({
          id: group.id,
          groupSize: group.group.length,
          contactIds: group.group,
          createdAt: group.createdAt,
        })),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Duplicate detection failed',
        error: error.message,
      };
    }
  }

  @Post('finish')
  @UseGuards(JwtAuthGuard)
  async finishProcess(
    @Request() req: any,
    @Body() finishProcessDto: FinishProcessDto,
  ) {
    const userId = req.user.id as number;
    console.log('00000000000000000000000000000000', userId, finishProcessDto);

    return this.hubspotService.finishProcess(userId, finishProcessDto);
  }

  @Post('reset-merge')
  @UseGuards(JwtAuthGuard)
  async resetMerge(@Request() req: any, @Body() resetMergeDto: ResetMergeDto) {
    const userId = req.user.id as number;
    return this.hubspotService.resetMergedGroup(
      userId,
      resetMergeDto.groupId,
      resetMergeDto.apiKey,
    );
  }
}
