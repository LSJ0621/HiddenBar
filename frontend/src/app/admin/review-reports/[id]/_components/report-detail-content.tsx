'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { showErrorToast } from '@/lib/error-utils';
import {
  useAdminReviewReportDetail,
  useResolveReviewReport,
} from '@/hooks/queries/use-review-reports';
import { DetailRow } from '@/components/admin/detail-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_RESOLUTION_LABELS,
} from '@/lib/constants';
import { ReportStatus, ReportResolution } from '@my-project/shared';

interface ReportDetailContentProps {
  reportId: number;
}

/** 관리자 리뷰 신고 상세 페이지 */
export function ReportDetailContent({ reportId }: ReportDetailContentProps) {
  const id = reportId;
  const router = useRouter();
  const { data: report, isLoading } = useAdminReviewReportDetail(id);
  const resolveReport = useResolveReviewReport();

  const [action, setAction] = useState<ReportResolution>(ReportResolution.RESTORED);
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    try {
      await resolveReport.mutateAsync({
        reportId: id,
        dto: {
          action,
          note: note || undefined,
        },
      });
      router.push('/admin/review-reports');
    } catch (error) {
      showErrorToast(error, 'Failed to resolve report');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center text-muted-foreground">
        Report not found
      </div>
    );
  }

  const isPending = report.status === ReportStatus.PENDING;

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => router.push('/admin/review-reports')}
          aria-label="back"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Report Details
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant={isPending ? 'secondary' : 'default'}
            >
              {REPORT_STATUS_LABELS[report.status]}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 신고 정보 */}
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Report Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Reason" value={REPORT_REASON_LABELS[report.reason]} />
            <DetailRow label="Detail" value={report.detail || '-'} />
            <DetailRow label="Reporter" value={report.reporter.name} />
            <DetailRow
              label="Filed"
              value={new Date(report.createdAt).toLocaleDateString('en-US')}
            />
          </CardContent>
        </Card>

        {/* 리뷰 정보 */}
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Review Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Content" value={report.review.content} />
            <DetailRow label="Rating" value={String(report.review.rating)} />
            <DetailRow label="Author" value={report.review.user.name} />
            <DetailRow label="Review Status" value={report.review.status} />
            {report.review.visitedAt && (
              <DetailRow
                label="Visited"
                value={new Date(report.review.visitedAt).toLocaleDateString('en-US')}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* PENDING: resolve 폼 */}
      {isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolve Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={action}
                onValueChange={(value) => setAction(value as ReportResolution)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_RESOLUTION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Note</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={resolveReport.isPending}
            >
              Submit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* RESOLVED: 처리 결과 */}
      {!isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label="Action"
              value={
                report.resolution
                  ? REPORT_RESOLUTION_LABELS[report.resolution]
                  : '-'
              }
            />
            <DetailRow label="Note" value={report.resolutionNote || '-'} />
            <DetailRow
              label="Processed"
              value={
                report.processedAt
                  ? new Date(report.processedAt).toLocaleDateString('en-US')
                  : '-'
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
