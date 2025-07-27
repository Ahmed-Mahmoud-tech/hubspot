import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment } from '../entities/payment.entity';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

@Controller('stripe')
export class StripeController {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
  ) {}

  @Post('create-checkout-session')
  async createCheckoutSession(
    @Body() dto: { contactCount: number; billingType: string; userId: number },
  ) {
    const amount =
      dto.billingType === 'monthly'
        ? Math.round((dto.contactCount * 100) / 2000)
        : Math.round(((dto.contactCount * 100) / 4000) * 12);
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
      success_url: process.env.STRIPE_SUCCESS_URL!,
      cancel_url: process.env.STRIPE_CANCEL_URL!,
      metadata: {
        userId: String(dto.userId),
        contactCount: String(dto.contactCount),
        billingType: dto.billingType,
      },
    });
    await this.paymentRepo.save({
      userId: dto.userId,
      amount,
      status: 'pending',
      stripePaymentIntentId: session.id,
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
        process.env.STRIPE_WEBHOOK_SECRET!,
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
