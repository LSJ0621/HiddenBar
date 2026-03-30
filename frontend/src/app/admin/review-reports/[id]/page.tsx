'use client';

import { use } from 'react';
import { ReportDetailContent } from './_components/report-detail-content';

export default function AdminReviewReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ReportDetailContent reportId={Number(id)} />;
}
