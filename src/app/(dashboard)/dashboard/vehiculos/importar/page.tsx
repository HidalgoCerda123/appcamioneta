import CsvImportVehicles from "@/components/vehicles/CsvImportVehicles";

export default function ImportVehiclesPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Importar Vehículos desde CSV</h2>
        <p className="text-gray-500 text-sm mt-1">Carga masiva de vehículos usando un archivo CSV</p>
      </div>
      <CsvImportVehicles />
    </div>
  );
}
