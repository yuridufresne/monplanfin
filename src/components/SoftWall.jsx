import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { X, Lock, Sparkles, ArrowRight } from "lucide-react";

export default function SoftWall({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #0D1628 0%, #050810 100%)",
                border: "1px solid rgba(201,160,99,0.2)",
                boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,160,99,0.05) inset",
              }}
            >
              {/* Top champagne bar */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#C9A063] to-transparent" />

              <div className="p-8">
                {/* Close */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(201,160,99,0.12)", border: "1px solid rgba(201,160,99,0.25)" }}
                  >
                    <Sparkles className="w-6 h-6 text-[#C9A063]" />
                  </div>
                </div>

                {/* Text */}
                <div className="text-center mb-8">
                  <h2 className="text-[1.5rem] font-urbanist font-bold text-white mb-3 tracking-tight">
                    Passez à l'espace sécurisé
                  </h2>
                  <p className="text-[14px] text-[#94A3B8] leading-relaxed">
                    Sauvegardez vos résultats, synchronisez vos données et accédez à votre tableau de bord personnalisé.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {[
                    "Sauvegarde automatique de vos calculs",
                    "Tableau de bord financier complet",
                    "Suivi des placements & budget interactif",
                    "Plan financier à long terme",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(201,160,99,0.15)" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C9A063]" />
                      </div>
                      <span className="text-[13px] text-[#94A3B8]">{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-[14px] transition-all duration-200 mb-3"
                  style={{ background: "#C9A063", color: "#050810" }}
                >
                  Créer mon espace gratuit
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="w-full py-3 rounded-xl text-[13.5px] font-medium text-white/50 hover:text-white/80 transition-colors"
                >
                  J'ai déjà un compte — Connexion
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}