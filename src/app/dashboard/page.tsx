import { DashboardPageClient } from '@/components/dashboard-page-client';

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{
    token?: string;
  }>;
}) {
  const params = (await searchParams) || {};
  return <DashboardPageClient token={params.token || ''} />;
}
