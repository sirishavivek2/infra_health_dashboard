import { NextResponse } from "next/server";
import { getServers, createServer, ValidationError } from "@/lib/servers";

// These routes touch the database on every request, so they must never be
// statically pre-rendered at build time.
export const dynamic = "force-dynamic";

// GET /api/servers  -> list all servers
export async function GET() {
  try {
    const servers = await getServers();
    return NextResponse.json(servers);
  } catch (err) {
    console.error("GET /api/servers failed:", err);
    return NextResponse.json(
      { error: "Failed to load servers" },
      { status: 500 }
    );
  }
}

// POST /api/servers  -> register a new server
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  try {
    const server = await createServer(body);
    return NextResponse.json(server, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/servers failed:", err);
    return NextResponse.json(
      { error: "Failed to register server" },
      { status: 500 }
    );
  }
}
