"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const MAD = (n: number) =>
  new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(n);

const PIE_COLORS = ["#ef4444", "#f97316", "#22c55e"];

interface BlocStat { name: string; revenue: number; sold: number }

export default function DashboardCharts({
  sold, reserved, available, blocStats,
}: {
  sold: number; reserved: number; available: number; blocStats: BlocStat[];
}) {
  const pieData = [
    { name: "Vendus",      value: sold      },
    { name: "Réservés",    value: reserved  },
    { name: "Disponibles", value: available },
  ].filter((d) => d.value > 0);

  const hasRevenue = blocStats.some((b) => b.revenue > 0);

  return (
    <div className="bg-[#0b0e18] border border-[#1c2336] rounded-xl p-5 space-y-6">
      {/* Donut */}
      <div>
        <h2 className="text-white font-semibold text-sm mb-4">Répartition des appartements</h2>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0b0e18",
                border: "1px solid #1c2336",
                borderRadius: "8px",
                color: "#eef2ff",
                fontSize: 12,
              }}
              formatter={(value, name) => [value, name]}
            />
            <Legend
              formatter={(value) => (
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Bar Chart — only if data exists */}
      {hasRevenue && (
        <div>
          <h2 className="text-white font-semibold text-sm mb-3">CA par BLOC (MAD)</h2>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={blocStats} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2336" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "#0b0e18",
                  border: "1px solid #1c2336",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                formatter={(value: number) => [MAD(value), "CA"]}
                labelStyle={{ color: "#eef2ff" }}
              />
              <Bar dataKey="revenue" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
