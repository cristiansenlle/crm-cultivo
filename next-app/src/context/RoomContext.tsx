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

  const fetchRooms = async () => {
    if (!supabase) return; // Fail gracefully if no keys
    try {
      const { data, error } = await supabase.from('core_rooms').select('*').order('name');
      if (data && !error) {
        setRooms(data);
        if (data.length > 0 && !selectedRoom) {
          setSelectedRoom(data[0]);
        }
      }
    } catch(e) {}
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

      setSensors(allSensors);

      if (allSensors.length > 0) {
         const stillExists = activeSensor && allSensors.find((s: Sensor) => s.id === activeSensor.id);
         if (!stillExists) {
             setActiveSensor(allSensors[0]);
         }
      } else {
         setActiveSensor(null);
      }
    } catch(e) {}
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
