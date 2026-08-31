import { query } from "./db";

// Allowed status values. Keeping this in one place means the API, the UI, and
// the tests all agree on what a valid status is.
export const SERVER_STATUSES = ["online", "offline", "degraded", "maintenance"];

/**
 * Return every registered server, newest first.
 * On an empty database this resolves to an empty array (never null/undefined),
 * which keeps the UI and the API contract simple.
 */
export async function getServers() {
  const result = await query(
    `SELECT id, name, ip_address, status, location, cpu_usage, last_updated
       FROM servers
       ORDER BY last_updated DESC`
  );
  return result.rows;
}

/**
 * Validate and insert a new server. Throws a ValidationError (HTTP 400 upstream)
 * on bad input so the API layer can distinguish user error from server error.
 */
export async function createServer(input) {
  const { name, ip_address, status, location, cpu_usage } = normalize(input);

  const result = await query(
    `INSERT INTO servers (name, ip_address, status, location, cpu_usage)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, ip_address, status, location, cpu_usage, last_updated`,
    [name, ip_address, status, location, cpu_usage]
  );
  return result.rows[0];
}

/**
 * Delete a server by id. Returns true if a row was removed, false if no server
 * had that id (lets the API return a clean 404 instead of a silent 200).
 */
export async function deleteServer(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new ValidationError("id must be a positive integer");
  }
  const result = await query(`DELETE FROM servers WHERE id = $1`, [numericId]);
  return result.rowCount > 0;
}

// --- helpers -------------------------------------------------------------

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

function normalize(input) {
  const raw = input ?? {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) throw new ValidationError("name is required");
  if (name.length > 120) throw new ValidationError("name is too long");

  const ip_address =
    typeof raw.ip_address === "string" ? raw.ip_address.trim() : "";
  if (!ip_address) throw new ValidationError("ip_address is required");
  if (!isPlausibleIp(ip_address)) {
    throw new ValidationError("ip_address is not a valid IPv4 address");
  }

  const status = raw.status ?? "online";
  if (!SERVER_STATUSES.includes(status)) {
    throw new ValidationError(
      `status must be one of: ${SERVER_STATUSES.join(", ")}`
    );
  }

  const location =
    typeof raw.location === "string" ? raw.location.trim() : "";
  if (!location) throw new ValidationError("location is required");

  let cpu_usage = raw.cpu_usage ?? 0;
  cpu_usage = Number(cpu_usage);
  if (Number.isNaN(cpu_usage) || cpu_usage < 0 || cpu_usage > 100) {
    throw new ValidationError("cpu_usage must be a number between 0 and 100");
  }

  return { name, ip_address, status, location, cpu_usage };
}

function isPlausibleIp(value) {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}
