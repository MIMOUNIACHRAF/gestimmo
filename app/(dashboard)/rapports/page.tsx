import { prisma } from "@/lib/prisma";
import { TrendingUp, FileText, Home } from "lucide-react";

async function getReports() {
  const [sales, apartments, blocs] = await Promise.all([
    prisma.sale.findMany({
      include: { apartment: { include: { floor: { include: { building: { include: { bloc: true } } } } } }, client: true, user: true },
      orderBy: { date: "desc" },
    }),
    prisma.apartment.count(),
    prisma.bloc.findMany({ include: { buildings: { include: { floors: { include: { apartments: true } } } } } }),
  ]);
  return { sales, apartments, blocs };
}

export default async function RapportsPage() {
  const { sales, apartments, blocs } = await getReports();
  const totalRevenue = sales.reduce((s, v) => s + v.price, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Rapports & Statistiques</h1>
        <p className="text-slate-500 text-sm mt-0.5">Vue d'ensemble des ventes et performances</p>
      </div>

      {/* Revenue KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400 text-sm">Chiffre d'affaires total</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(totalRevenue)} MAD
          </div>
          <div className="text-slate-500 text-xs mt-1">{sales.length} ventes réalisées</div>
        </div>
        <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-4 h-4 text-blue-400" />
            <span className="text-slate-400 text-sm">Taux de vente</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {apartments ? ((sales.length / apartments) * 100).toFixed(1) : 0}%
          </div>
          <div className="text-slate-500 text-xs mt-1">{sales.length} / {apartments} appartements</div>
        </div>
        <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-green-400" />
            <span className="text-slate-400 text-sm">Prix moyen de vente</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {sales.length ? new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(totalRevenue / sales.length) : 0} MAD
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1c2336]">
          <h2 className="text-white font-semibold text-sm">Historique des ventes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1c2336] bg-[#10141f]">
              {["Date", "Appartement", "Client", "Agent", "Prix de vente"].map((h) => (
                <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b border-[#1c2336] hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5 text-slate-400 text-xs">
                  {new Date(sale.date).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-white font-medium">{sale.apartment.number}</div>
                  <div className="text-slate-500 text-xs">
                    {sale.apartment.floor.building.bloc.name} › {sale.apartment.floor.building.name}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-300">{sale.client.name}</td>
                <td className="px-5 py-3.5 text-slate-400">{sale.user.name}</td>
                <td className="px-5 py-3.5 text-green-400 font-mono font-semibold">
                  {new Intl.NumberFormat("fr-MA").format(sale.price)} MAD
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="text-center py-12 text-slate-600">Aucune vente enregistrée</div>
        )}
      </div>
    </div>
  );
}
