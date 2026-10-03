"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "../ui/GlassCard";
import { X, UserPlus, FloppyDisk, Phone, User, Tag, Notepad } from "@phosphor-icons/react";
import { ClientProfile, saveClient } from "../../lib/clients";

interface ClientModalProps {
  isOpen: boolean;
  clientToEdit?: ClientProfile | null;
  onClose: () => void;
  onSaved: (client: ClientProfile) => void;
}

export function ClientModal({ isOpen, clientToEdit, onClose, onSaved }: ClientModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<"regular" | "vip_1" | "wholesale_1">("regular");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setName(clientToEdit.name || "");
        setPhone(clientToEdit.phone || "");
        setTier(clientToEdit.tier || "regular");
        setNotes(clientToEdit.notes || "");
      } else {
        setName("");
        setPhone("");
        setTier("regular");
        setNotes("");
      }
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("El nombre del comprador es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveClient({
        id: clientToEdit?.id,
        name: name.trim(),
        phone: phone.trim(),
        tier,
        notes: notes.trim()
      });

      if (res.error) {
        alert("Error al guardar cliente: " + res.error.message);
      } else if (res.data) {
        onSaved(res.data);
        onClose();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <GlassCard className="max-w-md w-full p-6 shadow-2xl relative border-t-4 border-t-purple-500 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-brand-slate-600 hover:text-foreground transition-colors p-1"
        >
          <X size={22} />
        </button>

        <div className="mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-purple-400">
            <UserPlus size={24} />
            {clientToEdit ? "Editar Comprador / Socio" : "Nuevo Comprador / Socio"}
          </h3>
          <p className="text-xs text-brand-slate-600 dark:text-slate-400 mt-0.5">
            Agenda de clientes para trazabilidad comercial y estadísticas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 flex items-center gap-1.5 font-semibold">
              <User size={14} /> Nombre Completo / Alias *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Mauri, Regina, Juan Pérez..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-black/[0.03] dark:bg-black/30 border border-panel-border rounded-lg p-2.5 text-sm font-semibold outline-none focus:border-purple-500 text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 flex items-center gap-1.5 font-semibold">
              <Phone size={14} /> Teléfono / WhatsApp
            </label>
            <input
              type="text"
              placeholder="Ej: +54 9 11 1234-5678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-black/[0.03] dark:bg-black/30 border border-panel-border rounded-lg p-2.5 text-sm font-mono outline-none focus:border-purple-500 text-foreground"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 flex items-center gap-1.5 font-semibold">
              <Tag size={14} /> Categoría de Precios / Tarifa
            </label>
            <select
              value={tier}
              onChange={e => setTier(e.target.value as any)}
              className="w-full bg-black/[0.03] dark:bg-black/30 border border-panel-border rounded-lg p-2.5 text-sm outline-none focus:border-purple-500 text-foreground font-semibold"
            >
              <option value="regular" className="bg-slate-900 text-white">
                Cliente Regular (Tarifa Plena / 0% Desc.)
              </option>
              <option value="vip_1" className="bg-slate-900 text-white">
                Socio VIP (10% de Descuento)
              </option>
              <option value="wholesale_1" className="bg-slate-900 text-white">
                Mayorista / Dispensario (30% de Descuento)
              </option>
            </select>
          </div>

          <div>
            <label className="text-xs font-mono text-brand-slate-600 uppercase mb-1 flex items-center gap-1.5 font-semibold">
              <Notepad size={14} /> Notas / Preferencias
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Prefiere cepas sativas, flores con curado largo..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-black/[0.03] dark:bg-black/30 border border-panel-border rounded-lg p-2.5 text-xs outline-none focus:border-purple-500 text-foreground resize-none"
            />
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-panel-border text-xs font-bold text-brand-slate-600 hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FloppyDisk size={16} weight="bold" />
              {isSubmitting ? "Guardando..." : "Guardar en Agenda"}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
