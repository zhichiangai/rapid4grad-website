import { ResultPageClient } from '@/components/result-page-client';

export default async function ResultPage({
  searchParams
}: {
  searchParams?: Promise<{
    token?: string;
  }>;
}) {
  const params = (await searchParams) || {};
  return <ResultPageClient token={params.token || ''} />;
}
