export class AdminUserDto {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  verified: boolean;
  role: string;
  created_at: Date;
  updated_at: Date;
  currentPlan?: {
    id: number;
    planType: string;
    activationDate: Date;
    mergeGroupsUsed: number;
    contactCount: number;
    billingEndDate?: Date;
    paymentStatus: string;
  };
  paymentHistory: Array<{
    id: number;
    amount: number;
    contactCount?: number;
    billingType?: string;
    currency: string;
    status: string;
    createdAt: Date;
    stripePaymentIntentId: string;
    originalPrice?: number;
  }>;
  totalSpent: number;
  planCount: number;
}
