import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Payment } from '../entities/payment.entity';
import { UserPlan } from '../entities/user-plan.entity';
import { AdminUserDto } from '../dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(UserPlan)
    private userPlanRepository: Repository<UserPlan>,
  ) {}

  async getAllUsersWithDetails(): Promise<AdminUserDto[]> {
    const users = await this.userRepository.find({
      order: { created_at: 'DESC' },
    });

    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        // Get current plan
        const currentPlan = await this.userPlanRepository.findOne({
          where: { userId: user.id },
          relations: ['payment'],
          order: { activationDate: 'DESC' },
        });

        // Get payment history
        const paymentHistory = await this.paymentRepository.find({
          where: { userId: user.id },
          order: { createdAt: 'DESC' },
        });

        // Calculate total spent
        const totalSpent = paymentHistory
          .filter((payment) => payment.status === 'completed')
          .reduce((sum, payment) => sum + payment.amount, 0);

        // Get plan count
        const planCount = await this.userPlanRepository.count({
          where: { userId: user.id },
        });

        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          verified: user.verified,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
          currentPlan: currentPlan
            ? {
                id: currentPlan.id,
                planType: currentPlan.planType,
                activationDate: currentPlan.activationDate,
                mergeGroupsUsed: currentPlan.mergeGroupsUsed,
                contactCount: currentPlan.contactCount,
                billingEndDate: currentPlan.billingEndDate,
                paymentStatus: currentPlan.paymentStatus,
              }
            : undefined,
          paymentHistory: paymentHistory.map((payment) => ({
            id: payment.id,
            amount: payment.amount,
            contactCount: payment.contactCount,
            billingType: payment.billingType,
            currency: payment.currency,
            status: payment.status,
            createdAt: payment.createdAt,
            stripePaymentIntentId: payment.stripePaymentIntentId,
            originalPrice: payment.originalPrice,
          })),
          totalSpent,
          planCount,
        };
      }),
    );

    return usersWithDetails;
  }

  async getUserDetails(userId: number): Promise<AdminUserDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get current plan
    const currentPlan = await this.userPlanRepository.findOne({
      where: { userId: user.id },
      relations: ['payment'],
      order: { activationDate: 'DESC' },
    });

    // Get payment history
    const paymentHistory = await this.paymentRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    // Calculate total spent
    const totalSpent = paymentHistory
      .filter((payment) => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Get plan count
    const planCount = await this.userPlanRepository.count({
      where: { userId: user.id },
    });

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      verified: user.verified,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
      currentPlan: currentPlan
        ? {
            id: currentPlan.id,
            planType: currentPlan.planType,
            activationDate: currentPlan.activationDate,
            mergeGroupsUsed: currentPlan.mergeGroupsUsed,
            contactCount: currentPlan.contactCount,
            billingEndDate: currentPlan.billingEndDate,
            paymentStatus: currentPlan.paymentStatus,
          }
        : undefined,
      paymentHistory: paymentHistory.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        contactCount: payment.contactCount,
        billingType: payment.billingType,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        originalPrice: payment.originalPrice,
      })),
      totalSpent,
      planCount,
    };
  }
}
