import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanType } from '../entities/plan.entity';
import { UserPlan } from '../entities/user-plan.entity';
import { Payment } from '../entities/payment.entity';
import { EmailService } from './email.service';
import { UserService } from './user.service';
import {
  dividedContactPerMonth,
  dividedContactPerYear,
  freeContactLimit,
  freeMergeGroupLimit,
} from 'src/constant/main';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(UserPlan)
    private userPlanRepo: Repository<UserPlan>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
  ) {}
  // Cron job: runs every minute
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async notifyUsersBeforePlanEnds() {
    // Get latest plan for each user (subquery for max activationDate per userId)
    console.log('777777777777777777');

    const now = new Date();
    const subQuery = this.userPlanRepo
      .createQueryBuilder('up')
      .select('up."userId"', 'userId')
      .addSelect('MAX(up."activationDate")', 'maxActivationDate')
      .groupBy('up."userId"');

    const latestPlans = await this.userPlanRepo
      .createQueryBuilder('userPlan')
      .innerJoin(
        '(' + subQuery.getQuery() + ')',
        'latest',
        '"userPlan"."userId" = latest."userId" AND "userPlan"."activationDate" = latest."maxActivationDate"',
      )
      .select(['userPlan.userId', 'userPlan.billingEndDate'])
      .where('"userPlan"."billingEndDate" > :now', { now })
      .getRawMany();

    for (const plan of latestPlans) {
      console.log(
        `Processing plan ${latestPlans.indexOf(plan)} of ${latestPlans.length}`,
      );
      if (!plan.userPlan_billingEndDate) continue;
      const billingEnd = new Date(plan.userPlan_billingEndDate);
      const diffDays = Math.ceil(
        (billingEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      console.log(diffDays, '444444444466666666666', latestPlans, '44444411');
      if (diffDays < 2) {
        // Get user email
        const user = await this.userService.findById(plan.userPlan_userId);

        if (user && user.email) {
          await this.emailService.sendPlanEndingSoonEmail(
            user.email,
            billingEnd,
          );
        }
      }
    }
  }

  freePlan: Plan = {
    id: 1,
    type: PlanType.FREE,
    name: 'Free Plan',
    mergeGroupLimit: freeMergeGroupLimit,
    contactLimit: freeContactLimit,
    durationDays: 30,
    price: 0,
    billingType: null,
  };

  getPaidPlan(contactCount: number, billingType: 'monthly' | 'yearly'): Plan {
    let price = 0;
    if (billingType === 'monthly') {
      price = contactCount / dividedContactPerMonth;
    } else {
      price = (contactCount / dividedContactPerYear) * 12;
    }
    return {
      id: 2,
      type: PlanType.PAID,
      name: 'Paid Plan',
      mergeGroupLimit: null,
      contactLimit: null,
      durationDays: null,
      price,
      billingType,
    };
  }

  async getUserPlan(userId: number): Promise<UserPlan | null> {
    return await this.userPlanRepo.findOne({
      where: { userId },
      order: { activationDate: 'DESC' },
    });
  }

  async createUserPlan(data: Partial<UserPlan>): Promise<UserPlan> {
    const plan = this.userPlanRepo.create(data);
    return await this.userPlanRepo.save(plan);
  }

  async updateUserPlan(
    userId: number,
    data: Partial<UserPlan>,
  ): Promise<UserPlan | null> {
    await this.userPlanRepo.update({ userId }, data);
    return await this.getUserPlan(userId);
  }

  async calculateUserBalance(userId: number): Promise<{
    hasBalance: boolean;
    balanceAmount: number;
    remainingDays: number;
    originalAmount: number;
    totalDays: number;
  }> {
    // Get ALL current user plans that are active and paid
    const currentPlans = await this.userPlanRepo.find({
      where: {
        userId,
        planType: PlanType.PAID,
        paymentStatus: 'active',
      },
      order: { activationDate: 'DESC' },
      relations: ['payment'],
    });

    if (!currentPlans || currentPlans.length === 0) {
      return {
        hasBalance: false,
        balanceAmount: 0,
        remainingDays: 0,
        originalAmount: 0,
        totalDays: 0,
      };
    }

    const now = new Date();
    let totalBalance = 0;
    let hasAnyBalance = false;
    let maxRemainingDays = 0;
    let totalOriginalAmount = 0;
    let totalDaysSum = 0;

    // Calculate balance for each active plan
    for (const currentPlan of currentPlans) {
      if (!currentPlan.billingEndDate || !currentPlan.paymentId) {
        continue;
      }

      const endDate = new Date(currentPlan.billingEndDate);

      // Check if the plan is still active (end date is in the future)
      if (endDate <= now) {
        continue;
      }

      // Get the payment information
      const payment = await this.paymentRepo.findOne({
        where: { id: currentPlan.paymentId },
      });

      if (!payment || payment.status !== 'completed') {
        continue;
      }

      // Calculate remaining days for this plan
      const remainingDays = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Calculate total days from activation to end for this plan
      const startDate = new Date(currentPlan.activationDate);
      const totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const originalAmount = payment.originalPrice / 100; // Convert from cents to dollars
      const planBalance = (originalAmount * remainingDays) / totalDays;

      // Accumulate totals
      totalBalance += planBalance;
      totalOriginalAmount += originalAmount;
      totalDaysSum += totalDays;
      maxRemainingDays = Math.max(maxRemainingDays, remainingDays);
      hasAnyBalance = true;

      console.log(
        `Plan ${currentPlan.id}:`,
        'startDate',
        startDate,
        'endDate',
        endDate,
        'planBalance',
        planBalance,
        'remainingDays',
        remainingDays,
        'totalDays',
        totalDays,
        'originalAmount',
        originalAmount,
      );
    }

    console.log(
      'Final totals:',
      'totalBalance',
      totalBalance,
      'maxRemainingDays',
      maxRemainingDays,
      'totalOriginalAmount',
      totalOriginalAmount,
    );

    return {
      hasBalance: hasAnyBalance,
      balanceAmount: Math.round(totalBalance * 100) / 100, // Round to 2 decimal places
      remainingDays: maxRemainingDays,
      originalAmount: totalOriginalAmount,
      totalDays: totalDaysSum,
    };
  }

  async calculateUpgradePrice(
    userId: number,
    newContactCount: number,
    newBillingType: 'monthly' | 'yearly',
    isProRatedUpgrade: boolean = false,
    currentPlan?: {
      contactCount: number;
      billingType: string;
      remainingDays: number;
      billingEndDate: string;
    },
  ): Promise<{
    originalPrice: number;
    userBalance: number;
    finalPrice: number;
    canUpgrade: boolean;
    balanceInfo: any;
    isProRated: boolean;
    proratedDetails?: {
      oldPlanDailyRate: number;
      newPlanDailyRate: number;
      remainingDays: number;
      proratedAmount: number;
    } | null;
  }> {
    let originalPrice = 0;
    let proratedDetails: {
      oldPlanDailyRate: number;
      newPlanDailyRate: number;
      remainingDays: number;
      proratedAmount: number;
    } | null = null;

    if (isProRatedUpgrade && currentPlan) {
      // Calculate pro-rated pricing for upgrade
      const oldPlanMonthlyPrice =
        currentPlan.contactCount /
        (currentPlan.billingType === 'monthly'
          ? dividedContactPerMonth
          : dividedContactPerYear);

      const newPlanMonthlyPrice =
        newContactCount /
        (newBillingType === 'monthly'
          ? dividedContactPerMonth
          : dividedContactPerYear);

      // Calculate daily rates
      const oldPlanDailyRate = oldPlanMonthlyPrice / 30; // Assuming 30 days per month
      const newPlanDailyRate = newPlanMonthlyPrice / 30;

      // Calculate pro-rated amount (difference in daily rates × remaining days)
      const proratedAmount =
        (newPlanDailyRate - oldPlanDailyRate) * currentPlan.remainingDays;

      originalPrice = Math.max(0, proratedAmount);

      proratedDetails = {
        oldPlanDailyRate: Math.round(oldPlanDailyRate * 100) / 100,
        newPlanDailyRate: Math.round(newPlanDailyRate * 100) / 100,
        remainingDays: currentPlan.remainingDays,
        proratedAmount: Math.round(proratedAmount * 100) / 100,
      };
    } else {
      // Regular pricing calculation
      originalPrice =
        newContactCount /
        (newBillingType === 'monthly'
          ? dividedContactPerMonth
          : dividedContactPerYear);
    }

    // Get user's current balance (only for non-pro-rated upgrades or if no existing balance)
    const balanceInfo = await this.calculateUserBalance(userId);
    const userBalance = isProRatedUpgrade ? 0 : balanceInfo.balanceAmount; // Don't apply balance for pro-rated upgrades

    // Calculate final price after applying balance (if applicable)
    let finalPrice = originalPrice - userBalance;

    // Ensure minimum price of $1.00
    const minimumPrice = 1.0;
    if (finalPrice < minimumPrice) {
      finalPrice = minimumPrice;
    }

    // For pro-rated upgrades, user can upgrade if there's a positive difference
    // For regular upgrades, user can upgrade if new plan price minus balance is at least $1
    const canUpgrade = isProRatedUpgrade
      ? originalPrice > 0
      : originalPrice - userBalance >= minimumPrice;

    return {
      originalPrice: Math.round(originalPrice * 100) / 100,
      userBalance: Math.round(userBalance * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      canUpgrade,
      balanceInfo,
      isProRated: isProRatedUpgrade,
      proratedDetails,
    };
  }

  // Get paginated payments for a user
  async getUserPayments(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Payment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const [payments, total] = await this.paymentRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
