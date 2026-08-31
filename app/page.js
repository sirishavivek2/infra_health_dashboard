import { getServers } from "@/lib/servers";
import Dashboard from "./components/Dashboard";

// This page reads live data on every request, so opt out of static rendering.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let servers = [];
  let loadError = null;

  try {
    servers = await getServers();
  } catch (err) {
    // The UI should still render (with an error banner) even if the database
    // is unreachable — a blank white screen is a worse experience.
    console.error("Failed to load servers for page:", err);
    loadError =
      "Could not reach the database. Is Postgres running and DATABASE_URL set?";
  }

  return <Dashboard initialServers={servers} loadError={loadError} />;
}
