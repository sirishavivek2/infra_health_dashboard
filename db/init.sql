-- Schema for the Infrastructure Health Dashboard.
-- This file is applied automatically when the Postgres container first starts
-- (it is mounted into /docker-entrypoint-initdb.d in docker-compose.yml), and
-- can also be run by hand:  psql "$DATABASE_URL" -f db/init.sql

CREATE TABLE IF NOT EXISTS servers (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(120) NOT NULL,
    ip_address   VARCHAR(45)  NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'online'
                 CHECK (status IN ('online', 'offline', 'degraded', 'maintenance')),
    location     VARCHAR(120) NOT NULL,
    cpu_usage    NUMERIC(5,2) NOT NULL DEFAULT 0
                 CHECK (cpu_usage >= 0 AND cpu_usage <= 100),
    last_updated TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Keep last_updated fresh on every change without the app having to remember.
CREATE OR REPLACE FUNCTION touch_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_last_updated ON servers;
CREATE TRIGGER trg_touch_last_updated
    BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION touch_last_updated();

-- A little seed data so the dashboard isn't empty on first run.
INSERT INTO servers (name, ip_address, status, location, cpu_usage)
SELECT * FROM (VALUES
    ('web-prod-01',  '10.0.1.24',  'online',      'us-west-2a', 37.5),
    ('db-primary',   '10.0.2.10',  'online',      'us-west-2b', 61.2),
    ('cache-02',     '10.0.3.51',  'degraded',    'us-east-1a', 88.9),
    ('batch-worker', '10.0.4.7',   'maintenance', 'us-east-1c', 4.0)
) AS seed(name, ip_address, status, location, cpu_usage)
WHERE NOT EXISTS (SELECT 1 FROM servers);
