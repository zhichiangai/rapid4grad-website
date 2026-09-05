import { redirect } from "next/navigation";
import { GraduationRiskOverview } from "@/components/graduation-risk/GraduationRiskOverview";
import { deriveGraduationRiskSignals, deriveGraduationRiskStatus, getPrimaryGraduationRiskSignal } from "@/lib/graduation-risk/risk-domain";
import { loadStudentGraduationRisk } from "@/lib/graduation-risk/risk-data";

export default async function GraduationRiskPage() {
  const data = await loadStudentGraduationRisk();
  if (!data.allowed) redirect("/dashboard");
  const signals = deriveGraduationRiskSignals({ activeLab: Boolean(data.activeLab), joinedAt: data.activeLab?.joinedAt, latestWeekly: data.latestWeekly, meetings: data.meetings, actions: data.actions, thesisMilestones: data.thesisMilestones });
  return <GraduationRiskOverview result={{ status: deriveGraduationRiskStatus({ signals, hasThesisRows: data.hasThesisRows, activeLab: Boolean(data.activeLab) }), signals, primary: getPrimaryGraduationRiskSignal(signals) }} />;
}
