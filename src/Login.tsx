import React, { useState } from 'react';

const Login = ({ onLogin }: { onLogin: (pass: string) => void }) => {
  const [password, setPassword] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onLogin(password);
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center font-mono text-green-500 overflow-hidden relative">
      {/* Matrix-like background effect (simple version) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none select-none overflow-hidden text-[10px] leading-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="whitespace-nowrap animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
            {Array.from({ length: 100 }).map(() => Math.random() > 0.5 ? '1' : '0').join(' ')}
          </div>
        ))}
      </div>

      <div className="border-2 border-green-500 p-8 shadow-[0_0_25px_rgba(34,197,94,0.3)] bg-black/80 backdrop-blur-sm z-10 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold animate-pulse tracking-tighter"> {'>'} ACCESS_RESTRICTED </h1>
          <span className="text-[10px] bg-green-900 px-1">V1.0.4-STABLE</span>
        </div>
        
        <div className="mb-8 space-y-1">
          <p className="text-xs text-green-800 uppercase">System: PREDATOR_OS_V1.0</p>
          <p className="text-xs text-green-800 uppercase">Status: ENCRYPTED_SESSION_PENDING</p>
          <p className="text-xs text-green-800 uppercase">Location: {window.location.hostname}</p>
        </div>
        
        <div className="relative mb-8">
          <div className="absolute -top-6 left-0 text-[10px] text-green-700">ENCRYPTION_KEY_REQUIRED</div>
          <input 
            type="password" 
            placeholder="****************"
            className="bg-black border-2 border-green-900 focus:border-green-500 outline-none w-full p-4 text-center text-xl tracking-[0.5em] transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        
        <button 
          onClick={() => onLogin(password)}
          className="block w-full bg-green-900/30 border border-green-500 hover:bg-green-500 hover:text-black transition-all p-4 font-bold uppercase tracking-widest group"
        >
          <span className="group-hover:translate-x-1 inline-block transition-transform">INITIATE_AUTH_SEQUENCE_</span>
        </button>

        <div className="mt-6 flex justify-between text-[9px] text-green-900 uppercase">
          <span>RSA_4096_ACTIVE</span>
          <span>AES_256_GCM</span>
          <span>NO_LOGS_POLICY</span>
        </div>
      </div>

      <div className="absolute bottom-4 text-[10px] text-green-900 font-bold">
        WARNING: UNAUTHORIZED ACCESS ATTEMPTS ARE LOGGED AND TRACED
      </div>
    </div>
  );
};

export default Login;
