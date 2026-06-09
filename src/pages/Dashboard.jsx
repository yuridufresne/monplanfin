{/* ── ZONE 3.5 — Immobilier (pré-qualification) ─────────── */}
            <motion.div {...fadeUp(0.19)} className="mb-5">
              <FlipCard
                expandedHeight={620}
                onFlip={setImmoFlipped}
                front={
                  !immoRempli ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Home size={16} color="#C9A063" />
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Pré-qualification immobilière</p>
                        </div>
                        <Badge color="gold">Outil gratuit</Badge>
                      </div>
                      <div style={{ textAlign: "center", padding: "24px 16px" }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>
                          Envie de savoir jusqu'à combien<br/>une banque peut vous prêter ?
                        </p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: "0 auto 18px", lineHeight: 1.6 }}>
                          Complétez votre revenu, cote de crédit et propriétés dans l'ABF pour voir instantanément votre montant maximal qualifié.
                        </p>
                        <Link to="/analyse" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 12, background: "linear-gradient(135deg, #C9A063, #e6c07a)", color: "#050810", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                          Compléter l'ABF <ArrowRight style={{ width: 14, height: 14 }} />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Home size={16} color="#C9A063" />
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Pré-qualification immobilière</p>
                        </div>
                        <Badge color="gold">Estimation</Badge>
                      </div>
                      <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 14, letterSpacing: ".05em" }}>
                        Estimation BSIF 2026 · Avec votre cote {payloadImmo.cote_credit} · Non-courtier hypothécaire
                      </p>
                      {(() => {
                        const r = recoImmoMap["5"];
                        return (
                          <>
                            <div style={{ textAlign: "center", padding: "22px 0", borderRadius: 16, background: "linear-gradient(135deg, rgba(201,160,99,0.08), rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.2)" }}>
                              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(201,160,99,0.6)", marginBottom: 8 }}>Montant max qualifié</p>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: 42, fontWeight: 800, color: "#C9A063", lineHeight: 1, letterSpacing: "-.02em" }}>
                                {fmt(r.prixMax)}
                              </p>
                              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 8 }}>
                                prêt {fmt(r.pretTotal)} + mise {fmt(r.miseEffective)} ({(r.misePct || 0).toFixed(1)} %)
                              </p>
                              <p style={{ fontSize: 10.5, color: "rgba(91,196,160,0.7)", marginTop: 8, lineHeight: 1.5, maxWidth: 380, margin: "8px auto 0" }}>
                                💡 Avec une mise de fonds plus importante, le prix de maison achetable peut être supérieur.
                              </p>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <p style={{ ...LABEL, marginBottom: 3 }}>Paiement mensuel</p>
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                                  {fmt(r.paiementHypoReel)}/m
                                </p>
                              </div>
                              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <p style={{ ...LABEL, marginBottom: 3 }}>Cash au closing</p>
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                                  {fmt(r.cashClosingReel || r.cashTotalRequis)}
                                </p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                      <p style={{ fontSize: 10.5, color: "rgba(201,160,99,0.6)", marginTop: 14, textAlign: "center", fontWeight: 600 }}>
                        ↻ Cliquez pour comparer 5 / 10 / 15 / 20 %
                      </p>
                    </div>
                  )
                }
                back={
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Comparez vos stratégies de mise</p>
                      <Link to="/immobilier" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "#C9A063", textDecoration: "none" }}>Outil complet →</Link>
                    </div>
                    <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginBottom: 14, lineHeight: 1.5 }}>
                      Plus de mise = moins de maison à mise égale (votre épargne fixe le plafond)
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                      {["5", "10", "15", "20"].map(p => (
                        <button key={p} onClick={(e) => { e.stopPropagation(); setImmoPctSelected(p); }}
                          style={{
                            padding: "10px 6px", borderRadius: 10, cursor: "pointer",
                            background: immoPctSelected === p ? "linear-gradient(135deg, rgba(201,160,99,0.22), rgba(201,160,99,0.06))" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${immoPctSelected === p ? "#C9A063" : "rgba(255,255,255,0.08)"}`,
                            color: immoPctSelected === p ? "#C9A063" : "rgba(255,255,255,0.55)",
                            fontSize: 14, fontWeight: 700, textAlign: "center",
                          }}>
                          {p}%
                        </button>
                      ))}
                    </div>
                    <div style={{ padding: "16px 18px", borderRadius: 14, background: "linear-gradient(135deg, rgba(201,160,99,0.07), rgba(201,160,99,0.02))", border: "1px solid rgba(201,160,99,0.18)", marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                        <div>
                          <p style={{ ...LABEL, marginBottom: 4 }}>Montant max qualifié</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 800, color: "#C9A063", lineHeight: 1 }}>
                            {fmt(recoImmoSel.prixMax)}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ ...LABEL, marginBottom: 4 }}>Mise comptant ({immoPctSelected} %)</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#5BC4A0" }}>
                            {fmt(recoImmoSel.miseEffective)}
                          </p>
                        </div>
                      </div>
                      {recoImmoSel.limitePar === "cash" && (
                        <p style={{ fontSize: 10.5, color: "rgba(245,158,11,0.7)", textAlign: "center", marginBottom: 6, lineHeight: 1.5 }}>
                          ⓘ Limité par votre épargne ({fmt(recoImmoSel.miseDeFondsDispo)}) — pour mettre {immoPctSelected} % comptant sur un prix plus élevé, il faut épargner davantage.
                        </p>
                      )}
                      {recoImmoSel.limitePar === "revenu" && (
                        <p style={{ fontSize: 10.5, color: "rgba(91,196,160,0.7)", textAlign: "center", marginBottom: 6, lineHeight: 1.5 }}>
                          ✓ Limité par votre revenu (ratios ABD/ATD) — pas par l'épargne.
                        </p>
                      )}
                      {recoImmoSel.primeSCHL > 0 ? (
                        <p style={{ fontSize: 10.5, color: "rgba(245,158,11,0.7)", textAlign: "center" }}>
                          ⚠ Prime SCHL {fmt(recoImmoSel.primeSCHL)} ajoutée au prêt (mise &lt; 20 %)
                        </p>
                      ) : (
                        <p style={{ fontSize: 10.5, color: "rgba(91,196,160,0.7)", textAlign: "center" }}>
                          ✓ Pas de SCHL — vous économisez la prime
                        </p>
                      )}
                    </div>
                    <Row left="Hypothèque mensuelle" right={`${fmt(recoImmoSel.paiementHypoReel)}/m`} dot="#C9A063" />
                    <Row left="Taxes foncières (~1%)" right={`${fmt(recoImmoSel.taxesFonc)}/m`} dot="#6B8ED6" />
                    <Row left="Chauffage estimé" right={`${fmt(recoImmoSel.chauffage)}/m`} dot="#A87DD3" />
                    <Row left="PITH total" right={`${fmt(recoImmoSel.pithReel)}/m`} dot="#5BC4A0" />
                    <Row left="Cash au closing" right={fmt(recoImmoSel.cashClosingReel || recoImmoSel.cashTotalRequis)} dot="#f87171" />
                    <Link to="/immobilier" onClick={e => e.stopPropagation()} style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      marginTop: 14, padding: "10px", borderRadius: 10,
                      background: "linear-gradient(135deg, #C9A063, #e6c07a)",
                      color: "#050810", fontSize: 12.5, fontWeight: 700, textDecoration: "none"
                    }}>
                      Outil complet de pré-qualification →
                    </Link>
                  </div>
                }
              />
            </motion.div>