import { UserDetailContent } from './_components/user-detail-content';

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <UserDetailContent params={params} />;
}
