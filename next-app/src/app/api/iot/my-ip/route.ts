import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const nets = os.networkInterfaces();
  let localIp = '127.0.0.1';

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        // Priority for standard local subnets
        if (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.')) {
          localIp = net.address;
          break;
        }
      }
    }
  }

  return NextResponse.json({ ip: localIp });
}
