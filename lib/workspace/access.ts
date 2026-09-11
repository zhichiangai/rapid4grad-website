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
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  // Backslashes and control characters can be normalized into external URLs by browsers.
  return !value.includes("\\") && !/[\u0000-\u001f\u007f]/.test(value);
}
