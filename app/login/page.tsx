"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#06080f] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "repeating-linear-gradient(90deg,#5b8dee 0,#5b8dee 1px,transparent 1px,transparent 60px),repeating-linear-gradient(0deg,#5b8dee 0,#5b8dee 1px,transparent 1px,transparent 60px)" }} />

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image
              src="/logo.jpg"
              alt="OTAB IMMOBILIÈRE"
              width={160}
              height={80}
              className="object-contain rounded-xl"
              style={{ background: "white", padding: "8px" }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">GestImmo Pro</h1>
          <p className="text-slate-500 text-xs mt-1.5 font-mono">Secteur N°2 — Administration</p>
        </div>

        {/* Card */}
        <div className="bg-[#0b0e18]/90 border border-[#1c2336] rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="text-white text-base font-semibold mb-6">Connexion à votre espace</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-wider">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="votre@email.com"
                  className="w-full bg-[#10141f] border border-[#1c2336] rounded-xl pl-10 pr-4 py-3 text-white text-sm
                    placeholder-[#2a3450] focus:outline-none focus:border-blue-500 focus:bg-[#0d1220] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-[#10141f] border border-[#1c2336] rounded-xl pl-10 pr-10 py-3 text-white text-sm
                    placeholder-[#2a3450] focus:outline-none focus:border-blue-500 focus:bg-[#0d1220] transition-all"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                text-white font-bold py-3 rounded-xl transition-all mt-1 shadow-lg shadow-blue-600/20
                hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </span>
              ) : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-center text-[#2a3450] text-[10px] mt-6 font-mono">
          © {new Date().getFullYear()} OTAB IMMOBILIÈRE · Secteur N°2
        </p>
      </div>
    </div>
  );
}
