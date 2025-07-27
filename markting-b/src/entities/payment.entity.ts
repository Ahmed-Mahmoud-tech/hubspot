// ...existing code...
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Payment {
  @Column({ nullable: true })
  apiKey: string;
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column('int')
  amount: number;

  @Column({ default: 'usd' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'completed' | 'failed';

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  stripePaymentIntentId: string;
}
