const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });
    
    const cmds = `
DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-client

cat << 'EOF' > patch_vpd.sql
CREATE OR REPLACE FUNCTION calculate_vpd_trigger_func()
RETURNS trigger AS $$
DECLARE
    temp_c NUMERIC;
    hum_pct NUMERIC;
    svpPa FLOAT;
    svpKpa FLOAT;
    avpKpa FLOAT;
BEGIN
    temp_c := NEW.temperature_c;
    hum_pct := NEW.humidity_percent;

    IF temp_c IS NULL OR hum_pct IS NULL THEN
        RETURN NEW;
    END IF;

    -- Formula (Usamos FLOAT para math complex)
    svpPa := 610.78 * EXP((17.27 * temp_c::FLOAT) / (temp_c::FLOAT + 237.3));
    svpKpa := svpPa / 1000.0;
    avpKpa := svpKpa * (hum_pct::FLOAT / 100.0);
    NEW.vpd_kpa := ROUND(CAST((svpKpa - avpKpa) AS NUMERIC), 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calc_vpd_trg ON daily_telemetry;

CREATE TRIGGER calc_vpd_trg
BEFORE INSERT OR UPDATE ON daily_telemetry
FOR EACH ROW
EXECUTE FUNCTION calculate_vpd_trigger_func();

-- Forzar reparacion de todo registro nulo o cero 
UPDATE daily_telemetry SET vpd_kpa = 0 WHERE vpd_kpa IS NULL OR vpd_kpa = 0;
EOF

export PGPASSWORD="Fn@calderon6193"
psql -h db.opnjrzixsrizdnphbjnq.supabase.co -U postgres -d postgres -p 5432 -f patch_vpd.sql

echo "SQL COMPLETADO."
    `;

    console.log("Injecting SQL formula logic into Supabase Root Database...");
    const res = await ssh.execCommand(cmds);
    console.log("STDOUT:", res.stdout);
    console.log("STDERR:", res.stderr);
    ssh.dispose();
}
run();
