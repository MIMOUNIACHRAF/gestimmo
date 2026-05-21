"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Home, CheckCircle, Clock, XCircle, Plus, Trash2,
  Edit2, X, Save, ChevronDown, Filter,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Client = { id: string; name: string; phone: string };
type Building = { id: string; name: string; floors: { id: string; name: string; order: number }[] };
type Bloc = { id: string; name: string; buildings: Building[] };
type Apartment = {
  id: string; number: string; type: string; surface: number; price: number; status: string;
  floor: { id: string; name: string; order: number; building: { id: string; name: string; bloc: { id: string; name: string } } };
  client: { name: string; phone: string } | null;
  sale: { price: number } | null;
};

// ── Constantes ────────────────────────────────────────────────────────────────
const STATUS = {
  AVAILABLE: { label: "Disponible", icon: CheckCircle, dot: "bg-[#23d160]", cls: "text-[#23d160] bg-[#23d160]/10 border-[#23d160]/30" },
  RESERVED:  { label: "Réservé",    icon: Clock,       dot: "bg-[#f5a623]", cls: "text-[#f5a623] bg-[#f5a623]/10 border-[#f5a623]/30" },
  SOLD:      { label: "Vendu",      icon: XCircle,     dot: "bg-[#f04040]", cls: "text-[#f04040] bg-[#f04040]/10 border-[#f04040]/30" },
} as const;

const TYPES = ["F2", "F3", "F4", "F5"];
const FLOORS_NAMES = ["RDC", "ETG 1", "ETG 2"];
const SURF: Record<string, number> = { F2: 62, F3: 80, F4: 100, F5: 120 };
const PRIX: Record<string, number> = { F2: 900_000, F3: 1_170_000, F4: 1_440_000, F5: 1_800_000 };

// ── Composants UI petits ──────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const s = STATUS[status as keyof typeof STATUS] ?? STATUS.AVAILABLE;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>
      <Icon className="w-3 h-3"/>{s.label}
    </span>
  );
}

// ── Modal Edit inline ─────────────────────────────────────────────────────────
function EditModal({ apt, clients, blocs, onClose, onSaved }: {
  apt: Apartment; clients: Client[]; blocs: Bloc[];
  onClose: () => void; onSaved: () => void;
}) {
  const [status, setStatus]       = useState(apt.status);
  const [surface, setSurface]     = useState(apt.surface);
  const [clientId, setClientId]   = useState(apt.client ? clients.find(c=>c.name===apt.client!.name)?.id ?? "" : "");
  const [salePrice, setSalePrice] = useState(apt.sale?.price ?? apt.price);
  const [saleNotes, setSaleNotes] = useState("");
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");

  async function save() {
    setSaving(true); setErr("");
    const r = await fetch(`/api/apartments/${apt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, surface, clientId: clientId || null, salePrice, saleNotes }),
    });
    setSaving(false);
    if (r.ok) { onSaved(); onClose(); }
    else setErr("Erreur de sauvegarde");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0b0e18] border border-[#1c2336] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-400"/>Apt {apt.number}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {apt.floor.building.bloc.name} › {apt.floor.building.name} › {apt.floor.name}
            </p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500 hover:text-white"/></button>
        </div>

        {/* Surface */}
        <div className="mb-4">
          <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-2">Surface (m²)</label>
          <input
            type="number"
            value={surface}
            onChange={(e) => setSurface(Number(e.target.value))}
            min={1}
            className="w-full bg-[#10141f] border border-[#1c2336] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Statut */}
        <div className="mb-4">
          <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-2">Statut</label>
          <div className="flex gap-2">
            {(["AVAILABLE","RESERVED","SOLD"] as const).map(st => {
              const sm = STATUS[st]; const Icon = sm.icon;
              return (
                <button key={st} onClick={() => setStatus(st)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    status===st ? sm.cls : "border-[#1c2336] text-slate-500 hover:border-slate-500"
                  }`}>
                  <Icon className="w-3 h-3"/>{sm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Client + prix si réservé/vendu */}
        {(status === "RESERVED" || status === "SOLD") && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Client</label>
              <select value={clientId} onChange={e=>setClientId(e.target.value)}
                className="w-full bg-[#10141f] border border-[#1c2336] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                <option value="">— Choisir un client —</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Prix de vente (MAD)</label>
              <input type="number" value={salePrice} onChange={e=>setSalePrice(Number(e.target.value))}
                className="w-full bg-[#10141f] border border-[#1c2336] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"/>
            </div>
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Notes</label>
              <textarea value={saleNotes} onChange={e=>setSaleNotes(e.target.value)} rows={2}
                placeholder="Remarques..."
                className="w-full bg-[#10141f] border border-[#1c2336] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"/>
            </div>
          </div>
        )}

        {err && <p className="text-red-400 text-xs mb-3">{err}</p>}

        <button onClick={save} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
          <Save className="w-4 h-4"/>{saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

// ── Modal Créer appartement ────────────────────────────────────────────────────
function CreateModal({ blocs, onClose, onCreated }: {
  blocs: Bloc[]; onClose: () => void; onCreated: () => void;
}) {
  const [blocId, setBlocId]     = useState("");
  const [buildId, setBuildId]   = useState("");
  const [floorId, setFloorId]   = useState("");
  const [type, setType]         = useState("F3");
  const [number, setNumber]     = useState("");
  const [surface, setSurface]   = useState(SURF["F3"]);
  const [price, setPrice]       = useState(PRIX["F3"]);
  const [status, setStatus]     = useState("AVAILABLE");
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const buildings = blocs.find(b=>b.id===blocId)?.buildings ?? [];
  const floors    = buildings.find(b=>b.id===buildId)?.floors.sort((a,b)=>a.order-b.order) ?? [];

  function onTypeChange(t: string) {
    setType(t);
    setSurface(SURF[t] ?? 80);
    setPrice(PRIX[t] ?? 1_000_000);
  }

  async function create() {
    if (!floorId || !number || !type) { setErr("Remplir tous les champs obligatoires"); return; }
    setSaving(true); setErr("");
    const r = await fetch("/api/apartments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floorId, number, type, surface, price, status }),
    });
    setSaving(false);
    if (r.ok) { onCreated(); onClose(); }
    else {
      const d = await r.json();
      setErr(d.error ?? "Erreur");
    }
  }

  const inputCls = "w-full bg-[#10141f] border border-[#1c2336] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0b0e18] border border-[#1c2336] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400"/>Nouvel appartement</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500 hover:text-white"/></button>
        </div>

        <div className="space-y-3">
          {/* Bloc */}
          <div>
            <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Bloc *</label>
            <select value={blocId} onChange={e=>{setBlocId(e.target.value);setBuildId("");setFloorId("");}} className={inputCls}>
              <option value="">— Choisir un bloc —</option>
              {blocs.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          {/* Bâtiment */}
          {blocId && (
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Bâtiment *</label>
              <select value={buildId} onChange={e=>{setBuildId(e.target.value);setFloorId("");}} className={inputCls}>
                <option value="">— Choisir un bâtiment —</option>
                {buildings.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          {/* Étage */}
          {buildId && (
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Étage *</label>
              <select value={floorId} onChange={e=>setFloorId(e.target.value)} className={inputCls}>
                <option value="">— Choisir un étage —</option>
                {floors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          {/* Type + Numéro */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Type *</label>
              <select value={type} onChange={e=>onTypeChange(e.target.value)} className={inputCls}>
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Numéro *</label>
              <input value={number} onChange={e=>setNumber(e.target.value)} placeholder="ex: B1A-RDC-03" className={inputCls}/>
            </div>
          </div>
          {/* Surface + Prix */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Surface (m²)</label>
              <input type="number" value={surface} onChange={e=>setSurface(Number(e.target.value))} className={inputCls}/>
            </div>
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Prix (MAD)</label>
              <input type="number" value={price} onChange={e=>setPrice(Number(e.target.value))} className={inputCls}/>
            </div>
          </div>
          {/* Statut */}
          <div>
            <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Statut</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} className={inputCls}>
              <option value="AVAILABLE">Disponible</option>
              <option value="RESERVED">Réservé</option>
              <option value="SOLD">Vendu</option>
            </select>
          </div>
        </div>

        {err && <p className="text-red-400 text-xs mt-3">{err}</p>}

        <button onClick={create} disabled={saving}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4"/>{saving ? "Création..." : "Créer l'appartement"}
        </button>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function ApartmentsClient({
  apartments: initial, blocs, clients,
}: {
  apartments: Apartment[]; blocs: Bloc[]; clients: Client[];
}) {
  const router = useRouter();
  const [apts, setApts]           = useState(initial);
  const [search, setSearch]       = useState("");
  const [fStatus, setFStatus]     = useState("all");
  const [fBloc, setFBloc]         = useState("all");
  const [fType, setFType]         = useState("all");
  const [fFloor, setFFloor]       = useState("all");
  const [editApt, setEditApt]     = useState<Apartment | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [delId, setDelId]         = useState<string | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const refresh = useCallback(() => router.refresh(), [router]);

  // Refresh local state après action
  async function reloadApts() {
    router.refresh();
    // On recharge la page pour avoir les données fraîches
    window.location.reload();
  }

  // Filtres
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return apts.filter(a => {
      if (q && !a.number.toLowerCase().includes(q) && !a.type.toLowerCase().includes(q) &&
          !a.floor.building.bloc.name.toLowerCase().includes(q) &&
          !(a.client?.name.toLowerCase().includes(q)))
        return false;
      if (fStatus !== "all" && a.status !== fStatus) return false;
      if (fBloc   !== "all" && a.floor.building.bloc.name !== fBloc) return false;
      if (fType   !== "all" && a.type !== fType) return false;
      if (fFloor  !== "all" && a.floor.name !== fFloor) return false;
      return true;
    });
  }, [apts, search, fStatus, fBloc, fType, fFloor]);

  // Stats
  const stats = useMemo(() => ({
    total:  apts.length,
    avl:    apts.filter(a=>a.status==="AVAILABLE").length,
    res:    apts.filter(a=>a.status==="RESERVED").length,
    sold:   apts.filter(a=>a.status==="SOLD").length,
  }), [apts]);

  async function handleDelete(id: string) {
    setDeleting(true);
    await fetch(`/api/apartments/${id}`, { method: "DELETE" });
    setApts(prev => prev.filter(a => a.id !== id));
    setDelId(null);
    setDeleting(false);
  }

  const hasFilter = search || fStatus !== "all" || fBloc !== "all" || fType !== "all" || fFloor !== "all";

  return (
    <div className="flex flex-col h-full bg-[#06080c]">

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-[#131c2e] bg-[#0a0d16] flex items-center justify-between gap-4 shrink-0 flex-wrap">
        <div>
          <h1 className="text-white font-bold text-base tracking-wide">Appartements</h1>
          <p className="text-[#50607f] text-xs font-mono mt-0.5">
            Résidence 1 — Secteur N°2 ·{" "}
            <span className="text-[#23d160]">{stats.avl} disponibles</span> ·{" "}
            <span className="text-[#f5a623]">{stats.res} réservés</span> ·{" "}
            <span className="text-[#f04040]">{stats.sold} vendus</span>
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shrink-0">
          <Plus className="w-4 h-4"/>Nouvel appartement
        </button>
      </div>

      {/* ── KPI bar ── */}
      <div className="grid grid-cols-4 border-b border-[#131c2e] shrink-0">
        {[
          { label: "Total",      val: stats.total, cls: "text-white"         },
          { label: "Disponible", val: stats.avl,   cls: "text-[#23d160]"    },
          { label: "Réservé",    val: stats.res,   cls: "text-[#f5a623]"    },
          { label: "Vendu",      val: stats.sold,  cls: "text-[#f04040]"    },
        ].map(k => (
          <div key={k.label} className="flex flex-col items-center justify-center py-3 border-r border-[#131c2e] last:border-r-0">
            <span className={`text-xl font-bold font-mono ${k.cls}`}>{k.val}</span>
            <span className="text-[#50607f] text-[10px] uppercase tracking-wide">{k.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div className="px-6 py-3 border-b border-[#131c2e] bg-[#0a0d16] flex flex-wrap gap-2 items-center shrink-0">
        {/* Recherche */}
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#50607f]"/>
          <input type="text" placeholder="N°, type, client, bloc..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#06080c] border border-[#1c2336] text-white text-xs rounded-lg pl-8 pr-3 py-2 placeholder-[#2a3450] focus:outline-none focus:border-blue-500"/>
        </div>

        {/* Filtre statut — boutons */}
        <div className="flex bg-[#06080c] border border-[#1c2336] rounded-lg p-0.5 gap-0.5">
          {["all","AVAILABLE","RESERVED","SOLD"].map(st => (
            <button key={st} onClick={() => setFStatus(st)}
              className={`px-2.5 py-1.5 rounded text-[10px] font-bold transition-all ${
                fStatus===st
                  ? st==="all" ? "bg-[#1c2336] text-white"
                    : st==="AVAILABLE" ? "bg-[#23d160]/20 text-[#23d160]"
                    : st==="RESERVED"  ? "bg-[#f5a623]/20 text-[#f5a623]"
                    : "bg-[#f04040]/20 text-[#f04040]"
                  : "text-[#50607f] hover:text-white"
              }`}>
              {st==="all" ? "Tous" : STATUS[st as keyof typeof STATUS].label}
            </button>
          ))}
        </div>

        {/* Filtre bloc */}
        <div className="relative">
          <select value={fBloc} onChange={e=>setFBloc(e.target.value)}
            className="appearance-none bg-[#06080c] border border-[#1c2336] text-[#8896bb] text-xs rounded-lg pl-3 pr-7 py-2 focus:outline-none focus:border-blue-500">
            <option value="all">Tous blocs</option>
            {blocs.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#50607f] pointer-events-none"/>
        </div>

        {/* Filtre type */}
        <div className="relative">
          <select value={fType} onChange={e=>setFType(e.target.value)}
            className="appearance-none bg-[#06080c] border border-[#1c2336] text-[#8896bb] text-xs rounded-lg pl-3 pr-7 py-2 focus:outline-none focus:border-blue-500">
            <option value="all">Tous types</option>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#50607f] pointer-events-none"/>
        </div>

        {/* Filtre étage */}
        <div className="relative">
          <select value={fFloor} onChange={e=>setFFloor(e.target.value)}
            className="appearance-none bg-[#06080c] border border-[#1c2336] text-[#8896bb] text-xs rounded-lg pl-3 pr-7 py-2 focus:outline-none focus:border-blue-500">
            <option value="all">Tous étages</option>
            {FLOORS_NAMES.map(f=><option key={f}>{f}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#50607f] pointer-events-none"/>
        </div>

        {/* Reset filtres */}
        {hasFilter && (
          <button onClick={()=>{setSearch("");setFStatus("all");setFBloc("all");setFType("all");setFFloor("all");}}
            className="flex items-center gap-1 text-[10px] text-[#50607f] hover:text-white transition-colors px-2 py-1.5 rounded border border-[#1c2336] hover:border-slate-500">
            <X className="w-3 h-3"/>Reset
          </button>
        )}

        <span className="text-[#50607f] text-[10px] font-mono ml-auto">{filtered.length} résultat(s)</span>
      </div>

      {/* ── Tableau ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0a0d16] border-b border-[#131c2e]">
              {["N° / Type","Emplacement","Surface","Prix","Statut","Client","Actions"].map(h => (
                <th key={h} className="text-left text-[#50607f] text-[10px] font-bold uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((apt, i) => (
              <tr key={apt.id}
                className={`border-b border-[#0e1220] transition-colors hover:bg-[#0d1120] ${i%2===0?"bg-[#06080c]":"bg-[#080b10]"}`}>
                {/* N° / Type */}
                <td className="px-4 py-3">
                  <div className="text-white font-semibold text-xs">{apt.number}</div>
                  <div className="text-[#50607f] text-[10px] font-mono">{apt.type} · {apt.surface}m²</div>
                </td>
                {/* Emplacement */}
                <td className="px-4 py-3 text-[#8896bb] text-xs">
                  <div className="font-medium text-[#5b8dee]/80">{apt.floor.building.bloc.name}</div>
                  <div className="text-[#50607f] text-[10px]">{apt.floor.building.name} · {apt.floor.name}</div>
                </td>
                {/* Surface */}
                <td className="px-4 py-3 text-[#8896bb] text-xs font-mono whitespace-nowrap">{apt.surface} m²</td>
                {/* Prix */}
                <td className="px-4 py-3 text-[#8896bb] text-xs font-mono whitespace-nowrap">
                  {new Intl.NumberFormat("fr-MA").format(apt.price)}
                  <span className="text-[#50607f] text-[10px]"> MAD</span>
                </td>
                {/* Statut */}
                <td className="px-4 py-3"><Badge status={apt.status}/></td>
                {/* Client */}
                <td className="px-4 py-3 text-[#8896bb] text-xs">
                  {apt.client
                    ? <div><div className="text-white text-xs">{apt.client.name}</div><div className="text-[#50607f] text-[10px] font-mono">{apt.client.phone}</div></div>
                    : <span className="text-[#2a3450]">—</span>
                  }
                </td>
                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditApt(apt)}
                      className="p-1.5 rounded-lg border border-[#1c2336] text-[#5b8dee] hover:bg-[#5b8dee]/10 transition-colors"
                      title="Modifier">
                      <Edit2 className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={() => setDelId(apt.id)}
                      className="p-1.5 rounded-lg border border-[#1c2336] text-[#f04040] hover:bg-[#f04040]/10 transition-colors"
                      title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#2a3450]">
            <Filter className="w-8 h-8 mb-3 opacity-30"/>
            <p className="text-sm">Aucun appartement trouvé</p>
            {hasFilter && <button onClick={()=>{setSearch("");setFStatus("all");setFBloc("all");setFType("all");setFFloor("all");}} className="mt-3 text-blue-400 text-xs hover:underline">Réinitialiser les filtres</button>}
          </div>
        )}
      </div>

      {/* ── Modal confirmation suppression ── */}
      {delId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDelId(null)}>
          <div className="bg-[#0b0e18] border border-[#1c2336] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#f04040]/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[#f04040]"/>
              </div>
              <div>
                <h3 className="text-white font-bold">Supprimer l'appartement</h3>
                <p className="text-slate-500 text-xs">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDelId(null)}
                className="flex-1 py-2.5 rounded-lg border border-[#1c2336] text-slate-400 text-sm hover:border-slate-500 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(delId)} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-[#f04040] hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {editApt && (
        <EditModal apt={editApt} clients={clients} blocs={blocs}
          onClose={() => setEditApt(null)} onSaved={reloadApts}/>
      )}
      {showCreate && (
        <CreateModal blocs={blocs} onClose={() => setShowCreate(false)} onCreated={reloadApts}/>
      )}
    </div>
  );
}
