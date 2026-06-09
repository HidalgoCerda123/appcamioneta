"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, CheckCircle, User, Mail, Truck } from "lucide-react";
import Link from "next/link";

export default function PerfilPage() {
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [profileId, setProfileId] = useState("");

  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passError, setPassError] = useState("");

  const [linkedAssignment, setLinkedAssignment] = useState<{
    driver_name: string;
    driver_id: string;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate: string;
    vehicle_id: string;
  } | null>(null);

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-construserv-orange";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserEmail(user.email ?? "");
      const { data: profile } = await supabase.from("profiles").select("id, full_name").eq("id", user.id).single();
      if (cancelled) return;
      if (profile) {
        setFullName(profile.full_name ?? "");
        setOriginalName(profile.full_name ?? "");
        setProfileId(profile.id);
      }

      // Comprobar si este usuario está vinculado como conductor activo
      const { data: assignment } = await supabase
        .from("vehicle_drivers")
        .select("id, driver_name, vehicle:vehicles(id, plate, brand, model)")
        .eq("profile_id", user.id)
        .is("end_date", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (assignment) {
        const veh = assignment.vehicle as unknown as { id: string; plate: string; brand: string; model: string } | null;
        if (veh) {
          setLinkedAssignment({
            driver_id: assignment.id,
            driver_name: assignment.driver_name,
            vehicle_id: veh.id,
            vehicle_brand: veh.brand,
            vehicle_model: veh.model,
            vehicle_plate: veh.plate,
          });
        }
      }

      setLoadingProfile(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || fullName === originalName) return;
    setSavingName(true);
    setNameMsg("");
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", profileId);
    setSavingName(false);
    if (error) {
      setNameMsg("Error al guardar: " + error.message);
    } else {
      setOriginalName(fullName.trim());
      setNameMsg("Nombre actualizado correctamente.");
      setTimeout(() => setNameMsg(""), 3000);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassError("");
    setPassMsg("");

    if (newPass.length < 6) { setPassError("La nueva contraseña debe tener al menos 6 caracteres."); return; }
    if (newPass !== confirm) { setPassError("Las contraseñas no coinciden."); return; }

    setSavingPass(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: current });
    if (signInError) { setPassError("La contraseña actual es incorrecta."); setSavingPass(false); return; }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
    setSavingPass(false);

    if (updateError) {
      setPassError(updateError.message);
    } else {
      setPassMsg("Contraseña actualizada correctamente.");
      setCurrent(""); setNewPass(""); setConfirm("");
      setTimeout(() => setPassMsg(""), 3000);
    }
  }

  if (loadingProfile) {
    return (
      <div className="max-w-lg space-y-6">
        <div><h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2></div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mi Perfil</h2>
        <p className="text-gray-500 text-sm mt-1">Administra tu cuenta</p>
      </div>

      {/* Avatar + email */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-construserv-orange flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
          {fullName.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-lg truncate">{fullName || "Sin nombre"}</p>
          <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3.5 h-3.5" /> {userEmail}
          </p>
        </div>
      </div>

      {/* Vehículo asignado (si usuario es conductor) */}
      {linkedAssignment && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-green-500" />
            Vehículo Asignado
          </h3>
          <Link
            href={`/dashboard/vehiculos/${linkedAssignment.vehicle_id}`}
            className="flex items-center gap-3 hover:text-construserv-orange transition"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{linkedAssignment.vehicle_brand} {linkedAssignment.vehicle_model}</p>
              <p className="text-sm text-gray-500">{linkedAssignment.vehicle_plate}</p>
            </div>
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Registrado como conductor: <span className="font-medium text-gray-600">{linkedAssignment.driver_name}</span>
          </p>
        </div>
      )}

      {/* Editar nombre */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-construserv-orange" />
          Nombre en la aplicación
        </h3>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Ej: Ignacio Hidalgo"
              className={inputClass}
            />
          </div>
          {nameMsg && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> {nameMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={savingName || !fullName.trim() || fullName === originalName}
            className="w-full bg-construserv-orange hover:bg-orange-700 text-white py-2.5 rounded-lg font-medium transition disabled:opacity-50 text-sm"
          >
            {savingName ? "Guardando..." : "Guardar nombre"}
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-5">
          <KeyRound className="w-4 h-4 text-construserv-orange" />
          Cambiar contraseña
        </h3>
        {passMsg && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm mb-4">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {passMsg}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required placeholder="Mínimo 6 caracteres" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={inputClass} />
          </div>
          {passError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{passError}</p>}
          <button
            type="submit"
            disabled={savingPass}
            className="w-full bg-construserv-orange hover:bg-orange-700 text-white py-2.5 rounded-lg font-medium transition disabled:opacity-50 text-sm"
          >
            {savingPass ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
