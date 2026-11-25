"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  Thermometer,
  Droplets,
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  ShieldCheck,
  Cpu,
  Loader2,
  Bot,
  User,
  Pencil,
  Link2,
  Snowflake,
  Flame,
  Power,
  X,
} from 'lucide-react';
import {
  parseCommandMeta,
  EquipmentRuntimeState,
  ExecutingSequenceState,
  formatRelativeTimeAr,
} from './BroadlinkPanel';

interface ProfilePreset {
  label: string;
  phase: string;
  day_temp_min: number;
  day_temp_max: number;
  day_humidity_min: number;
  day_humidity_max: number;
  day_vpd_min: number;
  day_vpd_max: number;
  night_temp_min: number;
  night_temp_max: number;
  night_humidity_min: number;
  night_humidity_max: number;
  night_vpd_min: number;
  night_vpd_max: number;
}

const PROFILE_PRESETS: ProfilePreset[] = [
  {
    label: 'Vegetativo Estándar',
    phase: 'vegetative',
    day_temp_min: 24,
    day_temp_max: 27,
    day_humidity_min: 55,
    day_humidity_max: 65,
    day_vpd_min: 1.05,
    day_vpd_max: 1.35,
    night_temp_min: 19,
    night_temp_max: 22,
    night_humidity_min: 45,
    night_humidity_max: 55,
    night_vpd_min: 0.8,
    night_vpd_max: 1.05,
  },
  {
    label: 'Floración Temprana',
    phase: 'flowering_early',
    day_temp_min: 23,
    day_temp_max: 26,
    day_humidity_min: 48,
    day_humidity_max: 58,
    day_vpd_min: 1.15,
    day_vpd_max: 1.45,
    night_temp_min: 18,
    night_temp_max: 21,
    night_humidity_min: 42,
    night_humidity_max: 50,
    night_vpd_min: 0.9,
    night_vpd_max: 1.15,
  },
  {
    label: 'Floración Tardía',
    phase: 'flowering_late',
    day_temp_min: 21,
    day_temp_max: 25,
    day_humidity_min: 40,
    day_humidity_max: 50,
    day_vpd_min: 1.25,
    day_vpd_max: 1.55,
    night_temp_min: 17,
    night_temp_max: 20,
    night_humidity_min: 38,
    night_humidity_max: 46,
    night_vpd_min: 0.95,
    night_vpd_max: 1.25,
  },
  {
    label: 'Secado / Curado',
    phase: 'drying',
    day_temp_min: 18,
    day_temp_max: 21,
    day_humidity_min: 55,
    day_humidity_max: 62,
    day_vpd_min: 0.8,
    day_vpd_max: 1.0,
    night_temp_min: 18,
    night_temp_max: 21,
    night_humidity_min: 55,
    night_humidity_max: 62,
    night_vpd_min: 0.8,
    night_vpd_max: 1.0,
  },
];

function getParamLabel(param: string): string {
  if (param === 'temperature') return 'Temperatura';
  if (param === 'humidity') return 'Humedad';
  if (param === 'vpd') return 'VPD Foliar';
  if (param === 'all_climate') return 'Clima Completo (Temp + Hum)';
  return param;
}

function getParamUnit(param: string): string {
  if (param === 'temperature') return '°C';
  if (param === 'humidity') return '%';
  if (param === 'vpd') return ' kPa';
  return '';
}

function getOperatorSymbol(cond: string): string {
  if (cond === 'greater_than') return '>';
  if (cond === 'less_than') return '<';
  if (cond === 'gte') return '>=';
  if (cond === 'lte') return '<=';
  return cond;
}

function getProfileBound(profile: any, mode: 'day' | 'night', param: string, bound: 'min' | 'max'): number | null {
  if (!profile) return null;
  const colParam = param === 'temperature' ? 'temp' : param === 'humidity' ? 'humidity' : 'vpd';
  const val = Number(profile[`${mode}_${colParam}_${bound}`]);
  return Number.isFinite(val) ? val : null;
}

function describeCondition(
  param: string,
  cond: string,
  source: string,
  manualVal: any,
  hyst: any,
  activeProfile: any
): { title: string; resolvedPreview: string } {
  const unit = getParamUnit(param);
  const src = source || 'manual';
  const h = Math.max(0, Number(hyst) || 0);

  if (src === 'profile_in_range') {
    if (param === 'all_climate') {
      const dTMin = getProfileBound(activeProfile, 'day', 'temperature', 'min');
      const dTMax = getProfileBound(activeProfile, 'day', 'temperature', 'max');
      const dHMax = getProfileBound(activeProfile, 'day', 'humidity', 'max');
      const nTMin = getProfileBound(activeProfile, 'night', 'temperature', 'min');
      const nTMax = getProfileBound(activeProfile, 'night', 'temperature', 'max');
      const nHMax = getProfileBound(activeProfile, 'night', 'humidity', 'max');

      const dPrev =
        dTMin !== null && dTMax !== null && dHMax !== null
          ? `☀️ ${Number((dTMin + Math.min(h, (dTMax - dTMin) * 0.45)).toFixed(1))}–${Number((dTMax - Math.min(h, (dTMax - dTMin) * 0.45)).toFixed(1))}°C y H <= ${Number((dHMax - Math.max(2, h * 2)).toFixed(0))}%`
          : '';
      const nPrev =
        nTMin !== null && nTMax !== null && nHMax !== null
          ? `🌙 ${Number((nTMin + Math.min(h, (nTMax - nTMin) * 0.45)).toFixed(1))}–${Number((nTMax - Math.min(h, (nTMax - nTMin) * 0.45)).toFixed(1))}°C y H <= ${Number((nHMax - Math.max(2, h * 2)).toFixed(0))}%`
          : '';
      return {
        title: `Temp y Hum dentro de Consigna (margen histéresis)`,
        resolvedPreview: [dPrev, nPrev].filter(Boolean).join(' | '),
      };
    }

    const dMin = getProfileBound(activeProfile, 'day', param, 'min');
    const dMax = getProfileBound(activeProfile, 'day', param, 'max');
    const nMin = getProfileBound(activeProfile, 'night', param, 'min');
    const nMax = getProfileBound(activeProfile, 'night', param, 'max');
    const dPrev =
      dMin !== null && dMax !== null
        ? `☀️ ${(dMin + Math.min(h, (dMax - dMin) * 0.45)).toFixed(param === 'vpd' ? 2 : 1)}–${(dMax - Math.min(h, (dMax - dMin) * 0.45)).toFixed(param === 'vpd' ? 2 : 1)}${unit}`
        : '';
    const nPrev =
      nMin !== null && nMax !== null
        ? `🌙 ${(nMin + Math.min(h, (nMax - nMin) * 0.45)).toFixed(param === 'vpd' ? 2 : 1)}–${(nMax - Math.min(h, (nMax - nMin) * 0.45)).toFixed(param === 'vpd' ? 2 : 1)}${unit}`
        : '';
    return {
      title: `${getParamLabel(param)} dentro de Consigna`,
      resolvedPreview: [dPrev, nPrev].filter(Boolean).join(' | '),
    };
  }

  if (src === 'profile_max' || src === 'profile_min') {
    const bound = src === 'profile_max' ? 'max' : 'min';
    const dVal = getProfileBound(activeProfile, 'day', param, bound);
    const nVal = getProfileBound(activeProfile, 'night', param, bound);

    const calcEff = (base: number | null) => {
      if (base === null) return null;
      if (src === 'profile_max' && cond === 'less_than') return Number((base - h).toFixed(2));
      if (src === 'profile_min' && cond === 'greater_than') return Number((base + h).toFixed(2));
      return base;
    };

    const op =
      src === 'profile_max' && cond === 'less_than'
        ? '<='
        : src === 'profile_min' && cond === 'greater_than'
        ? '>='
        : getOperatorSymbol(cond);

    const dEff = calcEff(dVal);
    const nEff = calcEff(nVal);
    const dPrev = dEff !== null ? `☀️ ${op} ${dEff}${unit}` : '';
    const nPrev = nEff !== null ? `🌙 ${op} ${nEff}${unit}` : '';

    return {
      title: `${getParamLabel(param)} ${op} ${bound === 'max' ? 'Máx Consigna' : 'Mín Consigna'}`,
      resolvedPreview: [dPrev, nPrev].filter(Boolean).join(' | '),
    };
  }

  return {
    title: `${getParamLabel(param)} ${getOperatorSymbol(cond)} ${manualVal}${unit}`,
    resolvedPreview: 'Umbral fijo manual',
  };
}

const DEFAULT_RULE_FORM = {
  id: '' as string,
  name: '',
  mode: 'both',
  target_parameter: 'temperature',
  condition: 'greater_than',
  threshold_source: 'profile_max',
  threshold_value: 27,
  hysteresis: 1.0,
  cooldown_minutes: 10,
  priority: 1,
  action_type: 'activate',
  hasSecondary: false,
  secondary_parameter: 'temperature',
  secondary_condition: 'gte',
  secondary_threshold_source: 'profile_min',
  secondary_threshold_value: 24,
  command_id: '',
  is_active: true,
};

export default function ClimateAutomationPanel() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const hasUnsavedProfileEdits = useRef(false);
  const [rules, setRules] = useState<any[]>([]);
  const [commands, setCommands] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<any>(null);
  const [isLightOn, setIsLightOn] = useState<boolean>(true);
  const [equipmentStates, setEquipmentStates] = useState<Record<string, EquipmentRuntimeState>>({});
  const [executingSequence, setExecutingSequence] = useState<ExecutingSequenceState | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Modal Nuevo Perfil de Consignas
  const [isNewProfileOpen, setIsNewProfileOpen] = useState(false);
  const [newProfileForm, setNewProfileForm] = useState<ProfilePreset & { name: string }>({
    ...PROFILE_PRESETS[1],
    name: 'Floración Temprana',
  });

  // Modal Crear / Editar Regla
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({ ...DEFAULT_RULE_FORM });

  const fetchData = async () => {
    try {
      const [res, stateRes] = await Promise.all([
        fetch('/api/iot/climate-automation'),
        fetch('/api/iot/mqtt_publish'),
      ]);
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles || []);
        const active = data.profiles?.find((p: any) => p.is_active) || data.profiles?.[0] || null;
        if (!hasUnsavedProfileEdits.current) {
          setActiveProfile(active);
        }
        setRules(data.rules || []);
        setCommands(data.commands || []);
        setLogs(data.logs || []);
        setLatestTelemetry(data.latestTelemetry || null);
        if (typeof data.isLightOn === 'boolean') {
          setIsLightOn(data.isLightOn);
        }
      }
      const stateData = await stateRes.json();
      if (stateData.success) {
        if (stateData.equipmentStates) setEquipmentStates(stateData.equipmentStates);
        setExecutingSequence(stateData.executingSequence || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const updateActiveProfileField = (patch: Record<string, any>) => {
    hasUnsavedProfileEdits.current = true;
    setActiveProfile((prev: any) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSaveProfile = async (updatedProfile: any) => {
    setSaving(true);
    try {
      const res = await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_profile', profile: updatedProfile }),
      });
      const data = await res.json();
      if (data.success) {
        hasUnsavedProfileEdits.current = false;
        setStatusMsg("Consignas actualizadas. Todas las reglas vinculadas ya están usando estos nuevos límites.");
        setTimeout(() => setStatusMsg(""), 4000);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchActiveProfile = async (profileId: string) => {
    if (!profileId || profileId === activeProfile?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active_profile', profileId }),
      });
      const data = await res.json();
      if (data.success) {
        hasUnsavedProfileEdits.current = false;
        setStatusMsg("Perfil ambiental activado. Las reglas vinculadas aplican automáticamente las nuevas consignas.");
        setTimeout(() => setStatusMsg(""), 4000);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileForm.name.trim()) {
      alert("Ingresa un nombre para el perfil ambiental.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_profile',
          activate: true,
          profile: {
            name: newProfileForm.name.trim(),
            phase: newProfileForm.phase,
            day_temp_min: newProfileForm.day_temp_min,
            day_temp_max: newProfileForm.day_temp_max,
            day_humidity_min: newProfileForm.day_humidity_min,
            day_humidity_max: newProfileForm.day_humidity_max,
            day_vpd_min: newProfileForm.day_vpd_min,
            day_vpd_max: newProfileForm.day_vpd_max,
            night_temp_min: newProfileForm.night_temp_min,
            night_temp_max: newProfileForm.night_temp_max,
            night_humidity_min: newProfileForm.night_humidity_min,
            night_humidity_max: newProfileForm.night_humidity_max,
            night_vpd_min: newProfileForm.night_vpd_min,
            night_vpd_max: newProfileForm.night_vpd_max,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        hasUnsavedProfileEdits.current = false;
        setIsNewProfileOpen(false);
        setStatusMsg(`Perfil "${newProfileForm.name}" creado y activado para el cultivo.`);
        setTimeout(() => setStatusMsg(""), 4000);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm("¿Eliminar este perfil de consignas secundario?")) return;
    try {
      const res = await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_profile', profileId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg("Perfil secundario eliminado.");
        setTimeout(() => setStatusMsg(""), 3000);
        fetchData();
      } else {
        alert(data.error || "No se pudo eliminar el perfil.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_rule', ruleId, isActive: !currentStatus }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("¿Eliminar esta regla de automatización?")) return;
    try {
      await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_rule', ruleId }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const openNewRuleModal = () => {
    setRuleForm({
      ...DEFAULT_RULE_FORM,
      priority: rules.length + 1,
    });
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: any) => {
    setRuleForm({
      id: rule.id || '',
      name: rule.name || '',
      mode: rule.mode || 'both',
      target_parameter: rule.target_parameter || 'temperature',
      condition: rule.condition || 'greater_than',
      threshold_source: rule.threshold_source || 'manual',
      threshold_value: Number.isFinite(Number(rule.threshold_value)) ? Number(rule.threshold_value) : 26.5,
      hysteresis: Number.isFinite(Number(rule.hysteresis)) ? Number(rule.hysteresis) : 1.0,
      cooldown_minutes: Number.isFinite(Number(rule.cooldown_minutes)) ? Number(rule.cooldown_minutes) : 10,
      priority: Number.isFinite(Number(rule.priority)) ? Number(rule.priority) : 10,
      action_type: rule.action_type || 'auto',
      hasSecondary: Boolean(rule.secondary_parameter),
      secondary_parameter: rule.secondary_parameter || 'temperature',
      secondary_condition: rule.secondary_condition || 'gte',
      secondary_threshold_source: rule.secondary_threshold_source || 'profile_min',
      secondary_threshold_value: Number.isFinite(Number(rule.secondary_threshold_value))
        ? Number(rule.secondary_threshold_value)
        : 24,
      command_id: rule.command_id || '',
      is_active: rule.is_active !== false,
    });
    setIsRuleModalOpen(true);
  };

  const applyRuleTemplate = (tpl: 'cool' | 'heat' | 'dry' | 'off') => {
    if (tpl === 'cool') {
      setRuleForm(prev => ({
        ...prev,
        name: prev.id ? prev.name : 'Modo Frío (Sobre Máx Temperatura)',
        mode: 'both',
        priority: 1,
        target_parameter: 'temperature',
        threshold_source: 'profile_max',
        condition: 'greater_than',
        action_type: 'activate',
        hasSecondary: false,
      }));
    } else if (tpl === 'heat') {
      setRuleForm(prev => ({
        ...prev,
        name: prev.id ? prev.name : 'Modo Calor (Bajo Mín Temperatura)',
        mode: 'both',
        priority: 2,
        target_parameter: 'temperature',
        threshold_source: 'profile_min',
        condition: 'less_than',
        action_type: 'activate',
        hasSecondary: false,
      }));
    } else if (tpl === 'dry') {
      setRuleForm(prev => ({
        ...prev,
        name: prev.id ? prev.name : 'Deshumidificar (Humedad Alta sin Frío)',
        mode: 'both',
        priority: 3,
        target_parameter: 'humidity',
        threshold_source: 'profile_max',
        condition: 'greater_than',
        action_type: 'activate',
        hasSecondary: true,
        secondary_parameter: 'temperature',
        secondary_condition: 'gte',
        secondary_threshold_source: 'profile_min',
      }));
    } else if (tpl === 'off') {
      setRuleForm(prev => ({
        ...prev,
        name: prev.id ? prev.name : 'Apagar Equipo al Volver a Consigna',
        mode: 'both',
        priority: 4,
        target_parameter: 'all_climate',
        threshold_source: 'profile_in_range',
        condition: 'less_than',
        hysteresis: 1.0,
        action_type: 'deactivate',
        hasSecondary: false,
      }));
    }
  };

  const handleSaveRule = async () => {
    if (!ruleForm.name.trim() || !ruleForm.command_id) {
      alert("Por favor completa el nombre y selecciona un comando o secuencia.");
      return;
    }

    // Calcular fallback numérico para threshold_value (columna NOT NULL)
    let fallbackThreshold = Number(ruleForm.threshold_value);
    const activeMode: 'day' | 'night' = isLightOn ? 'day' : 'night';
    if (ruleForm.threshold_source === 'profile_max') {
      const bound = getProfileBound(activeProfile, activeMode, ruleForm.target_parameter, 'max');
      if (bound !== null) fallbackThreshold = bound;
    } else if (ruleForm.threshold_source === 'profile_min') {
      const bound = getProfileBound(activeProfile, activeMode, ruleForm.target_parameter, 'min');
      if (bound !== null) fallbackThreshold = bound;
    } else if (ruleForm.threshold_source === 'profile_in_range') {
      const refParam = ruleForm.target_parameter === 'all_climate' ? 'temperature' : ruleForm.target_parameter;
      const bound = getProfileBound(activeProfile, activeMode, refParam, 'max');
      if (bound !== null) fallbackThreshold = bound;
    }

    let fallbackSecondary = ruleForm.hasSecondary ? Number(ruleForm.secondary_threshold_value) : null;
    if (ruleForm.hasSecondary) {
      if (ruleForm.secondary_threshold_source === 'profile_max') {
        const b = getProfileBound(activeProfile, activeMode, ruleForm.secondary_parameter, 'max');
        if (b !== null) fallbackSecondary = b;
      } else if (ruleForm.secondary_threshold_source === 'profile_min') {
        const b = getProfileBound(activeProfile, activeMode, ruleForm.secondary_parameter, 'min');
        if (b !== null) fallbackSecondary = b;
      }
    }

    setSaving(true);
    try {
      const payloadRule: any = {
        profile_id: activeProfile?.id || null,
        name: ruleForm.name.trim(),
        mode: ruleForm.mode,
        target_parameter: ruleForm.target_parameter,
        condition: ruleForm.condition,
        threshold_source: ruleForm.threshold_source,
        threshold_value: Number.isFinite(fallbackThreshold) ? fallbackThreshold : 0,
        hysteresis: Number(ruleForm.hysteresis) || 0,
        cooldown_minutes: Number(ruleForm.cooldown_minutes) || 10,
        priority: Number(ruleForm.priority) || 10,
        action_type: ruleForm.action_type,
        secondary_parameter: ruleForm.hasSecondary ? ruleForm.secondary_parameter : null,
        secondary_condition: ruleForm.hasSecondary ? ruleForm.secondary_condition : null,
        secondary_threshold_source: ruleForm.hasSecondary ? ruleForm.secondary_threshold_source : 'manual',
        secondary_threshold_value: fallbackSecondary,
        command_id: ruleForm.command_id,
        is_active: ruleForm.is_active,
      };
      if (ruleForm.id) {
        payloadRule.id = ruleForm.id;
      }

      const res = await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_rule',
          rule: payloadRule,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsRuleModalOpen(false);
        setRuleForm({ ...DEFAULT_RULE_FORM });
        setStatusMsg(payloadRule.id ? "Regla actualizada con éxito." : "Regla creada y vinculada al motor climático.");
        setTimeout(() => setStatusMsg(""), 3500);
        fetchData();
      } else {
        alert(data.error || "Error guardando regla.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const linkedRulesCount = rules.filter(
    r =>
      r.is_active &&
      ((r.threshold_source && r.threshold_source !== 'manual') ||
        (r.secondary_parameter && r.secondary_threshold_source && r.secondary_threshold_source !== 'manual'))
  ).length;

  if (loading) {
    return (
      <div className="p-8 text-center text-neutral-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-500" />
        Cargando sistema de automatización climática...
      </div>
    );
  }

  const primaryModalPreview = describeCondition(
    ruleForm.target_parameter,
    ruleForm.condition,
    ruleForm.threshold_source,
    ruleForm.threshold_value,
    ruleForm.hysteresis,
    activeProfile
  );
  const secondaryModalPreview = ruleForm.hasSecondary
    ? describeCondition(
        ruleForm.secondary_parameter,
        ruleForm.secondary_condition,
        ruleForm.secondary_threshold_source,
        ruleForm.secondary_threshold_value,
        0,
        activeProfile
      )
    : null;

  return (
    <div className="space-y-6">
      {/* HEADER DE ESTADO EN VIVO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* FOTOPERIODO SHELLY */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Fotoperiodo (Shelly)</span>
            <div className="flex items-center gap-2 mt-1">
              {isLightOn ? (
                <>
                  <Sun className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span className="text-lg font-bold text-white">DÍA (Luces ON)</span>
                </>
              ) : (
                <>
                  <Moon className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <span className="text-lg font-bold text-white">NOCHE (Luces OFF)</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Usando consignas de {isLightOn ? 'DÍA' : 'NOCHE'}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
            isLightOn
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          }`}>
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* TEMPERATURA ACTUAL */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Temp (Shelly H&T)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-white">
                {latestTelemetry?.temperature_c !== undefined ? `${latestTelemetry.temperature_c.toFixed(1)}°C` : '--'}
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              Consigna ({isLightOn ? 'Día' : 'Noche'}): {isLightOn
                ? `${activeProfile?.day_temp_min}° - ${activeProfile?.day_temp_max}°C`
                : `${activeProfile?.night_temp_min}° - ${activeProfile?.night_temp_max}°C`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
            <Thermometer className="w-5 h-5" />
          </div>
        </div>

        {/* HUMEDAD RELATIVA */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Humedad Relativa</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-white">
                {latestTelemetry?.humidity_percent !== undefined ? `${latestTelemetry.humidity_percent.toFixed(0)}%` : '--'}
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              Consigna ({isLightOn ? 'Día' : 'Noche'}): {isLightOn
                ? `${activeProfile?.day_humidity_min}% - ${activeProfile?.day_humidity_max}%`
                : `${activeProfile?.night_humidity_min}% - ${activeProfile?.night_humidity_max}%`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
            <Droplets className="w-5 h-5" />
          </div>
        </div>

        {/* VPD FOLIAR */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">VPD Foliar</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-emerald-400">
                {latestTelemetry?.vpd_leaf_kpa !== undefined ? `${latestTelemetry.vpd_leaf_kpa.toFixed(2)} kPa` : '--'}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              Rango ({isLightOn ? 'Día' : 'Noche'}): {isLightOn
                ? `${activeProfile?.day_vpd_min} - ${activeProfile?.day_vpd_max} kPa`
                : `${activeProfile?.night_vpd_min} - ${activeProfile?.night_vpd_max} kPa`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ESTADO ACTIVO DE EQUIPOS IR (BROADLINK) */}
      {(Object.keys(equipmentStates).length > 0 || executingSequence) && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Estado Activo de Equipos IR (Broadlink)
            </span>
            <span className="text-[11px] text-neutral-500">
              Última secuencia o comando aplicado por equipo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(
              new Set([
                ...Object.keys(equipmentStates),
                ...(executingSequence?.equipment ? [executingSequence.equipment] : []),
              ])
            ).map(eq => {
              const st = equipmentStates[eq];
              const isExec = executingSequence?.equipment === eq;
              const isOn = st?.powerState === 'on';

              return (
                <div
                  key={eq}
                  className={`rounded-lg p-3 border flex items-center justify-between gap-3 ${
                    isExec
                      ? 'bg-amber-950/25 border-amber-500/50'
                      : isOn
                      ? 'bg-emerald-950/25 border-emerald-600/50'
                      : 'bg-neutral-950/60 border-neutral-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{eq}</span>
                      {isExec ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Paso {executingSequence?.currentStep}/{executingSequence?.totalSteps}
                        </span>
                      ) : isOn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {st?.isSequence ? 'SECUENCIA ACTIVA' : 'ON'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                          OFF
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-300 font-medium truncate mt-1">
                      {isExec
                        ? executingSequence?.commandName
                        : st?.activeCommandName || (isOn ? 'Encendido' : 'Apagado')}
                    </div>
                    {st && !isExec && (
                      <div className="text-[10px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                        {st.source === 'automation' ? (
                          <span className="inline-flex items-center gap-1 text-purple-300">
                            <Bot className="w-2.5 h-2.5" /> {st.ruleName || 'Auto'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-neutral-400">
                            <User className="w-2.5 h-2.5" /> Manual
                          </span>
                        )}
                        <span>• {formatRelativeTimeAr(st.updatedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {statusMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* CONSIGNAS AMBIENTALES: DÍA VS NOCHE */}
      {activeProfile && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6 border-b border-neutral-800 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  Consignas Ambientales: {activeProfile.name}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    linkedRulesCount > 0
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {linkedRulesCount} {linkedRulesCount === 1 ? 'regla vinculada' : 'reglas vinculadas'} a estas consignas
                </span>
              </div>
              <p className="text-sm text-neutral-400 mt-1">
                Cerebro central Día/Noche: al guardar o cambiar de perfil, las reglas vinculadas actualizan sus umbrales automáticamente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {profiles.length > 0 && (
                <select
                  value={activeProfile.id}
                  onChange={e => handleSwitchActiveProfile(e.target.value)}
                  disabled={saving}
                  className="bg-neutral-950 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  title="Cambiar perfil ambiental activo"
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.is_active ? '🟢 ' : ''}
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setIsNewProfileOpen(true)}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-blue-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Nuevo Perfil
              </button>

              {profiles.length > 1 && (
                <select
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) {
                      handleDeleteProfile(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-neutral-950 border border-neutral-800 text-neutral-400 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                  title="Eliminar un perfil inactivo"
                >
                  <option value="">Eliminar inactivo...</option>
                  {profiles
                    .filter(p => !p.is_active)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        🗑️ {p.name}
                      </option>
                    ))}
                </select>
              )}

              <button
                onClick={() => handleSaveProfile(activeProfile)}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar Consignas'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PERFIL DÍA */}
            <div className="bg-neutral-950/60 border border-amber-900/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-amber-400 border-b border-neutral-800/80 pb-2">
                <Sun className="w-5 h-5" />
                <h4 className="font-bold text-base">FOTOPERIODO DÍA (Luces ON)</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Temperatura Rango (°C) — Mín / Máx</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={activeProfile.day_temp_min}
                      onChange={e => updateActiveProfileField({ day_temp_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínima"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={activeProfile.day_temp_max}
                      onChange={e => updateActiveProfileField({ day_temp_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máxima"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Humedad Relativa Rango (%) — Mín / Máx</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="1"
                      value={activeProfile.day_humidity_min}
                      onChange={e => updateActiveProfileField({ day_humidity_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínima"
                    />
                    <input
                      type="number"
                      step="1"
                      value={activeProfile.day_humidity_max}
                      onChange={e => updateActiveProfileField({ day_humidity_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máxima"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">VPD Foliar Objetivo (kPa) — Mín / Máx</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.05"
                      value={activeProfile.day_vpd_min}
                      onChange={e => updateActiveProfileField({ day_vpd_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínimo"
                    />
                    <input
                      type="number"
                      step="0.05"
                      value={activeProfile.day_vpd_max}
                      onChange={e => updateActiveProfileField({ day_vpd_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máximo"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PERFIL NOCHE */}
            <div className="bg-neutral-950/60 border border-indigo-900/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4 text-indigo-400 border-b border-neutral-800/80 pb-2">
                <Moon className="w-5 h-5" />
                <h4 className="font-bold text-base">FOTOPERIODO NOCHE (Luces OFF)</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Temperatura Rango (°C) — Mín / Máx</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={activeProfile.night_temp_min}
                      onChange={e => updateActiveProfileField({ night_temp_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínima"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={activeProfile.night_temp_max}
                      onChange={e => updateActiveProfileField({ night_temp_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máxima"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Humedad Relativa Rango (%) — Mín / Máx</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="1"
                      value={activeProfile.night_humidity_min}
                      onChange={e => updateActiveProfileField({ night_humidity_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínima"
                    />
                    <input
                      type="number"
                      step="1"
                      value={activeProfile.night_humidity_max}
                      onChange={e => updateActiveProfileField({ night_humidity_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máxima"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">VPD Foliar Objetivo (kPa) — Mín / Máx</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.05"
                      value={activeProfile.night_vpd_min}
                      onChange={e => updateActiveProfileField({ night_vpd_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínimo"
                    />
                    <input
                      type="number"
                      step="0.05"
                      value={activeProfile.night_vpd_max}
                      onChange={e => updateActiveProfileField({ night_vpd_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máximo"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGLAS DE AUTOMATIZACION */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Reglas de Automatización Broadlink (Motor por Prioridad)
            </h3>
            <p className="text-sm text-neutral-400 mt-1">
              Vincula las lecturas de los Shelly con las Consignas del perfil activo, prioridad entre modos y protección de compresor.
            </p>
          </div>
          <button
            onClick={openNewRuleModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-md flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nueva Regla
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 border border-dashed border-neutral-800 rounded-xl text-center text-neutral-500">
            No hay reglas configuradas aún. Haz clic en &quot;Nueva Regla&quot; para crear la primera.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map(rule => {
              const matchedCmd =
                commands.find(c => c.id === rule.command_id) || rule.broadlink_commands;
              const cmdMeta = matchedCmd ? parseCommandMeta(matchedCmd) : null;
              const equipName = cmdMeta?.equipment || 'Climatizador';
              const effAction =
                rule.action_type === 'deactivate'
                  ? 'deactivate'
                  : rule.action_type === 'activate'
                  ? 'activate'
                  : cmdMeta?.powerEffect === 'off'
                  ? 'deactivate'
                  : 'activate';

              const primaryDesc = describeCondition(
                rule.target_parameter,
                rule.condition,
                rule.threshold_source || 'manual',
                rule.threshold_value,
                rule.hysteresis,
                activeProfile
              );

              const secondaryDesc = rule.secondary_parameter
                ? describeCondition(
                    rule.secondary_parameter,
                    rule.secondary_condition || 'gte',
                    rule.secondary_threshold_source || 'profile_min',
                    rule.secondary_threshold_value,
                    0,
                    activeProfile
                  )
                : null;

              const isLinkedToProfile =
                (rule.threshold_source && rule.threshold_source !== 'manual') ||
                (rule.secondary_parameter && rule.secondary_threshold_source && rule.secondary_threshold_source !== 'manual');

              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    rule.is_active
                      ? 'bg-neutral-950/80 border-neutral-800'
                      : 'bg-neutral-950/40 border-neutral-900 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700/50 text-blue-300 text-[11px] font-bold font-mono">
                            P{rule.priority ?? 10}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-medium inline-flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-blue-400" />
                            {equipName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              effAction === 'deactivate'
                                ? 'bg-red-950/50 text-red-300 border-red-800/50'
                                : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                            }`}
                          >
                            {effAction === 'deactivate' ? '🔴 Apaga Equipo' : '🟢 Activa / Modo'}
                          </span>
                          {isLinkedToProfile && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 text-[10px] inline-flex items-center gap-1">
                              <Link2 className="w-2.5 h-2.5" /> Consigna
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              rule.is_active
                                ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                                : 'bg-neutral-600'
                            }`}
                          />
                          <h4 className="font-bold text-white text-base truncate">{rule.name}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleRule(rule.id, rule.is_active)}
                          className={`text-xs px-2.5 py-1 rounded font-medium ${
                            rule.is_active
                              ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {rule.is_active ? 'ACTIVA' : 'PAUSADA'}
                        </button>
                        <button
                          onClick={() => openEditRuleModal(rule)}
                          className="text-neutral-400 hover:text-blue-400 transition-colors p-1.5"
                          title="Editar regla / Vincular a Consignas"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-neutral-500 hover:text-red-400 transition-colors p-1.5"
                          title="Eliminar regla"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-neutral-300 my-3 bg-neutral-900/60 p-3 rounded-lg border border-neutral-800/50">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-neutral-500 shrink-0">Condición 1:</span>
                          <span className="font-mono font-medium text-amber-300 text-right">
                            {primaryDesc.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 text-right mt-0.5">
                          {primaryDesc.resolvedPreview}
                        </div>
                      </div>

                      {secondaryDesc && (
                        <div className="pt-1.5 border-t border-neutral-800/70">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-blue-400 font-semibold shrink-0">Y (AND):</span>
                            <span className="font-mono font-medium text-blue-300 text-right">
                              {secondaryDesc.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 text-right mt-0.5">
                            {secondaryDesc.resolvedPreview}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between pt-1.5 border-t border-neutral-800/70">
                        <span className="text-neutral-500">Fotoperiodo:</span>
                        <span className="capitalize">
                          {rule.mode === 'both'
                            ? 'Día y Noche'
                            : rule.mode === 'day'
                            ? '☀️ Solo Día'
                            : '🌙 Solo Noche'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Acción Broadlink:</span>
                        <span className="text-emerald-400 font-semibold truncate ml-2">
                          {rule.broadlink_commands?.name || 'Comando no asignado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Protección Compresor:</span>
                        <span>
                          Cooldown {rule.cooldown_minutes} min (Histéresis: {rule.hysteresis})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    Último disparo:{' '}
                    {rule.last_triggered_at
                      ? new Date(rule.last_triggered_at).toLocaleTimeString('es-AR')
                      : 'Nunca'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HISTORIAL RECIENTE DE ACCIONES */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-neutral-400" />
          Registro Histórico de Disparos Automáticos
        </h3>
        {logs.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay registros de disparos recientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950 text-neutral-500 uppercase tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="py-2.5 px-4">Hora</th>
                  <th className="py-2.5 px-4">Modo</th>
                  <th className="py-2.5 px-4">Evento / Causa</th>
                  <th className="py-2.5 px-4">Valor Medido</th>
                  <th className="py-2.5 px-4">Comando Emitido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-neutral-800/30">
                    <td className="py-2 px-4 font-mono">
                      {new Date(log.created_at).toLocaleTimeString('es-AR')}
                    </td>
                    <td className="py-2 px-4">
                      {log.mode === 'day' ? (
                        <span className="text-amber-400 font-semibold">☀️ DÍA</span>
                      ) : (
                        <span className="text-indigo-400 font-semibold">🌙 NOCHE</span>
                      )}
                    </td>
                    <td className="py-2 px-4">{log.event_description}</td>
                    <td className="py-2 px-4 font-mono font-medium text-emerald-400">
                      {log.triggered_value}
                    </td>
                    <td className="py-2 px-4 font-semibold text-white">{log.command_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NUEVO PERFIL DE CONSIGNAS */}
      {isNewProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                Nuevo Perfil de Consignas Ambientales
              </h3>
              <button
                onClick={() => setIsNewProfileOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-xs text-neutral-400 block mb-2">
                Plantillas Agronómicas Rápidas (1 clic):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROFILE_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setNewProfileForm({ ...preset, name: preset.label })}
                    className="text-left px-3 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200 transition-colors"
                  >
                    <div className="font-semibold text-emerald-400">{preset.label}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      ☀️ {preset.day_temp_min}–{preset.day_temp_max}°C / {preset.day_humidity_min}–{preset.day_humidity_max}%
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Nombre del Perfil</label>
                <input
                  type="text"
                  value={newProfileForm.name}
                  onChange={e => setNewProfileForm({ ...newProfileForm, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Ej. Floración Carpa 2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-950/60 p-4 rounded-xl border border-neutral-800">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sun className="w-4 h-4" /> DÍA (Luces ON)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={newProfileForm.day_temp_min}
                      onChange={e => setNewProfileForm({ ...newProfileForm, day_temp_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                      title="Temp Mín Día"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={newProfileForm.day_temp_max}
                      onChange={e => setNewProfileForm({ ...newProfileForm, day_temp_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                      title="Temp Máx Día"
                    />
                    <input
                      type="number"
                      step="1"
                      value={newProfileForm.day_humidity_min}
                      onChange={e => setNewProfileForm({ ...newProfileForm, day_humidity_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                      title="Hum Mín Día"
                    />
                    <input
                      type="number"
                      step="1"
                      value={newProfileForm.day_humidity_max}
                      onChange={e => setNewProfileForm({ ...newProfileForm, day_humidity_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                      title="Hum Máx Día"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Moon className="w-4 h-4" /> NOCHE (Luces OFF)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={newProfileForm.night_temp_min}
                      onChange={e => setNewProfileForm({ ...newProfileForm, night_temp_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                      title="Temp Mín Noche"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={newProfileForm.night_temp_max}
                      onChange={e => setNewProfileForm({ ...newProfileForm, night_temp_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                      title="Temp Máx Noche"
                    />
                    <input
                      type="number"
                      step="1"
                      value={newProfileForm.night_humidity_min}
                      onChange={e => setNewProfileForm({ ...newProfileForm, night_humidity_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                      title="Hum Mín Noche"
                    />
                    <input
                      type="number"
                      step="1"
                      value={newProfileForm.night_humidity_max}
                      onChange={e => setNewProfileForm({ ...newProfileForm, night_humidity_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                      title="Hum Máx Noche"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-neutral-800 pt-4">
              <button
                onClick={() => setIsNewProfileOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProfile}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"
              >
                {saving ? 'Creando...' : 'Crear y Activar Perfil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR REGLA */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {ruleForm.id ? 'Editar Regla de Automatización' : 'Nueva Regla de Automatización Climática'}
              </h3>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PLANTILLAS RÁPIDAS 3-EN-1 */}
            <div className="mb-5 bg-neutral-950/70 border border-neutral-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Plantillas Equipo 3-en-1 / Climatizador (vinculadas a Consignas por Prioridad):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyRuleTemplate('cool')}
                  className="px-2.5 py-2 rounded-lg bg-sky-950/40 hover:bg-sky-950/70 border border-sky-800/50 text-sky-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Snowflake className="w-3.5 h-3.5 shrink-0" />
                  <span>P1 Frío</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyRuleTemplate('heat')}
                  className="px-2.5 py-2 rounded-lg bg-orange-950/40 hover:bg-orange-950/70 border border-orange-800/50 text-orange-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  <span>P2 Calor</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyRuleTemplate('dry')}
                  className="px-2.5 py-2 rounded-lg bg-blue-950/40 hover:bg-blue-950/70 border border-blue-800/50 text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Droplets className="w-3.5 h-3.5 shrink-0" />
                  <span>P3 Deshum</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyRuleTemplate('off')}
                  className="px-2.5 py-2 rounded-lg bg-red-950/40 hover:bg-red-950/70 border border-red-800/50 text-red-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Power className="w-3.5 h-3.5 shrink-0" />
                  <span>P4 Apagar</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Nombre Descriptivo</label>
                <input
                  type="text"
                  placeholder="ej. Modo Frío sobre Máx Consigna"
                  value={ruleForm.name}
                  onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Fotoperiodo</label>
                  <select
                    value={ruleForm.mode}
                    onChange={e => setRuleForm({ ...ruleForm, mode: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="both">Día y Noche (Auto Consigna)</option>
                    <option value="day">☀️ Solo Día (Luz ON)</option>
                    <option value="night">🌙 Solo Noche (Luz OFF)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Prioridad (1 = Mayor)</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={ruleForm.priority}
                    onChange={e => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Efecto sobre Equipo</label>
                  <select
                    value={ruleForm.action_type}
                    onChange={e => setRuleForm({ ...ruleForm, action_type: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="activate">🟢 Encender / Cambiar Modo</option>
                    <option value="deactivate">🔴 Apagar Equipo</option>
                    <option value="auto">⚙️ Detectar según comando</option>
                  </select>
                </div>
              </div>

              {/* CONDICIÓN PRIMARIA */}
              <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Condición Principal
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Variable a Medir</label>
                    <select
                      value={ruleForm.target_parameter}
                      onChange={e => {
                        const nextParam = e.target.value;
                        setRuleForm(prev => ({
                          ...prev,
                          target_parameter: nextParam,
                          threshold_source:
                            nextParam === 'all_climate'
                              ? 'profile_in_range'
                              : prev.threshold_source,
                        }));
                      }}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="temperature">Temperatura (°C)</option>
                      <option value="humidity">Humedad Relativa (%)</option>
                      <option value="vpd">VPD Foliar (kPa)</option>
                      <option value="all_climate">Clima Completo (Temp + Hum dentro de Consigna)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Fuente del Umbral</label>
                    <select
                      value={ruleForm.threshold_source}
                      onChange={e => setRuleForm({ ...ruleForm, threshold_source: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      {ruleForm.target_parameter !== 'all_climate' && (
                        <>
                          <option value="profile_max">🔗 Máxima de Consigna (Día/Noche)</option>
                          <option value="profile_min">🔗 Mínima de Consigna (Día/Noche)</option>
                        </>
                      )}
                      <option value="profile_in_range">🔗 Dentro de Consigna (con histéresis)</option>
                      {ruleForm.target_parameter !== 'all_climate' && (
                        <option value="manual">🔢 Número Fijo Manual</option>
                      )}
                    </select>
                  </div>
                </div>

                {ruleForm.threshold_source !== 'profile_in_range' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">Operador</label>
                      <select
                        value={ruleForm.condition}
                        onChange={e => setRuleForm({ ...ruleForm, condition: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                      >
                        <option value="greater_than">Mayor que (&gt;)</option>
                        <option value="less_than">Menor que (&lt;)</option>
                        <option value="gte">Mayor o igual (&gt;=)</option>
                        <option value="lte">Menor o igual (&lt;=)</option>
                      </select>
                    </div>

                    {ruleForm.threshold_source === 'manual' && (
                      <div>
                        <label className="text-xs text-neutral-400 block mb-1">Valor Umbral Fijo</label>
                        <input
                          type="number"
                          step={ruleForm.target_parameter === 'vpd' ? '0.05' : '0.5'}
                          value={ruleForm.threshold_value}
                          onChange={e =>
                            setRuleForm({ ...ruleForm, threshold_value: parseFloat(e.target.value) })
                          }
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                {ruleForm.threshold_source !== 'manual' && (
                  <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2 text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      Límites en vivo ({activeProfile?.name}):
                    </span>
                    <span className="font-mono">{primaryModalPreview.resolvedPreview}</span>
                  </div>
                )}
              </div>

              {/* 2ª CONDICIÓN COMBINADA (Y / AND) */}
              <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-blue-300">
                  <input
                    type="checkbox"
                    checked={ruleForm.hasSecondary}
                    onChange={e => setRuleForm({ ...ruleForm, hasSecondary: e.target.checked })}
                    className="rounded border-neutral-700 bg-neutral-900 text-blue-500"
                  />
                  Agregar 2ª Condición combinada (&quot;Y&quot; / AND) — Útil para Deshumidificar solo si no hace frío
                </label>

                {ruleForm.hasSecondary && (
                  <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-neutral-400 block mb-1">2ª Variable</label>
                        <select
                          value={ruleForm.secondary_parameter}
                          onChange={e =>
                            setRuleForm({ ...ruleForm, secondary_parameter: e.target.value })
                          }
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-white text-xs"
                        >
                          <option value="temperature">Temperatura (°C)</option>
                          <option value="humidity">Humedad (%)</option>
                          <option value="vpd">VPD Foliar (kPa)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-neutral-400 block mb-1">Condición</label>
                        <select
                          value={ruleForm.secondary_condition}
                          onChange={e =>
                            setRuleForm({ ...ruleForm, secondary_condition: e.target.value })
                          }
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-white text-xs"
                        >
                          <option value="gte">Mayor o igual (&gt;=)</option>
                          <option value="greater_than">Mayor que (&gt;)</option>
                          <option value="lte">Menor o igual (&lt;=)</option>
                          <option value="less_than">Menor que (&lt;)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-neutral-400 block mb-1">Fuente Umbral 2</label>
                        <select
                          value={ruleForm.secondary_threshold_source}
                          onChange={e =>
                            setRuleForm({ ...ruleForm, secondary_threshold_source: e.target.value })
                          }
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-white text-xs"
                        >
                          <option value="profile_min">🔗 Mínima de Consigna</option>
                          <option value="profile_max">🔗 Máxima de Consigna</option>
                          <option value="manual">🔢 Número Manual</option>
                        </select>
                      </div>
                    </div>

                    {ruleForm.secondary_threshold_source === 'manual' ? (
                      <div>
                        <label className="text-xs text-neutral-400 block mb-1">Valor Fijo 2ª Condición</label>
                        <input
                          type="number"
                          step={ruleForm.secondary_parameter === 'vpd' ? '0.05' : '0.5'}
                          value={ruleForm.secondary_threshold_value}
                          onChange={e =>
                            setRuleForm({
                              ...ruleForm,
                              secondary_threshold_value: parseFloat(e.target.value),
                            })
                          }
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm"
                        />
                      </div>
                    ) : (
                      secondaryModalPreview && (
                        <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg px-3 py-2 text-xs text-blue-300 flex flex-wrap items-center justify-between gap-2">
                          <span>Límite 2ª condición ({activeProfile?.name}):</span>
                          <span className="font-mono">{secondaryModalPreview.resolvedPreview}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Histéresis (Margen de retorno a rango)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={ruleForm.hysteresis}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, hysteresis: parseFloat(e.target.value) })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Protección Compresor (Minutos)
                  </label>
                  <input
                    type="number"
                    value={ruleForm.cooldown_minutes}
                    onChange={e =>
                      setRuleForm({ ...ruleForm, cooldown_minutes: parseInt(e.target.value, 10) })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  Comando o Secuencia Broadlink a Disparar
                </label>
                <select
                  value={ruleForm.command_id}
                  onChange={e => setRuleForm({ ...ruleForm, command_id: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-medium text-emerald-400"
                >
                  <option value="">Selecciona un comando / secuencia...</option>
                  {(() => {
                    const macros = commands.filter(c => c.hex_code?.startsWith('MACRO:'));
                    const singles = commands.filter(c => !c.hex_code?.startsWith('MACRO:'));
                    const groups: Record<string, Array<{ cmd: any; order: number }>> = {};
                    singles.forEach((cmd, idx) => {
                      const meta = parseCommandMeta(cmd, idx);
                      if (!groups[meta.equipment]) groups[meta.equipment] = [];
                      groups[meta.equipment].push({ cmd, order: meta.order });
                    });
                    Object.keys(groups).forEach(eq => {
                      groups[eq].sort((a, b) => a.order - b.order);
                    });

                    return (
                      <>
                        {macros.length > 0 && (
                          <optgroup label="🔄 Secuencias Guardadas (Macros)">
                            {macros.map(cmd => {
                              const mMeta = parseCommandMeta(cmd);
                              return (
                                <option key={cmd.id} value={cmd.id}>
                                  🔄 [{mMeta.equipment}] {cmd.name}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        {Object.entries(groups).map(([eq, list]) => (
                          <optgroup key={eq} label={`📦 Equipo: ${eq}`}>
                            {list.map((item, idx) => (
                              <option key={item.cmd.id} value={item.cmd.id}>
                                #{idx + 1} ⚡ [{eq}] {item.cmd.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </>
                    );
                  })()}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-neutral-800 pt-4">
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRule}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"
              >
                {saving ? 'Guardando...' : ruleForm.id ? 'Guardar Cambios' : 'Crear Regla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
