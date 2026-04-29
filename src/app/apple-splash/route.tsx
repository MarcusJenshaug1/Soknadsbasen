import { ImageResponse } from "next/og";

export const runtime = "edge";

const ALLOWED = new Set([
  "750x1334",
  "828x1792",
  "1125x2436",
  "1242x2688",
  "1170x2532",
  "1284x2778",
  "1179x2556",
  "1290x2796",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const w = Number(searchParams.get("w") ?? 1170);
  const h = Number(searchParams.get("h") ?? 2532);
  if (!ALLOWED.has(`${w}x${h}`)) {
    return new Response("bad size", { status: 400 });
  }
  const logo = Math.round(Math.min(w, h) * 0.22);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#D5592E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={logo}
          height={logo}
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 3 C25 3 29 7 29 16 C29 25 25 29 16 29 L10 29 L3 22 L3 10 C3 6 5 3 10 3 Z"
            fill="#faf8f5"
          />
          <path d="M3 22 L10 29 L3 29 Z" fill="#eee9df" />
        </svg>
      </div>
    ),
    {
      width: w,
      height: h,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
