import fs from 'fs';
import path from 'path';

export interface PlantZoneConfig {
    zone_id: string;
    row: number;
    col: number;
    plant_id: string;
    plant_name: string;
    strain: string;
    biotype: 'INDICA_DOMINANT' | 'SATIVA_DOMINANT' | 'HYBRID_50_50' | 'AUTOFLOWER';
    natural_anthocyanins: boolean;
    expected_flowering_days: number;
    soil_sensor_pin: string;
    bio_channel: 'NONE' | 'CH1' | 'CH2';
    active: boolean;
    notes?: string;
}

export interface PlantGridLayout {
    room_name: string;
    grid_rows: number;
    grid_cols: number;
    scrog_net_installed: boolean;
    target_flip_coverage_pct: number;
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

const PROD_GRID_PATH = '/var/www/captures/crop_vision/plant_grid.json';
const LOCAL_GRID_PATH = path.join(process.cwd(), 'public', 'captures', 'plant_grid.json');

export function getDefaultGridLayout(rows = 2, cols = 3): PlantGridLayout {
    const rowLabels = ['A', 'B', 'C', 'D'];
    const defaultStrains = [
        { strain: 'Nicole Punch', biotype: 'INDICA_DOMINANT' as const, antho: true, days: 60 },
        { strain: 'Nicole Punch', biotype: 'INDICA_DOMINANT' as const, antho: true, days: 60 },
        { strain: 'Nicole Punch', biotype: 'INDICA_DOMINANT' as const, antho: true, days: 60 },
        { strain: 'Tropicanna WFC', biotype: 'HYBRID_50_50' as const, antho: true, days: 65 },
        { strain: 'Tropicanna WFC', biotype: 'HYBRID_50_50' as const, antho: true, days: 65 },
        { strain: 'Gorilla Glue #4', biotype: 'SATIVA_DOMINANT' as const, antho: false, days: 68 }
    ];

    const zones: PlantZoneConfig[] = [];
    let index = 0;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const zoneId = `${rowLabels[r] || 'Z'}${c + 1}`;
            const preset = defaultStrains[index % defaultStrains.length];
            zones.push({
                zone_id: zoneId,
                row: r,
                col: c,
                plant_id: `PL-${String(index + 1).padStart(2, '0')}`,
                plant_name: `${preset.strain} #${(index % 3) + 1}`,
                strain: preset.strain,
                biotype: preset.biotype,
                natural_anthocyanins: preset.antho,
                expected_flowering_days: preset.days,
                soil_sensor_pin: index === 0 ? 'Pin 1 (Suelo CH1)' : index === 3 ? 'Pin 2 (Suelo CH2)' : 'Monitoreo Visual',
                bio_channel: index === 0 ? 'CH1' : index === 3 ? 'CH2' : 'NONE',
                active: true,
                notes: index === 0 ? 'Planta centinela principal con electrodos CH1' : ''
            });
            index++;
        }
    }

    return {
        room_name: 'Carpa 2 (Principal)',
        grid_rows: rows,
        grid_cols: cols,
        scrog_net_installed: true,
        target_flip_coverage_pct: 72,
        updated_at: new Date().toISOString(),
        zones
    };
}

export function loadPlantGrid(): PlantGridLayout {
    try {
        if (fs.existsSync(PROD_GRID_PATH)) {
            const raw = fs.readFileSync(PROD_GRID_PATH, 'utf-8');
            return JSON.parse(raw);
        }
        if (fs.existsSync(LOCAL_GRID_PATH)) {
            const raw = fs.readFileSync(LOCAL_GRID_PATH, 'utf-8');
            return JSON.parse(raw);
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
