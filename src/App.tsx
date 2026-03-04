import React, { useState, useEffect, useRef } from 'react';
import { io } from "socket.io-client";
import { createClient } from '@supabase/supabase-js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// 1. Config (Correct URL format from your doc)
const socket = io('http://localhost:3001');
const supabase = createClient(
  "https://kewbyppxdgxkwtelcxed.supabase.co", 
  "sb_publishable_vCN82fw_sIyUTqwjjNV36Q_Gs-u7bXD"
);

const PredatorTerminal = () => {
  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);

  useEffect(() => {
    if (terminalInstance.current) return; // Duplicate prevent karne ke liye

    const term = new Terminal({
      cursorBlink: true,
      theme: { background: '#000000', foreground: '#00ff00' }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    if (terminalRef.current) {
      term.open(terminalRef.current);
      setTimeout(() => fitAddon.fit(), 100); // Fit addon fix
    }

    terminalInstance.current = term;

    // Server output listen karna
    socket.on('terminal-output', (data) => term.write(data));
    term.onData((data) => socket.emit('terminal-input', data));

    return () => {
      term.dispose();
      socket.off('terminal-output');
      terminalInstance.current = null;
    };
  }, []);

  return <div ref={terminalRef} className="h-80 w-full bg-black" />;
};

// 3. Main Dashboard
export default function App() {
  const [lootBox, setLootBox] = useState<any[]>([]);

  useEffect(() => {
    const fetchLoot = async () => {
      const { data } = await supabase.from('loot').select('*').order('timestamp', { ascending: false });
      if (data) setLootBox(data);
    };
    fetchLoot();

    const channel = supabase.channel('loot_db')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'loot' }, (payload) => {
        setLootBox((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans">
      <h1 className="text-3xl font-black text-green-500 mb-8 tracking-tighter uppercase">
        Python Predator <span className="text-zinc-600 text-sm">v2.0</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Loot Stream Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 bg-zinc-800/50 font-bold text-xs uppercase tracking-widest text-zinc-400">
            Live Loot Stream
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-800/30 text-zinc-500">
              <tr>
                <th className="p-4">Target</th>
                <th className="p-4">Status</th>
                <th className="p-4">Risk</th>
              </tr>
            </thead>
            <tbody>
              {lootBox.map((item, idx) => (
                <tr key={idx} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-mono text-blue-400">{item.target}</td>
                  <td className="p-4 text-green-400">{item.status || 'Active'}</td>
                  <td className="p-4 text-red-500 font-bold">{item.sqli_risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Terminal Control */}
        <PredatorTerminal />
      </div>
    </div>
  );
}