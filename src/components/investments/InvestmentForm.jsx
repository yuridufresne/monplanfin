import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TYPES = [
  { value: "actions", label: "Actions" },
  { value: "obligations", label: "Obligations" },
  { value: "fonds_communs", label: "Fonds communs" },
  { value: "fnb", label: "FNB (ETF)" },
  { value: "compte_epargne", label: "Compte épargne" },
  { value: "crypto", label: "Crypto" },
  { value: "immobilier", label: "Immobilier" },
  { value: "autre", label: "Autre" },
];

const ACCOUNTS = [
  { value: "celi", label: "CELI" },
  { value: "reer", label: "REER" },
  { value: "reee", label: "REEE" },
  { value: "non_enregistre", label: "Non enregistré" },
  { value: "autre", label: "Autre" },
];

export default function InvestmentForm({ open, onClose, onSave, investment }) {
  const [form, setForm] = useState(
    investment || {
      name: "",
      ticker: "",
      type: "fnb",
      account_type: "celi",
      quantity: 0,
      purchase_price: 0,
      current_price: 0,
      current_value: 0,
      annual_return_pct: 0,
      notes: "",
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = form.quantity && form.current_price
      ? form.quantity * form.current_price
      : form.current_value;
    onSave({ ...form, current_value: value || form.current_value });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{investment ? "Modifier le placement" : "Nouveau placement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Nom du placement</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: iShares S&P 500" required />
            </div>
            <div className="space-y-2">
              <Label>Symbole (ticker)</Label>
              <Input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder="Ex: XIC" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Compte</Label>
              <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNTS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantité</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} className="font-mono" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Prix d'achat ($)</Label>
              <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: +e.target.value })} className="font-mono" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Prix actuel ($)</Label>
              <Input type="number" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: +e.target.value })} className="font-mono" step="0.01" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Valeur totale ($) (ou calculée automatiquement)</Label>
              <Input type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: +e.target.value })} className="font-mono" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Rendement annuel (%)</Label>
              <Input type="number" value={form.annual_return_pct} onChange={(e) => setForm({ ...form, annual_return_pct: +e.target.value })} className="font-mono" step="0.1" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
            <Button type="submit" className="flex-1">{investment ? "Modifier" : "Ajouter"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}