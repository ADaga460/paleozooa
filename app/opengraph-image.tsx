import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Paleozooa - Daily Dinosaur Guessing Game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #1a2332 0%, #2a3a4a 50%, #3a2a1a 100%)",
          color: "#e8d9a8",
          fontFamily: "sans-serif",
          padding: 80,
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1,
            color: "#f0e4c0",
          }}
        >
          Paleozooa
        </div>
        <div
          style={{
            fontSize: 44,
            marginTop: 28,
            color: "#c4b090",
            textAlign: "center",
          }}
        >
          Daily Dinosaur Guessing Game
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 48,
            color: "#8a9aab",
            textAlign: "center",
          }}
        >
          Guess the mystery dinosaur using taxonomy clues
        </div>
      </div>
    ),
    { ...size }
  );
}
