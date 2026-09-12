import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Dev Backdoor state
  const [isDevLogin, setIsDevLogin] = useState(false);
  const [devPasscode, setDevPasscode] = useState('');
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (devPasscode !== 'HEY HEY HEY') {
      setError('Invalid developer passcode.');
      return;
    }

    const savedEmail = localStorage.getItem('dev_email');
    const savedPassword = localStorage.getItem('dev_password');

    if (!savedEmail || !savedPassword) {
      setError('Developer backdoor not configured. Please log in normally once to link your account, then you can use the backdoor.');
      setIsDevLogin(false);
      return;
    }

    // Decode obfuscated credentials
    let decodedEmail: string;
    let decodedPassword: string;
    try {
      decodedEmail = atob(savedEmail);
      decodedPassword = atob(savedPassword);
    } catch {
      setError('Stored credentials are corrupted. Please log in normally to re-link your account.');
      localStorage.removeItem('dev_email');
      localStorage.removeItem('dev_password');
      setIsDevLogin(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: decodedEmail, password: decodedPassword });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Error executing backdoor access.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const cleanEmail = email.trim();
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        
        // Obfuscate credentials for dev backdoor (not cryptographic, but prevents casual snooping)
        localStorage.setItem('dev_email', btoa(cleanEmail));
        localStorage.setItem('dev_password', btoa(password));
        
      } else {
        const { error } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (error) throw error;
        setMessage('Check your inbox for the confirmation link.');
      }
    } catch (err: any) {
      if (err.message === 'Invalid login credentials') {
        setError('Invalid access code or email. (If your local DB was reset, you may need to register again)');
      } else if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        setError('Cannot connect to authentication service (Failed to fetch). Ensure your local Supabase/Docker backend is running on port 54321.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm bg-bg-secondary border-2 border-text-primary p-10 shadow-[8px_8px_0_0_var(--color-text-primary)]">
        
        <div className="text-center mb-10 pb-6 border-b-2 border-text-primary">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-3 h-3 bg-text-primary"></div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-text-primary leading-none">JARVIS</h1>
          </div>
          <div className="text-xs font-mono font-bold tracking-widest uppercase text-text-secondary">
            {isDevLogin ? 'Developer Override' : 'System Initialization'}
          </div>
        </div>

        {error && (
          <div className="p-4 mb-8 bg-accent-muted border-l-4 border-accent flex items-start gap-3">
            <span className="text-accent font-bold mt-0.5">!</span>
            <p className="text-xs font-mono text-text-primary leading-relaxed">{error}</p>
          </div>
        )}

        {message && (
          <div className="p-4 mb-8 bg-success-muted border-l-4 border-success flex items-start gap-3">
            <span className="text-success font-bold mt-0.5">✓</span>
            <p className="text-xs font-mono text-text-primary leading-relaxed">{message}</p>
          </div>
        )}

        {isDevLogin ? (
          <form onSubmit={handleDevSubmit} className="space-y-6">
            <div>
              <label className="label block mb-2 text-text-primary">Developer Passcode</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-system w-full pr-10"
                  value={devPasscode}
                  onChange={(e) => setDevPasscode(e.target.value)}
                  placeholder="Enter bypass phrase"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4 text-base py-3 bg-accent text-bg-primary hover:bg-text-primary"
            >
              {loading ? 'Bypassing...' : 'OVERRIDE AUTH'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label block mb-2 text-text-primary">Email Address</label>
              <input
                type="email"
                className="input-system w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@jarvis.sys"
                required
              />
            </div>
            
            <div>
              <label className="label block mb-2 text-text-primary">Access Code</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-system w-full pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4 text-base py-3"
            >
              {loading ? 'Processing...' : isLogin ? 'Initialize Agent' : 'Register New Agent'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center pt-6 border-t border-border-strong flex flex-col gap-4">
          <button
            onClick={() => {
              if (isDevLogin) {
                setIsDevLogin(false);
              } else {
                setIsLogin(!isLogin);
              }
              setError(null);
              setMessage(null);
            }}
            className="text-xs font-mono font-bold tracking-widest uppercase text-text-secondary hover:text-text-primary transition-colors"
          >
            {isDevLogin ? 'Return to Standard Login' : isLogin ? 'Register a new agent instead' : 'Return to system initialization'}
          </button>
          
          {!isDevLogin && (
            <button
              onClick={() => {
                setIsDevLogin(true);
                setError(null);
                setMessage(null);
              }}
              className="text-xs font-mono font-bold tracking-widest uppercase text-accent hover:text-text-primary transition-colors"
            >
              Developer Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
