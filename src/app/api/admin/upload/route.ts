import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "org-assets";
const ALLOWED_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function ext(mimeType: string) {
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  return "webp";
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ugyldig form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Ingen fil" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Kun SVG, PNG og JPG er støttet" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Filen er for stor (maks 2 MB)" }, { status: 400 });
  }

  const filename = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext(file.type)}`;
  const ab = await file.arrayBuffer();
  const client = supabaseAdmin();

  // Create bucket if it doesn't exist yet (idempotent)
  await client.storage.createBucket(BUCKET, { public: true, allowedMimeTypes: ALLOWED_TYPES });

  const { data, error } = await client.storage.from(BUCKET).upload(filename, ab, {
    contentType: file.type,
    cacheControl: "31536000",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
