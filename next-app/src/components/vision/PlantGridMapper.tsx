'use client';
import React, { useState, useEffect } from 'react';
import {
    Grid,
    Leaf,
    Sparkles,
    Save,
    CheckCircle2,
    Cpu,
    Droplets,
    Scissors,
    Award,
    AlertTriangle,
    Layers,
    RefreshCw,
    Eye
} from 'lucide-react';
import { PlantGridLayout, PlantZoneConfig, PerPlantAnalysis } from '@/lib/vision/PlantGridStore';

interface PlantGridMapperProps {
    latestImageUrl?: string | null;
    cropDetected?: boolean;
}

export default function PlantGridMapper({ latestImageUrl, cropDetected = false }: PlantGridMapperProps) {
    const [grid, setGrid] = useState<PlantGridLayout | null>(null);
    const [availableStrains, setAvailableStrains] = useState<string[]>([]);
    const [perPlantResults, setPerPlantResults] = useState<PerPlantAnalysis[]>([]);
    const [selectedZoneId, setSelectedZoneId] = useState<string>('A1');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [showOverlayMetrics, setShowOverlayMetrics] = useState(true);

    const fetchGridData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/vision/grid');
            if (res.ok) {
                const data = await res.json();
                setGrid(data.grid);
                setAvailableStrains(data.available_strains || []);
                setPerPlantResults(data.latest_per_plant || []);
                if (data.grid?.zones?.length > 0 && !selectedZoneId) {
                    setSelectedZoneId(data.grid.zones[0].zone_id);
                }
            }
        } catch (err) {
            console.error('Error cargando mapa de plantas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGridData();
    }, []);

    const handleResizeGrid = async (rows: number, cols: number) => {
        setSaving(true);
        try {
            const res = await fetch('/api/vision/grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resize', rows, cols })
            });
            if (res.ok) {
                const data = await res.json();
                setGrid(data.grid);
                setSelectedZoneId(data.grid.zones[0]?.zone_id || 'A1');
                setSaveMessage(`Cuadrícula ajustada a ${rows}x${cols} (${rows * cols} zonas)`);
                setTimeout(() => setSaveMessage(''), 3500);
            }
        } catch (err) {
            console.error('Error redimensionando grilla:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveGrid = async () => {
        if (!grid) return;
        setSaving(true);
        try {
            const res = await fetch('/api/vision/grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grid })
            });
            if (res.ok) {
                const data = await res.json();
                setGrid(data.grid);
                setSaveMessage('✅ Mapa de plantas y genéticas guardado en el Agente de Visión');
                setTimeout(() => setSaveMessage(''), 4000);
            }
        } catch (err) {
            console.error('Error guardando mapa:', err);
        } finally {
            setSaving(false);
        }
    };

    const updateSelectedZone = (patch: Partial<PlantZoneConfig>) => {
        if (!grid) return;
        const updatedZones = grid.zones.map(z =>
            z.zone_id === selectedZoneId ? { ...z, ...patch } : z
        );
        setGrid({ ...grid, zones: updatedZones });
    };

    if (loading || !grid) {
        return (
            <div className="p-12 rounded-2xl bg-panel-base border border-panel-border text-center text-sm text-zinc-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                Cargando mapeo espacial de cuadrícula y perfiles genéticos...
            </div>
        );
    }

    const selectedZone = grid.zones.find(z => z.zone_id === selectedZoneId) || grid.zones[0];
    const selectedPlantAnalysis = perPlantResults.find(p => p.zone_id === selectedZone?.zone_id);

    // Agrupar por genética para resumen multigenética
    const strainGroups = grid.zones
        .filter(z => z.active)
        .reduce((acc: Record<string, PlantZoneConfig[]>, z) => {
            const key = z.strain || 'Sin especificar';
            if (!acc[key]) acc[key] = [];
            acc[key].push(z);
            return acc;
        }, {});

    const getBiotypeBadge = (biotype: PlantZoneConfig['biotype']) => {
        switch (biotype) {
            case 'INDICA_DOMINANT':
                return { label: 'Indica (Hoja Ancha)', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
            case 'SATIVA_DOMINANT':
                return { label: 'Sativa (Hoja Fina / Stretch)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
            case 'AUTOFLOWER':
                return { label: 'Autofloreciente', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
            default:
                return { label: 'Híbrido 50/50', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
        }
    };

    const getHarvestStatusBadge = (status?: PerPlantAnalysis['harvest_status']) => {
        switch (status) {
            case 'READY_TO_CHOP':
                return { label: 'Lista para Cosecha', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
            case 'FLUSH_WINDOW':
                return { label: 'Ventana de Lavado (Flush)', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
            case 'OVERRIPE_RISK':
                return { label: 'Riesgo Sobremaduración', color: 'bg-red-500/20 text-red-300 border-red-500/40' };
            case 'DEVELOPING':
                return { label: 'Engorde Floral Activo', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
            default:
                return { label: 'En Crecimiento / Monitoreo', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Barra de Controles del Mapa Espacial */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                        <Grid className="w-5 h-5 text-emerald-400" />
                        <span>Mapeo Espacial de Plantas Individuales y Multigenética</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Divide la vista cenital de 120° en cuadrantes fijos para que la IA identifique cada planta, calibre las genéticas y planifique cosechas escalonadas.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs">
                        {[
                            { r: 1, c: 2, label: '1×2 (2 pl)' },
                            { r: 2, c: 2, label: '2×2 (4 pl)' },
                            { r: 2, c: 3, label: '2×3 (6 pl)' },
                            { r: 3, c: 3, label: '3×3 (9 pl)' },
                            { r: 3, c: 4, label: '3×4 (12 pl)' }
                        ].map(preset => {
                            const active = grid.grid_rows === preset.r && grid.grid_cols === preset.c;
                            return (
                                <button
                                    key={preset.label}
                                    onClick={() => handleResizeGrid(preset.r, preset.c)}
                                    disabled={saving}
                                    className={`px-2.5 py-1.5 rounded-lg font-mono transition-all cursor-pointer ${
                                        active
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setShowOverlayMetrics(!showOverlayMetrics)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                    >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{showOverlayMetrics ? 'Ocultar Etiquetas' : 'Ver Etiquetas'}</span>
                    </button>

                    <button
                        onClick={handleSaveGrid}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Guardando...' : 'Guardar Mapa'}</span>
                    </button>
                </div>
            </div>

            {saveMessage && (
                <div className="px-4 py-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{saveMessage}</span>
                </div>
            )}

            {/* Cuerpo Principal: Imagen Cenital con Grilla Interactiva + Editor de Planta */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Columna Izquierda (7 cols): Visor Cenital con Cuadrícula Superpuesta */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl">
                        <img
                            src={latestImageUrl || '/captures/cenital_2026-09-17T23-55-54-760Z.jpg'}
                            alt="Vista Cenital con Cuadrícula de Plantas"
                            className="w-full h-full object-cover opacity-85"
                        />

                        {/* Grilla Espacial Interactiva */}
                        <div
                            className="absolute inset-0 grid"
                            style={{
                                gridTemplateRows: `repeat(${grid.grid_rows}, minmax(0, 1fr))`,
                                gridTemplateColumns: `repeat(${grid.grid_cols}, minmax(0, 1fr))`
                            }}
                        >
                            {grid.zones.map(zone => {
                                const isSelected = zone.zone_id === selectedZone?.zone_id;
                                const plantDiag = perPlantResults.find(p => p.zone_id === zone.zone_id);

                                return (
                                    <div
                                        key={zone.zone_id}
                                        onClick={() => setSelectedZoneId(zone.zone_id)}
                                        className={`relative border transition-all cursor-pointer flex flex-col justify-between p-2.5 select-none ${
                                            isSelected
                                                ? 'border-2 border-emerald-400 bg-emerald-500/15 shadow-[inset_0_0_25px_rgba(16,185,129,0.25)]'
                                                : zone.active
                                                ? 'border-white/25 bg-black/25 hover:bg-emerald-950/30 hover:border-emerald-400/60'
                                                : 'border-white/10 bg-black/60 opacity-50'
                                        }`}
                                    >
                                        {/* Cabecera del Cuadrante */}
                                        <div className="flex items-start justify-between gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                                                        isSelected
                                                            ? 'bg-emerald-400 text-zinc-950'
                                                            : 'bg-black/75 text-emerald-400 border border-emerald-500/40'
                                                    }`}
                                                >
                                                    {zone.zone_id}
                                                </span>
                                                {zone.active && showOverlayMetrics && (
                                                    <span className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[11px] font-bold text-white truncate max-w-[130px]">
                                                        {zone.plant_name}
                                                    </span>
                                                )}
                                            </div>

                                            {zone.active && zone.natural_anthocyanins && showOverlayMetrics && (
                                                <span
                                                    className="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-500/40 text-purple-300 text-[9px] font-mono"
                                                    title="Genética con antocianinas naturales (tonos púrpura normales en flora)"
                                                >
                                                    💜 Antocianina
                                                </span>
                                            )}
                                        </div>

                                        {/* Pie del Cuadrante: Genética + Telemetría Individual */}
                                        {zone.active && showOverlayMetrics ? (
                                            <div className="flex flex-col gap-1 mt-auto">
                                                <div className="flex items-center justify-between gap-1 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                                    <span className="text-[10px] font-mono text-emerald-300 truncate">
                                                        🌿 {zone.strain}
                                                    </span>
                                                    {zone.bio_channel !== 'NONE' && (
                                                        <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                            ⚡ {zone.bio_channel}
                                                        </span>
                                                    )}
                                                </div>

                                                {cropDetected && plantDiag && (
                                                    <div className="flex items-center justify-between gap-1 bg-emerald-950/90 px-2 py-1 rounded-lg border border-emerald-500/30 text-[10px] font-mono">
                                                        <span className="text-emerald-300 font-bold">
                                                            ♥ {plantDiag.health_score}/100
                                                        </span>
                                                        <span className="text-cyan-300">
                                                            🌸 {plantDiag.bud_count} colas
                                                        </span>
                                                        <span className="text-amber-300">
                                                            ⏳ {plantDiag.maturity_pct}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : !zone.active ? (
                                            <div className="m-auto text-[10px] font-mono text-zinc-500 bg-black/70 px-2 py-1 rounded">
                                                Cuadrante Vacío
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Ajustes de Malla SCROG debajo del visor */}
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-zinc-200 font-medium">
                            <input
                                type="checkbox"
                                checked={grid.scrog_net_installed}
                                onChange={e => setGrid({ ...grid, scrog_net_installed: e.target.checked })}
                                className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span>Malla SCROG Instalada en esta Sala</span>
                        </label>

                        <div className="flex items-center gap-3">
                            <span className="text-zinc-400">Meta de Cobertura para pasar a 12/12:</span>
                            <input
                                type="number"
                                min={40}
                                max={95}
                                value={grid.target_flip_coverage_pct}
                                onChange={e => setGrid({ ...grid, target_flip_coverage_pct: Number(e.target.value) || 72 })}
                                className="w-16 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-emerald-400 font-mono font-bold text-center"
                            />
                            <span className="text-zinc-500 font-mono">%</span>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha (5 cols): Editor de Planta Individual Seleccionada */}
                <div className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-black text-sm">
                                    Zona {selectedZone.zone_id}
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-100">
                                        Ficha Individual de Planta y Genética
                                    </h3>
                                    <p className="text-[11px] text-zinc-400">
                                        Fila {selectedZone.row + 1}, Columna {selectedZone.col + 1} en la vista cenital
                                    </p>
                                </div>
                            </div>

                            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedZone.active}
                                    onChange={e => updateSelectedZone({ active: e.target.checked })}
                                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-500"
                                />
                                <span>Activa</span>
                            </label>
                        </div>

                        {selectedZone.active ? (
                            <div className="flex flex-col gap-3.5 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-zinc-400 font-medium">Nombre / Etiqueta de Planta</label>
                                        <input
                                            type="text"
                                            value={selectedZone.plant_name}
                                            onChange={e => updateSelectedZone({ plant_name: e.target.value })}
                                            placeholder="Ej. Nicole Punch #1"
                                            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:border-emerald-500 outline-none"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-zinc-400 font-medium">Genética / Cepa</label>
                                        <input
                                            type="text"
                                            list="strains-list"
                                            value={selectedZone.strain}
                                            onChange={e => updateSelectedZone({ strain: e.target.value })}
                                            placeholder="Ej. Nicole Punch"
                                            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-300 font-semibold focus:border-emerald-500 outline-none"
                                        />
                                        <datalist id="strains-list">
                                            {availableStrains.map(s => (
                                                <option key={s} value={s} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-zinc-400 font-medium">Biotipo Morfológico</label>
                                        <select
                                            value={selectedZone.biotype}
                                            onChange={e => updateSelectedZone({ biotype: e.target.value as any })}
                                            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 outline-none"
                                        >
                                            <option value="INDICA_DOMINANT">Indica Dominante (Hoja Ancha)</option>
                                            <option value="HYBRID_50_50">Híbrido Equilibrado 50/50</option>
                                            <option value="SATIVA_DOMINANT">Sativa Dominante (Hoja Fina / Alto Stretch)</option>
                                            <option value="AUTOFLOWER">Autofloreciente</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-zinc-400 font-medium">Días de Floración Estimados</label>
                                        <input
                                            type="number"
                                            min={45}
                                            max={110}
                                            value={selectedZone.expected_flowering_days}
                                            onChange={e => updateSelectedZone({ expected_flowering_days: Number(e.target.value) || 60 })}
                                            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Regla de Antocianinas */}
                                <label className="p-3 rounded-xl bg-purple-950/25 border border-purple-500/30 flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedZone.natural_anthocyanins}
                                        onChange={e => updateSelectedZone({ natural_anthocyanins: e.target.checked })}
                                        className="mt-0.5 rounded border-purple-500/50 bg-zinc-900 text-purple-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-purple-300">
                                            Genética con Antocianinas Naturales (Tonos Púrpura/Violeta)
                                        </span>
                                        <span className="text-[11px] text-zinc-400">
                                            Evita que la IA confunda la coloración morada genética de esta cepa con una deficiencia de Fósforo (P) o estrés por frío.
                                        </span>
                                    </div>
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-zinc-400 font-medium flex items-center gap-1">
                                            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                                            <span>Sensor de Suelo en Maceta</span>
                                        </label>
                                        <select
                                            value={selectedZone.soil_sensor_pin}
                                            onChange={e => updateSelectedZone({ soil_sensor_pin: e.target.value })}
                                            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 outline-none"
                                        >
                                            <option value="Pin 1 (Suelo CH1)">Pin 1 (Suelo Centinela 1)</option>
                                            <option value="Pin 2 (Suelo CH2)">Pin 2 (Suelo Centinela 2)</option>
                                            <option value="Monitoreo Visual">Monitoreo Visual por IA</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-zinc-400 font-medium flex items-center gap-1">
                                            <Cpu className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Canal Bioeléctrico (ADS1115)</span>
                                        </label>
                                        <select
                                            value={selectedZone.bio_channel}
                                            onChange={e => updateSelectedZone({ bio_channel: e.target.value as any })}
                                            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 outline-none"
                                        >
                                            <option value="NONE">Sin electrodo directo</option>
                                            <option value="CH1">Canal 1 (CH1 - Planta Centinela A)</option>
                                            <option value="CH2">Canal 2 (CH2 - Planta Centinela B)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-zinc-400 font-medium">Notas de Entrenamiento (Topping / LST / Podas)</label>
                                    <input
                                        type="text"
                                        value={selectedZone.notes || ''}
                                        onChange={e => updateSelectedZone({ notes: e.target.value })}
                                        placeholder="Ej. Poda apical día 20, rama central guiada al norte..."
                                        className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 outline-none"
                                    />
                                </div>

                                {/* Diagnóstico IA específico de esta planta si existe */}
                                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 flex flex-col gap-1.5 mt-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Estado Individual IA ({selectedZone.zone_id})</span>
                                        </span>
                                        {selectedPlantAnalysis && (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getHarvestStatusBadge(selectedPlantAnalysis.harvest_status).color}`}>
                                                {getHarvestStatusBadge(selectedPlantAnalysis.harvest_status).label}
                                            </span>
                                        )}
                                    </div>
                                    {cropDetected && selectedPlantAnalysis ? (
                                        <div className="text-[11px] text-zinc-300 flex flex-col gap-1">
                                            <p><strong>Rasgos observados:</strong> {selectedPlantAnalysis.pheno_traits_observed}</p>
                                            <p><strong>Diagnóstico:</strong> {selectedPlantAnalysis.specific_diagnosis}</p>
                                            <p className="text-emerald-300"><strong>Acción sugerida:</strong> {selectedPlantAnalysis.specific_action}</p>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-zinc-400">
                                            {cropDetected
                                                ? 'Guarda el mapa y dispara una nueva captura para generar el reporte individual de este cuadrante.'
                                                : 'Cámara actualmente fuera de sala de cultivo. Al enfocarse el dosel, aquí verás el diagnóstico individual de esta planta.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-zinc-500 text-xs">
                                Este cuadrante está marcado como vacío (sin maceta). Activa la casilla superior si colocas una planta en esta posición.
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSaveGrid}
                        disabled={saving}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>Guardar Cambios de Cuadrícula y Genéticas</span>
                    </button>
                </div>
            </div>

            {/* Tablero Resumen Multigenética y Planificador de Cosecha Escalonada */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <div>
                        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-400" />
                            <span>Distribución Multigenética y Planificador de Cosecha Escalonada</span>
                        </h3>
                        <p className="text-xs text-zinc-400">
                            Comparativa morfológica y ventana de corte por variedad según los cuadrantes asignados en la sala.
                        </p>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-xl">
                        {Object.keys(strainGroups).length} Genética(s) • {grid.zones.filter(z => z.active).length} Plantas Activas
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(strainGroups).map(([strainName, zones]) => {
                        const sample = zones[0];
                        const bioBadge = getBiotypeBadge(sample.biotype);
                        return (
                            <div
                                key={strainName}
                                className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/90 flex flex-col justify-between gap-3"
                            >
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-black text-zinc-100 flex items-center gap-1.5">
                                            <Leaf className="w-4 h-4 text-emerald-400" />
                                            {strainName}
                                        </span>
                                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300">
                                            {zones.length} {zones.length === 1 ? 'planta' : 'plantas'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${bioBadge.color}`}>
                                            {bioBadge.label}
                                        </span>
                                        {sample.natural_anthocyanins && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                                Fenotipo Púrpura
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-xs text-zinc-400 flex flex-col gap-1 mt-1">
                                        <div className="flex justify-between">
                                            <span>Cuadrantes asignados:</span>
                                            <span className="font-mono text-emerald-400 font-bold">
                                                {zones.map(z => z.zone_id).join(', ')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Ciclo floral estimado:</span>
                                            <span className="font-mono text-zinc-200">
                                                ~{sample.expected_flowering_days} días (12/12)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                                    <span className="text-zinc-400">Orden de Corte Sugerido:</span>
                                    <span className="font-semibold text-amber-300">
                                        {sample.expected_flowering_days <= 60
                                            ? '1° Tanda (Temprana)'
                                            : sample.expected_flowering_days <= 65
                                            ? '2° Tanda (Media)'
                                            : '3° Tanda (Tardía)'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
