import { NextResponse } from "next/server";
import { deleteServer, ValidationError } from "@/lib/servers";

export const dynamic = "force-dynamic";

// DELETE /api/servers/:id  -> remove a server
// Delete is a "sensitive action": we validate the id, return 404 when nothing
// matched, and never leak internal error detail to the client.
export async function DELETE(_request, { params }) {
  try {
    const removed = await deleteServer(params.id);
    if (!removed) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("DELETE /api/servers/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to delete server" },
      { status: 500 }
    );
  }
}
