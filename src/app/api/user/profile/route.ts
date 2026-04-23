import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/profile
 * Returns app-level profile data the client auth store needs to render
 * the user cell, CV defaults, etc.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, avatarUrl: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

/**
 * POST /api/user/profile/avatar (multipart/form-data with field `file`)
 * Uploads to Supabase Storage bucket `avatars`, replaces any existing file
 * for this user, stores the public URL on User.avatarUrl.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ingen fil lastet opp" }, { status: 400 });
  }
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
    return NextResponse.json(
      { error: "Kun PNG, JPG, WEBP eller GIF støttes." },
      { status: 400 },
    );
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Bildet er for stort (maks 2 MB)." }, { status: 400 });
  }

  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
  const objectPath = `${session.userId}/avatar.${ext}`;

  // Upload via the user's server-bound client so RLS policies apply.
  const supabase = await supabaseServer();
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(objectPath, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadErr) {
    // Retry via admin client in case user client lacks storage session.
    const admin = supabaseAdmin();
    const { error: adminErr } = await admin.storage
      .from("avatars")
      .upload(objectPath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });
    if (adminErr) {
      console.error("[avatar upload]", uploadErr, adminErr);
      return NextResponse.json(
        { error: `Kunne ikke laste opp bilde: ${uploadErr.message}` },
        { status: 502 },
      );
    }
  }

  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(objectPath);
  // Append a timestamp cachebuster so the browser re-fetches.
  const url = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: { avatarUrl: url },
    select: { id: true, email: true, name: true, avatarUrl: true },
  });

  return NextResponse.json({ user: updated });
}

/**
 * DELETE /api/user/profile/avatar — removes the avatar.
 */
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  // Remove any avatar.* file inside the user's folder.
  const { data: files } = await admin.storage
    .from("avatars")
    .list(session.userId);
  if (files?.length) {
    await admin.storage
      .from("avatars")
      .remove(files.map((f) => `${session.userId}/${f.name}`));
  }
  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: { avatarUrl: null },
    select: { id: true, email: true, name: true, avatarUrl: true },
  });
  return NextResponse.json({ user: updated });
}
