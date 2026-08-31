"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["online", "offline", "degraded", "maintenance"];

const EMPTY_FORM = {
  name: "",
  ip_address: "",
  status: "online",
  location: "",
  cpu_usage: "",
};

export default function Dashboard({ initialServers, loadError }) {
  const router = useRouter();
  const [servers, setServers] = useState(initialServers);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(loadError || null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cpu_usage: form.cpu_usage === "" ? 0 : Number(form.cpu_usage),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register server");
      setServers((list) => [data, ...list]);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError(null);
    // Optimistically remove, then reconcile with the server response.
    const previous = servers;
    setServers((list) => list.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/servers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete server");
      }
      router.refresh();
    } catch (err) {
      setServers(previous); // roll back on failure
      setError(err.message);
    }
  }

  return (
    <div className="grid">
      <section className="panel" aria-label="Register a server">
        <h2>Register a server</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="web-prod-01"
            required
          />

          <label htmlFor="ip">IP address</label>
          <input
            id="ip"
            value={form.ip_address}
            onChange={(e) => update("ip_address", e.target.value)}
            placeholder="10.0.1.24"
            required
          />

          <label htmlFor="location">Location</label>
          <input
            id="location"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="us-west-2a"
            required
          />

          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label htmlFor="cpu">CPU usage (%)</label>
          <input
            id="cpu"
            type="number"
            min="0"
            max="100"
            value={form.cpu_usage}
            onChange={(e) => update("cpu_usage", e.target.value)}
            placeholder="0"
          />

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Registering…" : "Register server"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>

      <section className="panel" aria-label="Registered servers">
        <h2>Registered servers ({servers.length})</h2>
        {servers.length === 0 ? (
          <p className="empty">
            No servers registered yet. Add one using the form.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>IP</th>
                <th>Status</th>
                <th>Location</th>
                <th>CPU</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="mono">{s.ip_address}</td>
                  <td>
                    <span className={`badge ${s.status}`}>{s.status}</span>
                  </td>
                  <td>{s.location}</td>
                  <td className="mono">{s.cpu_usage}%</td>
                  <td>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(s.id)}
                      aria-label={`Delete ${s.name}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
