import { useState } from "react";

export default function FlipCard({ front, back, expandedHeight = 540 }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div style={{ perspective: "1200px", width: "100%" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          minHeight: flipped ? expandedHeight : 220,
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1), min-height 0.4s ease",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          cursor: flipped ? "default" : "pointer",
        }}
        onClick={() => { if (!flipped) setFlipped(true); }}
      >
        {/* FACE AVANT */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: "100%",
            backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: "18px 20px",
          }}
        >
          {front}
          <div style={{
            display: "flex", alignItems: "center", gap: 5, marginTop: 10,
            fontSize: 10, color: "rgba(201,160,99,0.5)", fontWeight: 500,
          }}>
            <span style={{ fontSize: 13 }}>✦</span>
            Voir la stratégie IA →
          </div>
        </div>

        {/* FACE ARRIÈRE */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: "100%",
            backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "rgba(13,22,40,0.97)",
            border: "1px solid rgba(201,160,99,0.20)",
            borderRadius: 16, padding: "18px 20px",
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); setFlipped(false); }}
            style={{
              position: "absolute", top: 14, right: 16,
              width: 26, height: 26, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.5)", fontSize: 16,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
          {back}
        </div>
      </div>
    </div>
  );
}