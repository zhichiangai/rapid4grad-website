import { ProfessorStudentSupervision } from "@/components/professor/ProfessorStudentSupervision";
import { loadProfessorStudentSupervision } from "@/lib/professor/student-supervision-data";

type StudentPageProps = {
  params: Promise<{
    labId: string;
    studentId: string;
  }>;
};

export default async function ProfessorStudentPage({ params }: StudentPageProps) {
  const { labId, studentId } = await params;
  const data = await loadProfessorStudentSupervision(labId, studentId);
  return <ProfessorStudentSupervision data={data} />;
}
