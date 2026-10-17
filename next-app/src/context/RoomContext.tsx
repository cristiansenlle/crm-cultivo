"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

type Room = { id: string; name: string; phase: string };
type Sensor = { id: string; name: string; room_id: string; type?: string };

interface RoomContextType {
  rooms: Room[];
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  refreshRooms: () => Promise<void>;
  
  sensors: Sensor[];
  activeSensor: Sensor | null;
  setActiveSensor: (s: Sensor | null) => void;
  refreshSensors: () => Promise<void>;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [activeSensor, setActiveSensor] = useState<Sensor | null>(null);

  const calculateRoomPhase = (batchesInRoom: any[]): string => {
    const active = (batchesInRoom || []).filter((s: any) => {
      const st = (s.stage || '').toLowerCase();
      return st !== 'finalizado' && st !== 'cosecha seca';
    });
    if (active.length === 0) return 'Disponible';
    const stages = active.map((s: any) => (s.stage || '').toLowerCase());
    if (stages.every(st => st === 'cosecha')) return 'Cosecha';
    if (stages.some(st => st === 'floración')) return 'Floración';
    if (stages.some(st => st === 'cosecha')) return 'Cosecha';
    return 'Vegetativo';
  };

  const fetchRooms = async () => {
    if (!supabase) return; // Fail gracefully if no keys
    try {
      const [{ data, error }, { data: batchesData }] = await Promise.all([
        supabase.from('core_rooms').select('*').order('name'),
        supabase.from('core_batches').select('location, stage')
      ]);
      if (error) {
          console.error("Supabase fetchRooms error:", error);
      }
      if (data && !error) {
        const syncedRooms = await Promise.all(data.map(async (room: any) => {
          const inRoom = (batchesData || []).filter((b: any) => b.location === room.id);
          const correctPhase = calculateRoomPhase(inRoom);
          if (correctPhase !== room.phase) {
            await supabase.from('core_rooms').update({ phase: correctPhase }).eq('id', room.id);
            return { ...room, phase: correctPhase };
          }
          return room;
        }));
        setRooms(syncedRooms);
        if (syncedRooms.length > 0 && !selectedRoom) {
          setSelectedRoom(syncedRooms[0]);
        } else if (selectedRoom) {
          const updatedSelected = syncedRooms.find((r: any) => r.id === selectedRoom.id);
          if (updatedSelected) setSelectedRoom(updatedSelected);
        }
      }
    } catch(e) {
        console.error("fetchRooms exception:", e);
    }
  };

  const fetchSensors = async () => {
    if (!supabase || !selectedRoom) {
       setSensors([]); setActiveSensor(null); return;
    }
    try {
      const [ambientRes, soilRes] = await Promise.all([
         supabase.from('core_sensors').select('*').eq('room_id', selectedRoom.id).order('name'),
         supabase.from('core_soil_sensors').select('*').eq('room_id', selectedRoom.id).order('name')
      ]);

      let allSensors: Sensor[] = [];
      if (ambientRes.data) {
          allSensors = [...allSensors, ...ambientRes.data.map((s: any) => ({ ...s, type: 'th' }))];
      }
      if (soilRes.data) {
          allSensors = [...allSensors, ...soilRes.data.map((s: any) => ({ ...s, type: 'soil' }))];
      }

      allSensors.sort((a: any, b: any) => (a.name || '').localeCompare((b.name || ''), undefined, { numeric: true, sensitivity: 'base' }));

      setSensors(allSensors);

      if (allSensors.length > 0) {
         const stillExists = activeSensor && allSensors.find((s: Sensor) => s.id === activeSensor.id);
         if (!stillExists) {
             setActiveSensor(allSensors[0]);
         }
      } else {
         setActiveSensor(null);
      }
    } catch(e) {
        console.error("fetchSensors exception:", e);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchSensors();
  }, [selectedRoom]);

  return (
    <RoomContext.Provider value={{ rooms, selectedRoom, setSelectedRoom, refreshRooms: fetchRooms, sensors, activeSensor, setActiveSensor, refreshSensors: fetchSensors }}>
      {children}
    </RoomContext.Provider>
  );
}

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error("useRoom must be used within a RoomProvider");
  return context;
};
