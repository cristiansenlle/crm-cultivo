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

        if (
            updated.soil_sensor_pin === 'Pin 1 (Suelo CH1)' ||
            updated.soil_sensor_pin === 'Pin 2 (Suelo CH2)' ||
            updated.soil_sensor_pin === 'Monitoreo Visual' ||
            (!updated.soil_sensor_id && updated.soil_sensor_pin !== 'Monitoreo Visual por IA') ||
            (updated.soil_sensor_id && seenSensorIds.has(updated.soil_sensor_id))
        ) {
            const sensorOption = DEFAULT_SOIL_SENSORS[idx];
            if (sensorOption && updated.soil_sensor_pin !== 'Monitoreo Visual por IA') {
                updated.soil_sensor_id = sensorOption.id;
                updated.soil_sensor_pin = sensorOption.label;
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
