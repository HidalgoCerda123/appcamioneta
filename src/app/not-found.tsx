import Link from "next/link";
import { Truck, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Truck className="w-10 h-10 text-construserv-orange" />
        </div>
        <h1 className="text-6xl font-bold text-gray-200 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Página no encontrada</h2>
        <p className="text-gray-500 text-sm mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-construserv-orange hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg font-medium transition text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
