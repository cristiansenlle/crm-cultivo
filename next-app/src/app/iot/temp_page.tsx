import React from 'react';
import Link from 'next/link';

export default function IotDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-white">Dashboard IoT - Cultivo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-gray-400 font-medium mb-2">Dispositivos Activos</h3>
          <p className="text-4xl font-bold text-green-400">2</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-gray-400 font-medium mb-2">Humedad Suelo Prom.</h3>
          <p className="text-4xl font-bold text-blue-400">N/A</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-gray-400 font-medium mb-2">Temperatura Sala</h3>
          <p className="text-4xl font-bold text-yellow-400">N/A</p>
        </div>
      </div>

      <div className="flex space-x-4">
        <Link href="/iot/devices" className="bg-green-600 hover:bg-green-500 text-white font-medium py-3 px-6 rounded-lg transition-colors">
          Gestionar Dispositivos
        </Link>
        <Link href="/cultivo" className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-6 rounded-lg transition-colors border border-neutral-700">
          Volver a Cultivo
        </Link>
      </div>
    </div>
  );
}
