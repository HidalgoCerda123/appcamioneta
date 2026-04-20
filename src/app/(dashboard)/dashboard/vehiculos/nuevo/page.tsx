import VehicleForm from "@/components/vehicles/VehicleForm";

export default function NewVehiclePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Nuevo Vehículo</h2>
        <p className="text-gray-500 text-sm mt-1">Ingresa los datos del vehículo</p>
      </div>
      <VehicleForm />
    </div>
  );
}
