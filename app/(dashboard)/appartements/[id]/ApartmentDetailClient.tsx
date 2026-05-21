"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, CheckCircle, Clock, XCircle, Save, User, Phone, Hash, Layers, DollarSign, Trash2 } from "lucide-react";
import Link from "next/link";

type Client = { id: string; name: string; phone: string; email: string | null };
type Apartment = {
  id: string; number: string; type: string; surface: number; price: number; status: string;
  floor: { name: string; building: { name: string; bloc: { name: string } } };
  client: Client | null;
  sale: { price: number; date: string; notes: string | null; user: { name: string } } | null;
};

const statusMap = {
  AVAILABLE: { label: "Disponible", icon: CheckCircle, cls: "text-green-400 border-green-500/40 bg-green-500/10" },
  RESERVED:  { label: "Réservé",    icon: Clock,       cls: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  SOLD:      { label: "Vendu",      icon: XCircle,     cls: "text-red-400 border-red-500/40 bg-red-500/10" },
};

export default function ApartmentDetailClient({ apartment, clients }: { apartment: Apartment; clients: Client[] }) {
  const router = useRouter();
  const [status, setStatus] = useState(apartment.status);
  const [surface, setSurface] = useState(apartment.surface);
  const [clientId, setClientId] = useState(apartment.client?.id ?? "");
  const [salePrice, setSalePrice] = useState(apartment.sale?.price ?? apartment.price);
  const [saleNotes, setSaleNotes] = useState(apartment.sale?.notes ?? "");
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [msg, setMsg]         = useState("");

  const s = statusMap[status as keyof typeof statusMap] ?? statusMap.AVAILABLE;
  const Icon = s.icon;

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/apartments/${apartment.id}`, { method: "DELETE" });
    router.push("/appartements");
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/apartments/${apartment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, surface, clientId: clientId || null, salePrice, saleNotes }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Enregistré avec succès !");
      router.refresh();
    } else {
      setMsg("Erreur lors de la sauvegarde.");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/appartements" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-400" /> Appartement {apartment.number}
          </h1>
          <p className="text-slate-500 text-sm">
            {apartment.floor.building.bloc.name} › {apartment.floor.building.name} › {apartment.floor.name}
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Informations</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoItem icon={<Hash />} label="Numéro" value={apartment.number} />
          <InfoItem icon={<Home />} label="Type" value={apartment.type} />
          <InfoItem icon={<DollarSign />} label="Prix catalogue" value={`${new Intl.NumberFormat("fr-MA").format(apartment.price)} MAD`} />
          <div className="flex items-center gap-3">
            <div className="text-slate-500 w-4 h-4"><Layers /></div>
            <span className="text-slate-500">Surface</span>
            <div className="ml-auto flex items-center gap-1">
              <input
                type="number"
                value={surface}
                onChange={(e) => setSurface(Number(e.target.value))}
                className="w-20 bg-[#10141f] border border-[#1c2336] text-white text-sm rounded px-2 py-1 text-right focus:outline-none focus:border-blue-500"
                min={1}
              />
              <span className="text-slate-500 text-sm">m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Statut</h2>
        <div className="flex gap-3">
          {(["AVAILABLE", "RESERVED", "SOLD"] as const).map((st) => {
            const sm = statusMap[st];
            const SIcon = sm.icon;
            return (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-semibold transition-all ${status === st ? sm.cls : "border-[#1c2336] text-slate-500 bg-[#10141f] hover:border-slate-500"}`}
              >
                <SIcon className="w-4 h-4" />
                {sm.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Client */}
      {(status === "RESERVED" || status === "SOLD") && (
        <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Client</h2>
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-wider block mb-2">Sélectionner un client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-[#10141f] border border-[#1c2336] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">— Choisir un client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-wider block mb-2">Prix de vente (MAD)</label>
            <input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(Number(e.target.value))}
              className="w-full bg-[#10141f] border border-[#1c2336] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-wider block mb-2">Notes (optionnel)</label>
            <textarea
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#10141f] border border-[#1c2336] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Remarques, conditions particulières..."
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
          <Save className="w-4 h-4"/>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button onClick={() => setShowDel(true)}
          className="flex items-center gap-2 bg-[#0b0e18] hover:bg-red-500/10 border border-red-500/30 text-red-400 font-semibold px-4 py-3 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4"/>Supprimer
        </button>
        {msg && (
          <span className={`text-sm ${msg.includes("succès") ? "text-green-400" : "text-red-400"}`}>{msg}</span>
        )}
      </div>

      {/* Confirm delete */}
      {showDel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDel(false)}>
          <div className="bg-[#0b0e18] border border-[#1c2336] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400"/>
              </div>
              <div>
                <h3 className="text-white font-bold">Supprimer {apartment.number} ?</h3>
                <p className="text-slate-500 text-xs">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDel(false)}
                className="flex-1 py-2.5 rounded-lg border border-[#1c2336] text-slate-400 text-sm hover:border-slate-500">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {deleting ? "Suppression..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-500 w-4 h-4">{icon}</div>
      <span className="text-slate-500">{label}</span>
      <span className="text-white font-medium ml-auto">{value}</span>
    </div>
  );
}
