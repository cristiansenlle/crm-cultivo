"use client";

import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, Thermometer, Droplets, Activity, Zap, Play, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, Plus, Trash2, Sliders, ShieldCheck 
} from 'lucide-react';
import { parseCommandMeta } from './BroadlinkPanel';

export default function ClimateAutomationPanel() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [commands, setCommands] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<any>(null);
  const [isLightOn, setIsLightOn] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Modal para nueva regla
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    mode: 'both',
    target_parameter: 'temperature',
    condition: 'greater_than',
    threshold_value: 26.5,
    hysteresis: 1.5,
    cooldown_minutes: 10,
    command_id: '',
    is_active: true
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/iot/climate-automation');
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles || []);
        const active = data.profiles?.find((p: any) => p.is_active) || data.profiles?.[0] || null;
        setActiveProfile(active);
        setRules(data.rules || []);
        setCommands(data.commands || []);
        setLogs(data.logs || []);
        setLatestTelemetry(data.latestTelemetry || null);
        if (typeof data.isLightOn === 'boolean') {
          setIsLightOn(data.isLightOn);
        }
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

  const handleSaveProfile = async (updatedProfile: any) => {
    setSaving(true);
    try {
      const res = await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_profile', profile: updatedProfile })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg("Consignas ambientales guardadas exitosamente.");
        setTimeout(() => setStatusMsg(""), 3000);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_rule', ruleId, isActive: !currentStatus })
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
        body: JSON.stringify({ action: 'delete_rule', ruleId })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.command_id) {
      alert("Por favor completa el nombre y selecciona un comando o secuencia.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/iot/climate-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_rule',
          rule: { ...newRule, profile_id: activeProfile?.id }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsRuleModalOpen(false);
        setNewRule({
          name: '',
          mode: 'both',
          target_parameter: 'temperature',
          condition: 'greater_than',
          threshold_value: 26.5,
          hysteresis: 1.5,
          cooldown_minutes: 10,
          command_id: '',
          is_active: true
        });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-neutral-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-500" />
        Cargando sistema de automatización climática...
      </div>
    );
  }

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
              Reglas de {isLightOn ? 'DÍA' : 'NOCHE'} activas
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

      {statusMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {statusMsg}
        </div>
      )}

      {/* CONSIGNAS AMBIENTALES: DÍA VS NOCHE */}
      {activeProfile && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                Consignas Ambientales: {activeProfile.name}
              </h3>
              <p className="text-sm text-neutral-400 mt-1">
                Límites automáticos que determinan cuándo activar el climatizador o aire portátil.
              </p>
            </div>
            <button
              onClick={() => handleSaveProfile(activeProfile)}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Consignas'}
            </button>
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
                  <label className="text-xs text-neutral-400 block mb-1">Temperatura Rango (°C)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={activeProfile.day_temp_min}
                      onChange={e => setActiveProfile({ ...activeProfile, day_temp_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínima"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={activeProfile.day_temp_max}
                      onChange={e => setActiveProfile({ ...activeProfile, day_temp_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máxima"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Humedad Relativa Rango (%)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="1"
                      value={activeProfile.day_humidity_min}
                      onChange={e => setActiveProfile({ ...activeProfile, day_humidity_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínima"
                    />
                    <input
                      type="number"
                      step="1"
                      value={activeProfile.day_humidity_max}
                      onChange={e => setActiveProfile({ ...activeProfile, day_humidity_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máxima"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">VPD Foliar Objetivo (kPa)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.05"
                      value={activeProfile.day_vpd_min}
                      onChange={e => setActiveProfile({ ...activeProfile, day_vpd_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínimo"
                    />
                    <input
                      type="number"
                      step="0.05"
                      value={activeProfile.day_vpd_max}
                      onChange={e => setActiveProfile({ ...activeProfile, day_vpd_max: parseFloat(e.target.value) })}
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
                  <label className="text-xs text-neutral-400 block mb-1">Temperatura Rango (°C)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={activeProfile.night_temp_min}
                      onChange={e => setActiveProfile({ ...activeProfile, night_temp_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínima"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={activeProfile.night_temp_max}
                      onChange={e => setActiveProfile({ ...activeProfile, night_temp_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máxima"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Humedad Relativa Rango (%)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="1"
                      value={activeProfile.night_humidity_min}
                      onChange={e => setActiveProfile({ ...activeProfile, night_humidity_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínima"
                    />
                    <input
                      type="number"
                      step="1"
                      value={activeProfile.night_humidity_max}
                      onChange={e => setActiveProfile({ ...activeProfile, night_humidity_max: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Máxima"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">VPD Foliar Objetivo (kPa)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.05"
                      value={activeProfile.night_vpd_min}
                      onChange={e => setActiveProfile({ ...activeProfile, night_vpd_min: parseFloat(e.target.value) })}
                      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white text-sm"
                      placeholder="Mínimo"
                    />
                    <input
                      type="number"
                      step="0.05"
                      value={activeProfile.night_vpd_max}
                      onChange={e => setActiveProfile({ ...activeProfile, night_vpd_max: parseFloat(e.target.value) })}
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Reglas de Automatización Broadlink
            </h3>
            <p className="text-sm text-neutral-400 mt-1">
              Vincula las lecturas de los Shelly con los comandos o secuencias aprendidas del RM4.
            </p>
          </div>
          <button
            onClick={() => setIsRuleModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Regla
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 border border-dashed border-neutral-800 rounded-xl text-center text-neutral-500">
            No hay reglas configuradas aún. Haz clic en "Nueva Regla" para crear la primera.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map(rule => (
              <div 
                key={rule.id} 
                className={`p-4 rounded-xl border transition-all ${rule.is_active ? 'bg-neutral-950/80 border-neutral-800' : 'bg-neutral-950/40 border-neutral-900 opacity-60'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${rule.is_active ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-neutral-600'}`} />
                    <h4 className="font-bold text-white text-base">{rule.name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                      className={`text-xs px-2.5 py-1 rounded font-medium ${rule.is_active ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' : 'bg-neutral-800 text-neutral-400'}`}
                    >
                      {rule.is_active ? 'ACTIVA' : 'PAUSADA'}
                    </button>
                    <button 
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-300 my-3 bg-neutral-900/60 p-3 rounded-lg border border-neutral-800/50">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Condición:</span>
                    <span className="font-mono font-medium text-amber-300">
                      {rule.target_parameter.toUpperCase()} {rule.condition === 'greater_than' ? '>' : '<'} {rule.threshold_value} {rule.target_parameter === 'temperature' ? '°C' : rule.target_parameter === 'humidity' ? '%' : 'kPa'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Modo:</span>
                    <span className="capitalize">{rule.mode === 'both' ? 'Día y Noche' : rule.mode === 'day' ? '☀️ Solo Día' : '🌙 Solo Noche'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Acción Broadlink:</span>
                    <span className="text-emerald-400 font-semibold">{rule.broadlink_commands?.name || 'Comando no asignado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Protección Compresor:</span>
                    <span>Cooldown {rule.cooldown_minutes} min (Histéresis: {rule.hysteresis})</span>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-2">
                  <Clock className="w-3.5 h-3.5" />
                  Último disparo: {rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleTimeString('es-AR') : 'Nunca'}
                </div>
              </div>
            ))}
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
                    <td className="py-2 px-4 font-mono">{new Date(log.created_at).toLocaleTimeString('es-AR')}</td>
                    <td className="py-2 px-4">
                      {log.mode === 'day' ? <span className="text-amber-400 font-semibold">☀️ DÍA</span> : <span className="text-indigo-400 font-semibold">🌙 NOCHE</span>}
                    </td>
                    <td className="py-2 px-4">{log.event_description}</td>
                    <td className="py-2 px-4 font-mono font-medium text-emerald-400">{log.triggered_value}</td>
                    <td className="py-2 px-4 font-semibold text-white">{log.command_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR NUEVA REGLA */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Nueva Regla de Automatización Climática</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Nombre Descriptivo</label>
                <input
                  type="text"
                  placeholder="ej. Enfriar por Calor Extremo en Día"
                  value={newRule.name}
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Fotoperiodo</label>
                  <select
                    value={newRule.mode}
                    onChange={e => setNewRule({ ...newRule, mode: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="both">Día y Noche</option>
                    <option value="day">☀️ Solo Día (Luz ON)</option>
                    <option value="night">🌙 Solo Noche (Luz OFF)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Variable a Medir</label>
                  <select
                    value={newRule.target_parameter}
                    onChange={e => setNewRule({ ...newRule, target_parameter: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="temperature">Temperatura (°C)</option>
                    <option value="humidity">Humedad Relativa (%)</option>
                    <option value="vpd">VPD Foliar (kPa)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Condición</label>
                  <select
                    value={newRule.condition}
                    onChange={e => setNewRule({ ...newRule, condition: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="greater_than">Mayor que (&gt;)</option>
                    <option value="less_than">Menor que (&lt;)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Valor Umbral</label>
                  <input
                    type="number"
                    step={newRule.target_parameter === 'vpd' ? '0.05' : '0.5'}
                    value={newRule.threshold_value}
                    onChange={e => setNewRule({ ...newRule, threshold_value: parseFloat(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Histéresis (Margen apagado)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newRule.hysteresis}
                    onChange={e => setNewRule({ ...newRule, hysteresis: parseFloat(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Protección Compresor (Minutos)</label>
                  <input
                    type="number"
                    value={newRule.cooldown_minutes}
                    onChange={e => setNewRule({ ...newRule, cooldown_minutes: parseInt(e.target.value) })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Comando o Secuencia Broadlink a Disparar</label>
                <select
                  value={newRule.command_id}
                  onChange={e => setNewRule({ ...newRule, command_id: e.target.value })}
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
                            {macros.map(cmd => (
                              <option key={cmd.id} value={cmd.id}>
                                🔄 {cmd.name}
                              </option>
                            ))}
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
                onClick={handleCreateRule}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"
              >
                {saving ? 'Guardando...' : 'Crear Regla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
