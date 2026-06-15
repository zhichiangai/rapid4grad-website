import { AdminLoginClient } from '@/components/admin-login-client';

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams?: Promise<{
    next?: string;
  }>;
}) {
  const params = (await searchParams) || {};
  return <AdminLoginClient nextPath={params.next || '/admin/dashboard'} />;
}
