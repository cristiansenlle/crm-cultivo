"use client";

import React, { useState } from "react";
import { GlassCard } from "../ui/GlassCard";
import { Users, UserPlus, Phone, Tag, Notepad, PencilSimple, Trash, ShoppingCart, MagnifyingGlass } from "@phosphor-icons/react";
import { ClientProfile } from "../../lib/clients";

interface ClientAgendaViewProps {
  clients: ClientProfile[];
  onNewClient: () => void;
  onEditClient: (client: ClientProfile) => void;
  onDeleteClient: (id: string, name: string) => void;
  onSelectForSale?: (client: ClientProfile) => void;
}

export function ClientAgendaView({
  clients,
  onNewClient,
  onEditClient,
  onDeleteClient,
  onSelectForSale
}: ClientAgendaViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(c => {
    const q = searchTerm.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.notes || "").toLowerCase().includes(q)
    );
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "vip_1":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">Socio VIP (-10%)</span>;
      case "wholesale_1":
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold">Mayorista (-30%)</span>;
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">Regular</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users size={24} className="text-purple-400" /> Agenda de Compradores & Socios
          </h2>
          <p className="text-xs font-mono text-brand-slate-600 dark:text-slate-400">
            Padrón de contactos para trazabilidad comercial y fidelización.
          </p>
        </div>

        <button
          onClick={onNewClient}
          className="btn-glow-purple px-3.5 py-2 border border-purple-500/40 text-purple-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer hover:bg-purple-500/20"
        >
          <UserPlus size={16} weight="bold" /> + Nuevo Comprador
        </button>
      </div>

      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-6 gap-3">
          <div className="relative w-full max-w-xs">
            <MagnifyingGlass size={16} className="absolute left-3 top-3 text-brand-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-panel-border rounded-lg pl-9 pr-3 py-2 text-xs font-mono outline-none focus:border-purple-500 text-foreground"
            />
          </div>

          <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 font-bold">
            {clients.length} contactos
          </span>
        </div>

        {filteredClients.length === 0 ? (
          <div className="py-12 text-center text-sm font-mono opacity-50 border border-dashed border-panel-border rounded-xl">
            {searchTerm ? "No se encontraron compradores que coincidan con la búsqueda." : "Aún no hay compradores registrados en la agenda."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(client => (
              <div
                key={client.id}
                className="p-4 rounded-xl border border-panel-border bg-black/[0.03] dark:bg-black/20 hover:border-purple-500/50 transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-xs">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{client.name}</h4>
                        {getTierBadge(client.tier)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditClient(client)}
                        className="p-1.5 rounded hover:bg-black/20 text-brand-slate-500 hover:text-blue-400 transition-colors"
                        title="Editar datos"
                      >
                        <PencilSimple size={15} />
                      </button>
                      <button
                        onClick={() => onDeleteClient(client.id, client.name)}
                        className="p-1.5 rounded hover:bg-black/20 text-brand-slate-500 hover:text-red-400 transition-colors"
                        title="Eliminar de agenda"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>

                  {client.phone && (
                    <div className="text-xs font-mono text-brand-slate-400 flex items-center gap-1.5 mb-1.5 mt-2">
                      <Phone size={13} className="text-emerald-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}

                  {client.notes && (
                    <div className="text-[11px] font-mono text-brand-slate-500 bg-black/20 p-2 rounded border border-panel-border/40 mt-2 italic">
                      "{client.notes}"
                    </div>
                  )}
                </div>

                {onSelectForSale && (
                  <div className="mt-4 pt-3 border-t border-panel-border/30 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSelectForSale(client)}
                      className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ShoppingCart size={14} /> Atender en POS
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
