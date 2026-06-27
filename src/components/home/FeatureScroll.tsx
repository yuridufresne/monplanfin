import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
          style={{ textAlign: "center", marginBottom: 8 }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "#C9A063", textTransform: "uppercase" }}>
            Ce que vous obtenez
          </p>
        </motion.div>

        {/* Feature rows */}
        <div>
          {features.map((f, i) => (
            <div key={f.label}>
              {/* Row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={onCTA}
                className="cursor-pointer"
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                }}
              >
                <motion.h3
                  animate={{
                    color: hovered === i ? "#C9A063" : "rgba(255,255,255,0.88)",
                    scale: hovered === i ? 1.015 : 1,
                  }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{
                    fontFamily: "var(--font-urbanist)",
                    fontWeight: 800,
                    fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1.05,
                    display: "inline-block",
                  }}
                >
                  {f.label}
                </motion.h3>
              </motion.div>

              {/* Description expandable entre les items */}
              <AnimatePresence initial={false}>
                {hovered === i && (
                  <motion.div
                    key={`desc-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <p style={{
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 300,
                      color: "rgba(148,163,184,0.7)",
                      lineHeight: 1.7,
                      paddingBottom: 20,
                      maxWidth: 420,
                      margin: "0 auto",
                    }}>
                      {f.desc}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Divider */}
              {i < features.length - 1 && (
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}