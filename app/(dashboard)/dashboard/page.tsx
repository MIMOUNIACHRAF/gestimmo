import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import DashboardCharts from "./DashboardCharts";
import {
  Home, Users, TrendingUp, Building,
  CheckCircle, Clock, XCircle, DollarSign, Percent,
} from "lucide-react";

const MAD = (n: number) =>
  new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(n);

async function getStats() {
  const [apartments, clients, sales, blocs] = await Promise.all([
    prisma.apartment.findMany({
      include: { floor: { include: { building: { include: { bloc: true } } } } },
    }),
    prisma.client.count(),
    prisma.sale.findMany({
      include: {
        apartment: {
          include: { floor: { include: { building: { include: { bloc: true } } } } },
        },
      },
    }),
    prisma.bloc.findMany({
      include: { buildings: { include: { floors: { include: { apartments: true } } } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const total     = apartments.length;
  const available = apartments.filter((a) => a.status === "AVAILABLE").length;
  const reserved  = apartments.filter((a) => a.status === "RESERVED").length;
  const sold      = apartments.filter((a) => a.status === "SOLD").length;
  const revenue   = sales.reduce((s, x) => s + x.price, 0);
  const avgPrice  = sold > 0 ? Math.round(revenue / sold) : 0;

  const blocStats = blocs.map((bloc) => {
    const apts = bloc.buildings.flatMap((b) => b.floors.flatMap((f) => f.apartments));
    const blocRevenue = sales
      .filter((s) => s.apartment?.floor?.building?.bloc?.name === bloc.name)
      .reduce((acc, s) => acc + s.price, 0);
    return {
      name:      bloc.name,
      total:     apts.length,
      available: apts.filter((a) => a.status === "AVAILABLE").length,
      reserved:  apts.filter((a) => a.status === "RESERVED").length,
      sold:      apts.filter((a) => a.status === "SOLD").length,
      revenue:   blocRevenue,
    };
  });

  return { total, available, reserved, sold, clients, revenue, avgPrice, blocStats };
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  title, value, sub, icon: Icon, iconCls, pct, highlight,
}: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; iconCls: string; pct?: number; highlight?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#0b0e18] border rounded-xl p-5 flex flex-col gap-3 ${
      highlight ? "border-yellow-500/30" : "border-[#1c2336]"
    }`}>
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none"/>
      )}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconCls}`}>
          <Icon className="w-5 h-5" />
        </div>
        {pct !== undefined && (
          <span className="text-xs font-mono font-bold text-slate-400 bg-[#151a28] px-2 py-1 rounded-full">
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-white leading-none mb-1">{value}</div>
        <div className="text-slate-400 text-sm">{title}</div>
        {sub && <div className="text-slate-600 text-xs mt-0.5">{sub}</div>}
      </div>
      {pct !== undefined && (
        <div className="h-1 bg-[#1c2336] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct > 60 ? "bg-green-500" : pct > 30 ? "bg-orange-400" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Bloc Row ──────────────────────────────────────────────────────────────────
function BlocRow({ b, maxRev }: { b: ReturnType<typeof Array.prototype.map>[0]; maxRev: number }) {
  const bloc = b as {
    name: string; total: number; available: number; reserved: number; sold: number; revenue: number;
  };
  const soldPct = bloc.total ? (bloc.sold / bloc.total) * 100 : 0;
  const resPct  = bloc.total ? (bloc.reserved / bloc.total) * 100 : 0;
  const avlPct  = bloc.total ? (bloc.available / bloc.total) * 100 : 0;
  const revPct  = maxRev > 0 ? (bloc.revenue / maxRev) * 100 : 0;

  return (
    <div className="p-4 bg-[#10141f] rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-white text-sm font-bold">{bloc.name}</span>
        </div>
        <span className="text-slate-500 text-xs font-mono">{bloc.total} appts</span>
      </div>

      {/* Occupation bar */}
      <div className="flex rounded-full overflow-hidden h-2">
        {bloc.sold      > 0 && <div className="bg-red-500"    style={{ width: `${soldPct}%` }} />}
        {bloc.reserved  > 0 && <div className="bg-orange-400" style={{ width: `${resPct}%` }} />}
        {bloc.available > 0 && <div className="bg-green-500"  style={{ width: `${avlPct}%` }} />}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="text-green-400">{bloc.available} dispo</span>
          <span className="text-orange-400">{bloc.reserved} rés.</span>
          <span className="text-red-400">{bloc.sold} vendus</span>
        </div>
        {bloc.revenue > 0 && (
          <span className="text-yellow-400 text-xs font-mono font-semibold">{MAD(bloc.revenue)}</span>
        )}
      </div>

      {/* Revenue bar */}
      {maxRev > 0 && (
        <div className="h-1 bg-[#1c2336] rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500/60 rounded-full transition-all"
            style={{ width: `${revPct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const session = await auth();
  const { total, available, reserved, sold, clients, revenue, avgPrice, blocStats } = await getStats();
  const maxRev = Math.max(...blocStats.map((b) => b.revenue), 0);
  const occupancyPct = total > 0 ? ((sold + reserved) / total) * 100 : 0;

  return (
    <div className="p-6 space-y-6 min-h-full bg-[#06080f]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Tableau de bord</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Bonjour, <span className="text-blue-400">{session?.user?.name}</span> · OTAB IMMOBILIÈRE · Secteur N°2
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-[#0b0e18] border border-[#1c2336] px-4 py-2 rounded-xl font-mono">
          {new Date().toLocaleDateString("fr-MA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total appartements"
          value={total}
          sub="Résidence 1 · 4 blocs"
          icon={Home}
          iconCls="bg-blue-500/20 text-blue-400"
        />
        <KpiCard
          title="Disponibles"
          value={available}
          icon={CheckCircle}
          iconCls="bg-green-500/20 text-green-400"
          pct={total ? (available / total) * 100 : 0}
        />
        <KpiCard
          title="Réservés"
          value={reserved}
          icon={Clock}
          iconCls="bg-orange-500/20 text-orange-400"
          pct={total ? (reserved / total) * 100 : 0}
        />
        <KpiCard
          title="Vendus"
          value={sold}
          icon={XCircle}
          iconCls="bg-red-500/20 text-red-400"
          pct={total ? (sold / total) * 100 : 0}
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Chiffre d'affaires"
          value={MAD(revenue)}
          sub="Ventes confirmées"
          icon={TrendingUp}
          iconCls="bg-yellow-500/20 text-yellow-400"
          highlight
        />
        <KpiCard
          title="Prix moyen / vente"
          value={sold > 0 ? MAD(avgPrice) : "—"}
          sub={sold > 0 ? `Sur ${sold} vente${sold > 1 ? "s" : ""}` : "Aucune vente"}
          icon={DollarSign}
          iconCls="bg-emerald-500/20 text-emerald-400"
        />
        <KpiCard
          title="Clients enregistrés"
          value={clients}
          sub="Base acquéreurs"
          icon={Users}
          iconCls="bg-purple-500/20 text-purple-400"
        />
      </div>

      {/* Occupation Bar */}
      <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-slate-500" />
            <h2 className="text-white font-semibold text-sm">Taux d'occupation global</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">{total} appartements</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono ${
              occupancyPct > 50 ? "bg-orange-500/15 text-orange-400" : "bg-green-500/15 text-green-400"
            }`}>
              {occupancyPct.toFixed(1)}% occupés
            </span>
          </div>
        </div>
        <div className="flex rounded-full overflow-hidden h-5 mb-3 bg-[#10141f]">
          {sold > 0 && (
            <div className="bg-red-500 h-full transition-all flex items-center justify-center"
              style={{ width: `${(sold / total) * 100}%` }}
              title={`Vendus: ${sold}`}>
              {sold > 5 && <span className="text-white text-[9px] font-bold">{sold}</span>}
            </div>
          )}
          {reserved > 0 && (
            <div className="bg-orange-400 h-full transition-all flex items-center justify-center"
              style={{ width: `${(reserved / total) * 100}%` }}
              title={`Réservés: ${reserved}`}>
              {reserved > 5 && <span className="text-white text-[9px] font-bold">{reserved}</span>}
            </div>
          )}
          {available > 0 && (
            <div className="bg-green-500 h-full transition-all flex items-center justify-center"
              style={{ width: `${(available / total) * 100}%` }}
              title={`Disponibles: ${available}`}>
              {available > 5 && <span className="text-white text-[9px] font-bold">{available}</span>}
            </div>
          )}
        </div>
        <div className="flex gap-6 text-xs">
          {[
            { color: "bg-red-500",    label: "Vendus",      val: sold      },
            { color: "bg-orange-400", label: "Réservés",    val: reserved  },
            { color: "bg-green-500",  label: "Disponibles", val: available },
          ].map(({ color, label, val }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-slate-400">{label} <span className="text-white font-bold">({val})</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts + Bloc Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCharts
          sold={sold}
          reserved={reserved}
          available={available}
          blocStats={blocStats.map((b) => ({ name: b.name, revenue: b.revenue, sold: b.sold }))}
        />

        {/* Bloc Stats */}
        <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-4 h-4 text-blue-400" />
            <h2 className="text-white font-semibold text-sm">Statistiques par BLOC</h2>
            {revenue > 0 && (
              <span className="ml-auto text-yellow-400 text-xs font-mono font-semibold">{MAD(revenue)} total</span>
            )}
          </div>
          <div className="space-y-3">
            {blocStats.map((b) => (
              <BlocRow key={b.name} b={b} maxRev={maxRev} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
