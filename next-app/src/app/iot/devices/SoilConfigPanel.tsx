"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { GlassCard } from '../../../components/ui/GlassCard';

export default function SoilConfigPanel() {
  const [boards, setBoards] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  const [newBoardMac, setNewBoardMac] = useState('');
  const [newBoardName, setNewBoardName] = useState('');

  const [newSensorName, setNewSensorName] = useState('');
  const [newSensorPin, setNewSensorPin] = useState(0);
  const [selectedBoardId, setSelectedBoardId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [boardsRes, sensorsRes, roomsRes] = await Promise.all([
      supabase.from('core_soil_boards').select('*').order('created_at'),
      supabase.from('core_soil_sensors').select('*').order('created_at'),
      supabase.from('core_rooms').select('*').order('name')
    ]);
    
    if (boardsRes.data) setBoards(boardsRes.data);
    if (sensorsRes.data) setSensors(sensorsRes.data);
    if (roomsRes.data) setRooms(roomsRes.data);
  };

  const handleAddBoard = async () => {
    if (!newBoardMac || !newBoardName) return alert('Completa los campos');
    const { error } = await supabase.from('core_soil_boards').insert({
       mac_address: newBoardMac,
       name: newBoardName
    });
    if (error) alert('Error al agregar placa: ' + error.message);
    else {
       setNewBoardMac(''); setNewBoardName(''); fetchData();
    }
  };

  const handleAddSensor = async () => {
    if (!newSensorName || !selectedBoardId) return alert('Completa los campos');
    const { error } = await supabase.from('core_soil_sensors').insert({
       board_id: selectedBoardId,
       pin_index: newSensorPin,
       name: newSensorName
    });
    if (error) {
       if (error.message.includes('core_soil_sensors_board_id_pin_index_key')) {
           alert(`El pin ${newSensorPin} ya está registrado para esta placa. Por favor, elige otro número de pin.`);
       } else {
           alert('Error al agregar sensor: ' + error.message);
       }
    }
    else {
       setNewSensorName(''); setNewSensorPin(prev => prev + 1); fetchData();
    }
  };

  const handleAssignRoom = async (sensorId: string, roomId: string) => {
    const { error } = await supabase.from('core_soil_sensors').update({ room_id: roomId === 'none' ? null : roomId }).eq('id', sensorId);
    if (error) alert('Error al asignar sala: ' + error.message);
    else fetchData();
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta placa? Se eliminarán también los sensores asociados.')) return;
    const { error } = await supabase.from('core_soil_boards').delete().eq('id', boardId);
    if (error) alert('Error al eliminar placa: ' + error.message);
    else fetchData();
  };

  const handleDeleteSensor = async (sensorId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este sensor?')) return;
    const { error } = await supabase.from('core_soil_sensors').delete().eq('id', sensorId);
    if (error) alert('Error al eliminar sensor: ' + error.message);
    else fetchData();
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-blue-500 flex animate-pulse"></span>
         Placas y Sensores de Suelo (ESP32)
      </h2>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Placas ESP32 */}
        <GlassCard className="p-6 border-blue-500/20 bg-blue-500/5">
          <h3 className="text-xl font-bold text-white mb-4">Placas Registradas</h3>
          <ul className="space-y-3 mb-6">
            {boards.map(b => (
              <li key={b.id} className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5 group">
                 <div>
                    <p className="font-bold text-gray-200">{b.name}</p>
                    <p className="text-xs font-mono text-gray-500">MAC: {b.mac_address}</p>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                     <span className="text-xs text-blue-400">{b.last_seen ? new Date(b.last_seen).toLocaleString() : 'Nunca'}</span>
                     <button onClick={() => handleDeleteBoard(b.id)} className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
                 </div>
              </li>
            ))}
            {boards.length === 0 && <li className="text-sm text-gray-500">No hay placas registradas.</li>}
          </ul>
          
          <div className="border-t border-white/10 pt-4 mt-4">
            <h4 className="text-sm font-bold text-gray-300 mb-2">Nueva Placa</h4>
            <div className="flex gap-2">
               <input type="text" placeholder="Nombre (ej: ESP32 Sala 1)" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} className="bg-black/50 border border-white/10 rounded px-3 py-2 flex-1 text-sm text-white focus:outline-none focus:border-blue-500" />
               <input type="text" placeholder="MAC Address" value={newBoardMac} onChange={e => setNewBoardMac(e.target.value)} className="bg-black/50 border border-white/10 rounded px-3 py-2 flex-1 text-sm text-white focus:outline-none focus:border-blue-500 font-mono" />
               <button onClick={handleAddBoard} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold transition-colors">Añadir</button>
            </div>
          </div>
        </GlassCard>

        {/* Sensores */}
        <GlassCard className="p-6 border-emerald-500/20 bg-emerald-500/5">
          <h3 className="text-xl font-bold text-white mb-4">Sensores de Humedad</h3>
          <ul className="space-y-3 mb-6">
            {sensors.map(s => {
               const board = boards.find(b => b.id === s.board_id);
               return (
                  <li key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/20 p-3 rounded-lg border border-white/5 gap-3 group">
                     <div>
                        <p className="font-bold text-gray-200">{s.name}</p>
                        <p className="text-xs font-mono text-gray-500">Placa: {board?.name || 'Desconocida'} | Pin: {s.pin_index}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <select 
                           value={s.room_id || 'none'} 
                           onChange={e => handleAssignRoom(s.id, e.target.value)}
                           className="bg-black/50 border border-white/10 rounded px-3 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                           <option value="none">-- Sin Sala --</option>
                           {rooms.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                           ))}
                        </select>
                        <button onClick={() => handleDeleteSensor(s.id)} className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>
                     </div>
                  </li>
               );
            })}
            {sensors.length === 0 && <li className="text-sm text-gray-500">No hay sensores registrados.</li>}
          </ul>
          
          <div className="border-t border-white/10 pt-4 mt-4">
            <h4 className="text-sm font-bold text-gray-300 mb-2">Nuevo Sensor</h4>
            <div className="flex flex-col gap-2">
               <div className="flex gap-2">
                   <select value={selectedBoardId} onChange={e => setSelectedBoardId(e.target.value)} className="bg-black/50 border border-white/10 rounded px-3 py-2 flex-1 text-sm text-white focus:outline-none focus:border-emerald-500">
                      <option value="">-- Seleccionar Placa --</option>
                      {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
                   <input type="number" placeholder="Pin Índice" value={newSensorPin} onChange={e => setNewSensorPin(parseInt(e.target.value))} className="bg-black/50 border border-white/10 rounded px-3 py-2 w-24 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono" />
               </div>
               <div className="flex gap-2">
                   <input type="text" placeholder="Nombre (ej: Planta 1 - Maceta Izquierda)" value={newSensorName} onChange={e => setNewSensorName(e.target.value)} className="bg-black/50 border border-white/10 rounded px-3 py-2 flex-1 text-sm text-white focus:outline-none focus:border-emerald-500" />
                   <button onClick={handleAddSensor} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold transition-colors">Añadir</button>
               </div>
            </div>
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
