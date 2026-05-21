import React, { useState } from "react";
import { motion } from "framer-motion";

const features = [
  {
    label: "Éducation financière interactive",
    desc: "Apprenez à votre rythme avec des modules engageants et adaptés à votre réalité.",
  },
  {
    label: "IA formée pour le Québec",
    desc: "Un moteur d'intelligence artificielle entraîné spécifiquement sur la fiscalité et les lois québécoises.",
  },
  {
    label: "Conseillers en sécurité financière",
    desc: "Accédez à des professionnels certifiés AMF en direct pour des conseils personnalisés.",
  },
  {
    label: "Comment l'argent travaille",
    desc: "Comprenez les intérêts composés, les placements et les mécanismes de création de richesse.",
  },
  {
    label: "L'argent expliqué aux enfants",
    desc: "Des ressources pédagogiques pour initier vos enfants aux bonnes habitudes financières dès le jeune âge.",
  },
  {
    label: "Mythes & Légendes Urbaines",
    desc: "On démystifie les idées reçues sur l'argent, les impôts et les investissements au Québec.",
  },
];

export default function FeatureScroll({ onCTA }) {
  const [hovered, setHovered] = useState(null);

  return (
    <section style={{ background: "#050810", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "#C9A063", textTransform: "uppercase", marginBottom: 8 }}>
            Ce que vous obtenez
          </p>
        </motion.div>

        {/* Feature rows */}
        <div>
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={onCTA}
              className="cursor-pointer group"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 0",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                transition: "all 0.2s",
              }}
            >
              {/* Big label */}
              <motion.h3
                animate={{ color: hovered === i ? "#C9A063" : "rgba(255,255,255,0.85)" }}
                transition={{ duration: 0.2 }}
                style={{
                  fontFamily: "var(--font-urbanist)",
                  fontWeight: 800,
                  fontSize: "clamp(1.6rem, 4vw, 3rem)",
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                  flex: 1,
                }}
              >
                {f.label}
              </motion.h3>

              {/* Desc — visible on hover */}
              <motion.p
                animate={{ opacity: hovered === i ? 1 : 0, x: hovered === i ? 0 : 12 }}
                transition={{ duration: 0.25 }}
                style={{
                  fontSize: 13,
                  fontWeight: 300,
                  color: "rgba(148,163,184,0.8)",
                  maxWidth: 260,
                  lineHeight: 1.65,
                  textAlign: "right",
                  flexShrink: 0,
                  marginLeft: 24,
                }}
                className="hidden md:block"
              >
                {f.desc}
              </motion.p>

              {/* Arrow */}
              <motion.span
                animate={{ opacity: hovered === i ? 1 : 0.2, x: hovered === i ? 0 : -6 }}
                transition={{ duration: 0.2 }}
                style={{ marginLeft: 20, fontSize: 20, color: "#C9A063", flexShrink: 0 }}
              >
                →
              </motion.span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}