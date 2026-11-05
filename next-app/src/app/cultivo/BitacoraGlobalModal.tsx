"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Drop,
  Bug,
  FloppyDisk,
  Info,
  Plus,
  Trash,
  Lightning,
  Leaf,
  Flask
} from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import {
  getInsumoOrigin,
  getDoseUomForInsumo,
  calcTotalStockFromDose,
  calcDoseFromTotalStock,
  buildFertigationDescription,
  insertAgronomicEventsSafe,
  RecipeItemApplied
} from "../../lib/agronomy/fertigationUtils";

interface FertRowInput {
  productName: string;
  dosePerLiter: string;
  totalAmount: string;
}

export function BitacoraGlobalModal({
  room,
  batches,
  onClose,
  onRefreshBatches
}: {
  room: any;
  batches: any[];
  onClose: () => void;
  onRefreshBatches: () => void;
}) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [actionType, setActionType] = useState<"riego" | "ipm" | "poda" | "alerta">("riego");

  // Estados de Dilución en Agua y Nutrición Mineral / Orgánica
  const [waterLiters, setWaterLiters] = useState<string>("");
  const [fertRows, setFertRows] = useState<FertRowInput[]>([
    { productName: "", dosePerLiter: "", totalAmount: "" }
  ]);
  const [phWater, setPhWater] = useState<string>("");
  const [ecWater, setEcWater] = useState<string>("");
  const [ecUnit, setEcUnit] = useState<"mS/cm" | "µS/cm" | "ppm">("mS/cm");

  const [desc, setDesc] = useState("");
  const [podaType, setPodaType] = useState("Defoliación Baja");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase
      .from("core_inventory_quimicos")
      .select("*")
      .order("name");
    if (data) setInventory(data);
  };

  const activeBatches = batches.filter(b => {
    const st = (b.stage || "").toLowerCase();
    return st !== "finalizado" && st !== "cosecha seca";
  });

  const groupedInventory = useMemo(() => {
    let localDoses: Record<string, number> = {};
    if (typeof window !== "undefined") {
      try {
        localDoses = JSON.parse(localStorage.getItem("crm_insumo_recommended_doses") || "{}");
      } catch {}
    }

    return Array.from(
      inventory.reduce((acc: Map<string, any>, item: any) => {
        const key = (item.name || "").trim();
        if (!key) return acc;
        const origin = getInsumoOrigin(item);
        const recDose = item.recommended_dose ?? localDoses[key.toLowerCase()] ?? null;
        if (!acc.has(key)) {
          acc.set(key, { ...item, origin_type: origin, recommended_dose: recDose });
        } else {
          const existing = acc.get(key);
          existing.qty += item.qty;
          if (origin === "mineral") existing.origin_type = "mineral";
          if (recDose) existing.recommended_dose = recDose;
        }
        return acc;
      }, new Map<string, any>()).values()
    )
      .filter((i: any) => i.qty > 0)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [inventory]);

  const getProductMeta = (productName: string): any => {
    return groupedInventory.find((i: any) => i.name === productName) || null;
  };

  const hasMineralSelected = useMemo(() => {
    return fertRows.some(r => {
      if (!r.productName) return false;
      const meta = getProductMeta(r.productName);
      return meta && (getInsumoOrigin(meta) === "mineral" || meta.uom === "gr" || meta.uom === "Kg");
    });
  }, [fertRows, groupedInventory]);

  const handleWaterLitersChange = (val: string) => {
    setWaterLiters(val);
    const litersNum = parseFloat(val) || 0;
    if (litersNum > 0) {
      setFertRows(prev =>
        prev.map(row => {
          const doseNum = parseFloat(row.dosePerLiter) || 0;
          if (row.productName && doseNum > 0) {
            const meta = getProductMeta(row.productName);
            const total = calcTotalStockFromDose(litersNum, doseNum, meta?.uom);
            return { ...row, totalAmount: total > 0 ? String(total) : row.totalAmount };
          }
          return row;
        })
      );
    }
  };

  const handleProductChange = (idx: number, prodName: string) => {
    const meta = getProductMeta(prodName);
    const litersNum = parseFloat(waterLiters) || 0;
    const recDose = meta?.recommended_dose ? String(meta.recommended_dose) : "";

    setFertRows(prev =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (!prodName) return { productName: "", dosePerLiter: "", totalAmount: "" };
        const newDose = recDose || row.dosePerLiter;
        const doseToUse = parseFloat(newDose) || 0;
        const newTotal =
          litersNum > 0 && doseToUse > 0
            ? String(calcTotalStockFromDose(litersNum, doseToUse, meta?.uom))
            : row.totalAmount;
        return { productName: prodName, dosePerLiter: newDose, totalAmount: newTotal };
      })
    );
  };

  const handleDoseChange = (idx: number, doseVal: string) => {
    const litersNum = parseFloat(waterLiters) || 0;
    const doseNum = parseFloat(doseVal) || 0;

    setFertRows(prev =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const meta = getProductMeta(row.productName);
        const computedTotal =
          litersNum > 0 && doseNum > 0
            ? String(calcTotalStockFromDose(litersNum, doseNum, meta?.uom))
            : doseVal === ""
            ? ""
            : row.totalAmount;
        return { ...row, dosePerLiter: doseVal, totalAmount: computedTotal };
      })
    );
  };

  const handleTotalAmountChange = (idx: number, totalVal: string) => {
    const litersNum = parseFloat(waterLiters) || 0;
    const totalNum = parseFloat(totalVal) || 0;

    setFertRows(prev =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const meta = getProductMeta(row.productName);
        const computedDose =
          litersNum > 0 && totalNum > 0
            ? String(calcDoseFromTotalStock(litersNum, totalNum, meta?.uom))
            : row.dosePerLiter;
        return { ...row, totalAmount: totalVal, dosePerLiter: computedDose };
      })
    );
  };

  const addFertRow = () => {
    setFertRows(prev => [...prev, { productName: "", dosePerLiter: "", totalAmount: "" }]);
  };

  const removeFertRow = (idx: number) => {
    setFertRows(prev => (prev.length <= 1 ? [{ productName: "", dosePerLiter: "", totalAmount: "" }] : prev.filter((_, i) => i !== idx)));
  };

  const handleCreateGlobalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (activeBatches.length === 0) {
      alert("No hay lotes activos en esta sala para distribuir la aplicación (los lotes finalizados no reciben insumos).");
      setIsSubmitting(false);
      return;
    }

    let finalDescGlobal = desc;
    let finalCostTotal = 0;
    const splitFactor = activeBatches.length;

    let selectedProductIdForEvent: string | null = null;
    let totalAmountExtracted = 0;
    let primaryDosePerLiter: number | null = null;
    let primaryDoseUom: string | null = null;
    const perBatchRecipeItems: RecipeItemApplied[] = [];

    const waterLitersTotal = parseFloat(waterLiters) || 0;
    const waterLitersPerBatch = waterLitersTotal > 0 ? Number((waterLitersTotal / splitFactor).toFixed(2)) : 0;
    const phWaterNum = phWater !== "" ? parseFloat(phWater) : null;
    const ecWaterNum = ecWater !== "" ? parseFloat(ecWater) : null;

    const updatedInv = inventory.map(i => ({ ...i }));

    if (actionType === "riego" || actionType === "ipm") {
      const activeRows = fertRows.filter(r => r.productName.trim() !== "");

      // 1. Validar stock total
      for (const row of activeRows) {
        const matchingItems = updatedInv
          .filter(i => i.name === row.productName)
          .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

        if (matchingItems.length === 0) {
          alert(`Producto "${row.productName}" no encontrado en inventario.`);
          setIsSubmitting(false);
          return;
        }

        const uom = matchingItems[0]?.uom || "gr";
        const doseNum = parseFloat(row.dosePerLiter) || 0;
        let reqAmount = parseFloat(row.totalAmount) || 0;
        if (reqAmount <= 0 && waterLitersTotal > 0 && doseNum > 0) {
          reqAmount = calcTotalStockFromDose(waterLitersTotal, doseNum, uom);
        }

        if (reqAmount <= 0) {
          alert(`Ingresá una cantidad mayor a 0 para "${row.productName}".`);
          setIsSubmitting(false);
          return;
        }

        const totalStock = matchingItems.reduce((sum, i) => sum + i.qty, 0);
        if (reqAmount > totalStock) {
          alert(`Stock Insuficiente para "${row.productName}". Requerís ${reqAmount} ${uom} pero hay ${Number(totalStock.toFixed(2))} ${uom} disponibles.`);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Descontar FIFO del inventario global
      for (const row of activeRows) {
        const matchingItems = updatedInv
          .filter(i => i.name === row.productName)
          .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

        const uom = matchingItems[0]?.uom || "gr";
        const origin = getInsumoOrigin(matchingItems[0]);
        const doseUom = getDoseUomForInsumo(uom);
        const doseNum = parseFloat(row.dosePerLiter) || 0;
        let reqAmount = parseFloat(row.totalAmount) || 0;
        if (reqAmount <= 0 && waterLitersTotal > 0 && doseNum > 0) {
          reqAmount = calcTotalStockFromDose(waterLitersTotal, doseNum, uom);
        }
        const effectiveDose =
          doseNum > 0
            ? doseNum
            : waterLitersTotal > 0
            ? calcDoseFromTotalStock(waterLitersTotal, reqAmount, uom)
            : 0;

        let remainingReq = reqAmount;
        let calculatedCost = 0;
        let lastConsumedItemId = matchingItems[0].id;

        for (const item of matchingItems) {
          if (remainingReq <= 0) break;
          if (item.qty <= 0) continue;

          const consume = Number(Math.min(remainingReq, item.qty).toFixed(4));
          calculatedCost += parseFloat(item.unit_cost || 0) * consume;

          const newQty = Number((item.qty - consume).toFixed(4));
          await supabase.from("core_inventory_quimicos").update({ qty: newQty }).eq("id", item.id);

          item.qty = newQty;
          remainingReq = Number((remainingReq - consume).toFixed(4));
          lastConsumedItemId = item.id;
        }

        finalCostTotal += calculatedCost;
        totalAmountExtracted += reqAmount;
        if (!selectedProductIdForEvent) selectedProductIdForEvent = lastConsumedItemId;
        if (primaryDosePerLiter === null && effectiveDose > 0) {
          primaryDosePerLiter = effectiveDose;
          primaryDoseUom = doseUom;
        }

        perBatchRecipeItems.push({
          product_name: row.productName,
          product_id: lastConsumedItemId,
          origin_type: origin,
          uom,
          dose_per_liter: effectiveDose,
          dose_uom: doseUom,
          amount_applied: Number((reqAmount / splitFactor).toFixed(2)),
          cost: Number((calculatedCost / splitFactor).toFixed(2))
        });
      }

      finalDescGlobal = buildFertigationDescription({
        actionType,
        waterLiters: waterLitersPerBatch > 0 ? waterLitersPerBatch : null,
        phWater: phWaterNum,
        ecWater: ecWaterNum,
        ecUnit,
        recipeItems: perBatchRecipeItems,
        notes: desc,
        perBatchSuffix: true
      });
    } else if (actionType === "poda") {
      finalDescGlobal = `PODA: ${podaType}. ` + desc;
    } else if (actionType === "alerta") {
      finalDescGlobal = `⚠️ EVENTO/PLAGA: ` + desc;
    }

    const costPerBatch = Number((finalCostTotal / splitFactor).toFixed(2));
    const amountPerBatch =
      totalAmountExtracted > 0 ? Number((totalAmountExtracted / splitFactor).toFixed(2)) : null;

    const eventsToInsert = activeBatches.map(batch => ({
      batch_id: batch.id,
      room_id: room.id,
      event_type: actionType === "riego" ? "Riego" : actionType === "ipm" ? "IPM" : actionType,
      water_liters: waterLitersPerBatch,
      amount_applied: (actionType === "riego" || actionType === "ipm") ? amountPerBatch : null,
      product_id: (actionType === "riego" || actionType === "ipm") ? selectedProductIdForEvent : null,
      total_cost: costPerBatch,
      description: finalDescGlobal,
      dosage_per_liter: primaryDosePerLiter,
      dosage_uom: primaryDoseUom,
      ph_water: phWaterNum,
      ec_water: ecWaterNum,
      ec_unit: ecUnit,
      recipe_items: perBatchRecipeItems.length > 0 ? perBatchRecipeItems : null,
      date_occurred: new Date().toISOString()
    }));

    const { error } = await insertAgronomicEventsSafe(supabase, eventsToInsert);

    if (!error) {
      alert(
        `✅ Aplicación global exitosa. Solución distribuida en ${splitFactor} lotes activos. Costo p/lote: $${costPerBatch.toFixed(2)}`
      );
      onRefreshBatches();
      onClose();
    } else {
      alert("Error insertando registros masivos: " + error.message);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-panel-base border border-emerald-500/50 w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col slide-in-from-bottom-5 duration-300 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        {/* Header */}
        <div className="p-5 border-b border-panel-border bg-emerald-500/5 flex justify-between items-center relative">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-500">
              Aplicación Global Distribuida (Fertirriego / Sala)
            </h2>
            <p className="text-sm font-mono text-brand-slate-600 mt-1">Sala: {room.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-brand-slate-600 hover:text-foreground transition-colors bg-black/[0.08] dark:bg-black/40 p-2 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col relative z-10">
          <div className="flex bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl mb-5 items-start gap-3">
            <Info size={22} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-100/80 leading-relaxed font-mono">
              Esta operación distribuirá el agua, los gramos/ml de fertilizante y los costos entre los{" "}
              <strong className="text-blue-400 text-sm mx-1">{activeBatches.length} lotes activos</strong> de esta sala, manteniendo la concentración (g/L), el pH y la EC en el historial de cada lote.
              {activeBatches.length > 0 && (
                <div className="mt-1.5 text-[11px] text-blue-300">
                  Lotes receptores: <span className="font-bold text-white">{activeBatches.map(b => b.id).join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              onClick={() => setActionType("riego")}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                actionType === "riego"
                  ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  : "bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-blue-500/50"
              }`}
            >
              <Drop size={24} weight={actionType === "riego" ? "fill" : "regular"} />
              <span className="text-xs font-bold uppercase tracking-wider">RIEGO / NUTRI MINERAL</span>
            </button>
            <button
              type="button"
              onClick={() => setActionType("ipm")}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                actionType === "ipm"
                  ? "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-red-500/50"
              }`}
            >
              <Bug size={24} weight={actionType === "ipm" ? "fill" : "regular"} />
              <span className="text-xs font-bold uppercase tracking-wider">IPM (Plagas)</span>
            </button>
          </div>

          <form onSubmit={handleCreateGlobalEvent} className="flex flex-col gap-4">
            {(actionType === "riego" || actionType === "ipm") && (
              <>
                {/* 1. Litros Totales del Tanque */}
                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold uppercase text-blue-400 flex items-center gap-1.5">
                      <Drop size={15} weight="fill" /> Volumen Total de Agua Preparado (Tanque)
                    </label>
                    {parseFloat(waterLiters) > 0 && activeBatches.length > 0 && (
                      <span className="text-[10px] font-mono text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/30">
                        {(parseFloat(waterLiters) / activeBatches.length).toFixed(1)} L por lote
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={waterLiters}
                      onChange={e => handleWaterLitersChange(e.target.value)}
                      placeholder="Ej: 40 (Litros totales del tanque de riego)"
                      className="w-full bg-black/20 border border-blue-500/30 rounded-lg p-2.5 pr-12 text-sm font-mono text-foreground focus:border-blue-400 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-blue-400">
                      Litros
                    </span>
                  </div>
                </div>

                {/* 2. Insumos y Calculadora g/L */}
                <div className="bg-black/[0.02] dark:bg-black/20 border border-panel-border/50 p-4 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase font-bold text-brand-slate-600 flex items-center gap-1.5">
                      <Flask size={15} className="text-cyan-400" /> Insumos Diluidos (Bodega Principal)
                    </label>
                    <button
                      type="button"
                      onClick={addFertRow}
                      className="text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20"
                    >
                      <Plus size={12} weight="bold" /> + Agregar Sal / Insumo
                    </button>
                  </div>

                  {fertRows.map((row, idx) => {
                    const meta = getProductMeta(row.productName);
                    const origin = meta ? getInsumoOrigin(meta) : "organico";
                    const uom = meta?.uom || "gr";
                    const doseUom = getDoseUomForInsumo(uom);
                    const isMineral = origin === "mineral" || uom === "gr" || uom === "Kg";

                    return (
                      <div key={idx} className="p-3 rounded-lg border border-panel-border/60 bg-black/20 flex flex-col gap-2.5">
                        <div className="flex items-center gap-2">
                          <select
                            value={row.productName}
                            onChange={e => handleProductChange(idx, e.target.value)}
                            className="flex-1 bg-panel-base border border-panel-border rounded-lg p-2.5 text-xs font-mono focus:border-emerald-500 outline-none truncate"
                          >
                            <option value="">
                              {idx === 0
                                ? actionType === "riego"
                                  ? "— Sólo Agua (Sin Costo) —"
                                  : "— Acción Física (Sin Producto) —"
                                : "— Seleccionar otro insumo —"}
                            </option>
                            {groupedInventory.map((item: any) => {
                              const itemOrigin = getInsumoOrigin(item);
                              const tag = itemOrigin === "mineral" ? "⚡ MINERAL" : itemOrigin === "organico" ? "🌿 ORG" : "📦";
                              return (
                                <option key={item.name} value={item.name}>
                                  [{tag}] {item.name} | Disp: {Number(item.qty.toFixed(2))} {item.uom || "gr"} (${item.unit_cost}/{item.uom || "u"})
                                </option>
                              );
                            })}
                          </select>
                          {fertRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFertRow(idx)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/20"
                            >
                              <Trash size={15} />
                            </button>
                          )}
                        </div>

                        {row.productName && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[10px] font-mono uppercase text-cyan-400 block mb-1 font-bold">
                                Concentración ({doseUom})
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={row.dosePerLiter}
                                  onChange={e => handleDoseChange(idx, e.target.value)}
                                  placeholder={isMineral ? "Ej: 1.5" : "Ej: 2.0"}
                                  className="w-full bg-panel-base border border-cyan-500/40 rounded-lg p-2 pr-11 text-sm font-mono text-cyan-300 outline-none"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-cyan-400">
                                  {doseUom}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-mono uppercase text-emerald-400 block mb-1 font-bold">
                                Total Bruto Extraído ({uom}) *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  value={row.totalAmount}
                                  onChange={e => handleTotalAmountChange(idx, e.target.value)}
                                  placeholder="Ej: 60"
                                  className="w-full bg-panel-base border border-emerald-500/40 rounded-lg p-2 pr-10 text-sm font-mono text-emerald-400 font-bold outline-none"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-emerald-400">
                                  {uom}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 3. pH y EC del Tanque */}
                <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-purple-300 font-bold block mb-1">
                      pH Solución Tanque {hasMineralSelected ? "*" : ""}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="14"
                      required={hasMineralSelected}
                      value={phWater}
                      onChange={e => setPhWater(e.target.value)}
                      placeholder="Ej: 5.9"
                      className="w-full bg-black/25 border border-purple-500/40 rounded-lg p-2.5 text-sm font-mono text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-purple-300 font-bold block mb-1">
                      EC Solución Tanque {hasMineralSelected ? "*" : ""}
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required={hasMineralSelected}
                        value={ecWater}
                        onChange={e => setEcWater(e.target.value)}
                        placeholder="Ej: 1.5"
                        className="w-full bg-black/25 border border-purple-500/40 rounded-lg p-2.5 text-sm font-mono text-foreground outline-none"
                      />
                      <select
                        value={ecUnit}
                        onChange={e => setEcUnit(e.target.value as any)}
                        className="bg-black/40 border border-purple-500/30 rounded-lg px-2 text-[11px] font-mono text-purple-300 outline-none"
                      >
                        <option value="mS/cm">mS/cm</option>
                        <option value="µS/cm">µS/cm</option>
                        <option value="ppm">ppm</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs uppercase font-bold text-brand-slate-600 mb-1.5 block">
                Observaciones Históricas (Opcional)
              </label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                placeholder="Comentarios que se replicarán en el historial de todos los lotes..."
                className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2.5 text-sm focus:border-emerald-500 outline-none resize-none font-mono"
              ></textarea>
            </div>

            <button
              disabled={isSubmitting || activeBatches.length === 0}
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 mt-1 uppercase tracking-widest text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {isSubmitting ? (
                "Procesando Nodos..."
              ) : (
                <>
                  <FloppyDisk size={20} /> Confirmar Aplicación Masiva
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
