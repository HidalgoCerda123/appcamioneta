"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  faultId: string;
  status: string;
}

const OPTIONS = [
  { value: "abierta", label: "Abierta", class: "bg-red-100 text-red-700" },
  { value: "en_proceso", label: "En proceso", class: "bg-yellow-100 text-yellow-700" },
  { value: "resuelta", label: "Resuelta", class: "bg-green-100 text-green-700" },
];

export default function FaultStatusControl({ faultId, status }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);

  async function change(value: string) {
    if (value === current || saving) return;
    setSaving(true);
    setCurrent(value);
    await supabase
      .from("fault_reports")
      .update({
        status: value,
        resolved_at: value === "resuelta" ? new Date().toISOString() : null,
      })
      .eq("id", faultId);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => change(o.value)}
          disabled={saving}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition disabled:opacity-50 ${
            current === o.value ? o.class : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
