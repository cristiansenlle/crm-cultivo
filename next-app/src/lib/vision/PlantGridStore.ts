import fs from 'fs';
import path from 'path';

export interface SoilSensorOption {
    id: string;
    board_id: string;
    board_name: string;
    board_mac: string;
    pin_index: number;
    name: string;
    label: string;
    latest_moisture_pct?: number | null;
}

export interface PlantZoneConfig {
    zone_id: string;
    row: number;
    col: number;
    x_pct: number; // 0-100% desde la izquierda del fotograma
    y_pct: number; // 0-100% desde arriba del fotograma
    w_pct: number; // Ancho relativo (5-100%)
    h_pct: number; // Alto relativo (5-100%)
    plant_id: string;
    plant_name: string;
    strain: string;
    biotype: 'INDICA_DOMINANT' | 'SATIVA_DOMINANT' | 'HYBRID_50_50' | 'AUTOFLOWER';
    natural_anthocyanins: boolean;
    expected_flowering_days: number;
    soil_sensor_id?: string;
    soil_sensor_pin: string;
    bio_channel: 'NONE' | 'CH1' | 'CH2';
    active: boolean;
    notes?: string;
    presence_status?: 'PRESENT' | 'MOVED' | 'NEW_DETECTED' | 'MISSING';
    last_seen_at?: string;
    visual_marker_label?: string;
}

export interface PlantGridLayout {
    room_name: string;
    layout_mode?: 'grid' | 'staggered' | 'perimeter' | 'freeform';
    grid_rows: number;
    grid_cols: number;
    scrog_net_installed: boolean;
    target_flip_coverage_pct: number;
    linked_shelly_device_id?: string;
    linked_shelly_name?: string;
    only_capture_when_shelly_on?: boolean;
    auto_capture_on_shelly_on?: boolean;
    auto_track_enabled?: boolean;
    auto_add_remove_zones?: boolean;
    last_tracking_summary?: {
        timestamp: string;
        matched_count: number;
        moved_count: number;
        added_zones: string[];
        missing_zones: string[];
        message: string;
    };
    updated_at: string;
    zones: PlantZoneConfig[];
}

export interface PerPlantAnalysis {
    zone_id: string;
    plant_name: string;
    strain: string;
    health_score: number;
    canopy_share_pct: number;
    leaf_posture: 'PRAYING' | 'TURGID' | 'DROOPING' | 'CLAWING' | 'NONE';
    pheno_traits_observed: string;
    bud_count: number;
    maturity_pct: number;
    harvest_status: 'VEGETATIVE' | 'DEVELOPING' | 'FLUSH_WINDOW' | 'READY_TO_CHOP' | 'OVERRIPE_RISK' | 'NONE';
    anthocyanin_expression: 'NONE' | 'GENETIC_NORMAL' | 'STRESS_INDUCED';
    specific_diagnosis: string;
    specific_action: string;
    presence_status?: 'PRESENT' | 'MOVED' | 'NEW_DETECTED' | 'MISSING';
    detected_box_pct?: { x_pct: number; y_pct: number; w_pct: number; h_pct: number };
    dome_detected?: boolean;
    dome_status?: 'NONE' | 'OPTIMAL_HUMIDITY' | 'HIGH_CONDENSATION' | 'LEAVES_TOUCHING_REMOVE_SOON';
    visual_substrate_moisture?: 'WET' | 'MOIST_OPTIMAL' | 'DRY_SURFACE' | 'UNKNOWN';
    relative_growth_vs_batch?: 'AHEAD' | 'AVERAGE' | 'LAGGING';
    lagging_alert?: string | null;
}

export interface DetectedPlantBox {
    zone_id_hint?: string;
    visual_label_read?: string;
    box_2d: [number, number, number, number];
    dome_detected?: boolean;
    dome_status?: 'NONE' | 'OPTIMAL_HUMIDITY' | 'HIGH_CONDENSATION' | 'LEAVES_TOUCHING_REMOVE_SOON';
    visual_substrate_moisture?: 'WET' | 'MOIST_OPTIMAL' | 'DRY_SURFACE' | 'UNKNOWN';
    health_score?: number;
    leaf_posture?: 'PRAYING' | 'TURGID' | 'DROOPING' | 'CLAWING' | 'NONE';
    notes?: string;
}

export const DEFAULT_SOIL_SENSORS: SoilSensorOption[] = [
    // Placa 1: ESP32 Suelo (AF:E8) - Pines 1 a 5
    {
        id: '6b78b83d-1415-42d5-b5b2-63a18ae330c0',
        board_id: '988331fc-0a8d-4e78-b4d0-276adf8b3b20',
        board_name: 'ESP32 Suelo (AF:E8)',
        board_mac: '04:B2:47:96:AF:E8',
        pin_index: 1,
        name: 'Sensor Humedad 1',
        label: 'ESP32 Suelo (AF:E8) • Pin 1 — Sensor Humedad 1'
    },
    {
        id: '90619ad2-f349-44af-8b1d-a931ac23a69e',
        board_id: '988331fc-0a8d-4e78-b4d0-276adf8b3b20',
        board_name: 'ESP32 Suelo (AF:E8)',
        board_mac: '04:B2:47:96:AF:E8',
        pin_index: 2,
        name: 'Sensor Humedad 2',
        label: 'ESP32 Suelo (AF:E8) • Pin 2 — Sensor Humedad 2'
    },
    {
        id: 'fc3d05c5-8b78-488a-a0a5-f8e1787e0abe',
        board_id: '988331fc-0a8d-4e78-b4d0-276adf8b3b20',
        board_name: 'ESP32 Suelo (AF:E8)',
        board_mac: '04:B2:47:96:AF:E8',
        pin_index: 3,
        name: 'Sensor Humedad 3',
        label: 'ESP32 Suelo (AF:E8) • Pin 3 — Sensor Humedad 3'
    },
    {
        id: 'e2fcfba4-27bd-4250-9928-f3a414cad421',
        board_id: '988331fc-0a8d-4e78-b4d0-276adf8b3b20',
        board_name: 'ESP32 Suelo (AF:E8)',
        board_mac: '04:B2:47:96:AF:E8',
        pin_index: 4,
        name: 'Sensor Humedad 4',
        label: 'ESP32 Suelo (AF:E8) • Pin 4 — Sensor Humedad 4'
    },
    {
        id: '1b8e72af-231e-4275-a139-adc72bb08107',
        board_id: '988331fc-0a8d-4e78-b4d0-276adf8b3b20',
        board_name: 'ESP32 Suelo (AF:E8)',
        board_mac: '04:B2:47:96:AF:E8',
        pin_index: 5,
        name: 'Sensor Humedad 5',
        label: 'ESP32 Suelo (AF:E8) • Pin 5 — Sensor Humedad 5'
    },
    // Placa 2: ESP32 Suelo 2 (F9:AC) - Pines 6 a 10
    {
        id: '39e0474a-7fed-4685-a835-126634bf5f17',
        board_id: '33c98d46-83c8-43cb-9dd3-b7dc054b6719',
        board_name: 'ESP32 Suelo 2',
        board_mac: 'B4:BF:E9:C9:F9:AC',
        pin_index: 6,
        name: 'Sensor Humedad 6',
        label: 'ESP32 Suelo 2 (F9:AC) • Pin 6 — Sensor Humedad 6'
    },
    {
        id: '4d4aca84-d9bf-4210-af38-a1959690dae7',
        board_id: '33c98d46-83c8-43cb-9dd3-b7dc054b6719',
        board_name: 'ESP32 Suelo 2',
        board_mac: 'B4:BF:E9:C9:F9:AC',
        pin_index: 7,
        name: 'Sensor Humedad 7',
        label: 'ESP32 Suelo 2 (F9:AC) • Pin 7 — Sensor Humedad 7'
    },
    {
        id: '869b52ac-07cd-41d4-b257-2bbe3be84817',
        board_id: '33c98d46-83c8-43cb-9dd3-b7dc054b6719',
        board_name: 'ESP32 Suelo 2',
        board_mac: 'B4:BF:E9:C9:F9:AC',
        pin_index: 8,
        name: 'Sensor Humedad 8',
        label: 'ESP32 Suelo 2 (F9:AC) • Pin 8 — Sensor Humedad 8'
    },
    {
        id: '21a5ee08-fb29-489a-8b11-c00f064738bf',
        board_id: '33c98d46-83c8-43cb-9dd3-b7dc054b6719',
        board_name: 'ESP32 Suelo 2',
        board_mac: 'B4:BF:E9:C9:F9:AC',
        pin_index: 9,
        name: 'Sensor Humedad 9',
        label: 'ESP32 Suelo 2 (F9:AC) • Pin 9 — Sensor Humedad 9'
    },
    {
        id: '3f162db1-1f4b-4733-bbbc-be90c32ba6cd',
        board_id: '33c98d46-83c8-43cb-9dd3-b7dc054b6719',
        board_name: 'ESP32 Suelo 2',
        board_mac: 'B4:BF:E9:C9:F9:AC',
        pin_index: 10,
        name: 'Sensor Humedad 10',
        label: 'ESP32 Suelo 2 (F9:AC) • Pin 10 — Sensor Humedad 10'
    }
];

const PROD_GRID_PATH = '/var/www/captures/crop_vision/plant_grid.json';
const LOCAL_GRID_PATH = path.join(process.cwd(), 'public', 'captures', 'plant_grid.json');

const DEFAULT_STRAINS = [
    { strain: 'Nicole Punch', biotype: 'INDICA_DOMINANT' as const, antho: true, days: 60 },
    { strain: 'Nicole Punch', biotype: 'INDICA_DOMINANT' as const, antho: true, days: 60 },
    { strain: 'Nicole Punch', biotype: 'INDICA_DOMINANT' as const, antho: true, days: 60 },
    { strain: 'Tropicanna WFC', biotype: 'HYBRID_50_50' as const, antho: true, days: 65 },
    { strain: 'Tropicanna WFC', biotype: 'HYBRID_50_50' as const, antho: true, days: 65 },
    { strain: 'Red Hot Cookies', biotype: 'SATIVA_DOMINANT' as const, antho: true, days: 63 }
];

export function getDefaultGridLayout(rows = 2, cols = 3, activeCount?: number): PlantGridLayout {
    const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const totalCells = rows * cols;
    const effectiveActiveCount =
        typeof activeCount === 'number' && activeCount >= 1
            ? Math.min(totalCells, Math.max(1, activeCount))
            : totalCells;

    const cellW = Number((100 / cols).toFixed(1));
    const cellH = Number((100 / rows).toFixed(1));

    const zones: PlantZoneConfig[] = [];
    let index = 0;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const zoneId = `${rowLabels[r] || 'Z'}${c + 1}`;
            const preset = DEFAULT_STRAINS[index % DEFAULT_STRAINS.length];
            const sensorOption = DEFAULT_SOIL_SENSORS[index];

            zones.push({
                zone_id: zoneId,
                row: r,
                col: c,
                x_pct: Number((c * cellW).toFixed(1)),
                y_pct: Number((r * cellH).toFixed(1)),
                w_pct: cellW,
                h_pct: cellH,
                plant_id: `PL-${String(index + 1).padStart(2, '0')}`,
                plant_name: `${preset.strain} #${(index % 3) + 1}`,
                strain: preset.strain,
                biotype: preset.biotype,
                natural_anthocyanins: preset.antho,
                expected_flowering_days: preset.days,
                soil_sensor_id: sensorOption ? sensorOption.id : undefined,
                soil_sensor_pin: sensorOption ? sensorOption.label : 'Monitoreo Visual por IA',
                bio_channel: index === 0 ? 'CH1' : index === 3 ? 'CH2' : 'NONE',
                active: index < effectiveActiveCount,
                notes: index === 0 ? 'Planta centinela con electrodos CH1' : ''
            });
            index++;
        }
    }

    return {
        room_name: 'Carpa 2 (Principal)',
        layout_mode: 'grid',
        grid_rows: rows,
        grid_cols: cols,
        scrog_net_installed: true,
        target_flip_coverage_pct: 72,
        auto_track_enabled: true,
        auto_add_remove_zones: true,
        updated_at: new Date().toISOString(),
        zones
    };
}

export function getTemplateGridLayout(
    template: 'staggered_5' | 'staggered_7' | 'staggered_10' | 'perimeter_8'
): PlantGridLayout {
    interface BoxCoord {
        zone_id: string;
        row: number;
        col: number;
        x_pct: number;
        y_pct: number;
        w_pct: number;
        h_pct: number;
    }

    let coords: BoxCoord[] = [];
    let rows = 2;
    let cols = 3;
    let mode: PlantGridLayout['layout_mode'] = 'staggered';

    if (template === 'staggered_5') {
        // Tresbolillo 3 arriba + 2 abajo intercaladas
        rows = 2;
        cols = 3;
        coords = [
            { zone_id: 'A1', row: 0, col: 0, x_pct: 2, y_pct: 3, w_pct: 30, h_pct: 45 },
            { zone_id: 'A2', row: 0, col: 1, x_pct: 35, y_pct: 3, w_pct: 30, h_pct: 45 },
            { zone_id: 'A3', row: 0, col: 2, x_pct: 68, y_pct: 3, w_pct: 30, h_pct: 45 },
            { zone_id: 'B1', row: 1, col: 0, x_pct: 18, y_pct: 52, w_pct: 31, h_pct: 45 },
            { zone_id: 'B2', row: 1, col: 1, x_pct: 52, y_pct: 52, w_pct: 31, h_pct: 45 }
        ];
    } else if (template === 'staggered_7') {
        // Tresbolillo 4 arriba + 3 abajo intercaladas
        rows = 2;
        cols = 4;
        coords = [
            { zone_id: 'A1', row: 0, col: 0, x_pct: 1.5, y_pct: 3, w_pct: 23, h_pct: 45 },
            { zone_id: 'A2', row: 0, col: 1, x_pct: 26, y_pct: 3, w_pct: 23, h_pct: 45 },
            { zone_id: 'A3', row: 0, col: 2, x_pct: 50.5, y_pct: 3, w_pct: 23, h_pct: 45 },
            { zone_id: 'A4', row: 0, col: 3, x_pct: 75, y_pct: 3, w_pct: 23, h_pct: 45 },
            { zone_id: 'B1', row: 1, col: 0, x_pct: 13.5, y_pct: 52, w_pct: 24, h_pct: 45 },
            { zone_id: 'B2', row: 1, col: 1, x_pct: 38.5, y_pct: 52, w_pct: 24, h_pct: 45 },
            { zone_id: 'B3', row: 1, col: 2, x_pct: 63.5, y_pct: 52, w_pct: 24, h_pct: 45 }
        ];
    } else if (template === 'staggered_10') {
        // Tresbolillo 5+5 Zig-Zag (10 sensores)
        rows = 2;
        cols = 5;
        coords = [
            { zone_id: 'A1', row: 0, col: 0, x_pct: 1, y_pct: 3, w_pct: 18.5, h_pct: 44 },
            { zone_id: 'A2', row: 0, col: 1, x_pct: 20, y_pct: 3, w_pct: 18.5, h_pct: 44 },
            { zone_id: 'A3', row: 0, col: 2, x_pct: 39, y_pct: 3, w_pct: 18.5, h_pct: 44 },
            { zone_id: 'A4', row: 0, col: 3, x_pct: 58, y_pct: 3, w_pct: 18.5, h_pct: 44 },
            { zone_id: 'A5', row: 0, col: 4, x_pct: 77, y_pct: 3, w_pct: 18.5, h_pct: 44 },
            { zone_id: 'B1', row: 1, col: 0, x_pct: 4.5, y_pct: 52, w_pct: 18.5, h_pct: 45 },
            { zone_id: 'B2', row: 1, col: 1, x_pct: 23.5, y_pct: 52, w_pct: 18.5, h_pct: 45 },
            { zone_id: 'B3', row: 1, col: 2, x_pct: 42.5, y_pct: 52, w_pct: 18.5, h_pct: 45 },
            { zone_id: 'B4', row: 1, col: 3, x_pct: 61.5, y_pct: 52, w_pct: 18.5, h_pct: 45 },
            { zone_id: 'B5', row: 1, col: 4, x_pct: 80.5, y_pct: 52, w_pct: 18.5, h_pct: 45 }
        ];
    } else {
        // Perimetral / Herradura 8 plantas (Centro libre para equipos)
        rows = 3;
        cols = 3;
        mode = 'perimeter';
        coords = [
            { zone_id: 'A1', row: 0, col: 0, x_pct: 2, y_pct: 2, w_pct: 30, h_pct: 30 },
            { zone_id: 'A2', row: 0, col: 1, x_pct: 35, y_pct: 2, w_pct: 30, h_pct: 30 },
            { zone_id: 'A3', row: 0, col: 2, x_pct: 68, y_pct: 2, w_pct: 30, h_pct: 30 },
            { zone_id: 'B1', row: 1, col: 0, x_pct: 2, y_pct: 35, w_pct: 30, h_pct: 30 },
            { zone_id: 'B2', row: 1, col: 2, x_pct: 68, y_pct: 35, w_pct: 30, h_pct: 30 },
            { zone_id: 'C1', row: 2, col: 0, x_pct: 2, y_pct: 68, w_pct: 30, h_pct: 30 },
            { zone_id: 'C2', row: 2, col: 1, x_pct: 35, y_pct: 68, w_pct: 30, h_pct: 30 },
            { zone_id: 'C3', row: 2, col: 2, x_pct: 68, y_pct: 68, w_pct: 30, h_pct: 30 }
        ];
    }

    const zones: PlantZoneConfig[] = coords.map((box, index) => {
        const preset = DEFAULT_STRAINS[index % DEFAULT_STRAINS.length];
        const sensorOption = DEFAULT_SOIL_SENSORS[index];

        return {
            zone_id: box.zone_id,
            row: box.row,
            col: box.col,
            x_pct: box.x_pct,
            y_pct: box.y_pct,
            w_pct: box.w_pct,
            h_pct: box.h_pct,
            plant_id: `PL-${String(index + 1).padStart(2, '0')}`,
            plant_name: `${preset.strain} #${(index % 3) + 1}`,
            strain: preset.strain,
            biotype: preset.biotype,
            natural_anthocyanins: preset.antho,
            expected_flowering_days: preset.days,
            soil_sensor_id: sensorOption ? sensorOption.id : undefined,
            soil_sensor_pin: sensorOption ? sensorOption.label : 'Monitoreo Visual por IA',
            bio_channel: index === 0 ? 'CH1' : index === 3 ? 'CH2' : 'NONE',
            active: true,
            notes: index === 0 ? 'Planta centinela con electrodos CH1' : ''
        };
    });

    return {
        room_name: 'Carpa 2 (Principal)',
        layout_mode: mode,
        grid_rows: rows,
        grid_cols: cols,
        scrog_net_installed: true,
        target_flip_coverage_pct: 72,
        linked_shelly_device_id: 'shellyplus1-8813bf9f8878',
        linked_shelly_name: 'Shelly Iluminación Carpa (8813bf9f8878)',
        only_capture_when_shelly_on: true,
        auto_capture_on_shelly_on: true,
        auto_track_enabled: true,
        auto_add_remove_zones: true,
        updated_at: new Date().toISOString(),
        zones
    };
}

function normalizeLegacySensors(layout: PlantGridLayout): PlantGridLayout {
    if (!layout?.zones) return layout;
    const seenSensorIds = new Set<string>();
    const seenBioChannels = new Set<string>();
    const rows = Math.max(1, layout.grid_rows || 2);
    const cols = Math.max(1, layout.grid_cols || 3);
    const defaultW = Number((100 / cols).toFixed(1));
    const defaultH = Number((100 / rows).toFixed(1));

    const zones = layout.zones.map((z, idx) => {
        let updated = { ...z };

        // Garantizar coordenadas relativas (x_pct, y_pct, w_pct, h_pct) si venían de versión anterior
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

        const isDuplicateSensor = Boolean(updated.soil_sensor_id && seenSensorIds.has(updated.soil_sensor_id));
        if (
            updated.soil_sensor_pin === 'Pin 1 (Suelo CH1)' ||
            updated.soil_sensor_pin === 'Pin 2 (Suelo CH2)' ||
            updated.soil_sensor_pin === 'Monitoreo Visual' ||
            (!updated.soil_sensor_id && updated.soil_sensor_pin !== 'Monitoreo Visual por IA') ||
            isDuplicateSensor
        ) {
            if (updated.soil_sensor_pin === 'Monitoreo Visual por IA' && !isDuplicateSensor) {
                updated.soil_sensor_id = undefined;
            } else {
                const freeOption = DEFAULT_SOIL_SENSORS.find(s => !seenSensorIds.has(s.id));
                if (freeOption) {
                    updated.soil_sensor_id = freeOption.id;
                    updated.soil_sensor_pin = freeOption.label;
                } else {
                    updated.soil_sensor_id = undefined;
                    updated.soil_sensor_pin = 'Monitoreo Visual por IA';
                }
            }
        }
        if (updated.soil_sensor_id) {
            seenSensorIds.add(updated.soil_sensor_id);
        }

        if (updated.bio_channel && updated.bio_channel !== 'NONE') {
            if (seenBioChannels.has(updated.bio_channel)) {
                updated.bio_channel = 'NONE';
            } else {
                seenBioChannels.add(updated.bio_channel);
            }
        }
        return updated;
    });
    return {
        ...layout,
        layout_mode: layout.layout_mode || 'grid',
        linked_shelly_device_id: layout.linked_shelly_device_id || 'shellyplus1-8813bf9f8878',
        linked_shelly_name: layout.linked_shelly_name || 'Shelly Iluminación Carpa (8813bf9f8878)',
        only_capture_when_shelly_on: layout.only_capture_when_shelly_on !== false,
        auto_capture_on_shelly_on: layout.auto_capture_on_shelly_on !== false,
        auto_track_enabled: layout.auto_track_enabled !== false,
        auto_add_remove_zones: layout.auto_add_remove_zones !== false,
        zones
    };
}

export function loadPlantGrid(): PlantGridLayout {
    try {
        if (fs.existsSync(PROD_GRID_PATH)) {
            const raw = fs.readFileSync(PROD_GRID_PATH, 'utf-8');
            return normalizeLegacySensors(JSON.parse(raw));
        }
        if (fs.existsSync(LOCAL_GRID_PATH)) {
            const raw = fs.readFileSync(LOCAL_GRID_PATH, 'utf-8');
            return normalizeLegacySensors(JSON.parse(raw));
        }
    } catch (err) {
        console.warn('[PlantGridStore] Error leyendo plant_grid.json, usando layout por defecto:', err);
    }
    return getDefaultGridLayout(2, 3);
}

export function savePlantGrid(layout: PlantGridLayout): PlantGridLayout {
    const updated: PlantGridLayout = {
        ...layout,
        updated_at: new Date().toISOString()
    };

    try {
        const prodDir = path.dirname(PROD_GRID_PATH);
        if (fs.existsSync('/var/www/captures') || process.platform === 'linux') {
            fs.mkdirSync(prodDir, { recursive: true });
            fs.writeFileSync(PROD_GRID_PATH, JSON.stringify(updated, null, 2), 'utf-8');
            return updated;
        }
    } catch (e) {
        console.warn('[PlantGridStore] No se pudo escribir en ruta prod, intentando ruta local:', e);
    }

    try {
        const localDir = path.dirname(LOCAL_GRID_PATH);
        fs.mkdirSync(localDir, { recursive: true });
        fs.writeFileSync(LOCAL_GRID_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (e) {
        console.error('[PlantGridStore] Error guardando plant_grid.json local:', e);
    }

    return updated;
}

function clampNum(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
}

function round1(val: number): number {
    return Number(val.toFixed(1));
}

function computeIoU(
    a: { x_pct: number; y_pct: number; w_pct: number; h_pct: number },
    b: { x_pct: number; y_pct: number; w_pct: number; h_pct: number }
): number {
    const x1 = Math.max(a.x_pct, b.x_pct);
    const y1 = Math.max(a.y_pct, b.y_pct);
    const x2 = Math.min(a.x_pct + a.w_pct, b.x_pct + b.w_pct);
    const y2 = Math.min(a.y_pct + a.h_pct, b.y_pct + b.h_pct);
    const interW = Math.max(0, x2 - x1);
    const interH = Math.max(0, y2 - y1);
    const interArea = interW * interH;
    const unionArea = a.w_pct * a.h_pct + b.w_pct * b.h_pct - interArea;
    return unionArea > 0 ? interArea / unionArea : 0;
}

export function normalizeBox2dToPct(
    box2d: number[] | null | undefined,
    scale: 1000 | 100 = 1000
): { x_pct: number; y_pct: number; w_pct: number; h_pct: number } | null {
    if (!Array.isArray(box2d) || box2d.length < 4) return null;
    const nums = box2d.slice(0, 4).map(Number);
    if (nums.some(n => isNaN(n))) return null;

    const factor = scale === 1000 ? 0.1 : 1;
    let ymin = nums[0] * factor;
    let xmin = nums[1] * factor;
    let ymax = nums[2] * factor;
    let xmax = nums[3] * factor;

    if (ymin > ymax) [ymin, ymax] = [ymax, ymin];
    if (xmin > xmax) [xmin, xmax] = [xmax, xmin];

    const cx = (xmin + xmax) / 2;
    const cy = (ymin + ymax) / 2;
    const w_pct = round1(clampNum(xmax - xmin, 9.5, 85));
    const h_pct = round1(clampNum(ymax - ymin, 14.5, 85));
    const x_pct = round1(clampNum(cx - w_pct / 2, 0, 100 - w_pct));
    const y_pct = round1(clampNum(cy - h_pct / 2, 0, 100 - h_pct));

    return { x_pct, y_pct, w_pct, h_pct };
}

/**
 * Empareja automáticamente las plantas/macetas detectadas por Visión IA contra el mapa
 * existente (plant_grid.json) para:
 * - Mover etiquetas automáticamente cuando una maceta cambió de posición.
 * - Crear zonas nuevas (P13, etc.) cuando se agrega una planta sin zona mapeada.
 * - Marcar como MISSING las zonas donde ya no hay maceta (sin borrar su historial,
 *   o desactivándolas si replaceAll: true).
 */
export function reconcileSpatialTracking(
    grid: PlantGridLayout,
    detectedBoxes: DetectedPlantBox[],
    options?: {
        forceSnap?: boolean;
        allowAddNew?: boolean;
        markMissing?: boolean;
        replaceAll?: boolean;
        maxMatchDistancePct?: number;
    }
): {
    updatedGrid: PlantGridLayout;
    movedCount: number;
    matchedCount: number;
    addedZones: string[];
    missingZones: string[];
    summaryMessage: string;
} {
    const now = new Date().toISOString();
    const validRaw = (Array.isArray(detectedBoxes) ? detectedBoxes : []).filter(
        b => Array.isArray(b?.box_2d) && b.box_2d.length >= 4 && !b.box_2d.slice(0, 4).some(v => isNaN(Number(v)))
    );

    if (validRaw.length === 0) {
        return {
            updatedGrid: grid,
            movedCount: 0,
            matchedCount: 0,
            addedZones: [],
            missingZones: [],
            summaryMessage: 'No se detectaron macetas o plantas válidas para reajustar el mapa.'
        };
    }

    // Determinar si la IA devolvió escala 0..1000 o 0..100 examinando todas las cajas juntas
    const allCoords = validRaw.flatMap(b => b.box_2d.slice(0, 4).map(Number));
    const maxCoord = Math.max(...allCoords);
    const detectedScale: 1000 | 100 = maxCoord > 100.5 ? 1000 : 100;

    interface NormalizedDet extends DetectedPlantBox {
        pct: { x_pct: number; y_pct: number; w_pct: number; h_pct: number };
        cx: number;
        cy: number;
    }

    const normalizedList: NormalizedDet[] = [];
    for (const raw of validRaw) {
        const pct = normalizeBox2dToPct(raw.box_2d, detectedScale);
        if (!pct) continue;
        const cx = pct.x_pct + pct.w_pct / 2;
        const cy = pct.y_pct + pct.h_pct / 2;

        // Deduplicar solo duplicados reales del mismo domo/maceta; domos contiguos en bandeja pueden estar a ~6-9%
        const isDuplicate = normalizedList.some(
            existing => computeIoU(existing.pct, pct) > 0.68 || Math.hypot(existing.cx - cx, existing.cy - cy) < 3.8
        );
        if (!isDuplicate) {
            normalizedList.push({ ...raw, pct, cx, cy });
        }
    }

    const zonesCopy: PlantZoneConfig[] = (grid.zones || []).map(z => ({ ...z }));
    const activeZoneIndices = zonesCopy
        .map((z, idx) => (z.active || z.presence_status === 'MISSING' ? idx : -1))
        .filter(idx => idx !== -1);

    const matchedZoneToDet = new Map<number, number>();
    const matchedDetIndices = new Set<number>();

    const distBetween = (z: PlantZoneConfig, d: NormalizedDet) => {
        const zcx = (z.x_pct ?? 0) + (z.w_pct ?? 20) / 2;
        const zcy = (z.y_pct ?? 0) + (z.h_pct ?? 25) / 2;
        return Math.hypot(zcx - d.cx, zcy - d.cy);
    };

    // Paso 1: Re-identificación explícita por etiqueta o número visible leído en la maceta/cúpula
    for (let detIdx = 0; detIdx < normalizedList.length; detIdx++) {
        const det = normalizedList[detIdx];
        const label = (det.visual_label_read || '').trim().toUpperCase();
        if (!label) continue;

        const zIdx = activeZoneIndices.find(idx => {
            if (matchedZoneToDet.has(idx)) return false;
            const z = zonesCopy[idx];
            const zId = String(z.zone_id || '').trim().toUpperCase();
            const marker = String(z.visual_marker_label || '').trim().toUpperCase();
            return zId === label || (marker.length > 0 && marker === label);
        });

        if (zIdx !== undefined) {
            matchedZoneToDet.set(zIdx, detIdx);
            matchedDetIndices.add(detIdx);
        }
    }

    // Paso 2: Hint por zone_id cuando proviene de per_plant_analysis (solo si está razonablemente cerca < 26%)
    for (let detIdx = 0; detIdx < normalizedList.length; detIdx++) {
        if (matchedDetIndices.has(detIdx)) continue;
        const det = normalizedList[detIdx];
        const hint = (det.zone_id_hint || '').trim().toUpperCase();
        if (!hint) continue;

        const zIdx = activeZoneIndices.find(
            idx => !matchedZoneToDet.has(idx) && String(zonesCopy[idx].zone_id || '').toUpperCase() === hint
        );
        if (zIdx !== undefined && distBetween(zonesCopy[zIdx], det) <= 26) {
            matchedZoneToDet.set(zIdx, detIdx);
            matchedDetIndices.add(detIdx);
        }
    }

    // Paso 3: Emparejamiento bipartito greedy por menor distancia euclidiana de centroides
    const runGreedyMatch = (limitDistPct: number) => {
        const candidatePairs: Array<{ zIdx: number; detIdx: number; dist: number }> = [];

        for (const zIdx of activeZoneIndices) {
            if (matchedZoneToDet.has(zIdx)) continue;
            for (let detIdx = 0; detIdx < normalizedList.length; detIdx++) {
                if (matchedDetIndices.has(detIdx)) continue;
                const d = distBetween(zonesCopy[zIdx], normalizedList[detIdx]);
                if (d <= limitDistPct) {
                    candidatePairs.push({ zIdx, detIdx, dist: d });
                }
            }
        }

        candidatePairs.sort((a, b) => a.dist - b.dist);

        for (const pair of candidatePairs) {
            if (!matchedZoneToDet.has(pair.zIdx) && !matchedDetIndices.has(pair.detIdx)) {
                matchedZoneToDet.set(pair.zIdx, pair.detIdx);
                matchedDetIndices.add(pair.detIdx);
            }
        }
    };

    const maxDist = options?.maxMatchDistancePct ?? 36;
    runGreedyMatch(maxDist);

    // Paso 3b: Fallback para plantas movidas a mayor distancia mientras queden zonas activas y detecciones libres
    const maxDistFallback = 42;
    if (
        maxDist < maxDistFallback &&
        matchedZoneToDet.size < activeZoneIndices.length &&
        matchedDetIndices.size < normalizedList.length
    ) {
        runGreedyMatch(maxDistFallback);
    }

    let matchedCount = 0;
    let movedCount = 0;
    const missingZones: string[] = [];
    const addedZones: string[] = [];

    // Aplicar emparejamientos y marcar ausencias
    for (const zIdx of activeZoneIndices) {
        const z = zonesCopy[zIdx];
        if (matchedZoneToDet.has(zIdx)) {
            const det = normalizedList[matchedZoneToDet.get(zIdx)!];
            const moveDist = distBetween(z, det);
            const sizeDiff = Math.abs(det.pct.w_pct - (z.w_pct ?? 20)) + Math.abs(det.pct.h_pct - (z.h_pct ?? 25));

            matchedCount++;
            const movedSignificantly = moveDist >= 2.5;
            if (movedSignificantly) movedCount++;

            if (options?.forceSnap || moveDist >= 2.0 || sizeDiff >= 6.0) {
                z.x_pct = det.pct.x_pct;
                z.y_pct = det.pct.y_pct;
                z.w_pct = det.pct.w_pct;
                z.h_pct = det.pct.h_pct;
            }
            z.active = true;
            z.presence_status = movedSignificantly ? 'MOVED' : 'PRESENT';
            z.last_seen_at = now;
            if (det.visual_label_read && det.visual_label_read.trim()) {
                z.visual_marker_label = det.visual_label_read.trim();
            }
        } else {
            if (options?.markMissing || options?.replaceAll) {
                z.presence_status = 'MISSING';
                if (options?.replaceAll) {
                    z.active = false;
                }
                missingZones.push(z.zone_id);
            } else {
                z.presence_status = 'PRESENT';
            }
        }
    }

    // Determinar metadatos predominantes del lote actual para heredarlos en plantas nuevas
    const allowAddNew = options?.allowAddNew !== undefined
        ? options.allowAddNew
        : (grid.auto_add_remove_zones !== false);

    if (allowAddNew) {
        const sampleActive = zonesCopy.find(z => z.active && z.presence_status !== 'MISSING') || zonesCopy[0];
        const defaultPlantName = sampleActive?.plant_name || 'Nueva Planta';
        const defaultStrain = sampleActive?.strain || 'Red Hot Cookies';
        const defaultBiotype = sampleActive?.biotype || 'HYBRID_50_50';
        const defaultAntho = sampleActive?.natural_anthocyanins ?? true;
        const defaultDays = sampleActive?.expected_flowering_days || 60;

        const usedSensorIds = new Set(zonesCopy.map(z => z.soil_sensor_id).filter(Boolean));
        const usedZoneIds = new Set(zonesCopy.map(z => String(z.zone_id || '').toUpperCase()));

        // Solo crear zonas nuevas si la cámara detectó realmente más ejemplares que los activos mapeados
        const maxNewZonesToCreate = Math.max(0, normalizedList.length - activeZoneIndices.length);
        let createdCount = 0;
        let nextNumber = zonesCopy.length + 1;
        for (let detIdx = 0; detIdx < normalizedList.length; detIdx++) {
            if (createdCount >= maxNewZonesToCreate) break;
            if (matchedDetIndices.has(detIdx)) continue;
            const det = normalizedList[detIdx];

            while (usedZoneIds.has(`P${nextNumber}`)) {
                nextNumber++;
            }
            const newZoneId = `P${nextNumber}`;
            usedZoneIds.add(newZoneId);
            nextNumber++;

            const freeSensor = DEFAULT_SOIL_SENSORS.find(s => !usedSensorIds.has(s.id));
            if (freeSensor) usedSensorIds.add(freeSensor.id);

            zonesCopy.push({
                zone_id: newZoneId,
                row: Math.floor(zonesCopy.length / Math.max(1, grid.grid_cols || 4)),
                col: zonesCopy.length % Math.max(1, grid.grid_cols || 4),
                x_pct: det.pct.x_pct,
                y_pct: det.pct.y_pct,
                w_pct: det.pct.w_pct,
                h_pct: det.pct.h_pct,
                plant_id: `PL-${String(zonesCopy.length + 1).padStart(2, '0')}`,
                plant_name: det.visual_label_read ? `${defaultPlantName} (${det.visual_label_read})` : defaultPlantName,
                strain: defaultStrain,
                biotype: defaultBiotype,
                natural_anthocyanins: defaultAntho,
                expected_flowering_days: defaultDays,
                soil_sensor_id: freeSensor ? freeSensor.id : undefined,
                soil_sensor_pin: freeSensor ? freeSensor.label : 'Monitoreo Visual por IA',
                bio_channel: 'NONE',
                active: true,
                notes: 'Detectada automáticamente por Visión IA',
                presence_status: 'NEW_DETECTED',
                last_seen_at: now,
                visual_marker_label: det.visual_label_read || undefined
            });
            addedZones.push(newZoneId);
            createdCount++;
        }
    }

    const parts: string[] = [];
    parts.push(`${matchedCount} planta(s) emparejada(s)`);
    if (movedCount > 0) parts.push(`${movedCount} etiqueta(s) reubicada(s)`);
    if (addedZones.length > 0) parts.push(`${addedZones.length} nueva(s) (${addedZones.join(', ')})`);
    if (missingZones.length > 0) parts.push(`${missingZones.length} ausente(s) (${missingZones.join(', ')})`);
    const summaryMessage = parts.join(' • ');

    const updatedGrid: PlantGridLayout = {
        ...grid,
        layout_mode: 'freeform',
        zones: zonesCopy,
        last_tracking_summary: {
            timestamp: now,
            matched_count: matchedCount,
            moved_count: movedCount,
            added_zones: addedZones,
            missing_zones: missingZones,
            message: summaryMessage
        },
        updated_at: now
    };

    return {
        updatedGrid,
        movedCount,
        matchedCount,
        addedZones,
        missingZones,
        summaryMessage
    };
}

function calcMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Garantiza coherencia total entre las zonas activas del mapa espacial (plant_grid.json)
 * y el arreglo per_plant_analysis devuelto por la IA o almacenado en base de datos.
 * - Siempre prevalecen el plant_name, strain y zone_id actuales configurados por el usuario.
 * - Calcula comparativa intra-lote contra la mediana (plantas rezagadas vs destacadas).
 * - Preserva estado de domo/cúpula, humedad visual del sustrato y estado de tracking espacial.
 */
export function reconcilePerPlantAnalysis(
    grid: PlantGridLayout,
    rawPerPlant: any[] | null | undefined,
    globalContext?: {
        stage?: string;
        health_score?: number;
        crop_detected?: boolean;
    }
): PerPlantAnalysis[] {
    if (!grid || !Array.isArray(grid.zones)) return [];
    const activeZones = grid.zones.filter(z => z.active);
    const rawList = Array.isArray(rawPerPlant) ? rawPerPlant : [];

    const stage = globalContext?.stage || 'SEEDLING';
    const isSeedlingOrVeg = ['SEEDLING', 'VEGETATIVE_EARLY', 'VEGETATIVE_SCROG', 'NONE'].includes(stage);
    const baseHealth = globalContext?.health_score && globalContext.health_score > 0 ? globalContext.health_score : 78;

    const mapped = activeZones.map(zone => {
        const match = rawList.find(
            (p: any) => p && String(p.zone_id).toUpperCase() === String(zone.zone_id).toUpperCase()
        );

        const defaultHarvestStatus: PerPlantAnalysis['harvest_status'] = isSeedlingOrVeg
            ? 'VEGETATIVE'
            : 'DEVELOPING';

        const zonePresence = zone.presence_status || (match?.presence_status as any) || 'PRESENT';

        if (zonePresence === 'MISSING') {
            return {
                zone_id: zone.zone_id,
                plant_name: zone.plant_name || `Planta ${zone.zone_id}`,
                strain: zone.strain || 'Sin especificar',
                health_score: 0,
                canopy_share_pct: 0,
                leaf_posture: 'NONE' as const,
                pheno_traits_observed: `Zona ${zone.zone_id} marcada como ausente/retirada en la captura más reciente.`,
                bud_count: 0,
                maturity_pct: 0,
                harvest_status: 'NONE' as const,
                anthocyanin_expression: 'NONE' as const,
                specific_diagnosis: 'Maceta no detectada en esta zona durante el último escaneo visual.',
                specific_action: 'Verifica si moviste o retiraste esta maceta (o usa Auto-Detectar Plantas IA).',
                presence_status: 'MISSING' as const,
                dome_detected: false,
                dome_status: 'NONE' as const,
                visual_substrate_moisture: 'UNKNOWN' as const
            };
        }

        if (match) {
            const rawScore = Number(match.health_score);
            const validScore = !isNaN(rawScore) && rawScore > 0 ? rawScore : baseHealth;
            const rawBuds = isSeedlingOrVeg ? 0 : Math.max(0, Number(match.bud_count) || 0);
            const rawMaturity = isSeedlingOrVeg ? 0 : Math.max(0, Number(match.maturity_pct) || 0);
            const parsedBox = Array.isArray(match.detected_box_2d)
                ? normalizeBox2dToPct(match.detected_box_2d, Math.max(...match.detected_box_2d.map(Number)) > 100.5 ? 1000 : 100)
                : match.detected_box_pct || undefined;

            return {
                zone_id: zone.zone_id,
                plant_name: zone.plant_name || `Planta ${zone.zone_id}`,
                strain: zone.strain || 'Sin especificar',
                health_score: validScore,
                canopy_share_pct: Math.max(2, Number(match.canopy_share_pct) || 8),
                leaf_posture: match.leaf_posture && ['PRAYING', 'TURGID', 'DROOPING', 'CLAWING'].includes(match.leaf_posture)
                    ? match.leaf_posture
                    : 'TURGID',
                pheno_traits_observed: match.pheno_traits_observed || `Ejemplar de ${zone.strain} en zona ${zone.zone_id} (${Math.round(zone.w_pct)}×${Math.round(zone.h_pct)}% del encuadre).`,
                bud_count: rawBuds,
                maturity_pct: rawMaturity,
                harvest_status: isSeedlingOrVeg ? 'VEGETATIVE' : (match.harvest_status || defaultHarvestStatus),
                anthocyanin_expression: match.anthocyanin_expression || 'NONE',
                specific_diagnosis: match.specific_diagnosis || `Vigor saludable en zona ${zone.zone_id} (${zone.strain}).`,
                specific_action: match.specific_action || (
                    isSeedlingOrVeg
                        ? 'Mantener humedad de sustrato homogénea y VPD de establecimiento radicular (0.6-0.9 kPa).'
                        : 'Continuar monitoreo fenológico y riego según plan nutricional activo.'
                ),
                presence_status: zonePresence,
                detected_box_pct: parsedBox || undefined,
                dome_detected: typeof match.dome_detected === 'boolean' ? match.dome_detected : undefined,
                dome_status: match.dome_status || (match.dome_detected ? 'OPTIMAL_HUMIDITY' : 'NONE'),
                visual_substrate_moisture: match.visual_substrate_moisture || 'UNKNOWN'
            } as PerPlantAnalysis;
        }

        const stageDesc = stage === 'SEEDLING'
            ? `Plántula de ${zone.strain} (${zone.plant_name}) posicionada en X:${Math.round(zone.x_pct)}% Y:${Math.round(zone.y_pct)}%. Cotiledones y primeras hojas verdaderas en desarrollo.`
            : `Planta de ${zone.strain} (${zone.plant_name}) activa en zona ${zone.zone_id}.`;

        const diagDesc = stage === 'SEEDLING'
            ? `Establecimiento inicial uniforme en zona ${zone.zone_id}. Sin signos visuales de estrés hídrico ni clorosis.`
            : `Desarrollo vegetativo normal en zona ${zone.zone_id} (${zone.strain}).`;

        return {
            zone_id: zone.zone_id,
            plant_name: zone.plant_name || `Planta ${zone.zone_id}`,
            strain: zone.strain || 'Sin especificar',
            health_score: baseHealth,
            canopy_share_pct: isSeedlingOrVeg ? 8 : 12,
            leaf_posture: 'TURGID' as const,
            pheno_traits_observed: stageDesc,
            bud_count: 0,
            maturity_pct: 0,
            harvest_status: defaultHarvestStatus,
            anthocyanin_expression: 'NONE' as const,
            specific_diagnosis: diagDesc,
            specific_action: isSeedlingOrVeg
                ? 'Mantener microclima húmedo y riego suave alrededor del tallo para estimular expansión radicular.'
                : 'Continuar seguimiento cenital y control de humedad por sensor asignado.',
            presence_status: zonePresence,
            dome_detected: undefined,
            dome_status: 'NONE' as const,
            visual_substrate_moisture: 'UNKNOWN' as const
        } as PerPlantAnalysis;
    });

    // Comparativa intra-lote para detectar plantas rezagadas o destacadas
    const presentItems = mapped.filter(m => m.presence_status !== 'MISSING' && m.health_score > 0);
    if (presentItems.length >= 3) {
        const medianScore = Math.round(calcMedian(presentItems.map(m => m.health_score)));
        const medianCanopy = round1(calcMedian(presentItems.map(m => m.canopy_share_pct)));

        for (const item of mapped) {
            if (item.presence_status === 'MISSING') {
                item.relative_growth_vs_batch = 'AVERAGE';
                item.lagging_alert = null;
                continue;
            }
            const isAhead =
                item.health_score >= medianScore + 7 ||
                (item.canopy_share_pct >= medianCanopy + 5 && item.health_score >= medianScore);
            const isLagging =
                item.health_score <= medianScore - 7 ||
                (item.health_score < 70 && medianScore >= 75) ||
                (medianCanopy >= 4 && item.canopy_share_pct <= medianCanopy * 0.5 && item.health_score <= medianScore - 3);

            if (isLagging) {
                item.relative_growth_vs_batch = 'LAGGING';
                item.lagging_alert = `Vigor rezagado vs mediana del lote (Score ${item.health_score} vs mediana ${medianScore}).`;
            } else if (isAhead) {
                item.relative_growth_vs_batch = 'AHEAD';
                item.lagging_alert = null;
            } else {
                item.relative_growth_vs_batch = 'AVERAGE';
                item.lagging_alert = null;
            }
        }
    }

    return mapped;
}
