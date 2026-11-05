"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Sparkle as Sparkles } from "@phosphor-icons/react";
import {
  X,
  Drop,
  Bug,
  Scissors,
  ClockCounterClockwise,
  FloppyDisk,
  Warning,
  PencilSimple,
  Trash,
  Plus,
  Lightning,
  Leaf,
  Flask,
  CaretDown,
  CaretUp,
  Sun
} from "@phosphor-icons/react";
import { supabase } from "../../lib/supabase";
import {
  getInsumoOrigin,
  getDoseUomForInsumo,
  calcTotalStockFromDose,
  calcDoseFromTotalStock,
  buildFertigationDescription,
  parseEventFertigationMetrics,
  insertAgronomicEventsSafe,
  updateAgronomicEventSafe,
  RecipeItemApplied
} from "../../lib/agronomy/fertigationUtils";
import {
  FertilizationPlan,
  RED_HOT_COOKIES_FEEDING_PLAN,
  loadFertilizationPlans,
  getBatchPlanAssignment,
  updateBatchPlanAssignment,
  resolveBatchActivePlanWeek,
  evaluateVisionPlanCorrelation,
  matchPlanProductToInventory,
  checkRecipeCompatibilityWarnings,
  PlanNutrientDose
} from "../../lib/agronomy/fertilizationPlanEngine";
import { FertilizationPlanModal } from "./FertilizationPlanModal";

interface FertRowInput {
  productName: string;
  dosePerLiter: string; // g/L o ml/L
  totalAmount: string;  // gr o ml totales a descontar de bodega
}

export function BitacoraModal({ batch, onClose }: { batch: any; onClose: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [actionType, setActionType] = useState<"riego" | "ipm" | "poda" | "alerta" | "cosecha_humeda">("riego");

  // Estados de Dilución en Agua y Nutrición Mineral / Orgánica
  const [waterLiters, setWaterLiters] = useState<string>("");
  const [fertRows, setFertRows] = useState<FertRowInput[]>([
    { productName: "", dosePerLiter: "", totalAmount: "" }
  ]);

  // Parámetros Fisicoquímicos de la Solución (pH, EC y PPM)
  const [phWater, setPhWater] = useState<string>("");
  const [ecWater, setEcWater] = useState<string>("");
  const [ecUnit, setEcUnit] = useState<"mS/cm" | "µS/cm" | "ppm">("mS/cm");
  const [ppmWater, setPpmWater] = useState<string>("");
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState<boolean>(false);
  const [ecWaterBase, setEcWaterBase] = useState<string>("");
  const [phRunoff, setPhRunoff] = useState<string>("");
  const [ecRunoff, setEcRunoff] = useState<string>("");
  const [ppmRunoff, setPpmRunoff] = useState<string>("");

  // Otros estados del formulario
  const [desc, setDesc] = useState("");
  const [podaType, setPodaType] = useState("Defoliación Baja");
  const [harvestCutName, setHarvestCutName] = useState("Tanda 1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de Edición
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingOldEvent, setEditingOldEvent] = useState<any | null>(null);

  // Estados del Plan de Fertilización y Correlación con Visión IA
  const [plans, setPlans] = useState<FertilizationPlan[]>([RED_HOT_COOKIES_FEEDING_PLAN]);
  const initialPlanAssign = getBatchPlanAssignment(batch);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanAssign.planId);
  const [planWeekOffset, setPlanWeekOffset] = useState<number>(initialPlanAssign.weekOffset);
  const [planSyncMode, setPlanSyncMode] = useState<"biological_cycles" | "calendar_days">(initialPlanAssign.syncMode);
  const [latestVisionAnalysis, setLatestVisionAnalysis] = useState<any | null>(null);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [openPlanInEditMode, setOpenPlanInEditMode] = useState<boolean>(false);

  useEffect(() => {
    fetchEvents();
    fetchInventory();
    loadFertilizationPlans(supabase).then(list => {
      if (list.length > 0) setPlans(list);
      const refreshed = getBatchPlanAssignment(batch);
      setSelectedPlanId(refreshed.planId);
      setPlanWeekOffset(refreshed.weekOffset);
      setPlanSyncMode(refreshed.syncMode);
    });
    supabase
      .from("core_image_analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }: { data: any }) => {
        if (data && data.length > 0) {
          const matched = data.find((a: any) => a.batch_id === batch.id) || data[0];
          setLatestVisionAnalysis(matched);
        }
      });
  }, [batch]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    const { data } = await supabase
      .from("core_agronomic_events")
      .select("*")
      .eq("batch_id", batch.id)
      .order("date_occurred", { ascending: false });
    if (data) setEvents(data);
    setLoadingEvents(false);
  };

  const fetchInventory = async () => {
    const { data } = await supabase
      .from("core_inventory_quimicos")
      .select("*")
      .order("name");
    if (data) setInventory(data);
  };

  // Agrupar inventario por nombre comercial con su stock combinado y origen
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
          acc.set(key, {
            ...item,
            origin_type: origin,
            recommended_dose: recDose
          });
        } else {
          const existing = acc.get(key);
          existing.qty += item.qty;
          if (origin === "mineral") existing.origin_type = "mineral";
          if (recDose) existing.recommended_dose = recDose;
        }
        return acc;
      }, new Map()).values()
    )
      .filter((i: any) => i.qty > 0)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [inventory]);

  const getProductMeta = (productName: string) => {
    return groupedInventory.find((i: any) => i.name === productName) ||
      inventory.find((i: any) => i.name === productName) ||
      null;
  };

  // Verificar si alguno de los productos seleccionados es mineral
  const hasMineralSelected = useMemo(() => {
    return fertRows.some(r => {
      if (!r.productName) return false;
      const meta = getProductMeta(r.productName);
      return Boolean(meta && getInsumoOrigin(meta) === "mineral");
    });
  }, [fertRows, groupedInventory, inventory]);

  // Recalcular gramos/ml totales cuando cambian los litros de agua
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

  // Cambiar producto en una fila de mezcla
  const handleProductChange = (idx: number, prodName: string) => {
    const meta = getProductMeta(prodName);
    const litersNum = parseFloat(waterLiters) || 0;
    const recDose = meta?.recommended_dose ? String(meta.recommended_dose) : "";
    const recDoseNum = parseFloat(recDose) || 0;

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
        return {
          productName: prodName,
          dosePerLiter: newDose,
          totalAmount: newTotal
        };
      })
    );
  };

  // Cambiar dosis (g/L o ml/L) en una fila -> calcula automáticamente gramos/ml totales
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
        return {
          ...row,
          dosePerLiter: doseVal,
          totalAmount: computedTotal
        };
      })
    );
  };

  // Cambiar gramos/ml totales directamente -> calcula automáticamente la concentración (g/L o ml/L)
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
        return {
          ...row,
          totalAmount: totalVal,
          dosePerLiter: computedDose
        };
      })
    );
  };

  const addFertRow = () => {
    setFertRows(prev => [...prev, { productName: "", dosePerLiter: "", totalAmount: "" }]);
  };

  const removeFertRow = (idx: number) => {
    setFertRows(prev => (prev.length <= 1 ? [{ productName: "", dosePerLiter: "", totalAmount: "" }] : prev.filter((_, i) => i !== idx)));
  };

  // Restaurar stock de un evento anterior (cuando se edita o elimina)
  const restoreStockFromEvent = async (ev: any, invList: any[]) => {
    const parsed = parseEventFertigationMetrics(ev);
    if (parsed.recipe_items && parsed.recipe_items.length > 0) {
      for (const rItem of parsed.recipe_items) {
        if (rItem.consumed_batches && rItem.consumed_batches.length > 0) {
          for (const cb of rItem.consumed_batches) {
            const target = invList.find(i => i.id === cb.id);
            if (target) {
              const newQty = Number((target.qty + cb.qty).toFixed(4));
              await supabase.from("core_inventory_quimicos").update({ qty: newQty }).eq("id", target.id);
              target.qty = newQty;
            }
          }
        } else if (rItem.product_name && rItem.amount_applied > 0) {
          const target = invList.find(i => i.id === rItem.product_id) || invList.find(i => i.name === rItem.product_name);
          if (target) {
            const newQty = Number((target.qty + rItem.amount_applied).toFixed(4));
            await supabase.from("core_inventory_quimicos").update({ qty: newQty }).eq("id", target.id);
            target.qty = newQty;
          }
        }
      }
    } else if (ev.product_id && ev.amount_applied > 0) {
      const oldItem = invList.find(i => i.id === ev.product_id);
      if (oldItem) {
        const newQty = Number((oldItem.qty + ev.amount_applied).toFixed(4));
        await supabase.from("core_inventory_quimicos").update({ qty: newQty }).eq("id", oldItem.id);
        oldItem.qty = newQty;
      }
    }
  };

  const handleEditClick = (ev: any) => {
    const et = (ev.event_type || "").toLowerCase();
    const parsed = parseEventFertigationMetrics(ev);

    if (et.includes("cosecha")) {
      setActionType("cosecha_humeda");
      const cutMatch = ev.description?.match(/COSECHA HÚMEDA: (.*?)\./);
      if (cutMatch && cutMatch[1]) setHarvestCutName(cutMatch[1]);
    } else {
      setActionType(
        et === "riego" || et === "nutricion"
          ? "riego"
          : et === "ipm"
          ? "ipm"
          : et === "alerta"
          ? "alerta"
          : "poda"
      );
    }

    setWaterLiters(parsed.water_liters ? String(parsed.water_liters) : "");
    setPhWater(parsed.ph_water !== null ? String(parsed.ph_water) : "");
    setEcWater(parsed.ec_water !== null ? String(parsed.ec_water) : "");
    setEcUnit(parsed.ec_unit || "mS/cm");
    setPpmWater(parsed.ppm_water !== null ? String(parsed.ppm_water) : "");
    setEcWaterBase(parsed.ec_water_base !== null ? String(parsed.ec_water_base) : "");
    setPhRunoff(parsed.ph_runoff !== null ? String(parsed.ph_runoff) : "");
    setEcRunoff(parsed.ec_runoff !== null ? String(parsed.ec_runoff) : "");
    setPpmRunoff(parsed.ppm_runoff !== null ? String(parsed.ppm_runoff) : "");
    setShowAdvancedMetrics(
      parsed.ec_water_base !== null || parsed.ph_runoff !== null || parsed.ec_runoff !== null || parsed.ppm_runoff !== null
    );

    if (parsed.recipe_items.length > 0) {
      setFertRows(
        parsed.recipe_items.map(ri => ({
          productName: ri.product_name,
          dosePerLiter: ri.dose_per_liter > 0 ? String(ri.dose_per_liter) : "",
          totalAmount: ri.amount_applied > 0 ? String(ri.amount_applied) : ""
        }))
      );
    } else if (ev.product_id) {
      const prodObj = inventory.find(i => i.id === ev.product_id);
      setFertRows([
        {
          productName: prodObj?.name || "",
          dosePerLiter: parsed.dosage_per_liter ? String(parsed.dosage_per_liter) : "",
          totalAmount: ev.amount_applied ? String(ev.amount_applied) : ""
        }
      ]);
    } else {
      setFertRows([{ productName: "", dosePerLiter: "", totalAmount: "" }]);
    }

    setDesc(parsed.raw_notes || "");

    if (et === "poda") {
      const podaMatch = ev.description?.match(/PODA: (.*?)\./);
      if (podaMatch && podaMatch[1]) setPodaType(podaMatch[1]);
    }

    setEditingEventId(ev.id);
    setEditingOldEvent(ev);
  };

  const handleDeleteEvent = async (ev: any) => {
    if (!window.confirm("¿Seguro que querés eliminar este registro? La cantidad de insumo se restaurará al inventario (si aplica).")) return;

    const updatedInv = [...inventory];
    await restoreStockFromEvent(ev, updatedInv);

    await supabase.from("core_agronomic_events").delete().eq("id", ev.id);
    await fetchEvents();
    await fetchInventory();
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setEditingOldEvent(null);
    setDesc("");
    setWaterLiters("");
    setFertRows([{ productName: "", dosePerLiter: "", totalAmount: "" }]);
    setPhWater("");
    setEcWater("");
    setPpmWater("");
    setEcWaterBase("");
    setPhRunoff("");
    setEcRunoff("");
    setPpmRunoff("");
    setShowAdvancedMetrics(false);
    setHarvestCutName("Tanda 1");
    setActionType("riego");
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalDesc = desc;
    let finalCost = 0;
    const updatedInv = inventory.map(i => ({ ...i }));

    // Si estamos editando, restauramos primero el stock previo
    if (editingEventId && editingOldEvent) {
      await restoreStockFromEvent(editingOldEvent, updatedInv);
    }

    let selectedProductIdForEvent: string | null = null;
    let totalAmountForEvent: number | null = null;
    let primaryDosePerLiter: number | null = null;
    let primaryDoseUom: string | null = null;
    const appliedRecipeItems: RecipeItemApplied[] = [];

    const waterLitersNum = parseFloat(waterLiters) || 0;
    const phWaterNum = hasMineralSelected && phWater !== "" ? parseFloat(phWater) : null;
    const ecWaterNum = hasMineralSelected && ecWater !== "" ? parseFloat(ecWater) : null;
    const ppmWaterNum = hasMineralSelected && ppmWater !== "" ? parseFloat(ppmWater) : null;
    const ecBaseNum = hasMineralSelected && ecWaterBase !== "" ? parseFloat(ecWaterBase) : null;
    const phRunoffNum = hasMineralSelected && phRunoff !== "" ? parseFloat(phRunoff) : null;
    const ecRunoffNum = hasMineralSelected && ecRunoff !== "" ? parseFloat(ecRunoff) : null;
    const ppmRunoffNum = hasMineralSelected && ppmRunoff !== "" ? parseFloat(ppmRunoff) : null;

    if (actionType === "riego" || actionType === "ipm") {
      const activeRows = fertRows.filter(r => r.productName.trim() !== "");

      // 1. Validar stock de todas las filas antes de descontar nada
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
        if (reqAmount <= 0 && waterLitersNum > 0 && doseNum > 0) {
          reqAmount = calcTotalStockFromDose(waterLitersNum, doseNum, uom);
        }

        if (reqAmount <= 0) {
          alert(`Ingresá los gramos/ml o la dosis en g/L junto a los litros de agua para "${row.productName}".`);
          setIsSubmitting(false);
          return;
        }

        const totalStock = matchingItems.reduce((sum, i) => sum + i.qty, 0);
        if (reqAmount > totalStock) {
          alert(
            `Stock Insuficiente para "${row.productName}". Requerís ${reqAmount} ${uom} pero el total disponible en Bodega es ${Number(totalStock.toFixed(2))} ${uom}.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Descontar FIFO y construir el detalle de receta
      for (const row of activeRows) {
        const matchingItems = updatedInv
          .filter(i => i.name === row.productName)
          .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

        const uom = matchingItems[0]?.uom || "gr";
        const origin = getInsumoOrigin(matchingItems[0]);
        const doseUom = getDoseUomForInsumo(uom);
        const doseNum = parseFloat(row.dosePerLiter) || 0;
        let reqAmount = parseFloat(row.totalAmount) || 0;
        if (reqAmount <= 0 && waterLitersNum > 0 && doseNum > 0) {
          reqAmount = calcTotalStockFromDose(waterLitersNum, doseNum, uom);
        }
        const effectiveDose =
          doseNum > 0
            ? doseNum
            : waterLitersNum > 0
            ? calcDoseFromTotalStock(waterLitersNum, reqAmount, uom)
            : 0;

        let remainingReq = reqAmount;
        let itemCost = 0;
        let lastConsumedItemId = matchingItems[0].id;
        const consumedBatches: Array<{ id: string; qty: number }> = [];

        for (const item of matchingItems) {
          if (remainingReq <= 0) break;
          if (item.qty <= 0) continue;

          const consume = Number(Math.min(remainingReq, item.qty).toFixed(4));
          itemCost += parseFloat(item.unit_cost || 0) * consume;

          const newQty = Number((item.qty - consume).toFixed(4));
          await supabase.from("core_inventory_quimicos").update({ qty: newQty }).eq("id", item.id);

          item.qty = newQty;
          remainingReq = Number((remainingReq - consume).toFixed(4));
          lastConsumedItemId = item.id;
          consumedBatches.push({ id: item.id, qty: consume });
        }

        finalCost += itemCost;
        if (!selectedProductIdForEvent) selectedProductIdForEvent = lastConsumedItemId;
        totalAmountForEvent = (totalAmountForEvent || 0) + reqAmount;
        if (primaryDosePerLiter === null && effectiveDose > 0) {
          primaryDosePerLiter = effectiveDose;
          primaryDoseUom = doseUom;
        }

        appliedRecipeItems.push({
          product_name: row.productName,
          product_id: lastConsumedItemId,
          origin_type: origin,
          uom,
          dose_per_liter: effectiveDose,
          dose_uom: doseUom,
          amount_applied: reqAmount,
          cost: Number(itemCost.toFixed(2)),
          consumed_batches: consumedBatches
        });
      }

      finalDesc = buildFertigationDescription({
        actionType,
        waterLiters: waterLitersNum > 0 ? waterLitersNum : null,
        phWater: phWaterNum,
        ecWater: ecWaterNum,
        ecUnit,
        ppmWater: ppmWaterNum,
        ecWaterBase: ecBaseNum,
        phRunoff: phRunoffNum,
        ecRunoff: ecRunoffNum,
        ppmRunoff: ppmRunoffNum,
        recipeItems: appliedRecipeItems,
        notes: desc
      });
    } else if (actionType === "poda") {
      finalDesc = `PODA: ${podaType}. ` + desc;
    } else if (actionType === "alerta") {
      finalDesc = `⚠️ EVENTO/PLAGA: ` + desc;
    } else if (actionType === "cosecha_humeda") {
      finalDesc =
        `COSECHA HÚMEDA: ${harvestCutName || "Tanda"}. ` +
        (desc ? desc : "Corte en verde registrado previo al secado.");
    }

    const payload: any = {
      batch_id: batch.id,
      room_id: batch.location || batch.room_id,
      event_type:
        actionType === "riego"
          ? "Riego"
          : actionType === "ipm"
          ? "IPM"
          : actionType === "cosecha_humeda"
          ? "Cosecha Húmeda"
          : actionType,
      water_liters: (actionType === "riego" || actionType === "ipm") && waterLitersNum > 0 ? waterLitersNum : 0,
      amount_applied: (actionType === "riego" || actionType === "ipm") ? totalAmountForEvent : null,
      product_id: (actionType === "riego" || actionType === "ipm") ? selectedProductIdForEvent : null,
      total_cost: Number(finalCost.toFixed(2)),
      description: finalDesc,
      dosage_per_liter: primaryDosePerLiter,
      dosage_uom: primaryDoseUom,
      ph_water: phWaterNum,
      ec_water: ecWaterNum,
      ec_unit: ecUnit,
      ec_water_base: ecBaseNum,
      ph_runoff: phRunoffNum,
      ec_runoff: ecRunoffNum,
      recipe_items: appliedRecipeItems.length > 0 ? appliedRecipeItems : null
    };

    if (editingEventId) {
      const { error } = await updateAgronomicEventSafe(supabase, editingEventId, payload);
      if (!error) {
        cancelEdit();
        await fetchEvents();
        await fetchInventory();
      } else {
        alert("Error actualizando el registro: " + error.message);
      }
    } else {
      payload.date_occurred = new Date().toISOString();
      const { error } = await insertAgronomicEventsSafe(supabase, [payload]);
      if (!error) {
        cancelEdit();
        await fetchEvents();
        await fetchInventory();
      } else {
        alert("Error insertando el registro: " + error.message);
      }
    }

    setIsSubmitting(false);
  };

  // Evaluación rápida de rango pH, EC y PPM comparando contra la Semana Activa del Plan de Fertilización
  const activePlanObj = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId) || RED_HOT_COOKIES_FEEDING_PLAN;
  }, [plans, selectedPlanId]);

  const planResolution = useMemo(() => {
    return resolveBatchActivePlanWeek(batch, activePlanObj, events, {
      weekOffset: planWeekOffset,
      syncMode: planSyncMode
    });
  }, [batch, activePlanObj, events, planWeekOffset, planSyncMode]);

  const visionCorrelation = useMemo(() => {
    return evaluateVisionPlanCorrelation(planResolution, latestVisionAnalysis);
  }, [planResolution, latestVisionAnalysis]);

  const compatibilityCheck = useMemo(() => {
    return checkRecipeCompatibilityWarnings(fertRows.map(r => r.productName));
  }, [fertRows]);

  const applyPlanNutrientsToForm = (nutrients: PlanNutrientDose[], modeLabel: string) => {
    const targetLiters = parseFloat(waterLiters) > 0 ? parseFloat(waterLiters) : (activePlanObj.tank_reference_liters || 20);
    if (!waterLiters || parseFloat(waterLiters) <= 0) {
      setWaterLiters(String(targetLiters));
    }

    if (!nutrients || nutrients.length === 0) {
      setFertRows([{ productName: "", dosePerLiter: "", totalAmount: "" }]);
      setDesc(`Plan ${planResolution.activeWeek.label} (${modeLabel}): Sólo agua reposada.`);
      return;
    }

    const mappedRows: FertRowInput[] = nutrients.map(n => {
      const matchedName = matchPlanProductToInventory(n.product_name, groupedInventory.length > 0 ? groupedInventory : inventory);
      const meta = getProductMeta(matchedName);
      const total = calcTotalStockFromDose(targetLiters, n.dose, meta?.uom || (n.dose_uom === "g/L" ? "gr" : "ml"));
      return {
        productName: matchedName,
        dosePerLiter: String(n.dose),
        totalAmount: total > 0 ? String(total) : ""
      };
    });

    setFertRows(mappedRows);
    setDesc(`Plan ${planResolution.activeWeek.label} (${planResolution.activeWeek.phenology}) • ${modeLabel}.`);
  };

  const handleAdjustPlanOffset = async (delta: number) => {
    const nextOffset = planWeekOffset + delta;
    setPlanWeekOffset(nextOffset);
    await updateBatchPlanAssignment(supabase, batch.id, {
      planId: selectedPlanId,
      weekOffset: nextOffset,
      syncMode: planSyncMode
    });
  };

  const handlePlanSelectionChange = async (newPlanId: string) => {
    setSelectedPlanId(newPlanId);
    await updateBatchPlanAssignment(supabase, batch.id, {
      planId: newPlanId,
      weekOffset: planWeekOffset,
      syncMode: planSyncMode
    });
  };

  const phStatus = useMemo(() => {
    const val = parseFloat(phWater);
    if (isNaN(val)) return null;
    if (!selectedPlanId) {
      if (val >= 5.8 && val <= 6.2) {
        return {
          label: "✅ pH Óptimo de Asimilación (5.8–6.2)",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
        };
      }
      if (val >= 5.5 && val <= 6.5) {
        return {
          label: "⚠️ pH Aceptable (5.5–6.5)",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/30"
        };
      }
      return {
        label: "🚨 pH Fuera de rango seguro (Riesgo Bloqueo)",
        color: "text-red-400 bg-red-500/10 border-red-500/30"
      };
    }
    const minPh = planResolution.activeWeek.target_ph_min;
    const maxPh = planResolution.activeWeek.target_ph_max;
    const rangeTxt = minPh === maxPh ? `${minPh}` : `${minPh}–${maxPh}`;
    if (val >= minPh - 0.05 && val <= maxPh + 0.05) {
      return {
        label: `✅ En meta de ${planResolution.activeWeek.label} (Obj: pH ${rangeTxt})`,
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      };
    }
    if (val >= 5.5 && val <= 6.5) {
      return {
        label: `⚠️ Desviado de meta ${planResolution.activeWeek.label} (Obj: pH ${rangeTxt} vs Medido: ${val})`,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30"
      };
    }
    return {
      label: `🚨 Fuera de rango seguro (Riesgo Bloqueo • Obj ${planResolution.activeWeek.label}: pH ${rangeTxt})`,
      color: "text-red-400 bg-red-500/10 border-red-500/30"
    };
  }, [phWater, planResolution, selectedPlanId]);

  const ecPlanCompareStatus = useMemo(() => {
    if (!selectedPlanId) return null;
    const val = parseFloat(ecWater);
    if (isNaN(val) || ecUnit !== "mS/cm") return null;
    const minEc = planResolution.activeWeek.target_ec_min;
    const maxEc = planResolution.activeWeek.target_ec_max;
    const rangeTxt = minEc === maxEc ? `${minEc}` : `${minEc}–${maxEc}`;
    if (val >= minEc - 0.05 && val <= maxEc + 0.05) {
      return {
        label: `✅ EC dentro de meta ${planResolution.activeWeek.label} (${rangeTxt} mS/cm)`,
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      };
    }
    if (val > maxEc + 0.05) {
      return {
        label: `⬆️ EC +${(val - maxEc).toFixed(2)} mS/cm sobre meta de ${planResolution.activeWeek.label} (${rangeTxt} mS/cm)`,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30"
      };
    }
    return {
      label: `⬇️ EC -${(minEc - val).toFixed(2)} mS/cm bajo meta de ${planResolution.activeWeek.label} (${rangeTxt} mS/cm)`,
      color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30"
    };
  }, [ecWater, ecUnit, planResolution, selectedPlanId]);

  const ecDeltaStatus = useMemo(() => {
    const inVal = parseFloat(ecWater);
    const outVal = parseFloat(ecRunoff);
    if (isNaN(inVal) || isNaN(outVal)) return null;
    const diff = Number((outVal - inVal).toFixed(2));
    if (diff > 0.5 && ecUnit === "mS/cm") {
      return {
        label: `ΔEC +${diff} mS/cm (Acumulación de sales en sustrato)`,
        color: "text-red-400 bg-red-500/10 border-red-500/30"
      };
    }
    return {
      label: `ΔEC ${diff >= 0 ? `+${diff}` : diff} ${ecUnit} (Drenaje equilibrado)`,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    };
  }, [ecWater, ecRunoff, ecUnit]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-panel-base border-l border-panel-border w-full max-w-4xl h-full shadow-2xl flex flex-col slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-panel-border bg-black/[0.03] dark:bg-black/20 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Bitácora Operativa & Fertirriego Mineral
            </h2>
            <p className="text-sm font-mono text-emerald-500 mt-1">
              Lote: {batch.id} ({batch.strain}) • Fase:{" "}
              <span className="uppercase text-purple-400 font-bold">{batch.stage || "Vegetativo"}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-brand-slate-600 hover:text-foreground transition-colors bg-black/[0.08] dark:bg-black/40 p-2 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row min-w-0">
          {/* Panel de Inyección (Col 1) */}
          <div className="p-6 md:w-[54%] min-w-0 overflow-x-hidden border-r border-panel-border/30 bg-black/10 flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm uppercase tracking-widest font-bold text-brand-slate-600 relative pl-3 border-l-2 border-emerald-500">
                {editingEventId ? "Editar Registro" : "Nuevo Registro"}
              </h3>
              {editingEventId && (
                <button
                  onClick={cancelEdit}
                  className="text-[10px] uppercase font-bold text-brand-slate-600 hover:text-white px-2 py-1 rounded border border-panel-border hover:bg-black/20 transition-all"
                >
                  Cancelar Edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setActionType("riego")}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all ${
                  actionType === "riego"
                    ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                    : "bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-blue-500/50"
                }`}
              >
                <Drop size={20} weight={actionType === "riego" ? "fill" : "regular"} />
                <span className="text-[10px] font-bold">RIEGO / FERTIRRIEGO</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType("ipm")}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all ${
                  actionType === "ipm"
                    ? "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-red-500/50"
                }`}
              >
                <Bug size={20} weight={actionType === "ipm" ? "fill" : "regular"} />
                <span className="text-[10px] font-bold">IPM / FOLIAR</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType("poda")}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all ${
                  actionType === "poda"
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : "bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-green-500/50"
                }`}
              >
                <Scissors size={20} weight={actionType === "poda" ? "fill" : "regular"} />
                <span className="text-[10px] font-bold">PODA</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType("alerta")}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all ${
                  actionType === "alerta"
                    ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                    : "bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-yellow-500/50"
                }`}
              >
                <Warning size={20} weight={actionType === "alerta" ? "fill" : "regular"} />
                <span className="text-[10px] font-bold">ALERTA</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType("cosecha_humeda")}
                className={`col-span-2 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${
                  actionType === "cosecha_humeda"
                    ? "bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                    : "bg-black/[0.03] dark:bg-black/20 border-panel-border text-brand-slate-600 hover:border-orange-500/50"
                }`}
              >
                <Scissors size={20} weight={actionType === "cosecha_humeda" ? "fill" : "regular"} className="text-orange-400" />
                <span className="text-[10px] font-bold tracking-wider">COSECHA HÚMEDA (CORTE EN VERDE)</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="flex flex-col gap-4 flex-1">
              {(actionType === "riego" || actionType === "ipm") && (
                <>
                  {/* 0. ASISTENTE DE PLAN DE FERTILIZACIÓN SEMANAL & CORRELACIÓN VISIÓN IA */}
                  {actionType === "riego" && (
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/25 via-black/30 to-cyan-950/20 flex flex-col gap-3 w-full min-w-0">
                      {/* Selector de Plan por Lote + Botones para Editar / Cargar Plan */}
                      <div className="flex flex-col gap-2 pb-2.5 border-b border-white/10">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                            📋 Plan de Fertilización del Lote
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenPlanInEditMode(true);
                                setShowPlanModal(true);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                              title="Editar este plan, crear uno nuevo o importar desde Google Sheets"
                            >
                              <PencilSimple size={11} weight="bold" /> Editar / Cargar Plan
                            </button>
                            {selectedPlanId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenPlanInEditMode(false);
                                  setShowPlanModal(true);
                                }}
                                className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold cursor-pointer"
                                title="Ver tabla completa de semanas del plan"
                              >
                                Ver Tabla
                              </button>
                            )}
                          </div>
                        </div>

                        <select
                          value={selectedPlanId}
                          onChange={e => handlePlanSelectionChange(e.target.value)}
                          className="w-full bg-black/50 border border-panel-border rounded-lg px-2.5 py-2 text-xs font-mono text-foreground focus:border-emerald-500 outline-none"
                        >
                          <option value="">-- Sin Plan Asignado (Cultivo Libre) --</option>
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {!selectedPlanId ? (
                        <div className="text-[11px] font-mono text-slate-400 leading-relaxed flex flex-col gap-1.5">
                          <span>
                            Este lote opera actualmente en <strong>modo libre</strong> (sin plan semanal asignado). Podés asignarle un plan del selector superior o cargar/editar un plan personalizado.
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* Fila Semana Activa y Botones Offset (-1 Sem / +1 Sem) */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                🎯 {planResolution.activeWeek.label}: {planResolution.activeWeek.phenology}
                              </span>
                              {planResolution.isExtendedPhotoperiod && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Sun size={11} weight="fill" /> {planResolution.lightHours}L/{planResolution.darkHours}O ({planResolution.cycleTotalHours}h • {planResolution.biologicalCyclesCompleted} ciclos)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAdjustPlanOffset(-1)}
                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-panel-border text-[10px] font-mono text-slate-300 cursor-pointer"
                                title="Estirar / atrasar 1 semana del plan"
                              >
                                -1 Sem
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdjustPlanOffset(1)}
                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-panel-border text-[10px] font-mono text-slate-300 cursor-pointer"
                                title="Adelantar 1 semana del plan"
                              >
                                +1 Sem
                              </button>
                            </div>
                          </div>

                          {/* Metas de la semana */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                            <span className="text-slate-400">Meta Semanal:</span>
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                              pH {planResolution.activeWeek.target_ph_min === planResolution.activeWeek.target_ph_max ? planResolution.activeWeek.target_ph_min : `${planResolution.activeWeek.target_ph_min}–${planResolution.activeWeek.target_ph_max}`}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                              EC {planResolution.activeWeek.target_ec_min === planResolution.activeWeek.target_ec_max ? planResolution.activeWeek.target_ec_min : `${planResolution.activeWeek.target_ec_min}–${planResolution.activeWeek.target_ec_max}`} mS/cm
                            </span>
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                              {planResolution.activeWeek.target_ppm_min === planResolution.activeWeek.target_ppm_max ? planResolution.activeWeek.target_ppm_min : `${planResolution.activeWeek.target_ppm_min}–${planResolution.activeWeek.target_ppm_max}`} ppm
                            </span>
                          </div>

                          {/* Diagnóstico de Correlación con Visión IA (Apilado limpio sin solapar texto) */}
                          <div className={`p-2.5 rounded-lg border text-[11px] font-mono flex flex-col gap-1 ${visionCorrelation.badgeColor}`}>
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="font-bold flex items-center gap-1">
                                <Sparkles size={13} weight="fill" className="shrink-0" />
                                <span>{visionCorrelation.badgeLabel}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-black/30 border border-white/10 text-[10px] font-bold whitespace-nowrap">
                                Sugerido hoy: {planResolution.recommendedMode === "primary" ? "🅰️ Principal" : "🅱️ Secundario"}
                              </span>
                            </div>
                            <span className="text-[10px] opacity-90 leading-relaxed">
                              {visionCorrelation.headline}
                            </span>
                          </div>

                          {/* Botones de Carga Automática a Ancho Completo (sin truncar nombres ni dosis) */}
                          <div className="flex flex-col gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                applyPlanNutrientsToForm(
                                  planResolution.activeWeek.primary_nutrients,
                                  "🅰️ Riego Principal"
                                )
                              }
                              className={`w-full p-2.5 rounded-lg border text-left text-[11px] font-mono transition-all cursor-pointer ${
                                planResolution.recommendedMode === "primary"
                                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                                  : "bg-black/30 border-panel-border text-slate-300 hover:border-cyan-500/40"
                              }`}
                            >
                              <div className="font-bold text-cyan-300 flex items-center justify-between gap-2">
                                <span>⚡ Cargar 🅰️ Riego Principal</span>
                                {planResolution.recommendedMode === "primary" && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/30 whitespace-nowrap">
                                    SUGERIDO HOY
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] opacity-90 mt-1 leading-snug whitespace-normal break-words">
                                {planResolution.activeWeek.primary_summary}
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                applyPlanNutrientsToForm(
                                  planResolution.activeWeek.secondary_nutrients,
                                  "🅱️ Riego Secundario"
                                )
                              }
                              className={`w-full p-2.5 rounded-lg border text-left text-[11px] font-mono transition-all cursor-pointer ${
                                planResolution.recommendedMode === "secondary"
                                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold"
                                  : "bg-black/30 border-panel-border text-slate-300 hover:border-emerald-500/40"
                              }`}
                            >
                              <div className="font-bold text-emerald-300 flex items-center justify-between gap-2">
                                <span>🌿 Cargar 🅱️ Riego Secundario</span>
                                {planResolution.recommendedMode === "secondary" && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 whitespace-nowrap">
                                    SUGERIDO HOY
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] opacity-90 mt-1 leading-snug whitespace-normal break-words">
                                {planResolution.activeWeek.secondary_summary}
                              </div>
                            </button>

                            {(visionCorrelation.doseMultiplier !== 1.0 ||
                              visionCorrelation.status === "PHOTOPERIOD_STRETCH_HOLD") && (
                              <button
                                type="button"
                                onClick={() =>
                                  applyPlanNutrientsToForm(
                                    visionCorrelation.adjustedNutrients,
                                    `🤖 Ajuste Visión IA (${(visionCorrelation.doseMultiplier * 100).toFixed(0)}%)`
                                  )
                                }
                                className="w-full p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-[10px] font-mono font-bold flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <span>🤖 {visionCorrelation.recommendedActionLabel}</span>
                                <span className="underline whitespace-nowrap">Aplicar Ajuste IA →</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 1. VOLUMEN DE AGUA DE DILUCIÓN */}
                  <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold uppercase text-blue-400 flex items-center gap-1.5">
                        <Drop size={15} weight="fill" /> Agua de Dilución / Riego (Litros)
                      </label>
                      <div className="flex gap-1">
                        {[5, 10, 20, 50].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleWaterLitersChange(String(preset))}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                              Number(waterLiters) === preset
                                ? "bg-blue-600 text-white border-blue-400"
                                : "bg-black/30 text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
                            }`}
                          >
                            {preset}L
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={waterLiters}
                        onChange={e => handleWaterLitersChange(e.target.value)}
                        placeholder="Ej: 10 (Litros de agua donde diluís el fertilizante)"
                        className="w-full bg-black/20 border border-blue-500/30 rounded-lg p-2.5 pr-12 text-sm font-mono text-foreground focus:border-blue-400 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-blue-400">
                        Litros
                      </span>
                    </div>
                  </div>

                  {/* 2. INSUMOS Y CALCULADORA DE GRAMOS POR LITRO (g/L) */}
                  <div className="p-3.5 rounded-xl border border-panel-border bg-black/[0.03] dark:bg-black/20 flex flex-col gap-3 w-full min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <label className="text-xs font-mono font-bold uppercase text-brand-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
                        <Flask size={15} className="text-cyan-400 shrink-0" /> Insumos Diluidos en el Agua
                      </label>
                      <button
                        type="button"
                        onClick={addFertRow}
                        className="shrink-0 text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                      >
                        <Plus size={12} weight="bold" /> + Agregar Sal / Insumo
                      </button>
                    </div>

                    {fertRows.map((row, idx) => {
                      const meta = getProductMeta(row.productName);
                      const origin = meta ? getInsumoOrigin(meta) : "organico";
                      const uom = meta?.uom || "gr";
                      const doseUom = getDoseUomForInsumo(uom);
                      const isMineral = origin === "mineral";
                      const rowCost = meta && parseFloat(row.totalAmount) > 0
                        ? (parseFloat(row.totalAmount) * (meta.unit_cost || 0)).toFixed(2)
                        : null;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border flex flex-col gap-2.5 w-full min-w-0 overflow-hidden ${
                            isMineral && row.productName
                              ? "border-cyan-500/40 bg-cyan-950/10"
                              : "border-panel-border/60 bg-black/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 w-full min-w-0">
                            <select
                              value={row.productName}
                              onChange={e => handleProductChange(idx, e.target.value)}
                              className="flex-1 min-w-0 w-0 bg-panel-base border border-panel-border rounded-lg p-2.5 text-xs font-mono focus:border-cyan-500 outline-none truncate"
                            >
                              <option value="">
                                {idx === 0
                                  ? actionType === "riego"
                                    ? "— Sólo Agua (Sin Fertilizante) —"
                                    : "— Manual (Sin Producto) —"
                                  : "— Seleccionar otro insumo —"}
                              </option>
                              {groupedInventory.map((item: any) => {
                                const itemOrigin = getInsumoOrigin(item);
                                const tag =
                                  itemOrigin === "mineral"
                                    ? "⚡ MINERAL"
                                    : itemOrigin === "organico"
                                    ? "🌿 ORG"
                                    : itemOrigin === "corrector_ph"
                                    ? "🧪 pH"
                                    : "📦";
                                return (
                                  <option key={item.name} value={item.name}>
                                    [{tag}] {item.name} (Stock: {Number(item.qty.toFixed(2))} {item.uom || "gr"})
                                  </option>
                                );
                              })}
                            </select>

                            {(fertRows.length > 1 || Boolean(row.productName)) && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeFertRow(idx);
                                }}
                                className="shrink-0 p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 bg-red-500/5 rounded-lg border border-red-500/30 transition-colors cursor-pointer"
                                title={fertRows.length > 1 ? "Eliminar este insumo de la mezcla" : "Quitar producto seleccionado"}
                              >
                                <Trash size={15} weight="bold" />
                              </button>
                            )}
                          </div>

                          {row.productName && (
                            <>
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="flex items-center gap-1">
                                  {isMineral ? (
                                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                                      <Lightning size={10} weight="fill" /> Mineral ({doseUom})
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                                      <Leaf size={10} weight="fill" /> Orgánico ({doseUom})
                                    </span>
                                  )}
                                  {meta?.recommended_dose && (
                                    <span className="text-cyan-400 ml-1">
                                      • Sugerido: {meta.recommended_dose} {doseUom}
                                    </span>
                                  )}
                                </span>
                                {rowCost && (
                                  <span className="text-orange-400 font-bold">Costo: ${rowCost}</span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="text-[10px] font-mono uppercase text-cyan-400 block mb-1 font-bold">
                                    Dosis por Litro ({doseUom})
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={row.dosePerLiter}
                                      onChange={e => handleDoseChange(idx, e.target.value)}
                                      placeholder={doseUom === "g/L" ? "Ej: 1.5" : "Ej: 2.0"}
                                      className="w-full bg-black/30 border border-cyan-500/40 rounded-lg p-2 pr-11 text-sm font-mono text-cyan-300 focus:border-cyan-400 outline-none"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-cyan-400">
                                      {doseUom}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-mono uppercase text-emerald-400 block mb-1 font-bold">
                                    Total a Descontar ({uom}) *
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      required
                                      value={row.totalAmount}
                                      onChange={e => handleTotalAmountChange(idx, e.target.value)}
                                      placeholder={
                                        waterLiters
                                          ? `Total en ${ waterLiters }L`
                                          : "Ej: 15"
                                      }
                                      className="w-full bg-black/30 border border-emerald-500/40 rounded-lg p-2 pr-10 text-sm font-mono text-emerald-300 font-bold focus:border-emerald-400 outline-none"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-emerald-400">
                                      {uom}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {parseFloat(waterLiters) > 0 && parseFloat(row.dosePerLiter) > 0 && (
                                <div className="text-[10px] font-mono text-cyan-300/80 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20">
                                  💧 Dilución calculada:{" "}
                                  <strong>
                                    {row.dosePerLiter} {doseUom}
                                  </strong>{" "}
                                  × <strong>{waterLiters} L de agua</strong> ={" "}
                                  <strong className="text-emerald-300">
                                    {row.totalAmount} {uom}
                                  </strong>{" "}
                                  extraídos de bodega.
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Alertas de Regla de Oro (BioEnhancer vs Sales) y Orden de Mezcla (Barrier Silicio) */}
                    {compatibilityCheck.messages.map((msg, mIdx) => (
                      <div
                        key={mIdx}
                        className={`p-2.5 rounded-lg border text-[10px] font-mono leading-relaxed ${
                          msg.type === "error"
                            ? "bg-red-500/15 border-red-500/40 text-red-300 font-bold"
                            : "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>

                  {/* 3. CONTROL FISICOQUÍMICO DE LA SOLUCIÓN: pH, EC Y PPM (EXCLUSIVO PARA FERTILIZANTES MINERALES) */}
                  {hasMineralSelected && (
                    <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 flex flex-col gap-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono font-bold uppercase text-purple-300 flex items-center gap-1.5">
                          <Lightning size={15} weight="fill" className="text-purple-400" /> Parámetros de la Solución (pH, EC & PPM)
                        </label>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                          Nutrición Mineral Activa
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[10px] font-mono uppercase text-brand-slate-600 dark:text-slate-300 block mb-1">
                            pH Solución *
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
                            className="w-full bg-black/25 border border-purple-500/40 rounded-lg p-2.5 text-sm font-mono text-foreground focus:border-purple-400 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase text-brand-slate-600 dark:text-slate-300 block mb-1">
                            EC Solución *
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required={hasMineralSelected}
                              value={ecWater}
                              onChange={e => setEcWater(e.target.value)}
                              placeholder={ecUnit === "mS/cm" ? "Ej: 1.4" : "Ej: 1400"}
                              className="w-full min-w-0 bg-black/25 border border-purple-500/40 rounded-lg p-2.5 text-sm font-mono text-foreground focus:border-purple-400 outline-none"
                            />
                            <select
                              value={ecUnit}
                              onChange={e => setEcUnit(e.target.value as any)}
                              className="bg-black/40 border border-purple-500/30 rounded-lg px-1.5 text-[10px] font-mono text-purple-300 outline-none shrink-0"
                            >
                              <option value="mS/cm">mS/cm</option>
                              <option value="µS/cm">µS/cm</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase text-brand-slate-600 dark:text-slate-300 block mb-1">
                            PPM Solución (TDS)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={ppmWater}
                              onChange={e => setPpmWater(e.target.value)}
                              placeholder="Ej: 700"
                              className="w-full bg-black/25 border border-purple-500/40 rounded-lg p-2.5 pr-11 text-sm font-mono text-foreground focus:border-purple-400 outline-none"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-purple-300">
                              ppm
                            </span>
                          </div>
                        </div>
                      </div>

                      {phStatus && (
                        <div className={`text-[10px] font-mono px-2.5 py-1 rounded border ${phStatus.color}`}>
                          {phStatus.label}
                        </div>
                      )}
                      {ecPlanCompareStatus && (
                        <div className={`text-[10px] font-mono px-2.5 py-1 rounded border ${ecPlanCompareStatus.color}`}>
                          {ecPlanCompareStatus.label}
                        </div>
                      )}

                      {/* Botón desplegable para EC Base y Drenaje (Runoff) */}
                      <button
                        type="button"
                        onClick={() => setShowAdvancedMetrics(prev => !prev)}
                        className="text-[11px] font-mono text-purple-300/80 hover:text-purple-200 flex items-center justify-between pt-1 border-t border-purple-500/20"
                      >
                        <span>+ Medición de Agua Base y Drenaje (Runoff) (Opcional)</span>
                        {showAdvancedMetrics ? <CaretUp size={14} /> : <CaretDown size={14} />}
                      </button>

                      {showAdvancedMetrics && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 animate-in fade-in duration-150">
                          <div>
                            <label className="text-[9px] font-mono uppercase text-slate-400 block mb-1">
                              EC Agua Base
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ecWaterBase}
                              onChange={e => setEcWaterBase(e.target.value)}
                              placeholder="Ej: 0.2"
                              className="w-full bg-black/30 border border-panel-border rounded-lg p-2 text-xs font-mono outline-none focus:border-purple-400"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-mono uppercase text-slate-400 block mb-1">
                              pH Drenaje
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="14"
                              value={phRunoff}
                              onChange={e => setPhRunoff(e.target.value)}
                              placeholder="Ej: 6.1"
                              className="w-full bg-black/30 border border-panel-border rounded-lg p-2 text-xs font-mono outline-none focus:border-purple-400"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-mono uppercase text-slate-400 block mb-1">
                              EC Drenaje
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ecRunoff}
                              onChange={e => setEcRunoff(e.target.value)}
                              placeholder="Ej: 1.7"
                              className="w-full bg-black/30 border border-panel-border rounded-lg p-2 text-xs font-mono outline-none focus:border-purple-400"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-mono uppercase text-slate-400 block mb-1">
                              PPM Drenaje
                            </label>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={ppmRunoff}
                              onChange={e => setPpmRunoff(e.target.value)}
                              placeholder="Ej: 850"
                              className="w-full bg-black/30 border border-panel-border rounded-lg p-2 text-xs font-mono outline-none focus:border-purple-400"
                            />
                          </div>
                          {ecDeltaStatus && (
                            <div className={`col-span-2 sm:col-span-4 text-[10px] font-mono px-2.5 py-1 rounded border ${ecDeltaStatus.color}`}>
                              📉 {ecDeltaStatus.label}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {actionType === "poda" && (
                <div>
                  <label className="text-xs uppercase text-brand-slate-600 mb-1 block">Técnica a Aplicar</label>
                  <select
                    value={podaType}
                    onChange={e => setPodaType(e.target.value)}
                    className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-3 text-sm focus:border-green-500 outline-none"
                  >
                    <option value="Defoliación Baja">Defoliación Baja (Lollipop)</option>
                    <option value="Topping / Poda Apical">Topping / Poda Apical</option>
                    <option value="LST (Low Stress Training)">LST (Low Stress Training)</option>
                    <option value="FIM">FIM</option>
                    <option value="Mantenimiento Limpieza">Revisión / Limpieza Físico</option>
                  </select>
                </div>
              )}

              {actionType === "alerta" && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs font-mono text-yellow-400">
                  Registrá la aparición de plagas, hongos o deficiencias detectadas. Este evento será resaltado pero no consumirá inventario a menos que luego apliques un control IPM.
                </div>
              )}

              {actionType === "cosecha_humeda" && (
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-xs font-mono text-orange-400 leading-relaxed">
                    🌱 Registrá un corte o tanda en verde antes del secado. No altera stock final ni requiere pesaje húmedo (el peso seco definitivo se ingresará al finalizar el lote).
                  </div>
                  <div>
                    <label className="text-xs uppercase text-brand-slate-600 mb-1 block">Identificador / Tanda Cortada</label>
                    <input
                      type="text"
                      value={harvestCutName}
                      onChange={e => setHarvestCutName(e.target.value)}
                      placeholder="Ej: Tanda 1 / Puntas principales / Corte parcial"
                      className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-3 text-sm focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs uppercase text-brand-slate-600 mb-1 block">
                  Notas de la Bitácora {actionType === "alerta" ? "*" : "(Opcional)"}
                </label>
                <textarea
                  required={actionType === "alerta"}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  rows={2}
                  placeholder="Observaciones adicionales de la aplicación..."
                  className="w-full bg-black/[0.03] dark:bg-black/20 border border-panel-border rounded-lg p-2.5 text-sm focus:border-emerald-500 outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex-1"></div>

              <button
                disabled={isSubmitting}
                type="submit"
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all disabled:opacity-50 mt-2 ${
                  actionType === "riego"
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                    : actionType === "ipm"
                    ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                    : actionType === "alerta"
                    ? "bg-yellow-600 hover:bg-yellow-500 text-foreground shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                    : actionType === "cosecha_humeda"
                    ? "bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                }`}
              >
                {isSubmitting ? (
                  "Verificando BD..."
                ) : (
                  <>
                    <FloppyDisk size={20} /> {editingEventId ? "Guardar Cambios" : "Asentar Bitácora"}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Panel de Historial (Col 2) */}
          <div className="p-6 md:w-[46%] flex flex-col">
            <h3 className="text-sm uppercase tracking-widest font-bold text-brand-slate-600 mb-6 flex justify-between items-center relative pl-3 border-l-2 border-brand-slate-600">
              <span className="flex items-center gap-2">
                <ClockCounterClockwise size={16} /> Historial del Lote
              </span>
              <span className="text-[10px] bg-black/[0.08] dark:bg-black/40 px-2 py-0.5 rounded text-emerald-500">
                {events.length} logs vitales
              </span>
            </h3>

            <div className="flex-1 flex flex-col gap-3 relative pr-1 overflow-y-auto">
              {loadingEvents ? (
                <div className="text-sm text-center py-10 font-mono text-brand-slate-600 animate-pulse">
                  Consultando Registros...
                </div>
              ) : events.length === 0 ? (
                <div className="opacity-50 text-center py-10 font-mono text-sm text-brand-slate-600 border border-dashed border-panel-border rounded-xl">
                  Sin historial agronómico.
                </div>
              ) : (
                events.map(ev => {
                  const metrics = parseEventFertigationMetrics(ev);
                  let evColor = "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
                  let EvIcon = Scissors;
                  const evType = (ev.event_type || "").toLowerCase();
                  if (evType === "nutricion" || evType === "riego") {
                    evColor = metrics.is_mineral
                      ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5"
                      : "text-blue-400 border-blue-500/20 bg-blue-500/5";
                    EvIcon = Drop;
                  } else if (evType === "ipm") {
                    evColor = "text-red-400 border-red-500/20 bg-red-500/5";
                    EvIcon = Bug;
                  } else if (evType === "alerta") {
                    evColor =
                      "text-yellow-400 border-yellow-500/40 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.1)]";
                    EvIcon = Warning;
                  } else if (evType.includes("cosecha")) {
                    evColor =
                      "text-orange-400 border-orange-500/40 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.1)]";
                    EvIcon = Scissors;
                  }

                  return (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-xl border ${evColor} flex flex-col gap-2 shadow-sm relative group`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="flex items-center gap-1.5 font-bold text-xs uppercase">
                            <EvIcon size={16} weight="bold" /> {ev.event_type}
                          </span>
                          {metrics.is_mineral && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5">
                              <Lightning size={10} weight="fill" /> Mineral
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono opacity-80 bg-black/[0.08] dark:bg-black/40 px-2 py-1 rounded">
                            {new Date(ev.date_occurred || ev.timestamp || ev.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex gap-1 ml-1 opacity-70 hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditClick(ev)}
                              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors text-brand-slate-600 hover:text-blue-400"
                              title="Editar"
                            >
                              <PencilSimple size={16} weight="bold" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev)}
                              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors text-brand-slate-600 hover:text-red-400"
                              title="Eliminar"
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Píldoras Técnicas de Fertirriego (Agua, Dosis g/L, pH, EC, PPM, Drenaje) */}
                      {(metrics.water_liters ||
                        metrics.ph_water !== null ||
                        metrics.ec_water !== null ||
                        metrics.ppm_water !== null ||
                        metrics.recipe_items.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {metrics.water_liters && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                              💧 {metrics.water_liters} L
                            </span>
                          )}
                          {metrics.recipe_items.map((ri, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold"
                            >
                              ⚖️ {ri.product_name}:{" "}
                              {ri.dose_per_liter > 0 ? `${ri.dose_per_liter} ${ri.dose_uom} ` : ""}
                              ({ri.amount_applied} {ri.uom})
                            </span>
                          ))}
                          {metrics.ph_water !== null && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                              🧪 pH {metrics.ph_water}
                            </span>
                          )}
                          {metrics.ec_water !== null && (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                              ⚡ EC {metrics.ec_water} {metrics.ec_unit}
                            </span>
                          )}
                          {metrics.ppm_water !== null && (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
                              🔬 {metrics.ppm_water} ppm
                            </span>
                          )}
                          {(metrics.ph_runoff !== null || metrics.ec_runoff !== null || metrics.ppm_runoff !== null) && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                              📉 Runoff:{" "}
                              {[
                                metrics.ph_runoff !== null ? `pH ${metrics.ph_runoff}` : null,
                                metrics.ec_runoff !== null ? `EC ${metrics.ec_runoff}` : null,
                                metrics.ppm_runoff !== null ? `${metrics.ppm_runoff} ppm` : null
                              ]
                                .filter(Boolean)
                                .join(" / ")}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-sm text-foreground my-0.5 leading-relaxed">
                        {ev.description}
                      </p>

                      {ev.total_cost > 0 && (
                        <span className="font-mono text-[10px] text-orange-400 uppercase place-self-end mt-1 font-bold">
                          Invertido: ${Number(ev.total_cost).toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showPlanModal && (
        <FertilizationPlanModal
          batch={batch}
          startInEditMode={openPlanInEditMode}
          onClose={() => setShowPlanModal(false)}
          onUpdated={() => {
            loadFertilizationPlans(supabase).then(list => {
              if (list.length > 0) setPlans(list);
              const refreshed = getBatchPlanAssignment(batch);
              setSelectedPlanId(refreshed.planId);
              setPlanWeekOffset(refreshed.weekOffset);
              setPlanSyncMode(refreshed.syncMode);
            });
          }}
        />
      )}
    </div>
  );
}
