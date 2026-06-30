"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Wrench, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setResetMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setResetLoading(false);
    if (error) {
      setResetMsg("Error al enviar el correo. Intenta más tarde.");
    } else {
      setResetMsg("¡Listo! Revisa tu correo y sigue el enlace para crear una nueva contraseña.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-construserv-dark to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-construserv-orange rounded-2xl mb-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Flotapp</h1>
          <p className="text-gray-400 mt-1">Gestión de Flota y Mantenciones</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {showReset ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Recuperar contraseña</h2>
              <p className="text-sm text-gray-500 mb-6">Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="tu@construserv.cl"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-construserv-orange transition"
                />
                {resetMsg && (
                  <p className={`text-sm px-3 py-2 rounded-lg ${resetMsg.startsWith("¡") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {resetMsg}
                  </p>
                )}
                <button type="submit" disabled={resetLoading} className="w-full bg-construserv-orange hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60">
                  {resetLoading ? "Enviando..." : "Enviar enlace"}
                </button>
                <button type="button" onClick={() => setShowReset(false)} className="w-full text-sm text-gray-500 hover:text-gray-700 transition">
                  ← Volver al inicio de sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar Sesión</h2>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tu@construserv.cl"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-construserv-orange focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-construserv-orange focus:border-transparent transition pr-12"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button type="button" onClick={() => setShowReset(true)} className="text-xs text-construserv-orange hover:underline mt-1 float-right">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}
                <button type="submit" disabled={loading} className="w-full bg-construserv-orange hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? "Ingresando..." : "Ingresar"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Pares y Alvarez &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
