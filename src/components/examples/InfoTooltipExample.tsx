import React from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';

/**
 * Exemple d'utilisation du composant InfoTooltip
 * Intégration dans un formulaire financier
 */
export default function InfoTooltipExample() {
  return (
    <div style={{ padding: "2rem", background: "#050810", minHeight: "100vh" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ color: "#fff", marginBottom: "2rem", fontSize: "1.5rem" }}>Exemples d'utilisation - InfoTooltip</h1>

        {/* Exemple 1 : Inline avec label */}
        <div style={{ marginBottom: "3rem" }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#E5E7EB", marginBottom: "0.5rem" }}>
            Ratio d'amortissement
            <InfoTooltip
              label="Ratio d'amortissement"
              explanation="Le ratio d'amortissement compare votre revenu brut mensuel au paiement hypothécaire. Un ratio sain est généralement ≤ 32%. Formule : (paiement hypothécaire ÷ revenu brut) × 100"
              position="top"
            />
          </label>
          <input
            type="number"
            placeholder="ex: 28"
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: "14px",
            }}
          />
        </div>

        {/* Exemple 2 : Avec une question */}
        <div style={{ marginBottom: "3rem" }}>
          <p style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#E5E7EB", marginBottom: "1rem" }}>
            Avez-vous un fonds de pension au travail ?
            <InfoTooltip
              label="Fonds de pension"
              explanation="Un fonds de pension est un régime de retraite collectif offert par votre employeur. Il existe deux types : cotisation déterminée (vous connaissez votre contribution) ou prestation déterminée (vous connaissez votre revenu de retraite)."
              position="right"
            />
          </p>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="radio" name="pension" value="oui" style={{ cursor: "pointer" }} />
              <span style={{ color: "#E5E7EB", fontSize: "13px" }}>Oui</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="radio" name="pension" value="non" style={{ cursor: "pointer" }} />
              <span style={{ color: "#E5E7EB", fontSize: "13px" }}>Non</span>
            </label>
          </div>
        </div>

        {/* Exemple 3 : Avec plusieurs termes */}
        <div style={{ marginBottom: "3rem", padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 style={{ color: "#C9A063", fontSize: "13px", fontWeight: "700", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Termes financiers clés
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <p style={{ display: "flex", alignItems: "center", fontSize: "13px", color: "#94A3B8" }}>
                CELI
                <InfoTooltip
                  explanation="Compte d'épargne libre d'impôt (CELI) — compte de placement enregistré au Canada. Les revenus générés ne sont pas imposés et vous pouvez retirer l'argent sans implications fiscales."
                  position="bottom"
                />
              </p>
            </div>
            <div>
              <p style={{ display: "flex", alignItems: "center", fontSize: "13px", color: "#94A3B8" }}>
                REER
                <InfoTooltip
                  explanation="Régime enregistré d'épargne-retraite (REER) — compte de retraite enregistré. Les cotisations sont déductibles du revenu imposable et la croissance est à l'abri de l'impôt jusqu'au retrait."
                  position="bottom"
                />
              </p>
            </div>
            <div>
              <p style={{ display: "flex", alignItems: "center", fontSize: "13px", color: "#94A3B8" }}>
                NIF (Numéro d'Indépendance Financière)
                <InfoTooltip
                  explanation="Le capital total nécessaire pour vivre de vos placements sans travailler. Calculé selon votre revenu mensuel désiré à la retraite et un taux de rendement estimé (généralement 4%)."
                  position="bottom"
                />
              </p>
            </div>
          </div>
        </div>

        {/* Exemple 4 : Icône seule (sans label) */}
        <div style={{ marginBottom: "3rem" }}>
          <p style={{ fontSize: "13px", color: "#94A3B8" }}>
            Votre épargne totale actuelle :
            {" "}
            <span style={{ fontWeight: "700", color: "#5BC4A0" }}>45 000$</span>
            <InfoTooltip
              explanation="Somme de tous vos comptes d'épargne enregistrés et non enregistrés (CELI, REER, comptes non enregistrés, crypto, etc.)."
              position="top"
            />
          </p>
        </div>

        {/* Info visuelle */}
        <div style={{ padding: "1rem", background: "rgba(201,160,99,0.06)", borderRadius: "0.75rem", border: "1px solid rgba(201,160,99,0.15)" }}>
          <p style={{ fontSize: "12px", color: "#94A3B8", lineHeight: "1.6" }}>
            💡 <strong style={{ color: "#C9A063" }}>Astuce :</strong> Survolez l'icône <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "50%", background: "rgba(201,160,99,0.15)", border: "1px solid rgba(201,160,99,0.3)", color: "#C9A063", fontSize: "10px", fontWeight: "700" }}>i</span> pour voir l'explication d'un terme. Sur mobile, appuyez sur l'icône.
          </p>
        </div>
      </div>
    </div>
  );
}