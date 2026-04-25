import { getSession, getUserRoles } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await getUserRoles();
  if (!roles) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(roles);
}
