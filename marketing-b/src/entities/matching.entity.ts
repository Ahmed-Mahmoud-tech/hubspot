import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('matching')
@Index(['userId'])
@Index(['apiKey'])
export class Matching {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'group_data', type: 'jsonb' })
  group: number[]; // Array of contact IDs that are duplicates

  @Column({ name: 'api_key' })
  apiKey: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'merged', default: false })
  merged: boolean;

  @Column({ name: 'merged_at', type: 'timestamp', nullable: true })
  mergedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
