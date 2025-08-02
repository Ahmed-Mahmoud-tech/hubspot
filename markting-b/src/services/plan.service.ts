import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanType } from '../entities/plan.entity';
import { UserPlan } from '../entities/user-plan.entity';
import { EmailService } from './email.service';
import { UserService } from './user.service';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(UserPlan)
    private userPlanRepo: Repository<UserPlan>,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
  ) {}
  // Cron job: runs every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async notifyUsersBeforePlanEnds() {
    // Get latest plan for each user (subquery for max activationDate per userId)
    const subQuery = this.userPlanRepo
      .createQueryBuilder('up')
      .select('up.userId', 'userId')
      .addSelect('MAX(up.activationDate)', 'maxActivationDate')
      .groupBy('up.userId');

    const latestPlans = await this.userPlanRepo
      .createQueryBuilder('userPlan')
      .innerJoin(
        '(' + subQuery.getQuery() + ')',
        'latest',
        'userPlan.userId = latest.userId AND userPlan.activationDate = latest.maxActivationDate',
      )
      .select(['userPlan.userId', 'userPlan.billingEndDate'])
      .getRawMany();

    const now = new Date();
    for (const plan of latestPlans) {
      if (!plan.billingEndDate) continue;
      const billingEnd = new Date(plan.billingEndDate);
      const diffDays = Math.ceil(
        (billingEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 2) {
        // Get user email
        const user = await this.userService.findById(plan.userId);
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
    mergeGroupLimit: 20,
    contactLimit: 500000,
    durationDays: 30,
    price: 0,
    billingType: null,
  };

  getPaidPlan(contactCount: number, billingType: 'monthly' | 'yearly'): Plan {
    let price = 0;
    if (billingType === 'monthly') {
      price = contactCount / 2000;
    } else {
      price = (contactCount / 4000) * 12;
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
}
