# 리뷰 신고 데이터베이스

> 관련 문서: [ERD](./erd.md) · [Enum 정의](./enums.md) · [Soft Delete 정책](./shared-policies.md) · [API: 관리자](../api.md) · [테스트: 관리자](../../testing/scenarios/admin.md)

---

### 1. review_reports

리뷰 신고 내역을 저장한다. 동일 리뷰에 대해 동일 사용자는 한 건만 신고할 수 있다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | int (autoincrement) | PK | 고유 식별자 |
| reviewId | int | NOT NULL, FK → reviews.id, INDEX | 신고 대상 리뷰 |
| reporterUserId | int | NULLABLE, FK → users.id, INDEX | 신고한 사용자 (onDelete: SET NULL) |
| reason | enum(ReportReason) | NOT NULL | 신고 사유 (SPAM, ABUSIVE_OR_HATEFUL, SEXUAL_OR_OBSCENE, MISINFORMATION, OTHER) |
| detail | text | NULLABLE | 신고 상세 내용 (최대 1000자) |
| status | enum(ReportStatus) | NOT NULL, DEFAULT 'PENDING' | 처리 상태 (PENDING, RESOLVED) |
| resolution | enum(ReportResolution) | NULLABLE | 처리 결과 (RESTORED, HIDDEN, DELETED) |
| resolutionNote | text | NULLABLE | 관리자 처리 메모 |
| processedByAdminId | int | NULLABLE, FK → users.id | 처리한 관리자 |
| processedAt | timestamp | NULLABLE | 처리 일시 |
| createdAt | timestamp | DEFAULT CURRENT_TIMESTAMP | 생성 시각 |
| updatedAt | timestamp | auto-update | 수정 시각 |

**제약조건**

- UNIQUE(`reviewId`, `reporterUserId`) — 동일 리뷰에 대한 중복 신고 방지
- INDEX(`reviewId`) — 리뷰별 신고 조회
- INDEX(`reporterUserId`) — 신고자별 조회
- INDEX(`processedByAdminId`) — 처리 관리자별 조회
- INDEX(`reviewId`, `status`) — 리뷰별 미처리 신고 조회 최적화
- INDEX(`status`, `createdAt`) — 관리자 신고 목록 조회 최적화

**관계**

- `reviewId` → `reviews.id` (ManyToOne, ON DELETE CASCADE)
- `reporterUserId` → `users.id` (ManyToOne, ON DELETE SET NULL)
- `processedByAdminId` → `users.id` (ManyToOne, ON DELETE SET NULL)

**TypeORM 엔티티**: `backend/src/entities/review-report.entity.ts`

```typescript
@Entity('review_reports')
@Unique(['reviewId', 'reporterUserId'])
@Index(['reviewId', 'status'])
@Index(['status', 'createdAt'])
export class ReviewReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  reviewId: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  reporterUserId: number | null;

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Column({ type: 'enum', enum: ReportResolution, nullable: true })
  resolution: ReportResolution | null;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  processedByAdminId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewId' })
  review: Review;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporterUserId' })
  reporter: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processedByAdminId' })
  processedByAdmin: User;
}
```

## 사용 Enum

- [ReportReason](./enums.md#111-reportreason) — 리뷰 신고 사유 (SPAM, ABUSIVE_OR_HATEFUL, SEXUAL_OR_OBSCENE, MISINFORMATION, OTHER)
- [ReportStatus](./enums.md#112-reportstatus) — 리뷰 신고 처리 상태 (PENDING, RESOLVED)
- [ReportResolution](./enums.md#113-reportresolution) — 관리자 신고 처리 결정 (RESTORED, HIDDEN, DELETED)
