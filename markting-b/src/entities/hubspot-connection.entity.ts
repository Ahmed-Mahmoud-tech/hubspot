import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('hubspot_connections')
@Index(['userId', 'isActive'])
export class HubSpotConnection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'access_token', type: 'text' })
  accessToken: string;

  @Column({ name: 'refresh_token', type: 'text' })
  refreshToken: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'token_type', default: 'Bearer' })
  tokenType: string;

  @Column({ name: 'portal_id', nullable: true })
  portalId: number;

  @Column({ name: 'hub_domain', nullable: true })
  hubDomain: string;

  @Column({ name: 'account_name', nullable: true })
  accountName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Check if token is expired
  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  // Check if token expires soon (within 5 minutes)
  expiresSoon(): boolean {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return this.expiresAt <= fiveMinutesFromNow;
  }
}
