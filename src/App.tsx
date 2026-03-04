import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { io } from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const socket = io('http://localhost:3001');
const supabase = createClient('https://kewbyppxdgxkwtelcxed.supabase.co', 'YOUR_PUBLIC_ANON_KEY');

// 1. Terminal Component (Cleaned Version)
const PredatorTerminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);

  useEffect(() => {
    // Basic safety: Agar terminal pehle se hai toh dobara initialize mat karo
    if (terminalInstance.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: { background: '#000000', foreground: '#00ff00' },
      fontFamily: 'Courier New',
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    if (terminalRef.current) {
      term.open(terminalRef.current);
      // Terminal size fix with a small delay
      setTimeout(() => {
        try { fitAddon.fit(); } catch (e) { console.error(e); }
      }, 100);
      
      term.writeln('>>> PREDATOR SYSTEM TERMINAL LINKED...');
      term.writeln('>>> READY FOR COMMANDS...');
    }

    // Socket Listeners
    socket.on('terminal-output', (data: string) => term.write(data));
    term.onData((data) => socket.emit('terminal-input', data));

    terminalInstance.current = term;

    // Cleanup when component unmounts
    return () => {
      socket.off('terminal-output');
      term.dispose();
      terminalInstance.current = null;
    };
  }, []);

  return (
    <div className="p-4 bg-black rounded-lg border border-green-900 mt-6 shadow-2xl">
      <div className="flex justify-between items-center mb-2 border-b border-green-900 pb-1">
         <span className="text-green-500 font-mono text-xs">STATION: KALI_REMOTE_SHELL_V1.0</span>
         <span className="text-red-500 font-mono text-xs animate-pulse">● LIVE</span>
      </div>
      <div ref={terminalRef} className="h-80" />
    </div>
  );
};

// 2. Main App Component
export default function App() {
  const [lootBox, setLootBox] = useState<any[]>([]);

  useEffect(() => {
    const fetchLoot = async () => {
      const { data } = await supabase.from('loot').select('*').order('timestamp', { ascending: false });
      if (data) setLootBox(data);
    };

    fetchLoot();

    // Supabase Real-time Listener
    const channel = supabase.channel('loot_db')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'loot' }, (payload) => {
        setLootBox((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-green-500">
            PYTHON_PREDATOR <span className="text-white text-sm font-mono opacity-50 text-xs">v2.0</span>
          </h1>
        </div>
        <div className="text-right font-mono text-xs text-zinc-500">
          Uptime: 99.9% | Port: 3001
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT SIDE: Loot Stream */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            LIVE LOOT STREAM
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-[450px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-800 text-zinc-400 sticky top-0">
                <tr>
                  <th className="p-4">Target</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Risk</th>
                </tr>
              </thead>
              <tbody>
                {lootBox?.length > 0 ? (
                  lootBox.map((item, idx) => (
                    <tr key={idx} className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="p-4 font-mono text-blue-400">{item.target}</td>
                      <td className="p-4 text-green-400">{item.status}</td>
                      <td className={`p-4 font-bold ${item.sqli_risk === 'High' ? 'text-red-500' : 'text-yellow-500'}`}>
                        {item.sqli_risk}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="p-10 text-center text-zinc-600">No loot detected yet...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RIGHT SIDE: Terminal */}
        <section>
          <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-zinc-500">Command Center</h2>
          <PredatorTerminal />
        </section>
      </div>
    </div>
  );
}