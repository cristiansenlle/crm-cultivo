'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
    Grid,
    Leaf,
    Sparkles,
    Save,
    CheckCircle2,
    Cpu,
    Droplets,
    Layers,
    RefreshCw,
    Eye,
    Move,
    Plus,
    Trash2,
    Maximize2
} from 'lucide-react';
import type {
    PlantGridLayout,
    PlantZoneConfig,
    PerPlantAnalysis,
    SoilSensorOption
} from '@/lib/vision/PlantGridStore';

interface PlantGridMapperProps {
    latestImageUrl?: string | null;
    cropDetected?: boolean;
}

export default function PlantGridMapper({ latestImageUrl, cropDetected = false }: PlantGridMapperProps) {
    const [grid, setGrid] = useState<PlantGridLayout | null>(null);
    const [soilSensors, setSoilSensors] = useState<SoilSensorOption[]>([]);
    const [availableStrains, setAvailableStrains] = useState<string[]>([]);
    const [perPlantResults, setPerPlantResults] = useState<PerPlantAnalysis[]>([]);
    const [serverImageUrl, setServerImageUrl] = useState<string | null>(null);
    const [selectedZoneId, setSelectedZoneId] = useState<string>('A1');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [showOverlayMetrics, setShowOverlayMetrics] = useState(true);
    const [freeformEditMode, setFreeformEditMode] = useState(true);

    const [customRows, setCustomRows] = useState<number>(2);
    const [customCols, setCustomCols] = useState<number>(3);
    const [customPlantCount, setCustomPlantCount] = useState<number>(6);

    const viewportRef = useRef<HTMLDivElement | null>(null);
    const [dragState, setDragState] = useState<{
        zoneId: string;
        mode: 'move' | 'resize';
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialW: number;
        initialH: number;
    } | null>(null);

    const fetchGridData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/vision/grid');
            if (res.ok) {
                const data = await res.json();
                const sensorsList: SoilSensorOption[] = Array.isArray(data.soil_sensors)
                    ? data.soil_sensors
                    : [];
                setSoilSensors(sensorsList);
                if (data.latest_image_url) {
                    setServerImageUrl(data.latest_image_url);
                }

                if (data.grid?.zones) {
                    const rows = Math.max(1, data.grid.grid_rows || 2);
                    const cols = Math.max(1, data.grid.grid_cols || 3);
                    const defaultW = Number((100 / cols).toFixed(1));
                    const defaultH = Number((100 / rows).toFixed(1));

                    const normalizedZones = data.grid.zones.map((z: PlantZoneConfig, idx: number) => {
                        let updated = { ...z };
                        if (
                            typeof updated.x_pct !== 'number' ||
                            typeof updated.y_pct !== 'number' ||
                            typeof updated.w_pct !== 'number' ||
                            typeof updated.h_pct !== 'number'
                        ) {
                            const r = typeof updated.row === 'number' ? updated.row : Math.floor(idx / cols);
                            const c = typeof updated.col === 'number' ? updated.col : idx % cols;
                            updated.x_pct = Number((c * defaultW).toFixed(1));
                            updated.y_pct = Number((r * defaultH).toFixed(1));
                            updated.w_pct = defaultW;
                            updated.h_pct = defaultH;
                        }

                        if (
                            updated.soil_sensor_pin === 'Pin 1 (Suelo CH1)' ||
                            updated.soil_sensor_pin === 'Pin 2 (Suelo CH2)' ||
                            updated.soil_sensor_pin === 'Monitoreo Visual'
                        ) {
                            const mappedSensor = sensorsList[idx];
                            if (mappedSensor) {
                                updated.soil_sensor_id = mappedSensor.id;
                                updated.soil_sensor_pin = mappedSensor.label;
                            }
                        }
                        return updated;
                    });
                    const loadedGrid = { ...data.grid, zones: normalizedZones };
                    setGrid(loadedGrid);
                    setCustomRows(loadedGrid.grid_rows || 2);
                    setCustomCols(loadedGrid.grid_cols || 3);
                    setCustomPlantCount(normalizedZones.filter((z: PlantZoneConfig) => z.active).length || 1);
                } else {
                    setGrid(data.grid);
                }

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

    // Manejo de Drag & Resize sobre el contenedor cenital
    useEffect(() => {
        if (!dragState) return;

        const handlePointerMove = (e: PointerEvent) => {
            if (!viewportRef.current || !grid) return;
            const rect = viewportRef.current.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;

            const deltaXPct = ((e.clientX - dragState.startX) / rect.width) * 100;
            const deltaYPct = ((e.clientY - dragState.startY) / rect.height) * 100;

            setGrid(prev => {
                if (!prev) return prev;
                const nextZones = prev.zones.map(z => {
                    if (z.zone_id !== dragState.zoneId) return z;

                    if (dragState.mode === 'move') {
                        const newX = Math.max(0, Math.min(100 - z.w_pct, Number((dragState.initialX + deltaXPct).toFixed(1))));
                        const newY = Math.max(0, Math.min(100 - z.h_pct, Number((dragState.initialY + deltaYPct).toFixed(1))));
                        return { ...z, x_pct: newX, y_pct: newY };
                    } else {
                        const newW = Math.max(10, Math.min(100 - z.x_pct, Number((dragState.initialW + deltaXPct).toFixed(1))));
                        const newH = Math.max(14, Math.min(100 - z.y_pct, Number((dragState.initialH + deltaYPct).toFixed(1))));
                        return { ...z, w_pct: newW, h_pct: newH };
                    }
                });
                return { ...prev, layout_mode: 'freeform', zones: nextZones };
            });
        };

        const handlePointerUp = () => {
            setDragState(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [dragState, grid]);

    const handleResizeGrid = async (rows: number, cols: number, activeCount?: number) => {
        const safeRows = Math.min(6, Math.max(1, Number(rows) || 1));
        const safeCols = Math.min(6, Math.max(1, Number(cols) || 1));
        const maxCells = safeRows * safeCols;
        const targetActive =
            typeof activeCount === 'number' && activeCount >= 1
                ? Math.min(maxCells, Math.max(1, activeCount))
                : maxCells;

        setSaving(true);
        try {
            const res = await fetch('/api/vision/grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'resize',
                    rows: safeRows,
                    cols: safeCols,
                    activeCount: targetActive
                })
            });
            if (res.ok) {
                const data = await res.json();
                setGrid(data.grid);
                setCustomRows(data.grid.grid_rows);
                setCustomCols(data.grid.grid_cols);
                setCustomPlantCount(data.grid.zones.filter((z: PlantZoneConfig) => z.active).length);
                setSelectedZoneId(data.grid.zones[0]?.zone_id || 'A1');
                setSaveMessage(
                    `Cuadrícula ajustada a ${safeRows}×${safeCols} (${targetActive} ${
                        targetActive === 1 ? 'planta activa' : 'plantas activas'
                    } de ${maxCells} zonas)`
                );
                setTimeout(() => setSaveMessage(''), 4000);
            }
        } catch (err) {
            console.error('Error redimensionando grilla:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleApplyTemplate = async (template: 'staggered_5' | 'staggered_7' | 'staggered_10' | 'perimeter_8', label: string) => {
        setSaving(true);
        try {
            const res = await fetch('/api/vision/grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'template', template })
            });
            if (res.ok) {
                const data = await res.json();
                setGrid(data.grid);
                setCustomRows(data.grid.grid_rows);
                setCustomCols(data.grid.grid_cols);
                setCustomPlantCount(data.grid.zones.filter((z: PlantZoneConfig) => z.active).length);
                setSelectedZoneId(data.grid.zones[0]?.zone_id || 'A1');
                setSaveMessage(`✨ Disposición "${label}" aplicada. Puedes arrastrar o redimensionar cada planta libremente.`);
                setTimeout(() => setSaveMessage(''), 4500);
            }
        } catch (err) {
            console.error('Error aplicando plantilla:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleApplyPlantCount = (newCount: number) => {
        const count = Math.min(36, Math.max(1, Number(newCount) || 1));
        setCustomPlantCount(count);

        let r = customRows;
        let c = customCols;
        if (count > r * c) {
            if (count <= 2) { r = 1; c = 2; }
            else if (count <= 4) { r = 2; c = 2; }
            else if (count <= 6) { r = 2; c = 3; }
            else if (count <= 8) { r = 2; c = 4; }
            else if (count <= 9) { r = 3; c = 3; }
            else if (count === 10) { r = 2; c = 5; }
            else if (count <= 12) { r = 3; c = 4; }
            else if (count <= 16) { r = 4; c = 4; }
            else if (count <= 20) { r = 4; c = 5; }
            else if (count <= 25) { r = 5; c = 5; }
            else { r = 6; c = 6; }
            setCustomRows(r);
            setCustomCols(c);
        }
        handleResizeGrid(r, c, count);
    };

    const handleAddFreeZone = () => {
        if (!grid) return;
        const idx = grid.zones.length;
        const newZoneId = `P${idx + 1}`;
        const usedSensorIds = new Set(grid.zones.map(z => z.soil_sensor_id).filter(Boolean));
        const freeSensor = soilSensors.find(s => !usedSensorIds.has(s.id));

        const newZone: PlantZoneConfig = {
            zone_id: newZoneId,
            row: 0,
            col: idx,
            x_pct: Math.min(72, 10 + (idx * 7) % 60),
            y_pct: Math.min(68, 12 + (idx * 9) % 55),
            w_pct: 24,
            h_pct: 36,
            plant_id: `PL-${String(idx + 1).padStart(2, '0')}`,
            plant_name: `Planta #${idx + 1}`,
            strain: availableStrains[0] || 'Nicole Punch',
            biotype: 'INDICA_DOMINANT',
            natural_anthocyanins: true,
            expected_flowering_days: 60,
            soil_sensor_id: freeSensor ? freeSensor.id : undefined,
            soil_sensor_pin: freeSensor ? freeSensor.label : 'Monitoreo Visual por IA',
            bio_channel: 'NONE',
            active: true,
            notes: 'Zona libre personalizada'
        };

        const updatedZones = [...grid.zones, newZone];
        setGrid({
            ...grid,
            layout_mode: 'freeform',
            zones: updatedZones
        });
        setSelectedZoneId(newZoneId);
        setCustomPlantCount(updatedZones.filter(z => z.active).length);
        setSaveMessage(`➕ Zona libre ${newZoneId} agregada. Arrástrala sobre la maceta en la imagen y pulsa Guardar Mapa.`);
        setTimeout(() => setSaveMessage(''), 4000);
    };

    const handleRemoveSelectedZone = () => {
        if (!grid || grid.zones.length <= 1) return;
        const filtered = grid.zones.filter(z => z.zone_id !== selectedZoneId);
        setGrid({
            ...grid,
            layout_mode: 'freeform',
            zones: filtered
        });
        setSelectedZoneId(filtered[0]?.zone_id || 'A1');
        setCustomPlantCount(filtered.filter(z => z.active).length);
    };

    const handleSaveGrid = async () => {
        if (!grid) return;
        setSaving(true);
        try {
            const res = await fetch('/api/vision/grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grid, current_per_plant: perPlantResults })
            });
            if (res.ok) {
                const data = await res.json();
                setGrid(data.grid);
                if (Array.isArray(data.reconciled_per_plant)) {
                    setPerPlantResults(data.reconciled_per_plant);
                }
                setSaveMessage('✅ Mapa guardado y sincronizado. Re-analizando diagnósticos individuales con IA...');
                setTimeout(() => {
                    fetchGridData();
                    setSaveMessage('');
                }, 4500);
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
        if (typeof patch.active === 'boolean') {
            setCustomPlantCount(updatedZones.filter(z => z.active).length);
        }
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
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                            <Grid className="w-5 h-5 text-emerald-400" />
                            <span>Mapeo Espacial Libre, Tresbolillo y Multigenética</span>
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Usa una plantilla rápida (Grilla, Tresbolillo o Perimetral) y <strong>arrastra o estira cada recuadro</strong> directamente sobre la foto cenital para calzar cualquier disposición real de macetas.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setFreeformEditMode(!freeformEditMode)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                freeformEditMode
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            }`}
                            title="Habilita arrastrar y cambiar el tamaño de cada zona con el mouse sobre la imagen"
                        >
                            <Move className="w-3.5 h-3.5" />
                            <span>{freeformEditMode ? 'Edición Libre Activa (Arrastrar/Estirar)' : 'Mover / Redimensionar'}</span>
                        </button>

                        <button
                            onClick={handleAddFreeZone}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold border border-cyan-500/40 transition-colors cursor-pointer"
                            title="Agrega una maceta suelta en cualquier posición"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar Planta</span>
                        </button>

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

                {/* Fila 2: Presets de Grilla + Plantillas No-Cuadradas (Tresbolillo / Perimetral) + Personalizador */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Grillas Uniformes */}
                        <div className="flex flex-wrap items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs">
                            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                                Grillas:
                            </span>
                            {[
                                { r: 1, c: 2, p: 2, label: '1×2 (2)' },
                                { r: 2, c: 2, p: 4, label: '2×2 (4)' },
                                { r: 2, c: 3, p: 6, label: '2×3 (6)' },
                                { r: 3, c: 3, p: 9, label: '3×3 (9)' },
                                { r: 2, c: 5, p: 10, label: '2×5 (10)' },
                                { r: 3, c: 4, p: 12, label: '3×4 (12)' }
                            ].map(preset => {
                                const activeCountNow = grid.zones.filter(z => z.active).length;
                                const active =
                                    grid.layout_mode === 'grid' &&
                                    grid.grid_rows === preset.r &&
                                    grid.grid_cols === preset.c &&
                                    activeCountNow === preset.p;
                                return (
                                    <button
                                        key={preset.label}
                                        onClick={() => handleResizeGrid(preset.r, preset.c, preset.p)}
                                        disabled={saving}
                                        className={`px-2 py-1 rounded-lg font-mono transition-all cursor-pointer ${
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

                        {/* Plantillas No-Cuadradas (Tresbolillo / Zig-Zag / Perimetral) */}
                        <div className="flex flex-wrap items-center gap-1 bg-zinc-950 border border-purple-500/30 rounded-xl p-1 text-xs">
                            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-purple-300">
                                Disposición Libre:
                            </span>
                            {[
                                { id: 'staggered_5' as const, label: 'Tresbolillo 3+2 (5 pl)' },
                                { id: 'staggered_7' as const, label: 'Tresbolillo 4+3 (7 pl)' },
                                { id: 'staggered_10' as const, label: 'Zig-Zag 5+5 (10 pl)' },
                                { id: 'perimeter_8' as const, label: 'Perimetral (8 pl)' }
                            ].map(tpl => (
                                <button
                                    key={tpl.id}
                                    onClick={() => handleApplyTemplate(tpl.id, tpl.label)}
                                    disabled={saving}
                                    className="px-2.5 py-1 rounded-lg font-mono text-purple-200 hover:bg-purple-500/20 hover:text-white transition-all cursor-pointer"
                                >
                                    {tpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Personalizador Numérico Libre */}
                    <div className="flex flex-wrap items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
                        <span className="text-[11px] font-semibold text-emerald-400">
                            Personalizar:
                        </span>

                        <div className="flex items-center gap-1">
                            <span className="text-zinc-400">Filas</span>
                            <input
                                type="number"
                                min={1}
                                max={6}
                                value={customRows}
                                onChange={e => {
                                    const r = Math.min(6, Math.max(1, Number(e.target.value) || 1));
                                    setCustomRows(r);
                                    setCustomPlantCount(Math.min(r * customCols, customPlantCount));
                                }}
                                className="w-11 px-1 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono font-bold text-center focus:border-emerald-500 outline-none"
                            />
                        </div>

                        <span className="text-zinc-500 font-mono">×</span>

                        <div className="flex items-center gap-1">
                            <span className="text-zinc-400">Cols</span>
                            <input
                                type="number"
                                min={1}
                                max={6}
                                value={customCols}
                                onChange={e => {
                                    const c = Math.min(6, Math.max(1, Number(e.target.value) || 1));
                                    setCustomCols(c);
                                    setCustomPlantCount(Math.min(customRows * c, customPlantCount));
                                }}
                                className="w-11 px-1 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono font-bold text-center focus:border-emerald-500 outline-none"
                            />
                        </div>

                        <div className="h-4 w-px bg-zinc-800 mx-0.5" />

                        <div className="flex items-center gap-1">
                            <span className="text-zinc-400">Plantas:</span>
                            <input
                                type="number"
                                min={1}
                                max={36}
                                value={customPlantCount}
                                onChange={e => {
                                    const p = Math.min(36, Math.max(1, Number(e.target.value) || 1));
                                    setCustomPlantCount(p);
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        handleApplyPlantCount(customPlantCount);
                                    }
                                }}
                                className="w-12 px-1 py-1 rounded-lg bg-zinc-900 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-center focus:border-emerald-400 outline-none"
                            />
                        </div>

                        <button
                            onClick={() => {
                                if (customPlantCount > customRows * customCols) {
                                    handleApplyPlantCount(customPlantCount);
                                } else {
                                    handleResizeGrid(customRows, customCols, customPlantCount);
                                }
                            }}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold transition-all cursor-pointer"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>
            </div>

            {saveMessage && (
                <div className="px-4 py-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{saveMessage}</span>
                </div>
            )}

            {/* Cuerpo Principal: Imagen Cenital con Zonas Libres Arrastrables + Editor de Planta */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Columna Izquierda (7 cols): Visor Cenital con Zonas Posicionables */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                    <div
                        ref={viewportRef}
                        className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl select-none"
                    >
                        {(latestImageUrl || serverImageUrl) ? (
                            <img
                                src={(latestImageUrl || serverImageUrl) as string}
                                alt="Vista Cenital con Zonas de Plantas"
                                className="w-full h-full object-cover opacity-85 pointer-events-none"
                                draggable={false}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-xs font-mono text-zinc-400">
                                Sincronizando última captura cenital...
                            </div>
                        )}

                        {/* Lienzo de Zonas Espaciales (Posicionamiento por Coordenadas % X, Y, Ancho, Alto) */}
                        <div className="absolute inset-0">
                            {grid.zones.map(zone => {
                                const isSelected = zone.zone_id === selectedZone?.zone_id;
                                const isDraggingThis = dragState?.zoneId === zone.zone_id;
                                const plantDiag = perPlantResults.find(p => p.zone_id === zone.zone_id);
                                const assignedSensor = soilSensors.find(
                                    s => s.id === zone.soil_sensor_id || s.label === zone.soil_sensor_pin
                                );
                                const isCompact = (zone.w_pct || 25) <= 24;

                                return (
                                    <div
                                        key={zone.zone_id}
                                        onClick={() => setSelectedZoneId(zone.zone_id)}
                                        onPointerDown={e => {
                                            setSelectedZoneId(zone.zone_id);
                                            if (!freeformEditMode) return;
                                            if ((e.target as HTMLElement).dataset.resizeHandle === 'true') return;
                                            e.stopPropagation();
                                            setDragState({
                                                zoneId: zone.zone_id,
                                                mode: 'move',
                                                startX: e.clientX,
                                                startY: e.clientY,
                                                initialX: zone.x_pct ?? 0,
                                                initialY: zone.y_pct ?? 0,
                                                initialW: zone.w_pct ?? 33,
                                                initialH: zone.h_pct ?? 50
                                            });
                                        }}
                                        style={{
                                            left: `${zone.x_pct ?? 0}%`,
                                            top: `${zone.y_pct ?? 0}%`,
                                            width: `${zone.w_pct ?? 33}%`,
                                            height: `${zone.h_pct ?? 50}%`,
                                            zIndex: isDraggingThis ? 30 : isSelected ? 20 : 10
                                        }}
                                        className={`absolute rounded-xl border transition-colors flex flex-col justify-between overflow-hidden min-w-0 select-none ${
                                            freeformEditMode ? 'cursor-move' : 'cursor-pointer'
                                        } ${isCompact ? 'p-1.5' : 'p-2'} ${
                                            isSelected
                                                ? 'border-2 border-emerald-400 bg-emerald-500/15 shadow-[inset_0_0_25px_rgba(16,185,129,0.25)]'
                                                : zone.active
                                                ? 'border-white/30 bg-black/20 hover:bg-emerald-950/30 hover:border-emerald-400/60'
                                                : 'border-dashed border-white/15 bg-black/60 opacity-45'
                                        }`}
                                    >
                                        {/* Cabecera de la Zona */}
                                        <div className="flex items-center justify-between gap-1 bg-zinc-950/85 backdrop-blur-md border border-white/10 rounded-lg px-1.5 py-1 min-w-0 shadow-sm">
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <span
                                                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-black leading-none ${
                                                        isSelected
                                                            ? 'bg-emerald-400 text-zinc-950'
                                                            : 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40'
                                                    }`}
                                                >
                                                    {zone.zone_id}
                                                </span>
                                                {zone.active && showOverlayMetrics && (
                                                    <span
                                                        className="text-[10px] sm:text-[11px] font-bold text-zinc-100 truncate min-w-0"
                                                        title={zone.plant_name}
                                                    >
                                                        {zone.plant_name}
                                                    </span>
                                                )}
                                            </div>

                                            {zone.active && showOverlayMetrics && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {isCompact && plantDiag && (
                                                        <span className="px-1 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold leading-none">
                                                            ♥{plantDiag.health_score}%
                                                        </span>
                                                    )}
                                                    {zone.natural_anthocyanins && !isCompact && (
                                                        <span
                                                            className="px-1 py-0.5 rounded bg-purple-950/90 border border-purple-500/40 text-purple-300 text-[9px] font-mono leading-none"
                                                            title="Genética con antocianinas naturales"
                                                        >
                                                            {isCompact ? '💜' : '💜 Antocianina'}
                                                        </span>
                                                    )}
                                                    {zone.bio_channel !== 'NONE' && (
                                                        <span
                                                            className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold leading-none"
                                                            title={`Canal Bioeléctrico ${zone.bio_channel}`}
                                                        >
                                                            ⚡{zone.bio_channel}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Indicador de Coordenadas en Vivo al Arrastrar / Redimensionar */}
                                        {isDraggingThis && (
                                            <div className="m-auto px-2 py-1 rounded-lg bg-amber-500 text-zinc-950 font-mono font-black text-[10px] shadow-lg">
                                                X:{Math.round(zone.x_pct)}% Y:{Math.round(zone.y_pct)}% • {Math.round(zone.w_pct)}×{Math.round(zone.h_pct)}%
                                            </div>
                                        )}

                                        {/* Pie de la Zona: Genética + Sensor de Suelo */}
                                        {zone.active && showOverlayMetrics ? (
                                            <div className="flex flex-col gap-1 mt-auto min-w-0 pr-3">
                                                <div className="flex flex-col gap-1 bg-zinc-950/85 backdrop-blur-md px-2 py-1.5 rounded-lg border border-white/10 min-w-0 shadow-md">
                                                    <div className="flex items-center justify-between gap-1 min-w-0">
                                                        <span
                                                            className="text-[10px] font-mono font-semibold text-emerald-300 truncate min-w-0"
                                                            title={`Genética: ${zone.strain}`}
                                                        >
                                                            🌿 {zone.strain}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-white/10 min-w-0">
                                                        {assignedSensor ? (
                                                            <>
                                                                <span
                                                                    className="text-[9px] font-mono text-cyan-300 truncate min-w-0"
                                                                    title={assignedSensor.label}
                                                                >
                                                                    💧 Pin {assignedSensor.pin_index}
                                                                    {!isCompact ? ` • ${assignedSensor.board_name}` : ''}
                                                                </span>
                                                                {assignedSensor.latest_moisture_pct !== null &&
                                                                assignedSensor.latest_moisture_pct !== undefined ? (
                                                                    <span className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 leading-none">
                                                                        {assignedSensor.latest_moisture_pct}%
                                                                    </span>
                                                                ) : (
                                                                    <span className="shrink-0 text-[9px] font-mono text-zinc-500">
                                                                        S/D
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-[9px] font-mono text-zinc-400 truncate">
                                                                👁️ Monitoreo Visual IA
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {cropDetected && plantDiag && !isCompact && (
                                                    <div className="flex items-center justify-between gap-1 bg-emerald-950/90 px-2 py-1 rounded-lg border border-emerald-500/30 text-[9px] font-mono min-w-0">
                                                        <span className="text-emerald-300 font-bold truncate">
                                                            ♥ {plantDiag.health_score}%
                                                        </span>
                                                        {(plantDiag.bud_count ?? 0) > 0 ? (
                                                            <>
                                                                <span className="text-cyan-300 shrink-0">
                                                                    🌸 {plantDiag.bud_count}
                                                                </span>
                                                                <span className="text-amber-300 shrink-0">
                                                                    ⏳ {plantDiag.maturity_pct}%
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-teal-300 shrink-0">
                                                                🌱 Vigor OK
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : !zone.active ? (
                                            <div className="m-auto text-[10px] font-mono text-zinc-400 bg-zinc-950/80 border border-zinc-800 px-2 py-1 rounded-lg truncate max-w-full">
                                                Zona Vacía
                                            </div>
                                        ) : null}

                                        {/* Tirador de Redimensionamiento Libre (Esquina Inferior Derecha) */}
                                        {freeformEditMode && (
                                            <div
                                                data-resize-handle="true"
                                                onPointerDown={e => {
                                                    e.stopPropagation();
                                                    setSelectedZoneId(zone.zone_id);
                                                    setDragState({
                                                        zoneId: zone.zone_id,
                                                        mode: 'resize',
                                                        startX: e.clientX,
                                                        startY: e.clientY,
                                                        initialX: zone.x_pct ?? 0,
                                                        initialY: zone.y_pct ?? 0,
                                                        initialW: zone.w_pct ?? 33,
                                                        initialH: zone.h_pct ?? 50
                                                    });
                                                }}
                                                title="Arrastra esta esquina para agrandar o achicar la zona de la planta"
                                                className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-emerald-500/90 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center cursor-nwse-resize shadow-md"
                                            >
                                                <Maximize2 className="w-3 h-3 rotate-90 pointer-events-none" />
                                            </div>
                                        )}
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
                                        Ficha Individual de Planta y Posición
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 font-mono">
                                        X:{Math.round(selectedZone.x_pct ?? 0)}% Y:{Math.round(selectedZone.y_pct ?? 0)}% • Tamaño {Math.round(selectedZone.w_pct ?? 33)}%×{Math.round(selectedZone.h_pct ?? 50)}%
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedZone.active}
                                        onChange={e => updateSelectedZone({ active: e.target.checked })}
                                        className="rounded border-zinc-700 bg-zinc-800 text-emerald-500"
                                    />
                                    <span>Activa</span>
                                </label>

                                {grid.zones.length > 1 && (
                                    <button
                                        onClick={handleRemoveSelectedZone}
                                        className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-colors cursor-pointer"
                                        title="Eliminar este recuadro de planta del mapa"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {selectedZone.active ? (
                            <div className="flex flex-col gap-3.5 text-xs">
                                {/* Ajuste fino de posición y tamaño en cámara */}
                                <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="font-semibold text-amber-300 flex items-center gap-1">
                                            <Move className="w-3.5 h-3.5" />
                                            <span>Posición y Área en Cámara (% de la toma)</span>
                                        </span>
                                        <span className="text-zinc-500 font-mono text-[10px]">
                                            Arrastra en la foto o ajusta aquí
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] text-zinc-400">Pos X (%)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={90}
                                                value={Math.round(selectedZone.x_pct ?? 0)}
                                                onChange={e => updateSelectedZone({ x_pct: Math.max(0, Math.min(90, Number(e.target.value) || 0)) })}
                                                className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-center"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] text-zinc-400">Pos Y (%)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={90}
                                                value={Math.round(selectedZone.y_pct ?? 0)}
                                                onChange={e => updateSelectedZone({ y_pct: Math.max(0, Math.min(90, Number(e.target.value) || 0)) })}
                                                className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-center"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] text-zinc-400">Ancho (%)</label>
                                            <input
                                                type="number"
                                                min={10}
                                                max={100}
                                                value={Math.round(selectedZone.w_pct ?? 33)}
                                                onChange={e => updateSelectedZone({ w_pct: Math.max(10, Math.min(100, Number(e.target.value) || 25)) })}
                                                className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-emerald-300 font-mono text-center"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] text-zinc-400">Alto (%)</label>
                                            <input
                                                type="number"
                                                min={12}
                                                max={100}
                                                value={Math.round(selectedZone.h_pct ?? 50)}
                                                onChange={e => updateSelectedZone({ h_pct: Math.max(12, Math.min(100, Number(e.target.value) || 40)) })}
                                                className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-emerald-300 font-mono text-center"
                                            />
                                        </div>
                                    </div>
                                </div>

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
                                        <label className="text-zinc-400 font-medium flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                                                <span>Sensor de Suelo en Maceta (2 ESP32 × 5)</span>
                                            </span>
                                            <span className="text-[10px] font-mono text-cyan-400">
                                                {soilSensors.length} sensores
                                            </span>
                                        </label>
                                        <select
                                            value={selectedZone.soil_sensor_pin}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const matched = soilSensors.find(s => s.label === val);
                                                updateSelectedZone({
                                                    soil_sensor_pin: val,
                                                    soil_sensor_id: matched ? matched.id : undefined
                                                });
                                            }}
                                            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 outline-none"
                                        >
                                            {Array.from(new Set(soilSensors.map(s => s.board_name))).map(boardName => {
                                                const boardSensors = soilSensors.filter(s => s.board_name === boardName);
                                                const mac = boardSensors[0]?.board_mac || '';
                                                return (
                                                    <optgroup
                                                        key={boardName}
                                                        label={`📡 ${boardName}${mac ? ` [${mac}]` : ''} (${boardSensors.length} sensores)`}
                                                    >
                                                        {boardSensors.map(sensor => (
                                                            <option key={sensor.id} value={sensor.label}>
                                                                {sensor.label}
                                                                {sensor.latest_moisture_pct !== null &&
                                                                sensor.latest_moisture_pct !== undefined
                                                                    ? ` — 💧 ${sensor.latest_moisture_pct}%`
                                                                    : ''}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            })}
                                            <optgroup label="👁️ Sin Sonda Física en Maceta">
                                                <option value="Monitoreo Visual por IA">
                                                    Monitoreo Visual por IA (Sin aguja en esta maceta)
                                                </option>
                                            </optgroup>
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
                                                ? 'Guarda el mapa y dispara una nueva captura para generar el reporte individual de esta zona.'
                                                : 'Cámara actualmente fuera de sala de cultivo. Al enfocarse el dosel, aquí verás el diagnóstico individual de esta planta.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-zinc-500 text-xs">
                                Esta zona está marcada como vacía (sin maceta). Activa la casilla superior si colocas una planta en esta posición.
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSaveGrid}
                        disabled={saving}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>Guardar Posiciones Libres y Genéticas</span>
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
                            Comparativa morfológica y ventana de corte por variedad según las zonas asignadas en la sala.
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
                                            <span>Zonas asignadas:</span>
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
