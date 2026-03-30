import { BarReviewContent } from './_components/bar-review-content';

export default function AdminBarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <BarReviewContent params={params} />;
}
