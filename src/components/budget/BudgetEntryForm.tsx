import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const CATEGORIES = {
  revenu: [
    { value: "logement", label: "Salaire" },
    { value: "divers", label: "Autre revenu" },
  ],
  depense: [
    { value: "logement", label: "Logement" },
    { value: "transport", label: "Transport" },
    { value: "alimentation", label: "Alimentation" },
    { value: "services_publics", label: "Services publics" },
    { value: "assurances", label: "Assurances" },
    { value: "sante", label: "Santé" },
    { value: "loisirs", label: "Loisirs" },
    { value: "vetements", label: "Vêtements" },
    { value: "education", label: "Éducation" },
    { value: "epargne", label: "Épargne" },
    { value: "dettes", label: "Remboursement dettes" },
    { value: "divers", label: "Divers" },
  ],
};

export default function BudgetEntryForm({ open, onClose, onSave, entry }) {
  const [form, setForm] = useState(
    entry || {
      type: "depense",
      category: "logement",
      label: "",
      amount: 0,
      frequency: "mensuel",
      is_fixed: true,
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const categories = CATEGORIES[form.type] || CATEGORIES.depense;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Modifier l'entrée" : "Nouvelle entrée"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={form.type === "revenu" ? "default" : "outline"}
              onClick={() => setForm({ ...form, type: "revenu", category: "logement" })}
              className="w-full"
            >
              Revenu
            </Button>
            <Button
              type="button"
              variant={form.type === "depense" ? "default" : "outline"}
              onClick={() => setForm({ ...form, type: "depense", category: "logement" })}
              className="w-full"
            >
              Dépense
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Ex: Loyer, Hydro-Québec..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Montant ($)</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: +e.target.value })}
              className="font-mono"
              required
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label>Fréquence</Label>
            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                <SelectItem value="bimensuel">Aux 2 semaines</SelectItem>
                <SelectItem value="mensuel">Mensuel</SelectItem>
                <SelectItem value="annuel">Annuel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Dépense fixe</Label>
            <Switch checked={form.is_fixed} onCheckedChange={(v) => setForm({ ...form, is_fixed: v })} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              {entry ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}