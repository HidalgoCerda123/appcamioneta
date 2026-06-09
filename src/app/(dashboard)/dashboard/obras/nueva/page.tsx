import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProjectForm from "@/components/projects/ProjectForm";

export const metadata = { title: "Nueva Obra" };

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/obras" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nueva Obra</h2>
          <p className="text-gray-500 text-sm mt-0.5">Registra una faena o proyecto</p>
        </div>
      </div>
      <ProjectForm />
    </div>
  );
}
