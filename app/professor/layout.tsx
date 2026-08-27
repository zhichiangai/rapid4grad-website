import { requireProfessorWorkspace } from "@/lib/auth/authorization";

export default async function ProfessorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireProfessorWorkspace("/professor/dashboard");
  return <>{children}</>;
}
