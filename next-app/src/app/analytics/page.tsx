"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { ChartLineUp, CurrencyDollar, TrendUp, Database, ArrowUpRight, ArrowDownRight } from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";

export default function AnalyticsPage() {
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        totalCostOfGoods: 0,
        totalInventoryValue: 0,
        salesCount: 0,
        avgTicket: 0,
    });
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAnalytics = async () => {
        setLoading(true);
        // Load Sales (Revenue)
        const { data: salesData } = await supabase.from('core_sales').select('*').neq('client', 'proveedor_opex');
        
        // Load Inventory Capex
        const { data: quimicos } = await supabase.from('core_inventory_quimicos').select('qty, unit_cost');

        let rev = 0;
        let cogs = 0;
        let sCount = 0;
        
        if (salesData) {
            sCount = salesData.length;
            salesData.forEach(s => {
                rev += Number(s.revenue || 0);
                cogs += Number(s.cost_of_goods || 0);
            });
            setSales(salesData.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()));
        }

        let invValue = 0;
        if (quimicos) {
            quimicos.forEach(q => {
                const qNum = Number(q.qty || 0);
                const ucNum = Number(q.unit_cost || 0);
                invValue += (qNum * ucNum);
            });
        }

        setMetrics({
            totalRevenue: rev,
            totalCostOfGoods: cogs,
            totalInventoryValue: invValue,
            salesCount: sCount,
            avgTicket: sCount > 0 ? (rev / sCount) : 0
        });

        setLoading(false);
    };

    useEffect(() => {
        loadAnalytics();
    }, []);

    const netProfit = metrics.totalRevenue - metrics.totalCostOfGoods;
    const margin = metrics.totalRevenue > 0 ? (netProfit / metrics.totalRevenue) * 100 : 0;

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
            {/* Header */}
            <GlassCard className="w-full relative overflow-hidden p-8 flex flex-col md:flex-row justify-between md:items-center gap-6 border-l-4 border-status-green">
                <div className="absolute top-0 right-0 w-64 h-64 bg-status-green/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="z-10">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        <ChartLineUp size={32} className="text-status-green" />
                        Tráfico Financiero (ROI)
                    </h1>
                    <p className="text-brand-slate-600 dark:text-slate-400 font-mono mt-2">
                        Liquidación de Costos, Ventas POS y Valuación CapEx
                    </p>
                </div>
            </GlassCard>

            {loading ? (
                <div className="py-20 text-center opacity-50 font-mono">Calculando Matrices...</div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Top Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <GlassCard className="p-6 border-t border-t-white/10 flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><CurrencyDollar size={64}/></div>
                            <span className="text-xs uppercase font-bold text-brand-slate-600">Ingreso Bruto (Revenue)</span>
                            <span className="text-3xl font-black text-status-green">${metrics.totalRevenue.toLocaleString('es-AR')}</span>
                            <span className="text-xs font-mono text-status-green flex items-center gap-1"><TrendUp size={12}/> Lifetime</span>
                        </GlassCard>
                        
                        <GlassCard className="p-6 border-t border-t-white/10 flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowDownRight size={64}/></div>
                            <span className="text-xs uppercase font-bold text-brand-slate-600">Liquidación COGS & OpEx</span>
                            <span className="text-3xl font-black text-red-500">${metrics.totalCostOfGoods.toLocaleString('es-AR')}</span>
                            <span className="text-xs font-mono text-red-500 flex items-center gap-1">Costos de la mercancía vendida</span>
                        </GlassCard>

                        <GlassCard className="p-6 border-t border-t-white/10 flex flex-col gap-2 relative overflow-hidden bg-emerald-900/10 border-l-2 border-emerald-500">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowUpRight size={64}/></div>
                            <span className="text-xs uppercase font-bold text-emerald-500">Net Profit (Ganancia Neta)</span>
                            <span className="text-3xl font-black text-white">${netProfit.toLocaleString('es-AR')}</span>
                            <span className="text-xs font-mono text-emerald-400">Margen Comercial: {margin.toFixed(1)}%</span>
                        </GlassCard>

                        <GlassCard className="p-6 border-t border-t-white/10 flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Database size={64}/></div>
                            <span className="text-xs uppercase font-bold text-brand-slate-600">CapEx / Activos Líquidos</span>
                            <span className="text-3xl font-black text-purple-400">${metrics.totalInventoryValue.toLocaleString('es-AR')}</span>
                            <span className="text-xs font-mono text-purple-400">Capital Atrapado en Bodega Operativa</span>
                        </GlassCard>
                    </div>

                    {/* Breakdown Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <GlassCard>
                            <h3 className="text-lg font-bold mb-4 border-b border-panel-border pb-2">Desglose de Facturación <span className="text-sm font-mono opacity-50 ml-2">(${metrics.avgTicket.toLocaleString('es-AR', {maximumFractionDigits:0})} Avg Ticket)</span></h3>
                            <div className="overflow-y-auto max-h-[400px]">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="sticky top-0 bg-panel-base/90 backdrop-blur">
                                        <tr className="text-[10px] uppercase font-mono text-brand-slate-600">
                                            <th className="py-2 px-2">Tx Date</th>
                                            <th className="py-2 px-2">Batch/SKU</th>
                                            <th className="py-2 px-2 text-right">Qty</th>
                                            <th className="py-2 px-2 text-right">Revenue</th>
                                            <th className="py-2 px-2 text-right">Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono text-xs">
                                        {sales.map((s,i) => {
                                            const profit = s.revenue - (s.cost_of_goods || 0);
                                            return (
                                                <tr key={i} className="border-b border-panel-border/20 hover:bg-black/5">
                                                    <td className="py-3 px-2 opacity-60">{new Date(s.date).toLocaleDateString()}</td>
                                                    <td className="py-3 px-2 truncate max-w-[120px]">{s.item_id}</td>
                                                    <td className="py-3 px-2 text-right font-bold text-blue-400">{s.qty_sold}g</td>
                                                    <td className="py-3 px-2 text-right text-status-green">${s.revenue}</td>
                                                    <td className="py-3 px-2 text-right font-bold text-white bg-black/20">${profit}</td>
                                                </tr>
                                            );
                                        })}
                                        {sales.length === 0 && <tr><td colSpan={5} className="py-10 text-center opacity-50">Sin Historial Financiero</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
}
