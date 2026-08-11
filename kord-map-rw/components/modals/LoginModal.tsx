'use client';

interface LoginModalProps {
  editorPassword: string;
  setEditorPassword: (val: string) => void;
  handleLoginSubmit: () => void;
  lockoutTime: number | null;
  lockoutRemaining: number;
  isVerifying: boolean;
  setIsLoginOpen: (val: boolean) => void;
}

export default function LoginModal({ 
  editorPassword, setEditorPassword, handleLoginSubmit, 
  lockoutTime, lockoutRemaining, isVerifying, setIsLoginOpen 
}: LoginModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center">
      <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg w-80 shadow-2xl">
        <h2 className="font-bold mb-4">Editor Login</h2>
        <input 
          type="password" 
          placeholder="Password..." 
          value={editorPassword}
          disabled={!!lockoutTime || isVerifying}
          className="w-full bg-[#2a2a2a] p-2 rounded border border-[#444] mb-4 outline-none focus:border-[#e68c3a] disabled:opacity-50"
          onChange={(e) => setEditorPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleLoginSubmit(); }}
        />
        <div className="flex gap-2">
          <button 
            onClick={() => { setIsLoginOpen(false); setEditorPassword(''); }} 
            className="flex-1 bg-[#333] p-2 rounded text-sm hover:bg-[#444]"
          >
            Cancel
          </button>
          <button 
            onClick={handleLoginSubmit} 
            disabled={!!lockoutTime || isVerifying}
            className="flex-1 bg-[#e68c3a] text-black font-bold p-2 rounded text-sm hover:bg-[#cf7d34] disabled:opacity-50 disabled:bg-gray-600 transition-colors"
          >
            {isVerifying ? 'Checking...' : lockoutTime ? `Locked (${lockoutRemaining}s)` : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}