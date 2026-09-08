"use client";

import { createContext, useContext } from "react";

type StudentWorkspaceCapabilities = {
  hasActiveLab: boolean;
  canUsePdfAudit: boolean;
};

const StudentWorkspaceCapabilitiesContext = createContext<StudentWorkspaceCapabilities>({
  hasActiveLab: false,
  canUsePdfAudit: false,
});

export function StudentWorkspaceCapabilitiesProvider({
  value,
  children,
}: {
  value: StudentWorkspaceCapabilities;
  children: React.ReactNode;
}) {
  return <StudentWorkspaceCapabilitiesContext.Provider value={value}>{children}</StudentWorkspaceCapabilitiesContext.Provider>;
}

export function useStudentWorkspaceCapabilities() {
  return useContext(StudentWorkspaceCapabilitiesContext);
}
