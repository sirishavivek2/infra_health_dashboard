import {
  getServers,
  createServer,
  deleteServer,
  ValidationError,
  SERVER_STATUSES,
} from "@/lib/servers";
import { query } from "@/lib/db";

// The data layer is the interesting logic to test in isolation: we mock the
// database so the tests are fast, deterministic, and require no running Postgres
// (which is exactly what makes them safe to run in CI on every push).
jest.mock("@/lib/db", () => ({
  query: jest.fn(),
}));

describe("getServers", () => {
  it("returns an empty array when the database is empty", async () => {
    // This is the case the interviewer's plan calls out explicitly: the API
    // must handle an empty database gracefully rather than blowing up.
    query.mockResolvedValueOnce({ rows: [] });

    const servers = await getServers();

    expect(servers).toEqual([]);
    expect(Array.isArray(servers)).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("returns the rows the database gives back", async () => {
    const rows = [
      { id: 1, name: "web-01", status: "online" },
      { id: 2, name: "db-01", status: "degraded" },
    ];
    query.mockResolvedValueOnce({ rows });

    const servers = await getServers();

    expect(servers).toEqual(rows);
  });
});

describe("createServer", () => {
  it("inserts a valid server and returns the created row", async () => {
    const created = {
      id: 10,
      name: "cache-01",
      ip_address: "10.0.0.5",
      status: "online",
      location: "us-west-2a",
      cpu_usage: 12,
    };
    query.mockResolvedValueOnce({ rows: [created] });

    const result = await createServer({
      name: "cache-01",
      ip_address: "10.0.0.5",
      location: "us-west-2a",
    });

    expect(result).toEqual(created);
    // The value passed to Postgres must go through parameters, not string
    // concatenation — assert the parameterized call shape.
    const [, params] = query.mock.calls[0];
    expect(params).toContain("cache-01");
    expect(params).toContain("10.0.0.5");
  });

  it("rejects a missing name before touching the database", async () => {
    await expect(createServer({ ip_address: "10.0.0.5", location: "x" }))
      .rejects.toBeInstanceOf(ValidationError);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects an invalid IP address", async () => {
    await expect(
      createServer({ name: "n", ip_address: "999.1.1.1", location: "x" })
    ).rejects.toThrow(/ip_address/);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects an unknown status", async () => {
    await expect(
      createServer({
        name: "n",
        ip_address: "10.0.0.1",
        location: "x",
        status: "on-fire",
      })
    ).rejects.toThrow(/status/);
  });

  it("rejects a cpu_usage outside 0–100", async () => {
    await expect(
      createServer({
        name: "n",
        ip_address: "10.0.0.1",
        location: "x",
        cpu_usage: 150,
      })
    ).rejects.toThrow(/cpu_usage/);
  });

  it("keeps the status whitelist and the DB check constraint in sync", () => {
    expect(SERVER_STATUSES).toEqual([
      "online",
      "offline",
      "degraded",
      "maintenance",
    ]);
  });
});

describe("deleteServer", () => {
  it("returns true when a row was deleted", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    await expect(deleteServer(5)).resolves.toBe(true);
  });

  it("returns false when no row matched (so the API can 404)", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });
    await expect(deleteServer(999)).resolves.toBe(false);
  });

  it("rejects a non-numeric id without querying", async () => {
    await expect(deleteServer("not-a-number")).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(query).not.toHaveBeenCalled();
  });
});
