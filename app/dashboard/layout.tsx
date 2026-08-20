import { redirect } from "next/navigation";
import { StudentWorkspaceNavigation } from "@/components/workspace/StudentWorkspaceNavigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <StudentWorkspaceNavigation />
      {children}
    </div>
  );
}
