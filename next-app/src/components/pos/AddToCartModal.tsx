"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "../ui/GlassCard";
import { X, ShoppingCart, Plus, Minus, TrendUp, Coins, CalendarBlank } from "@phosphor-icons/react";
import { getHarvestDateInfo } from "../../app/pos/page";

interface AddToCartModalProps {
  isOpen: boolean;
  item: any;
  onClose: () => void;
  onConfirm: (item: any, qty: number, pricePerG: number) => void;
}

export function AddToCartModal({ isOpen, item, onClose, onConfirm }: AddToCartModalProps) {
  const [qty, setQty] = useState<number>(10);
  const [pricePerG, setPricePerG] = useState<number>(10000);

  useEffect(() => {
    if (isOpen && item) {
      // Valor por defecto razonable: 10g o el stock máximo si es menor
      const defaultQty = Math.min(10, Math.max(1, Number(item.qty) || 1));
      setQty(defaultQty);
      setPricePerG(10000); // Precio sugerido de venta base
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const maxStock = Number(item.qty) || 0;
  const unitCost = Number(item.price) || 0; // Costo agronómico de producción por gramo
  const { formattedDate, daysElapsed } = getHarvestDateInfo(item.harvest_date || item.date_added);

  const subtotal = qty * pricePerG;
  const cogs = qty * unitCost;
  const profit = subtotal - cogs;
  const marginPct = subtotal > 0 ? (profit / subtotal) * 100 : 0;

  const handleQuickAddQty = (amount: number) => {
    setQty(prev => Math.min(maxStock, Math.max(0.1, Number((prev + amount).toFixed(1)))));
  };

  const handleSetMax = () => {
    setQty(maxStock);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0 || qty > maxStock) {
      alert(`La cantidad debe ser mayor a 0 y no superar los ${maxStock}g disponibles.`);
      return;
    }
    if (pricePerG < 0) {
      alert("El precio por gramo no puede ser negativo.");
      return;
    }
    onConfirm(item, qty, pricePerG);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <GlassCard className="max-w-md w-full p-6 shadow-2xl relative border-t-4 border-t-emerald-500 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors p-1"
        >
          <X size={22} />
        </button>

        {/* Encabezado del Producto */}
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {item.type === "cosecha_local" ? "🌱 Cosecha Propia" : "📦 B2B"}
            </span>
            {item.room_name && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                {item.room_name}
              </span>
            )}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold flex items-center gap-1">
              <CalendarBlank size={12} weight="bold" />
              {formattedDate} • {daysElapsed === 0 ? "Hoy" : `${daysElapsed}d`}
            </span>
          </div>

          <h3 className="text-xl font-bold text-foreground leading-snug">{item.name}</h3>
          {item.strain && (
            <p className="text-xs text-brand-slate-500 font-mono mt-0.5">
              Variedad: <strong className="text-foreground">{item.strain}</strong>
            </p>
          )}
        </div>

        {/* Barra de Stock y Costo Agronómico */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-black/20 border border-panel-border rounded-lg text-xs font-mono">
          <div>
            <span className="text-brand-slate-500 block text-[10px] uppercase">Stock Disponible:</span>
            <span className="text-base font-bold text-blue-400">{maxStock}g</span>
          </div>
          <div>
            <span className="text-brand-slate-500 block text-[10px] uppercase" title="Costo agronómico ponderado de producción">
              Costo Producción:
            </span>
            <span className="text-base font-bold text-emerald-400">
              ${unitCost.toFixed(0)} <span className="text-[10px] font-normal text-brand-slate-400">/g</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          {/* Selector de Gramos */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono text-brand-slate-600 uppercase font-semibold">
                Gramos a Dispensar
              </label>
              <span className="text-[11px] font-mono text-brand-slate-500">
                Máx: <strong className="text-blue-400">{maxStock}g</strong>
              </span>
            </div>

            {/* Input con botones + / - */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickAddQty(-1)}
                className="w-11 h-11 rounded-lg bg-black/30 hover:bg-black/50 border border-panel-border flex items-center justify-center text-foreground transition-colors font-bold"
              >
                <Minus size={18} />
              </button>

              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={maxStock}
                  required
                  value={qty || ""}
                  onChange={e => setQty(parseFloat(e.target.value) || 0)}
                  className="w-full h-11 bg-black/[0.03] dark:bg-black/30 border border-panel-border rounded-lg px-3 text-right text-xl font-mono font-bold text-foreground focus:border-emerald-500 outline-none pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-brand-slate-500 font-bold pointer-events-none">
                  g
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleQuickAddQty(1)}
                className="w-11 h-11 rounded-lg bg-black/30 hover:bg-black/50 border border-panel-border flex items-center justify-center text-foreground transition-colors font-bold"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Atajos de gramaje rápido */}
            <div className="flex gap-1.5 mt-1">
              {[1, 5, 10, 25].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQty(Math.min(maxStock, preset))}
                  className={`flex-1 py-1 text-xs font-mono font-semibold rounded border transition-all ${
                    qty === preset
                      ? "bg-emerald-600/30 border-emerald-500 text-emerald-300"
                      : "bg-black/20 hover:bg-black/40 border-panel-border text-brand-slate-600 hover:text-foreground"
                  }`}
                >
                  {preset}g
                </button>
              ))}
              <button
                type="button"
                onClick={handleSetMax}
                className="px-2.5 py-1 text-[11px] font-mono font-bold rounded border bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/40 text-blue-400 transition-all"
              >
                Todo
              </button>
            </div>
          </div>

          {/* Selector de Precio por Gramo */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono text-brand-slate-600 uppercase font-semibold">
                Precio de Venta por Gramo ($)
              </label>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-mono text-brand-slate-500 font-bold pointer-events-none">
                $
              </span>
              <input
                type="number"
                step="100"
                min="0"
                required
                value={pricePerG || ""}
                onChange={e => setPricePerG(parseFloat(e.target.value) || 0)}
                className="w-full h-11 bg-black/[0.03] dark:bg-black/30 border border-panel-border rounded-lg pl-8 pr-12 text-right text-lg font-mono font-bold text-foreground focus:border-emerald-500 outline-none"
              />
              <span className="absolute right-3.5 top-3 text-[11px] font-mono text-brand-slate-500 font-semibold pointer-events-none">
                /g
              </span>
            </div>

            {/* Atajos de precio sugerido */}
            <div className="flex gap-1.5 mt-0.5">
              {[7000, 8000, 10000, 12000].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPricePerG(p)}
                  className={`flex-1 py-1 text-[11px] font-mono font-semibold rounded border transition-all ${
                    pricePerG === p
                      ? "bg-purple-600/30 border-purple-500 text-purple-300"
                      : "bg-black/20 hover:bg-black/40 border-panel-border text-brand-slate-600 hover:text-foreground"
                  }`}
                >
                  ${(p / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* Previsualización en Vivo de Rentabilidad */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex flex-col gap-1.5 text-xs font-mono">
            <div className="flex justify-between text-brand-slate-500">
              <span>Subtotal Venta ({qty}g):</span>
              <span className="font-bold text-foreground text-sm">${subtotal.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between text-brand-slate-500 text-[11px]">
              <span>Costo Producción (COGS):</span>
              <span>${Math.round(cogs).toLocaleString("es-AR")}</span>
            </div>
            <div className="pt-1.5 border-t border-emerald-500/20 flex justify-between items-center">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <TrendUp size={14} weight="bold" /> Ganancia Estimada:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-300 text-sm">
                  +${Math.round(profit).toLocaleString("es-AR")}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {marginPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Botón de Confirmación */}
          <button
            type="submit"
            className="w-full mt-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 text-sm tracking-wide cursor-pointer"
          >
            <ShoppingCart size={18} weight="bold" />
            AGREGAR {qty}g AL TICKET (${subtotal.toLocaleString("es-AR")})
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
