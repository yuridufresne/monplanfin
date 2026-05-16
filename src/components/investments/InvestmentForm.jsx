import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { X, Search, Loader2, Sparkles } from "lucide-react";

const ACCOUNT_TYPES = { celi: "CELI", reer: "REER", reee: "REEE", non_enregistre: "Non enregistré", autre: "Autre" };
const ASSET_TYPES = { action: "Action", fnb: "FNB", fond_mutuel: "Fond mutuel", crypto: "Crypto", obligations: "Obligations", autre: "Autre" };

const POPULAR = [
  { asset_name: "iShares Core Equity ETF Portfolio", symbol: "XEQT", asset_type: "fnb" },
  { asset_name: "Vanguard S&P 500 Index ETF", symbol: "VFV", asset_type: "fnb" },
  { asset_name: "BMO Aggregate Bond Index ETF", symbol: "ZAG", asset_type: "fnb" },
  { asset_name: "iShares Core S&P/TSX Capped Composite", symbol: "XIC", asset_type: "fnb" },
  { asset_name: "iShares Core Balanced ETF Portfolio", symbol: "XBAL", asset_type: "fnb" },
  { asset_name: "Vanguard Growth ETF Portfolio", symbol: "VGRO", asset_type: "fnb" },
  { asset_name: "Purpose High Interest Savings ETF", symbol: "PSA", asset_type: "autre" },
  { asset_name: "Vanguard US Total Market ETF", symbol: "VUN", asset_type: "fnb" },
  { asset_name: "Apple Inc.", symbol: "AAPL", asset_type: "action" },
  { asset_name: "Microsoft Corporation", symbol: "MSFT", asset_type: "action" },
  { asset_name: "Nvidia Corporation", symbol: "NVDA", asset_type: "action" },
  { asset_name: "Shopify Inc.", symbol: "SHOP.TO", asset_type: "action" },
  { asset_name: "Royal Bank of Canada", symbol: "RY.TO", asset_type: "action" },
  { asset_name: "Brookfield Asset Management", symbol: "BAM.TO", asset_type: "action" },
];

// AI metadata suggestions based on asset type and market context
function generateAiMetadata(assetName, symbol, assetType) {
  const typeContext = {
    fnb: "Fonds négocié en bourse diversifié, faible coût, adapté à une stratégie passive long terme",
    action: "Action individuelle avec risque concentré, rendement potentiellement élevé",
    fond_mutuel: "Fond géré activement avec frais de gestion, exposition diversifiée",
    crypto: "Actif numérique volatil à haute spéculation, profil risque élevé",
    obligations: "Instrument à revenu fixe, faible volatilité, protection du capital",
    autre: "Actif financier divers",
  };
  return `${typeContext[assetType] || typeContext.autre}. Symbole: ${symbol || assetName}`;
}

function FieldLabel({ children }) {
  return <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "#94A3B8" }}>{children}</label>;
}

function TextInput({ value, onChange, placeholder, type = "text", className = "" }) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2.5 rounded-xl text-[13px] outline-none transition-all ${className}`}
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
  );
}

export default function InvestmentForm({ investment, onClose, onSaved }) {
  const blank = { asset_name: "", symbol: "", asset_type: "fnb", account_type: "celi", quantity: "", purchase_date: "", purchase_price: "", current_price: "", annual_return_pct: "", ai_metadata: "", notes: "" };
  const [form, setForm] = useState(investment ? { ...blank, ...investment } : blank);
  const [search, setSearch] = useState("");
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceHint, setPriceHint] = useState(null);

  const filtered = search.length >= 1
    ? POPULAR.filter(f => f.asset_name.toLowerCase().includes(search.toLowerCase()) || f.symbol.toLowerCase().includes(search.toLowerCase()))
    : [];

  const selectAsset = (asset) => {
    setForm(p => ({
      ...p,
      asset_name: asset.asset_name,
      symbol: asset.symbol,
      asset_type: asset.asset_type,
      ai_metadata: generateAiMetadata(asset.asset_name, asset.symbol, asset.asset_type),
    }));
    setSearch("");
  };

  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-fetch historical price when date + symbol are set
  useEffect(() => {
    if (!form.symbol || !form.purchase_date) return;
    const today = new Date().toISOString().split("T")[0];
    if (form.purchase_date >= today) return;
    const timeout = setTimeout(async () => {
      setFetchingPrice(true);
      setPriceHint(null);
      try {
        const res = await base44.functions.invoke("getStockPrice", { symbol: form.symbol, date: form.purchase_date });
        const price = res.data?.price;
        if (price) {
          setPriceHint(price);
          if (!form.purchase_price) setForm(p => ({ ...p, purchase_price: String(price) }));
        }
      } catch {}
      setFetchingPrice(false);
    }, 700);
    return () => clearTimeout(timeout);
  }, [form.symbol, form.purchase_date]);

  const handleSave = async () => {
    const data = {
      ...form,
      quantity: parseFloat(form.quantity) || 0,
      purchase_price: parseFloat(form.purchase_price) || 0,
      current_price: parseFloat(form.current_price) || null,
      annual_return_pct: parseFloat(form.annual_return_pct) || null,
      current_value: (parseFloat(form.current_price) || parseFloat(form.purchase_price) || 0) * (parseFloat(form.quantity) || 0),
      ai_metadata: form.ai_metadata || generateAiMetadata(form.asset_name, form.symbol, form.asset_type),
    };
    if (investment) await base44.entities.Investment.update(investment.id, data);
    else await base44.entities.Investment.create(data);
    onSaved();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        <div className="pointer-events-auto w-full max-w-lg my-auto rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0D1628 0%, #050810 100%)", border: "1px solid rgba(222,255,154,0.15)" }}>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#DEFF9A] to-transparent" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-urbanist font-bold text-white">{investment ? "Modifier" : "Ajouter un placement"}</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/70"><X className="w-4 h-4" /></button>
            </div>

            {/* Search */}
            {!investment && (
              <div className="mb-5">
                <FieldLabel>Rechercher un actif (FNB, action...)</FieldLabel>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ex: XEQT, Vanguard, Apple..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </div>
                {filtered.length > 0 && (
                  <div className="mt-1.5 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#0D1628" }}>
                    {filtered.slice(0, 6).map(a => (
                      <button key={a.symbol} onClick={() => selectAsset(a)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div>
                          <p className="text-[13px] font-medium text-white">{a.asset_name}</p>
                          <p className="text-[11px]" style={{ color: "#94A3B8" }}>{ASSET_TYPES[a.asset_type]}</p>
                        </div>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(222,255,154,0.08)", color: "#DEFF9A" }}>{a.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!search && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {POPULAR.slice(0, 6).map(a => (
                      <button key={a.symbol} onClick={() => selectAsset(a)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold font-mono transition-all"
                        style={{ background: "rgba(222,255,154,0.06)", border: "1px solid rgba(222,255,154,0.15)", color: "#DEFF9A" }}>
                        {a.symbol}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Nom de l'actif</FieldLabel>
                  <TextInput value={form.asset_name} onChange={f("asset_name")} placeholder="ex: XEQT" />
                </div>
                <div>
                  <FieldLabel>Symbole (ticker)</FieldLabel>
                  <TextInput value={form.symbol} onChange={f("symbol")} placeholder="XEQT" className="font-mono uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Type d'actif</FieldLabel>
                  <select value={form.asset_type} onChange={e => f("asset_type")(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                    {Object.entries(ASSET_TYPES).map(([v, l]) => <option key={v} value={v} style={{ background: "#0D1628" }}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Type de compte</FieldLabel>
                  <select value={form.account_type} onChange={e => f("account_type")(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
                    {Object.entries(ACCOUNT_TYPES).map(([v, l]) => <option key={v} value={v} style={{ background: "#0D1628" }}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Quantité (parts)</FieldLabel>
                  <TextInput type="number" value={form.quantity} onChange={f("quantity")} placeholder="100" />
                </div>
                <div>
                  <FieldLabel>Date d'achat</FieldLabel>
                  <TextInput type="date" value={form.purchase_date} onChange={f("purchase_date")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Prix d'achat / part ($)
                    {fetchingPrice && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" style={{ color: "#DEFF9A" }} />}
                    {priceHint && !fetchingPrice && <span className="ml-1 text-[10px] font-normal" style={{ color: "rgba(222,255,154,0.6)" }}>historique auto-rempli</span>}
                  </FieldLabel>
                  <TextInput type="number" value={form.purchase_price} onChange={f("purchase_price")} placeholder="0.00" />
                  {priceHint && !form.purchase_price && (
                    <p className="text-[11px] mt-1" style={{ color: "rgba(222,255,154,0.7)" }}>Prix historique trouvé : {priceHint}$</p>
                  )}
                </div>
                <div>
                  <FieldLabel>Prix actuel / part ($)</FieldLabel>
                  <TextInput type="number" value={form.current_price} onChange={f("current_price")} placeholder="(auto si symbole)" />
                </div>
              </div>

              <div>
                <FieldLabel>Rendement annuel visé (%)</FieldLabel>
                <TextInput type="number" value={form.annual_return_pct} onChange={f("annual_return_pct")} placeholder="7" />
              </div>

              {/* AI metadata */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "rgba(222,255,154,0.6)" }} />
                  <FieldLabel>Contexte IA (auto-généré, modifiable)</FieldLabel>
                </div>
                <textarea value={form.ai_metadata} onChange={e => f("ai_metadata")(e.target.value)}
                  rows={2} placeholder="Description contextuelle pour l'IA..."
                  className="w-full px-3 py-2.5 rounded-xl text-[12px] resize-none outline-none"
                  style={{ background: "rgba(222,255,154,0.03)", border: "1px solid rgba(222,255,154,0.12)", color: "rgba(255,255,255,0.7)" }} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>Annuler</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all"
                style={{ background: "#DEFF9A", color: "#050810" }}>
                {investment ? "Mettre à jour" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}