"use client";

import { Bell } from "lucide-react";
import type { Profile } from "@/types";

export default function Header({ profile }: { profile: Profile | null }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-gray-800">
          Bienvenido, {profile?.full_name?.split(" ")[0] ?? "Usuario"}
        </h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString("es-CL", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-9 h-9 rounded-full bg-construserv-orange flex items-center justify-center text-white text-sm font-bold">
          {profile?.full_name?.charAt(0).toUpperCase() ?? "U"}
        </div>
      </div>
    </header>
  );
}
