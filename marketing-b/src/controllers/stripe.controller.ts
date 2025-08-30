import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Payment } from '../entities/payment.entity';
import { UserPlan } from '../entities/user-plan.entity';
import { PlanService } from '../services/plan.service';
import {
  dividedContactPerMonth,
  dividedContactPerYear,
} from 'src/constant/main';

let stripe: Stripe;

@Controller('stripe')
export class StripeController {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(UserPlan)
    private userPlanRepo: Repository<UserPlan>,
    private readonly configService: ConfigService,
    private readonly planService: PlanService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    stripe = new Stripe(secretKey!);
  }

  @Post('verify-session')
  async verifySession(@Body() body: { session_id: string; apiKey?: string }) {
    if (!body.session_id) {
      return { success: false, error: 'Missing session_id' };
    }
    try {
      const sessionObj = await stripe.checkout.sessions.retrieve(
        body.session_id,
      );
      if (sessionObj.payment_status === 'paid') {
        // Find and update payment record
        const payment = await this.paymentRepo.findOne({
          where: { stripePaymentIntentId: body.session_id },
        });
        if (payment) {
          payment.status = 'completed';
          // Add apiKey to payment if provided
          if (body.apiKey) {
            payment.apiKey = body.apiKey;
          }
          await this.paymentRepo.save(payment);

          // Add plan to user plan db using injected repository
          const { PlanType } = await import('../entities/plan.entity');
          const { Action } = await import('../entities/action.entity');
          // const actionRepo = this.paymentRepo.manager.getRepository(Action);
          // let lastActionCount = 0;
          // if (payment.userId && payment.apiKey) {
          //   const lastAction = await actionRepo.findOne({
          //     where: { user_id: payment.userId, api_key: payment.apiKey },
          //     order: { created_at: 'DESC' },
          //   });
          //   if (lastAction) {
          //     lastActionCount = lastAction.count || 0;
          //   }
          // }
          // Determine billingEndDate based on payment.billingType and pro-ration settings
          let billingEndDate: Date | undefined = undefined;
          // Try to get billingType from Stripe session metadata if not in payment
          let billingType = payment['billingType'];
          if (
            !billingType &&
            sessionObj &&
            sessionObj.metadata &&
            sessionObj.metadata.billingType
          ) {
            billingType = sessionObj.metadata.billingType;
          }

          // Check if this is a pro-rated upgrade
          const isProRated = sessionObj.metadata?.isProRated === 'true';
          const preserveBillingEndDate =
            sessionObj.metadata?.preserveBillingEndDate === 'true';
          const existingBillingEndDate = sessionObj.metadata?.billingEndDate;

          const activationDate = new Date();

          if (isProRated && preserveBillingEndDate && existingBillingEndDate) {
            // For pro-rated upgrades, preserve the existing billing end date
            billingEndDate = new Date(existingBillingEndDate);
            console.log(
              'Pro-rated upgrade: preserving billing end date:',
              billingEndDate,
            );
          } else {
            // Regular billing date calculation
            if (billingType === 'yearly') {
              billingEndDate = new Date(activationDate);
              billingEndDate.setFullYear(billingEndDate.getFullYear() + 1);
            } else if (billingType === 'monthly') {
              billingEndDate = new Date(activationDate);
              billingEndDate.setMonth(billingEndDate.getMonth() + 1);
            }
          }

          await this.userPlanRepo.save({
            userId: payment.userId,
            planType: PlanType.PAID,
            activationDate,
            mergeGroupsUsed: 0,
            contactCount: payment.contactCount || 0,
            billingEndDate,
            paymentStatus: 'active',
            paymentId: payment.id,
          });
        }
        return { success: true, status: 'paid' };
      } else {
        return { success: false, status: sessionObj.payment_status };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  @Post('create-checkout-session')
  async createCheckoutSession(
    @Body()
    dto: {
      contactCount: number;
      billingType: string;
      userId: number;
      apiKey: string;
      isProRatedUpgrade?: boolean;
      currentPlan?: {
        contactCount: number;
        billingType: string;
        remainingDays: number;
        billingEndDate: string;
        planId?: number;
      };
      preserveBillingEndDate?: boolean;
      createNewPlanPeriod?: boolean;
      skipProRation?: boolean;
    },
  ) {
    // Calculate upgrade pricing with balance consideration and pro-ration support
    let upgradeInfo;
    let amount: number;

    if (dto.createNewPlanPeriod) {
      // For new plan periods, calculate full price without pro-ration
      const fullPrice =
        dto.contactCount /
        (dto.billingType === 'monthly'
          ? dividedContactPerMonth
          : dividedContactPerYear);

      amount = Math.round(fullPrice * 100); // Convert to cents
      console.log(`Creating new plan period with full price: $${fullPrice}`);

      // Create a mock upgradeInfo for consistency
      upgradeInfo = {
        canUpgrade: true,
        finalPrice: fullPrice,
        originalPrice: fullPrice,
        userBalance: 0,
        isProRated: false,
      };
    } else {
      upgradeInfo = await this.planService.calculateUpgradePrice(
        dto.userId,
        dto.contactCount,
        dto.billingType as 'monthly' | 'yearly',
        dto.isProRatedUpgrade || false,
        dto.currentPlan,
      );

      if (!upgradeInfo.canUpgrade) {
        throw new Error(
          `Cannot upgrade: The new plan price ($${upgradeInfo.originalPrice}) minus your balance ($${upgradeInfo.userBalance}) must be at least $1.00. Use createNewPlanPeriod to start a new billing period.`,
        );
      }

      // Use the calculated final price (in dollars) and convert to cents for Stripe
      amount = Math.round(upgradeInfo.finalPrice * 100);
    }

    // Use the contact count as specified (no more minimum enforcement here)
    const safeContactCount = dto.contactCount;

    const successUrl = `${this.configService.get<string>('STRIPE_SUCCESS_URL')}?session_id={CHECKOUT_SESSION_ID}&apiKey=${encodeURIComponent(dto.apiKey)}`;

    // Create description based on upgrade type
    let description: string;
    if (dto.createNewPlanPeriod) {
      description = `New plan period (${safeContactCount.toLocaleString()} contacts) - Full billing cycle`;
    } else if (upgradeInfo.isProRated && upgradeInfo.proratedDetails) {
      description = `Pro-rated plan upgrade (${safeContactCount.toLocaleString()} contacts) for ${upgradeInfo.proratedDetails.remainingDays} remaining days`;
    } else if (upgradeInfo.userBalance > 0) {
      description = `Plan upgrade (${safeContactCount.toLocaleString()} contacts) - Balance applied: $${upgradeInfo.userBalance}`;
    } else {
      description = `Plan upgrade (${safeContactCount.toLocaleString()} contacts)`;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      payment_method_options: {
        card: {
          request_three_d_secure: 'any', // Require 3D Secure for all cards
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: upgradeInfo.isProRated
                ? 'Pro-rated Plan Upgrade'
                : 'Contact Merge Plan',
              description: description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: this.configService.get<string>('STRIPE_CANCEL_URL')!,
      metadata: {
        userId: String(dto.userId),
        contactCount: String(safeContactCount),
        billingType: dto.billingType,
        originalPrice: String(upgradeInfo.originalPrice),
        userBalance: String(upgradeInfo.userBalance),
        finalPrice: String(upgradeInfo.finalPrice),
        isProRated: String(upgradeInfo.isProRated || false),
        preserveBillingEndDate: String(dto.preserveBillingEndDate || false),
        isNewPlanPeriod: String(Boolean(dto.createNewPlanPeriod)),
        skipProRation: String(Boolean(dto.skipProRation)),
        ...(dto.currentPlan && dto.currentPlan.planId
          ? { currentPlanId: String(dto.currentPlan.planId) }
          : {}),
        ...(dto.currentPlan
          ? { billingEndDate: dto.currentPlan.billingEndDate }
          : {}),
      },
    });

    await this.paymentRepo.save({
      userId: dto.userId,
      amount: amount, // amount is already in cents
      status: 'pending',
      stripePaymentIntentId: session.id,
      contactCount: safeContactCount,
      billingType: dto.billingType,
      originalPrice: Math.round(upgradeInfo.originalPrice * 100), // store originalPrice in cents
      // Add pro-ration metadata
      ...(upgradeInfo.isProRated &&
        {
          // You might want to add additional fields to track pro-ration in your Payment entity
          // isProRated: true,
          // proratedDays: upgradeInfo.proratedDetails?.remainingDays,
        }),
    });

    return {
      sessionId: session.id,
      url: session.url,
      upgradeInfo,
    };
  }

  @Post('webhook')
  async handleStripeWebhook(@Req() req, @Res() res) {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!,
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await this.paymentRepo.update(
        { stripePaymentIntentId: session.id },
        { status: 'completed' },
      );
      // TODO: Upgrade user plan logic here
    }
    res.json({ received: true });
  }
}
