import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanType } from '../entities/plan.entity';
import { UserPlan } from '../entities/user-plan.entity';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(UserPlan)
    private userPlanRepo: Repository<UserPlan>,
  ) {}

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
