import React, { useState, useRef, useEffect } from 'react';

/**
 * InfoTooltip — Icône info interactive avec tooltip
 * 
 * Usage:
 * <InfoTooltip label="Ratio d'amortissement" explanation="..." />
 * <label>Ratio d'amortissement <InfoTooltip explanation="..." /></label>
 */
export default function InfoTooltip({ explanation, label, position = "top" }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef(null);
  const iconRef = useRef(null);

  // Fermer au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target) && 
          iconRef.current && !iconRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    right: "left-full ml-2",
    left: "right-full mr-2",
  };

  const arrowClasses = {
    top: "top-full border-t-[6px] border-x-[4px] border-x-transparent border-b-0",
    bottom: "bottom-full border-b-[6px] border-x-[4px] border-x-transparent border-t-0",
    right: "right-full border-r-[6px] border-y-[4px] border-y-transparent border-l-0",
    left: "left-full border-l-[6px] border-y-[4px] border-y-transparent border-r-0",
  };

  return (
    <span className="relative inline-block">
      <button
        ref={iconRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-label={`Information sur ${label || explanation}`}
        role="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full cursor-help transition-all duration-200 ml-1"
        style={{
          background: "rgba(201,160,99,0.15)",
          border: "1px solid rgba(201,160,99,0.3)",
          color: "#C9A063",
          fontSize: "11px",
          fontWeight: "700",
          lineHeight: "1",
          flexShrink: 0,
        }}
      >
        i
      </button>

      {/* Tooltip */}
      {isOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute ${positionClasses[position]} left-1/2 transform -translate-x-1/2 z-50 opacity-0 animation-fadeIn pointer-events-auto`}
          style={{
            animation: "fadeIn 0.2s ease-out forwards",
            minWidth: "200px",
            maxWidth: "280px",
            width: "max-content",
          }}
        >
          {/* Contenu tooltip */}
          <div
            className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed font-medium"
            style={{
              background: "#0D1628",
              border: "1px solid rgba(201,160,99,0.25)",
              color: "#E5E7EB",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
              backdropFilter: "blur(16px)",
            }}
          >
            {explanation}
          </div>

          {/* Flèche pointant vers l'icône */}
          <div
            className={`absolute w-0 h-0 ${arrowClasses[position]}`}
            style={{
              borderTopColor: position === "top" ? "#0D1628" : "transparent",
              borderBottomColor: position === "bottom" ? "#0D1628" : "transparent",
              borderLeftColor: position === "left" ? "#0D1628" : "transparent",
              borderRightColor: position === "right" ? "#0D1628" : "transparent",
              left: position === "left" || position === "right" ? "auto" : "50%",
              transform: position === "left" || position === "right" ? "none" : "translateX(-50%)",
            }}
          />
        </div>
      )}

      {/* Animation CSS */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -4px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        @media (max-width: 640px) {
          [role="tooltip"] {
            max-width: calc(100vw - 2rem) !important;
          }
        }
      `}</style>
    </span>
  );
}