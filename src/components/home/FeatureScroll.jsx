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
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={onCTA}
              className="cursor-pointer"
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                padding: "28px 0",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                transition: "background 0.3s",
              }}
            >
              {/* Description à gauche — visible au hover */}
              <div className="hidden md:flex justify-end pr-10">
                <AnimatePresence>
                  {hovered === i && (
                    <motion.p
                      key="desc"
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        fontSize: 13,
                        fontWeight: 300,
                        color: "rgba(148,163,184,0.75)",
                        maxWidth: 220,
                        lineHeight: 1.65,
                        textAlign: "right",
                      }}
                    >
                      {f.desc}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Titre centré */}
              <motion.h3
                animate={{ color: hovered === i ? "#C9A063" : "rgba(255,255,255,0.88)" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{
                  fontFamily: "var(--font-urbanist)",
                  fontWeight: 800,
                  fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
                  letterSpacing: "-0.04em",
                  lineHeight: 1.05,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </motion.h3>

              {/* Colonne droite vide pour équilibrer la grille */}
              <div />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}