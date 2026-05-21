"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Home, User, Phone, Eye, EyeOff, Search, Save, CheckCircle, Clock, XCircle } from "lucide-react";

type Client = { id: string; name: string; phone: string };
type Apt = {
  id: string; number: string; type: string; surface: number; price: number;
  status: string; client: { id: string; name: string; phone: string } | null;
};
type Floor = { id: string; name: string; order: number; apartments: Apt[] };
type Bldg  = { id: string; name: string; position: number; floors: Floor[] };
type Bloc  = { id: string; name: string; buildings: Bldg[] };

const FLOOR_NAMES = ["RDC", "ETG 1", "ETG 2"];
const FLOOR_COLORS = [
  { bg: "bg-[#0a1a0f]", border: "border-[#1a4a2e]", badge: "bg-[#23d160]/15 border-[#23d160]/30 text-[#23d160]", dot: "bg-[#23d160]" },
  { bg: "bg-[#0a120e]", border: "border-[#1a3a5e]", badge: "bg-[#5b8dee]/15 border-[#5b8dee]/30 text-[#5b8dee]", dot: "bg-[#5b8dee]" },
  { bg: "bg-[#100a1a]", border: "border-[#3a1a5e]", badge: "bg-[#a855f7]/15 border-[#a855f7]/30 text-[#a855f7]", dot: "bg-[#a855f7]" },
];

const ST = {
  AVAILABLE: { cls: "bg-[#23d160]", ring: "ring-1 ring-[#23d160]/50", label: "Disponible", badge: "bg-[#23d160]/10 border-[#23d160]/30 text-[#23d160]", icon: CheckCircle },
  RESERVED:  { cls: "bg-[#f5a623]", ring: "ring-1 ring-[#f5a623]/50", label: "Réservé",    badge: "bg-[#f5a623]/10 border-[#f5a623]/30 text-[#f5a623]", icon: Clock },
  SOLD:      { cls: "bg-[#f04040]", ring: "ring-1 ring-[#f04040]/50", label: "Vendu",      badge: "bg-[#f04040]/10 border-[#f04040]/30 text-[#f04040]", icon: XCircle },
} as const;
type SK = keyof typeof ST;

const fmt = (n: number) => new Intl.NumberFormat("fr-MA").format(n);

interface TooltipData { apt: Apt; x: number; y: number }

// ── Dot ───────────────────────────────────────────────────────────────────────
function AptDot({ apt, floorName, blocName, onApt, onHover, dimmed, highlighted }: {
  apt: Apt; floorName: string; blocName: string;
  onApt: (a: Apt, b: string, f: string) => void;
  onHover: (d: TooltipData | null) => void;
  dimmed: boolean; highlighted: boolean;
}) {
  const s = ST[apt.status as SK] ?? ST.AVAILABLE;
  return (
    <button
      onClick={() => onApt(apt, blocName, floorName)}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onHover({ apt, x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => onHover(null)}
      className={`w-[13px] h-[13px] rounded-full flex-shrink-0 ${s.cls} ${s.ring}
        hover:scale-125 transition-all cursor-pointer shadow-md
        ${dimmed ? "opacity-[0.18] scale-75" : ""}
        ${highlighted ? "ring-[3px] !ring-white !ring-offset-1 !ring-offset-[#06080c] scale-125 shadow-[0_0_8px_rgba(255,255,255,0.45)]" : ""}
      `}
    />
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function AptTooltip({ data }: { data: TooltipData }) {
  const s = ST[data.apt.status as SK] ?? ST.AVAILABLE;
  const textCls = s.badge.split(" ").find((c) => c.startsWith("text-")) ?? "text-white";
  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{ left: data.x, top: data.y - 10, transform: "translate(-50%, -100%)" }}
    >
      <div className="bg-[#0d1120]/95 border border-[#2a3450] rounded-xl px-3.5 py-2.5 shadow-2xl text-xs whitespace-nowrap space-y-1.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${s.cls} shrink-0`} />
          <span className="text-white font-bold text-sm">{data.apt.number}</span>
          <span className={`text-[10px] font-semibold ${textCls} ml-1`}>{s.label}</span>
        </div>
        <div className="flex gap-2 text-slate-400">
          <span className="font-semibold text-slate-300">{data.apt.type}</span>
          <span>·</span>
          <span>{data.apt.surface} m²</span>
          <span>·</span>
          <span className="text-slate-200 font-mono">{fmt(data.apt.price)} MAD</span>
        </div>
        {data.apt.client && (
          <div className="flex items-center gap-1.5 text-slate-400 border-t border-[#1c2336] pt-1.5">
            <User className="w-3 h-3" />
            <span>{data.apt.client.name}</span>
            <span className="font-mono text-[10px]">· {data.apt.client.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quick Edit Modal ──────────────────────────────────────────────────────────
function QuickEditModal({ apt, blocName, floorName, clients, onClose, onSaved }: {
  apt: Apt; blocName: string; floorName: string;
  clients: Client[]; onClose: () => void; onSaved: () => void;
}) {
  const [status, setStatus]       = useState(apt.status);
  const [clientId, setClientId]   = useState(apt.client?.id ?? "");
  const [salePrice, setSalePrice] = useState(apt.price);
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");
  const s = ST[apt.status as SK] ?? ST.AVAILABLE;
  const sNew = ST[status as SK] ?? ST.AVAILABLE;

  async function save() {
    setSaving(true); setErr("");
    const res = await fetch(`/api/apartments/${apt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, clientId: clientId || null, salePrice, saleNotes: "" }),
    });
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else setErr("Erreur lors de la sauvegarde");
  }

  const changed = status !== apt.status || clientId !== (apt.client?.id ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-[#0b0e18] border border-[#1c2336] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-white font-bold flex items-center gap-2">
            <Home className="w-4 h-4 text-blue-400" />Apt {apt.number}
          </span>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
        </div>
        <p className="text-slate-500 text-xs mb-4">{blocName} · {floorName} · {apt.type} · {apt.surface} m²</p>

        {/* Prix + statut actuel */}
        <div className="flex items-center justify-between bg-[#10141f] rounded-lg px-3 py-2 mb-4">
          <span className="text-slate-300 text-xs font-mono">{fmt(apt.price)} MAD</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.cls}`} />{s.label}
          </span>
        </div>

        {/* Changer statut */}
        <div className="mb-4">
          <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-2">Nouveau statut</label>
          <div className="flex gap-2">
            {(["AVAILABLE", "RESERVED", "SOLD"] as SK[]).map((st) => {
              const sm = ST[st]; const Icon = sm.icon;
              return (
                <button key={st} onClick={() => setStatus(st)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    status === st ? sm.badge : "border-[#1c2336] text-slate-500 hover:border-slate-500"
                  }`}>
                  <Icon className="w-3 h-3" />{sm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Client si réservé / vendu */}
        {(status === "RESERVED" || status === "SOLD") && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#10141f] border border-[#1c2336] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                <option value="">— Choisir un client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
                ))}
              </select>
            </div>
            {status === "SOLD" && (
              <div>
                <label className="text-slate-500 text-[10px] uppercase tracking-wider block mb-1.5">Prix de vente (MAD)</label>
                <input type="number" value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-full bg-[#10141f] border border-[#1c2336] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
              </div>
            )}
          </div>
        )}

        {err && <p className="text-red-400 text-xs mb-3">{err}</p>}

        <div className="flex gap-2">
          <button onClick={save} disabled={saving || !changed}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500
              disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg
              text-sm transition-colors">
            <Save className="w-4 h-4" />{saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          <a href={`/appartements/${apt.id}`}
            className="px-4 flex items-center justify-center border border-[#1c2336] text-slate-400
              hover:text-white hover:border-slate-500 rounded-lg text-xs transition-colors whitespace-nowrap">
            Voir détail →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Bâtiment rect ─────────────────────────────────────────────────────────────
function BldgRect({ name, w, h }: { name: string; w?: number; h?: number }) {
  return (
    <div
      className="bg-[#10192e] border border-[#1e3a5f] rounded-[2px] flex items-center justify-center relative overflow-hidden flex-shrink-0"
      style={{ width: w ?? 26, height: h ?? 26 }}>
      <div className="absolute inset-0 opacity-15"
        style={{ backgroundImage: "repeating-linear-gradient(90deg,#5b8dee 0,#5b8dee 1px,transparent 1px,transparent 8px),repeating-linear-gradient(0deg,#5b8dee 0,#5b8dee 1px,transparent 1px,transparent 8px)" }} />
      <span className="text-[5px] text-[#5b8dee]/40 font-bold relative z-10 select-none"
        style={(w ?? 26) < (h ?? 26) ? { writingMode: "vertical-rl" } : {}}>{name}</span>
    </div>
  );
}

// ── Compound (plan résidence) ─────────────────────────────────────────────────
function Compound({ blocs, floorIdx, onApt, onHover, filterStatus, search }: {
  blocs: Bloc[]; floorIdx: number;
  onApt: (a: Apt, b: string, f: string) => void;
  onHover: (d: TooltipData | null) => void;
  filterStatus: string; search: string;
}) {
  const get    = (n: string) => blocs.find((b) => b.name.includes(n));
  const b1 = get("BLOC 1"), b2 = get("BLOC 2"), b3 = get("BLOC 3"), b4 = get("BLOC 4");
  const short  = (b: Bloc) => b.name.split(" — ").pop()!;
  const sorted = (b: Bloc) => [...b.buildings].sort((x, y) => x.position - y.position);

  const aptCount = (bldg: Bldg) => bldg.floors.find((f) => f.order === floorIdx)?.apartments.length ?? 2;
  const hW = (bldg: Bldg) => Math.max(aptCount(bldg) * 20, 36);
  const vH = (bldg: Bldg) => Math.max(aptCount(bldg) * 18, 34);
  const getApts = (bldg: Bldg) => {
    const fl = bldg.floors.find((f) => f.order === floorIdx);
    return { apts: fl?.apartments ?? [], floorName: fl?.name ?? "" };
  };

  const isDimmed = (apt: Apt) => {
    if (filterStatus !== "all" && apt.status !== filterStatus) return true;
    if (search && !apt.number.toLowerCase().includes(search.toLowerCase())) return true;
    return false;
  };
  const isHighlighted = (apt: Apt) =>
    search.length > 0 && apt.number.toLowerCase().includes(search.toLowerCase());

  const dot = (apt: Apt, blocName: string, floorName: string) => (
    <AptDot key={apt.id} apt={apt} floorName={floorName} blocName={blocName}
      onApt={onApt} onHover={onHover}
      dimmed={isDimmed(apt)} highlighted={isHighlighted(apt)} />
  );

  const allApts = blocs.flatMap((b) => b.buildings.flatMap((bu) => {
    const f = bu.floors.find((f) => f.order === floorIdx);
    return f ? f.apartments : [];
  }));
  const sold = allApts.filter((a) => a.status === "SOLD").length;
  const resv = allApts.filter((a) => a.status === "RESERVED").length;
  const avl  = allApts.filter((a) => a.status === "AVAILABLE").length;

  const Bloc1 = b1 && (
    <div className="flex flex-col items-center gap-[2px]">
      <div className="flex flex-row gap-[6px]">
        {sorted(b1).map((bldg) => {
          const { apts, floorName } = getApts(bldg);
          return (
            <div key={bldg.id} style={{ width: hW(bldg) }} className="flex flex-row gap-[3px] justify-center">
              {apts.map((a) => dot(a, short(b1), floorName))}
            </div>
          );
        })}
      </div>
      <div className="text-[6px] text-[#5b8dee]/55 font-bold tracking-[0.15em] uppercase">{short(b1)}</div>
      <div className="flex flex-row gap-[6px]">
        {sorted(b1).map((bldg) => <BldgRect key={bldg.id} name={bldg.name} w={hW(bldg)} h={22} />)}
      </div>
    </div>
  );

  const Bloc3 = b3 && (
    <div className="flex flex-col items-center gap-[2px]">
      <div className="flex flex-row gap-[6px]">
        {sorted(b3).map((bldg) => <BldgRect key={bldg.id} name={bldg.name} w={hW(bldg)} h={22} />)}
      </div>
      <div className="text-[6px] text-[#5b8dee]/55 font-bold tracking-[0.15em] uppercase">{short(b3)}</div>
      <div className="flex flex-row gap-[6px]">
        {sorted(b3).map((bldg) => {
          const { apts, floorName } = getApts(bldg);
          return (
            <div key={bldg.id} style={{ width: hW(bldg) }} className="flex flex-row gap-[3px] justify-center">
              {apts.map((a) => dot(a, short(b3), floorName))}
            </div>
          );
        })}
      </div>
    </div>
  );

  const Bloc2 = b2 && (
    <div className="flex flex-row items-center gap-[3px] self-stretch">
      <div className="text-[6px] text-[#5b8dee]/55 font-bold tracking-[0.15em] uppercase shrink-0"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{short(b2)}</div>
      <div className="flex flex-col gap-[6px] items-center justify-around self-stretch py-[3px]">
        {sorted(b2).map((bldg) => {
          const { apts, floorName } = getApts(bldg);
          return (
            <div key={bldg.id} className="flex flex-col gap-[3px] items-center justify-center"
              style={{ height: vH(bldg) }}>
              {apts.map((a) => dot(a, short(b2), floorName))}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-[6px] items-center justify-around self-stretch py-[3px]">
        {sorted(b2).map((bldg) => (
          <BldgRect key={bldg.id} name={bldg.name.replace("IM.", "")} w={22} h={vH(bldg)} />
        ))}
      </div>
    </div>
  );

  const Bloc4 = b4 && (
    <div className="flex flex-row items-center gap-[3px] self-stretch">
      <div className="flex flex-col gap-[6px] items-center justify-around self-stretch py-[3px]">
        {sorted(b4).map((bldg) => {
          const { apts, floorName } = getApts(bldg);
          const apt0 = apts[0], apt1 = apts[1];
          return (
            <div key={bldg.id} className="flex flex-row items-center gap-[3px]">
              {apt0 ? dot(apt0, short(b4), floorName) : <span className="w-[13px]" />}
              <BldgRect name={bldg.name.replace("IM.", "")} w={22} h={vH(bldg)} />
              {apt1 ? dot(apt1, short(b4), floorName) : <span className="w-[13px]" />}
            </div>
          );
        })}
      </div>
      <div className="text-[6px] text-[#5b8dee]/55 font-bold tracking-[0.15em] uppercase shrink-0"
        style={{ writingMode: "vertical-rl" }}>{short(b4)}</div>
    </div>
  );

  const Piscine = (
    <div className="flex-1 flex flex-col items-center justify-center gap-[4px] min-w-[58px] min-h-[68px]
      bg-[#070a0e] border border-[#131c2e] rounded-[3px] px-1.5 py-2">
      <div className="flex-1 w-7 max-h-28 rounded-[3px] flex items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(180deg,#0a2a4a 0%,#0d3d6b 40%,#1a5a8a 70%,#0d4070 100%)", border: "1px solid #1a6090", boxShadow: "inset 0 0 10px rgba(30,100,180,0.4)" }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,rgba(100,200,255,0.3) 0,rgba(100,200,255,0.3) 1px,transparent 1px,transparent 5px)" }} />
        <span className="text-[4px] text-[#5ab4e8]/50 font-bold tracking-wider relative z-10"
          style={{ writingMode: "vertical-rl" }}>PISCINE</span>
      </div>
      <div className="flex gap-[3px] text-[6px] font-mono font-bold shrink-0">
        <span className="text-[#23d160]">{avl}</span>
        <span className="text-[#f5a623]">{resv}</span>
        <span className="text-[#f04040]">{sold}</span>
      </div>
    </div>
  );

  return (
    <div className="inline-flex flex-col gap-[3px] p-[4px] bg-[#06080c] border border-[#101520] rounded-lg shadow-xl">
      {Bloc1}
      <div className="flex flex-row gap-[3px] items-stretch">{Bloc2}{Piscine}{Bloc4}</div>
      {Bloc3}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PlanMasseClient({ blocs, clients }: { blocs: Bloc[]; clients: Client[] }) {
  const router = useRouter();
  const [modal, setModal]         = useState<{ apt: Apt; blocName: string; floorName: string } | null>(null);
  const [tooltip, setTooltip]     = useState<TooltipData | null>(null);
  const [visibleFloors, setVisibleFloors] = useState([true, true, true]);
  const [filterStatus, setFilterStatus]   = useState("all");
  const [search, setSearch]               = useState("");

  const onApt = useCallback((apt: Apt, b: string, f: string) => {
    setTooltip(null);
    setModal({ apt, blocName: b, floorName: f });
  }, []);
  const onHover = useCallback((d: TooltipData | null) => setTooltip(d), []);
  const onSaved = useCallback(() => router.refresh(), [router]);

  const resMap = new Map<string, Bloc[]>();
  for (const bloc of blocs) {
    const key = bloc.name.split(" — ")[0];
    if (!resMap.has(key)) resMap.set(key, []);
    resMap.get(key)!.push(bloc);
  }
  const residences = Array.from(resMap.entries());

  const allApts = blocs.flatMap((b) => b.buildings.flatMap((bu) => bu.floors.flatMap((f) => f.apartments)));
  const sold = allApts.filter((a) => a.status === "SOLD").length;
  const resv = allApts.filter((a) => a.status === "RESERVED").length;
  const avl  = allApts.filter((a) => a.status === "AVAILABLE").length;
  const tot  = allApts.length;

  function toggleFloor(i: number) {
    setVisibleFloors((prev) => {
      const next = [...prev];
      if (next[i] && next.filter(Boolean).length === 1) return prev;
      next[i] = !next[i];
      return next;
    });
  }

  const activeSearch = search.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-[#06080c]">

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-[#131c2e] bg-[#08090f] flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gradient-to-b from-[#5b8dee] to-[#5b8dee]/30 rounded-full" />
            <h1 className="text-white font-bold text-sm tracking-wider uppercase">Plan de Masse — Secteur N°2</h1>
          </div>
          <p className="text-[#50607f] text-[10px] font-mono mt-1 ml-3">
            OTAB IMMOBILIÈRE · Résidence 1 · <span className="text-white">{tot}</span> appartements
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { label: "DISPO", val: avl,  cls: "border-[#23d160]/30 bg-[#23d160]/8 text-[#23d160]"  },
            { label: "RÉS.",  val: resv, cls: "border-[#f5a623]/30 bg-[#f5a623]/8 text-[#f5a623]"  },
            { label: "VENDU", val: sold, cls: "border-[#f04040]/30 bg-[#f04040]/8 text-[#f04040]"  },
          ].map((k) => (
            <div key={k.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold font-mono ${k.cls}`}>
              <span className="text-lg leading-none">{k.val}</span>
              <span className="opacity-70">{k.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Barre outils ── */}
      <div className="px-6 py-3 border-b border-[#131c2e] bg-[#08090f] flex items-center gap-3 flex-wrap shrink-0">

        {/* Étages */}
        <span className="text-[#50607f] text-[10px] font-mono uppercase tracking-wider shrink-0">Étages :</span>
        <div className="flex gap-1.5">
          {FLOOR_NAMES.map((name, i) => {
            const fc = FLOOR_COLORS[i];
            const active = visibleFloors[i];
            return (
              <button key={name} onClick={() => toggleFloor(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                  active ? `${fc.badge} border` : "border-[#1c2336] text-[#2a3450] hover:text-slate-500"
                }`}>
                {active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {name}
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-[#1c2336] shrink-0" />

        {/* Filtre statut */}
        <div className="flex gap-1 bg-[#06080c] border border-[#1c2336] rounded-lg p-0.5">
          {[
            { val: "all",       label: "Tous",     cls: "text-white" },
            { val: "AVAILABLE", label: "Dispo",    cls: "text-[#23d160]" },
            { val: "RESERVED",  label: "Réservé",  cls: "text-[#f5a623]" },
            { val: "SOLD",      label: "Vendu",    cls: "text-[#f04040]" },
          ].map(({ val, label, cls }) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-2.5 py-1.5 rounded text-[10px] font-bold transition-all ${
                filterStatus === val ? `bg-[#1c2336] ${cls}` : "text-[#50607f] hover:text-white"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[#1c2336] shrink-0" />

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#50607f] pointer-events-none" />
          <input
            type="text"
            placeholder="N° appartement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#06080c] border border-[#1c2336] text-white text-xs rounded-lg pl-7 pr-7 py-1.5 w-44
              placeholder-[#2a3450] focus:outline-none focus:border-blue-500 transition-colors"
          />
          {activeSearch && (
            <button onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#50607f] hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Légende */}
        <div className="ml-auto flex gap-3 text-[9px] text-[#50607f] font-mono">
          {([["bg-[#23d160]", "Disponible"], ["bg-[#f5a623]", "Réservé"], ["bg-[#f04040]", "Vendu"]] as [string, string][])
            .map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${c} inline-block`} />{l}
              </span>
            ))}
        </div>
      </div>

      {/* ── Barre de progression globale ── */}
      <div className="px-6 py-2 border-b border-[#131c2e] bg-[#06080c] flex items-center gap-3 shrink-0">
        <div className="flex-1 flex rounded-full overflow-hidden h-1.5 bg-[#131c2e]">
          {sold > 0 && <div className="bg-[#f04040] transition-all" style={{ width: `${(sold / tot) * 100}%` }} />}
          {resv > 0 && <div className="bg-[#f5a623] transition-all" style={{ width: `${(resv / tot) * 100}%` }} />}
          {avl  > 0 && <div className="bg-[#23d160] transition-all" style={{ width: `${(avl  / tot) * 100}%` }} />}
        </div>
        <span className="text-[#50607f] text-[9px] font-mono shrink-0">
          {tot > 0 ? (((sold + resv) / tot) * 100).toFixed(0) : 0}% occupé
        </span>
      </div>

      {/* ── Corps ── */}
      <div className="flex-1 overflow-auto p-6">
        {residences.map(([resName, rb]) => (
          <div key={resName} className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#e6c84a] shrink-0" />
              <h2 className="text-[#e6c84a]/90 text-[11px] font-bold uppercase tracking-[0.25em]">{resName}</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-[#e6c84a]/20 to-transparent" />
            </div>

            <div className="flex flex-row gap-8 items-start flex-wrap">
              {FLOOR_NAMES.map((floorName, fi) => {
                if (!visibleFloors[fi]) return null;
                const fc = FLOOR_COLORS[fi];
                const fa = rb.flatMap((b) => b.buildings.flatMap((bu) => {
                  const fl = bu.floors.find((f) => f.order === fi);
                  return fl ? fl.apartments : [];
                }));
                const fSold = fa.filter((a) => a.status === "SOLD").length;
                const fResv = fa.filter((a) => a.status === "RESERVED").length;
                const fAvl  = fa.filter((a) => a.status === "AVAILABLE").length;
                const fTot  = fa.length;
                const textCls = fc.badge.split(" ").find((c) => c.startsWith("text-")) ?? "text-white";

                return (
                  <div key={floorName} className="flex flex-col gap-3">
                    <div className={`rounded-xl border ${fc.border} ${fc.bg} px-4 py-3`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${fc.dot}`} />
                          <span className={`text-[11px] font-bold tracking-wider uppercase ${textCls}`}>{floorName}</span>
                        </div>
                        <span className="text-[9px] text-[#50607f] font-mono">{fTot} apts</span>
                      </div>
                      <div className="flex rounded-full overflow-hidden h-1 bg-[#131c2e] mb-2">
                        {fSold > 0 && <div className="bg-[#f04040]" style={{ width: `${(fSold / fTot) * 100}%` }} />}
                        {fResv > 0 && <div className="bg-[#f5a623]" style={{ width: `${(fResv / fTot) * 100}%` }} />}
                        {fAvl  > 0 && <div className="bg-[#23d160]" style={{ width: `${(fAvl  / fTot) * 100}%` }} />}
                      </div>
                      <div className="flex gap-3 text-[8px] font-mono">
                        <span className="text-[#23d160]">{fAvl} dispo</span>
                        <span className="text-[#f5a623]">{fResv} rés.</span>
                        <span className="text-[#f04040]">{fSold} vendu</span>
                      </div>
                    </div>
                    <Compound blocs={rb} floorIdx={fi} onApt={onApt} onHover={onHover}
                      filterStatus={filterStatus} search={search} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tooltip (fixed, pas de problème overflow) ── */}
      {tooltip && <AptTooltip data={tooltip} />}

      {/* ── Modal quick edit ── */}
      {modal && (
        <QuickEditModal
          apt={modal.apt}
          blocName={modal.blocName}
          floorName={modal.floorName}
          clients={clients}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
