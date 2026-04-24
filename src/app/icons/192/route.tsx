import { ImageResponse } from "next/og";

export const contentType = "image/png";

export function GET() {
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
          width="150"
          height="150"
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
    { width: 192, height: 192 },
  );
}
