"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#E8500A", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#84CC16"];

interface Props {
  monthlySpend: { mes: string; mantenciones: number; combustible: number; documentos: number }[];
  spendByType: { name: string; total: number }[];
}

const MONTHLY_LABELS: Record<string, string> = {
  mantenciones: "Mantenciones",
  combustible: "Combustible",
  documentos: "Documentos",
};

function formatCLPShort(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export default function ReportCharts({ monthlySpend, spendByType }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gasto mensual */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Gasto Mensual {new Date().getFullYear()}</h3>
        {monthlySpend.every((m) => m.mantenciones === 0 && m.combustible === 0 && m.documentos === 0) ? (
          <p className="text-gray-400 text-sm text-center py-12">Sin datos para este año</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlySpend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatCLPShort} tick={{ fontSize: 11 }} width={50} />
              <Tooltip formatter={(v: number, name: string) => [`$${v.toLocaleString("es-CL")}`, MONTHLY_LABELS[name] ?? name]} />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v) => MONTHLY_LABELS[v] ?? v} />
              <Bar dataKey="mantenciones" stackId="a" fill="#E8500A" />
              <Bar dataKey="combustible" stackId="a" fill="#10B981" />
              <Bar dataKey="documentos" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gasto por tipo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Gasto por Tipo de Mantención</h3>
        {spendByType.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">Sin datos aún</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={spendByType}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="total"
                nameKey="name"
              >
                {spendByType.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `$${v.toLocaleString("es-CL")}`} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
