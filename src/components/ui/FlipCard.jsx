import { useState } from "react";

export default function FlipCard({ front, back, expandedHeight = 560, onFlip }) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    const next = !flipped;
    setFlipped(next);
    onFlip?.(next);
  };

  return (
    <div
      style={{
        perspective: "1200px",
        width: "100%",
        gridColumn: flipped ? "1 / -1" : undefined,
        transition: "grid-column 0s",
        zIndex: flipped ? 10 : 1,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: flipped ? expandedHeight : 220,
          transformStyle: "preserve-3d",
          transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1), height 0.4s ease",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          cursor: flipped ? "default" : "pointer",
        }}
        onClick={() => { if (!flipped) handleFlip(); }}
      >
        {/* FACE AVANT */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: "18px 20px",
          overflow: "hidden",
        }}>
          {front}
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:12,
            fontSize:10, color:"rgba(201,160,99,0.45)", fontWeight:500 }}>
            <span>✦</span> Voir la stratégie IA →
          </div>
        </div>

        {/* FACE ARRIÈRE */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "#0A1628",
          border: "1px solid rgba(201,160,99,0.18)",
          borderRadius: 16, padding: "20px 22px",
          overflowY: "auto",
        }}>
          <button
            onClick={e => { e.stopPropagation(); handleFlip(); }}
            style={{
              position:"absolute", top:14, right:16,
              width:28, height:28, borderRadius:"50%",
              background:"rgba(255,255,255,0.06)",
              border:"1px solid rgba(255,255,255,0.1)",
              color:"rgba(255,255,255,0.45)", fontSize:16,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              zIndex:10,
            }}
          >×</button>
          {back}
        </div>
      </div>
    </div>
  );
}