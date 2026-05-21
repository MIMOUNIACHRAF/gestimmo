"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, User, Phone, Mail, Hash, X, Save } from "lucide-react";

type Client = {
  id: string; name: string; phone: string; email: string | null; cin: string | null;
  createdAt: Date | string;
  apartments: { id: string; number: string; status: string; floor: { building: { bloc: { name: string } } } }[];
  sales: { price: number }[];
};

function AddClientModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", cin: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { onAdded(); onClose(); }
    else { const d = await res.json(); setError(d.error ?? "Erreur"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0b0e18] border border-[#1c2336] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold">Nouveau client</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: "name", label: "Nom complet*", icon: User, type: "text", required: true },
            { key: "phone", label: "Téléphone*", icon: Phone, type: "tel", required: true },
            { key: "email", label: "Email", icon: Mail, type: "email", required: false },
            { key: "cin", label: "N° CIN", icon: Hash, type: "text", required: false },
          ].map(({ key, label, icon: Icon, type, required }) => (
            <div key={key}>
              <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1.5">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={type}
                  required={required}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-[#10141f] border border-[#1c2336] text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ))}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Enregistrement..." : "Ajouter le client"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ClientsClient({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.cin ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients.length} clients enregistrés</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau client
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0b0e18] border border-[#1c2336] text-white rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <div key={client.id} className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5 hover:border-blue-600/40 transition-all">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center text-white font-bold text-sm uppercase flex-shrink-0">
                {client.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate">{client.name}</div>
                {client.cin && <div className="text-slate-500 text-xs mt-0.5">CIN: {client.cin}</div>}
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{client.phone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-[#1c2336] flex items-center justify-between text-xs">
              <span className="text-slate-500">{client.apartments.length} appartement(s)</span>
              <span className="text-green-400 font-semibold">
                {new Intl.NumberFormat("fr-MA", { notation: "compact" }).format(
                  client.sales.reduce((s, v) => s + v.price, 0)
                )} MAD
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-600">Aucun client trouvé</div>
        )}
      </div>

      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onAdded={() => router.refresh()}
        />
      )}
    </div>
  );
}
