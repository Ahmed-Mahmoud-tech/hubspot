import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { PlanType } from './plan.entity';

@Entity()
export class UserPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'enum', enum: PlanType })
  planType: PlanType;

  @Column({ type: 'timestamp' })
  activationDate: Date;

  @Column({ default: 0 })
  mergeGroupsUsed: number;

  @Column({ default: 0 })
  contactCount: number;

  @Column({ type: 'timestamp', nullable: true })
  billingEndDate: Date;

  @Column({ default: 'active' })
  paymentStatus: string;
}
