import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { PlanService } from '../services/plan.service';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get('free')
  getFreePlan() {
    return this.planService.freePlan;
  }

  @Post('paid')
  getPaidPlan(
    @Body() body: { contactCount: number; billingType: 'monthly' | 'yearly' },
  ) {
    return this.planService.getPaidPlan(body.contactCount, body.billingType);
  }

  // Endpoint to get current user's plan
  @Get('user')
  getUserPlan(@Req() req) {
    // Use default userId if not provided
    const userId = req.user?.id || req.headers['x-user-id'] || 1;
    return this.planService.getUserPlan(userId);
  }

  // Endpoint to create a user plan
  @Post('create')
  async createUserPlan(@Req() req, @Body() body) {
    // Always get userId from the request (token/session/header)
    const userId = req.user?.id || req.headers['x-user-id'] || 1;
    // Merge userId into the body
    return this.planService.createUserPlan({ ...body, userId });
  }
}
