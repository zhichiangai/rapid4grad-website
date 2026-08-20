import { AdminPreviewCenter } from "@/components/admin/AdminPreviewCenter";
import { requireAdminContext } from "@/lib/admin/authorization";

export default async function AdminPreviewsPage() {
  await requireAdminContext("/admin/previews");

  return <AdminPreviewCenter />;
}
