"use client";

import React, { useState, useMemo } from "react";
import { GlassCard } from "../ui/GlassCard";
import {
  TrendUp,
  Coins,
  Scales,
  Users,
  CalendarBlank,
  ChartBar,
  CaretDown,
  CaretUp,
  Phone,
  User,
  ShoppingBag,
  Clock,
  ArrowUpRight
} from "@phosphor-icons/react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { ClientProfile } from "../../lib/clients";

interface ProfitabilityAnalyticsProps {
  sales: any[];
  clients: ClientProfile[];
  inventory: any[];
  onRefresh: () => void;
}

export function ProfitabilityAnalytics({ sales, clients, inventory, onRefresh }: ProfitabilityAnalyticsProps) {
  const [timeFilter, setTimeFilter] = useState<"7d" | "30d" | "all">("all");
  const [clientSearch, setClientSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  // Filtrar ventas por rango temporal
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      // Excluir compras operativas de insumos
      if (s.client === "proveedor_opex") return false;

      const saleDate = new Date(s.date);
      if (timeFilter === "7d") {
        const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return saleDate >= d7;
      }
      if (timeFilter === "30d") {
        const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return saleDate >= d30;
      }
      return true;
    });
  }, [sales, timeFilter]);

  // KPIs Globales
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalGrams = 0;

    filteredSales.forEach(s => {
      totalRevenue += Number(s.revenue) || 0;
      totalCogs += Number(s.cost_of_goods) || 0;
      totalGrams += Number(s.qty_sold) || 0;
    });

    const netProfit = totalRevenue - totalCogs;
    const avgMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const avgPricePerG = totalGrams > 0 ? totalRevenue / totalGrams : 0;
    const avgCostPerG = totalGrams > 0 ? totalCogs / totalGrams : 0;

    return {
      totalRevenue,
      totalCogs,
      netProfit,
      avgMargin,
      totalGrams,
      avgPricePerG,
      avgCostPerG,
      txCount: filteredSales.length
    };
  }, [filteredSales]);

  // Agrupación por Día para Línea Temporal (Timeline)
  const timelineData = useMemo(() => {
    const groups: Record<
      string,
      { date: string; fullDate: string; revenue: number; cogs: number; profit: number; grams: number }
    > = {};

    // Ordenar de más antiguo a más nuevo
    const sorted = [...filteredSales].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sorted.forEach(s => {
      const d = new Date(s.date);
      const key = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

      if (!groups[key]) {
        groups[key] = {
          date: label,
          fullDate: key,
          revenue: 0,
          cogs: 0,
          profit: 0,
          grams: 0
        };
      }

      const rev = Number(s.revenue) || 0;
      const cogs = Number(s.cost_of_goods) || 0;
      groups[key].revenue += rev;
      groups[key].cogs += cogs;
      groups[key].profit += rev - cogs;
      groups[key].grams += Number(s.qty_sold) || 0;
    });

    return Object.values(groups);
  }, [filteredSales]);

  // Agrupación por Cliente
  const clientsData = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        tier: string;
        ordersCount: number;
        totalGrams: number;
        totalRevenue: number;
        totalCogs: number;
        grossProfit: number;
        marginPct: number;
        lastPurchase: string;
        purchases: any[];
      }
    >();

    // Indexar clientes registrados
    const clientProfilesMap = new Map<string, ClientProfile>();
    clients.forEach(c => {
      clientProfilesMap.set(c.name.toLowerCase().trim(), c);
    });

    filteredSales.forEach(s => {
      const rawName = (s.customer_name || "Desconocido").trim();
      const normKey = rawName.toLowerCase();
      const profile = clientProfilesMap.get(normKey);

      if (!map.has(normKey)) {
        map.set(normKey, {
          name: rawName,
          phone: profile?.phone || "",
          tier: profile?.tier || s.client || "regular",
          ordersCount: 0,
          totalGrams: 0,
          totalRevenue: 0,
          totalCogs: 0,
          grossProfit: 0,
          marginPct: 0,
          lastPurchase: s.date,
          purchases: []
        });
      }

      const entry = map.get(normKey)!;
      const rev = Number(s.revenue) || 0;
      const cogs = Number(s.cost_of_goods) || 0;
      const g = Number(s.qty_sold) || 0;

      entry.ordersCount += 1;
      entry.totalGrams += g;
      entry.totalRevenue += rev;
      entry.totalCogs += cogs;
      entry.grossProfit += rev - cogs;
      entry.purchases.push(s);

      if (new Date(s.date) > new Date(entry.lastPurchase)) {
        entry.lastPurchase = s.date;
      }
    });

    // Calcular márgenes
    map.forEach(item => {
      item.marginPct = item.totalRevenue > 0 ? (item.grossProfit / item.totalRevenue) * 100 : 0;
      // Ordenar transacciones de este cliente por fecha desc
      item.purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    let list = Array.from(map.values());

    if (clientSearch.trim()) {
      const q = clientSearch.toLowerCase().trim();
      list = list.filter(
        c => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
      );
    }

    // Ordenar por mayor ganancia neta generada
    return list.sort((a, b) => b.grossProfit - a.grossProfit);
  }, [filteredSales, clients, clientSearch]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rev = payload.find((p: any) => p.dataKey === "revenue")?.value || 0;
      const cogs = payload.find((p: any) => p.dataKey === "cogs")?.value || 0;
      const profit = payload.find((p: any) => p.dataKey === "profit")?.value || 0;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;

      return (
        <div className="bg-slate-900/95 border border-panel-border p-3 rounded-lg shadow-xl text-xs font-mono">
          <p className="font-bold text-foreground mb-1.5">{label}</p>
          <p className="text-emerald-400">Ingresos: ${rev.toLocaleString("es-AR")}</p>
          <p className="text-slate-400">Costo Agronómico: ${cogs.toLocaleString("es-AR")}</p>
          <div className="pt-1.5 mt-1.5 border-t border-slate-700 flex justify-between gap-4 font-bold text-purple-300">
            <span>Ganancia Neta:</span>
            <span>+${profit.toLocaleString("es-AR")} ({margin.toFixed(1)}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Selector de Rango Temporal & Título */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendUp size={24} className="text-emerald-400" /> Métricas & Rentabilidad Comercial
          </h2>
          <p className="text-xs font-mono text-brand-slate-600 dark:text-slate-400">
            Control en vivo de margen bruto, costo agronómico (COGS) y ganancia por cliente.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-panel-border">
          <button
            onClick={() => setTimeFilter("7d")}
            className={`px-3 py-1 text-xs font-mono font-bold rounded transition-all ${
              timeFilter === "7d"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            7 Días
          </button>
          <button
            onClick={() => setTimeFilter("30d")}
            className={`px-3 py-1 text-xs font-mono font-bold rounded transition-all ${
              timeFilter === "30d"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            30 Días
          </button>
          <button
            onClick={() => setTimeFilter("all")}
            className={`px-3 py-1 text-xs font-mono font-bold rounded transition-all ${
              timeFilter === "all"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            Histórico Completo
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Rentabilidad */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Facturación Total */}
        <GlassCard className="p-4 border-l-4 border-l-blue-500">
          <span className="text-[10px] uppercase font-mono text-brand-slate-500 block">Total Facturado</span>
          <span className="text-2xl font-bold font-mono text-foreground mt-1 block">
            ${metrics.totalRevenue.toLocaleString("es-AR")}
          </span>
          <span className="text-[11px] font-mono text-brand-slate-400 mt-0.5 block">
            {metrics.txCount} ventas concretadas
          </span>
        </GlassCard>

        {/* Costo Agronómico (COGS) */}
        <GlassCard className="p-4 border-l-4 border-l-orange-500">
          <span className="text-[10px] uppercase font-mono text-brand-slate-500 block" title="Costo unitario de producción acumulado del lote">
            Costo Agronómico (COGS)
          </span>
          <span className="text-2xl font-bold font-mono text-orange-400 mt-1 block">
            ${metrics.totalCogs.toLocaleString("es-AR")}
          </span>
          <span className="text-[11px] font-mono text-brand-slate-400 mt-0.5 block">
            Prom: ${metrics.avgCostPerG.toFixed(0)}/g cosechado
          </span>
        </GlassCard>

        {/* Ganancia Neta Real */}
        <GlassCard className="p-4 border-l-4 border-l-emerald-500 bg-emerald-500/5">
          <span className="text-[10px] uppercase font-mono text-emerald-400 block font-bold">
            Ganancia Neta (Gross Profit)
          </span>
          <span className="text-2xl font-black font-mono text-emerald-300 mt-1 block">
            +${metrics.netProfit.toLocaleString("es-AR")}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
              {metrics.avgMargin.toFixed(1)}% Margen
            </span>
          </div>
        </GlassCard>

        {/* Gramos & Precio Promedio */}
        <GlassCard className="p-4 border-l-4 border-l-purple-500">
          <span className="text-[10px] uppercase font-mono text-brand-slate-500 block">Volumen Dispensado</span>
          <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">
            {metrics.totalGrams.toFixed(1)}g
          </span>
          <span className="text-[11px] font-mono text-brand-slate-400 mt-0.5 block">
            Ticket prom: ${metrics.avgPricePerG.toFixed(0)}/g
          </span>
        </GlassCard>
      </div>

      {/* Gráfico Línea Temporal (Timeline) */}
      <GlassCard className="w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
              <ChartBar size={20} className="text-emerald-400" /> Línea Temporal de Rentabilidad
            </h3>
            <p className="text-xs font-mono text-brand-slate-500">
              Evolución diaria de Ventas, Costos de Producción y Ganancia Neta.
            </p>
          </div>
        </div>

        {timelineData.length === 0 ? (
          <div className="h-64 flex items-center justify-center font-mono text-sm opacity-50 border border-dashed border-panel-border rounded-xl">
            Sin transacciones en el período seleccionado.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "#888", fontSize: 11 }}
                  tickFormatter={val => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="revenue" name="Ingresos Venta ($)" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="cogs" name="Costo Agronómico ($)" fill="#f97316" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Ganancia Neta ($)"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#a855f7" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      {/* Rentabilidad por Cliente */}
      <GlassCard className="w-full p-6">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
              <Users size={20} className="text-purple-400" /> Rentabilidad por Comprador / Socio
            </h3>
            <p className="text-xs font-mono text-brand-slate-500">
              Ranking de clientes ordenado por ganancia neta aportada. Clic para ver historial de compras.
            </p>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar comprador o tel..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="bg-black/20 border border-panel-border rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-purple-500 w-56 text-foreground"
            />
          </div>
        </div>

        {clientsData.length === 0 ? (
          <div className="py-8 text-center text-sm font-mono opacity-50 border border-dashed border-panel-border rounded-xl">
            No se encontraron clientes con ventas registradas.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {clientsData.map((client, idx) => {
              const isExpanded = expandedClient === client.name;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-panel-border bg-black/[0.02] dark:bg-black/20 overflow-hidden transition-all hover:border-purple-500/40"
                >
                  {/* Fila Principal del Cliente */}
                  <div
                    onClick={() => setExpandedClient(isExpanded ? null : client.name)}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-400 text-sm">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-foreground text-sm">{client.name}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-semibold uppercase">
                            {client.tier}
                          </span>
                        </div>
                        {client.phone && (
                          <p className="text-[11px] font-mono text-brand-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone size={12} /> {client.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Métricas del Cliente */}
                    <div className="flex items-center gap-6 font-mono text-xs flex-wrap">
                      <div className="text-right">
                        <span className="text-[10px] text-brand-slate-500 block">Gramos Totales</span>
                        <span className="font-bold text-purple-400 text-sm">{client.totalGrams.toFixed(1)}g</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-brand-slate-500 block">Total Facturado</span>
                        <span className="font-bold text-foreground text-sm">
                          ${client.totalRevenue.toLocaleString("es-AR")}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-brand-slate-500 block">Costo Agronómico</span>
                        <span className="text-orange-400 font-medium">
                          ${client.totalCogs.toLocaleString("es-AR")}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400 block font-bold">Ganancia Neta</span>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="font-bold text-emerald-300 text-sm">
                            +${client.grossProfit.toLocaleString("es-AR")}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            {client.marginPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="text-brand-slate-500">
                        {isExpanded ? <CaretUp size={18} /> : <CaretDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Detalle Desplegable: Transacciones del Cliente */}
                  {isExpanded && (
                    <div className="p-4 bg-black/30 border-t border-panel-border/50 animate-in fade-in duration-150">
                      <p className="text-xs font-mono font-bold text-purple-400 mb-2.5 flex items-center gap-1.5">
                        <ShoppingBag size={14} /> Historial de compras de {client.name} ({client.purchases.length}{" "}
                        operaciones):
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-panel-border/40 text-brand-slate-500 uppercase text-[10px]">
                              <th className="py-2 px-2">Fecha y Hora</th>
                              <th className="py-2 px-2">Lote / Ítem</th>
                              <th className="py-2 px-2 text-right">Gramos</th>
                              <th className="py-2 px-2 text-right">Precio/g</th>
                              <th className="py-2 px-2 text-right">Total Cobrado</th>
                              <th className="py-2 px-2 text-right">Costo COGS</th>
                              <th className="py-2 px-2 text-right text-emerald-400">Ganancia ($)</th>
                              <th className="py-2 px-2 text-right">Margen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {client.purchases.map((p, pIdx) => {
                              const rev = Number(p.revenue) || 0;
                              const cogs = Number(p.cost_of_goods) || 0;
                              const prof = rev - cogs;
                              const marg = rev > 0 ? (prof / rev) * 100 : 0;
                              const g = Number(p.qty_sold) || 0;
                              const priceG = g > 0 ? rev / g : 0;

                              // Buscar nombre del lote en inventario
                              const invItem = inventory.find(i => i.id === p.item_id);
                              const itemName = invItem ? invItem.name : p.item_id;

                              return (
                                <tr key={pIdx} className="border-b border-panel-border/20 hover:bg-black/20">
                                  <td className="py-2 px-2 text-slate-300">
                                    {new Date(p.date).toLocaleDateString()} {new Date(p.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </td>
                                  <td className="py-2 px-2 font-medium truncate max-w-[180px] text-foreground" title={itemName}>
                                    {itemName}
                                  </td>
                                  <td className="py-2 px-2 text-right font-bold text-purple-400">{g}g</td>
                                  <td className="py-2 px-2 text-right text-slate-400">${priceG.toFixed(0)}/g</td>
                                  <td className="py-2 px-2 text-right font-bold text-foreground">${rev.toLocaleString("es-AR")}</td>
                                  <td className="py-2 px-2 text-right text-orange-400">${cogs.toLocaleString("es-AR")}</td>
                                  <td className="py-2 px-2 text-right font-bold text-emerald-400">
                                    +${prof.toLocaleString("es-AR")}
                                  </td>
                                  <td className="py-2 px-2 text-right text-emerald-300 font-semibold">{marg.toFixed(1)}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
