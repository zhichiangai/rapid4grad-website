export type Workspace = "student" | "professor" | "admin";

export function getAvailableWorkspaces(
  role: string | null | undefined,
): Workspace[] {
  if (role === "admin") {
    return ["student", "professor", "admin"];
  }

  if (role === "professor") {
    return ["professor"];
  }

  return ["student"];
}

export function canAccessWorkspace(
  role: string | null | undefined,
  workspace: Workspace,
) {
  return getAvailableWorkspaces(role).includes(workspace);
}

export function getDefaultWorkspacePath(role: string | null | undefined) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "professor") {
    return "/professor/dashboard";
  }

  return "/dashboard";
}

export function isSafeNextPath(value: string | null): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}
