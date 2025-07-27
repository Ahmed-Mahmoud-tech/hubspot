export class Payment {
  id: number;
  userId: number;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  stripePaymentIntentId: string;
}
