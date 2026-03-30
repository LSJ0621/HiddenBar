import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Point } from 'geojson';
import { BarStatus } from '@my-project/shared';
import { User } from './user.entity.js';
import { BarPhoto } from './bar-photo.entity.js';
import { MenuItem } from './menu-item.entity.js';
import { OperatingHours } from './operating-hours.entity.js';
import { Bookmark } from './bookmark.entity.js';
import { Review } from './review.entity.js';
import { BarReviewStats } from './bar-review-stats.entity.js';

@Entity('bars')
@Index(['city', 'country'])
@Index(['latitude', 'longitude'])
export class Bar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 50 })
  city: string;

  @Column({ type: 'varchar', length: 50 })
  country: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  /**
   * PostGIS geography point. ST_DWithin / ST_Distance 기반 공간 검색에 사용된다.
   * Raw SQL 마이그레이션의 트리거로 latitude/longitude와 자동 동기화된다.
   */
  @Index('idx_bar_location', { synchronize: false })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Index()
  @Column({ type: 'enum', enum: BarStatus, default: BarStatus.PENDING })
  status: BarStatus;

  @Index()
  @Column({ type: 'int' })
  ownerId: number;

  /**
   * PostgreSQL tsvector 컬럼.
   * TypeORM에서 직접 관리하지 않으며, Raw SQL 마이그레이션의 트리거로 자동 갱신된다.
   */
  @Column({ type: 'tsvector', nullable: true, select: false })
  searchVector: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, (user) => user.bars)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => BarPhoto, (photo) => photo.bar)
  photos: BarPhoto[];

  @OneToMany(() => MenuItem, (menuItem) => menuItem.bar)
  menuItems: MenuItem[];

  @OneToMany(() => OperatingHours, (hours) => hours.bar)
  operatingHours: OperatingHours[];

  @OneToMany(() => Bookmark, (bookmark) => bookmark.bar)
  bookmarks: Bookmark[];

  @OneToMany(() => Review, (review) => review.bar)
  reviews: Review[];

  @OneToOne(() => BarReviewStats, (stats) => stats.bar)
  reviewStats: BarReviewStats;
}
