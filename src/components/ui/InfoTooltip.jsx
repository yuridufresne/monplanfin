import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export default function InfoTooltip({ text, explanation, size = "sm" }) {
  // Support both `text` and legacy `explanation` prop
  const content = text || explanation;

  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  const show = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const TIP_W = 230;
    const wouldOverflow = r.left + TIP_W > window.innerWidth - 12;
    setCoords({
      top:  r.bottom + 6,
      left: wouldOverflow ? Math.max(8, r.right - TIP_W) : r.left,
    });
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visible, hide]);

  const btnSize = size === "sm" ? 15 : 17;
  const fontSize = size === "sm" ? 9 : 10;

  if (!content) return null;

  return (
    <>
      <button
        ref={btnRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={e => { e.stopPropagation(); setVisible(v => !v); }}
        aria-label="Plus d'informations"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: btnSize,
          height: btnSize,
          borderRadius: "50%",
          background: visible ? "rgba(201,160,99,0.18)" : "rgba(255,255,255,0.07)",
          border: `1px solid ${visible ? "rgba(201,160,99,0.45)" : "rgba(255,255,255,0.18)"}`,
          color: visible ? "#C9A063" : "rgba(255,255,255,0.38)",
          fontSize,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
          lineHeight: 1,
          transition: "all .15s",
          verticalAlign: "middle",
          marginLeft: 5,
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
        }}
      >i</button>

      {visible && createPortal(
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{
            position: "fixed",
            top:  coords.top,
            left: coords.left,
            width: 230,
            maxWidth: "calc(100vw - 24px)",
            background: "#0C1525",
            border: "1px solid rgba(201,160,99,0.22)",
            borderRadius: 10,
            padding: "10px 13px",
            fontSize: 12,
            color: "rgba(255,255,255,0.72)",
            lineHeight: 1.55,
            zIndex: 99999,
            boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
            wordBreak: "break-word",
            whiteSpace: "normal",
          }}
        >{content}</div>,
        document.body
      )}
    </>
  );
}