import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Payment } from '../entities/payment.entity';
import { UserPlan } from '../entities/user-plan.entity';

let stripe: Stripe;

@Controller('stripe')
export class StripeController {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(UserPlan)
    private userPlanRepo: Repository<UserPlan>,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    stripe = new Stripe(secretKey!, {
      apiVersion: '2025-06-30.basil',
    });
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
          const actionRepo = this.paymentRepo.manager.getRepository(Action);
          let lastActionCount = 0;
          if (payment.userId && payment.apiKey) {
            const lastAction = await actionRepo.findOne({
              where: { user_id: payment.userId, api_key: payment.apiKey },
              order: { created_at: 'DESC' },
            });
            if (lastAction) {
              lastActionCount = lastAction.count || 0;
            }
          }
          // Determine billingEndDate based on payment.billingType
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
          const activationDate = new Date();
          if (billingType === 'yearly') {
            billingEndDate = new Date(activationDate);
            billingEndDate.setFullYear(billingEndDate.getFullYear() + 1);
          } else if (billingType === 'monthly') {
            billingEndDate = new Date(activationDate);
            billingEndDate.setMonth(billingEndDate.getMonth() + 1);
          }
          await this.userPlanRepo.save({
            userId: payment.userId,
            planType: PlanType.PAID,
            activationDate,
            mergeGroupsUsed: 0,
            contactCount: lastActionCount,
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
    },
  ) {
    console.log(
      this.configService.get<string>('STRIPE_SUCCESS_URL'),
      '55555555554444',
    );

    // Enforce minimum contact count for Stripe minimum charge ($1.00)
    const minContactCount = 2000; // $1.00 minimum for monthly (2000 contacts)
    const safeContactCount = Math.max(dto.contactCount, minContactCount);
    const amount =
      dto.billingType === 'monthly'
        ? Math.round((safeContactCount * 100) / 2000)
        : Math.round(((safeContactCount * 100) / 4000) * 12);
    console.log(dto.billingType, 'billingType', 'amount', amount);

    const successUrl = `${this.configService.get<string>('STRIPE_SUCCESS_URL')}?session_id={CHECKOUT_SESSION_ID}&apiKey=${encodeURIComponent(dto.apiKey)}`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Contact Merge Plan' },
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
      },
    });
    await this.paymentRepo.save({
      userId: dto.userId,
      amount,
      status: 'pending',
      stripePaymentIntentId: session.id,
      contactCount: safeContactCount,
      billingType: dto.billingType,
    });
    return { sessionId: session.id, url: session.url };
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
