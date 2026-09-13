import { useState } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase, supabaseUrl } from '../lib/supabaseClient';

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

  const isLocalhostInProd = 
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1'));

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (devPasscode !== 'HEY HEY HEY') {
      setError('Invalid developer passcode.');
      return;
    }

    const savedEmail = localStorage.getItem('dev_email');
    const savedPassword = localStorage.getItem('dev_password');

    if (!savedEmail || !savedPassword) {
      setError('Developer backdoor not configured on this device. Please register or log in normally once to link your account, then you can use the backdoor.');
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
        const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (error) throw error;
        if (data.session) {
          setMessage('Agent initialized successfully! Entering character matrix...');
        } else {
          setMessage('Registration received! Check your inbox/spam for the confirmation link, or disable "Confirm email" in your Supabase Auth dashboard.');
        }
      }
    } catch (err: any) {
      if (err.message === 'Invalid login credentials') {
        setError('Invalid credentials. If this is your first time on this deployment, please click "Register a new agent instead" below.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Email not confirmed yet. Check your inbox/spam for the confirmation email, or turn off "Confirm email" in Supabase Auth settings.');
      } else if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        if (isLocalhostInProd) {
          setError('Backend misconfigured: This deployment is still pointing to local 127.0.0.1:54321, which other devices cannot reach. Add your cloud VITE_SUPABASE_URL in Vercel settings and redeploy.');
        } else {
          setError(`Cannot connect to authentication service at ${supabaseUrl} (Failed to fetch). If you are using Brave, an ad-blocker, or an aggressive VPN, please disable shields for this site.`);
        }
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
            <h1 className="text-2xl font-mono font-bold tracking-[0.25em] text-text-primary leading-none">JARVIS</h1>
          </div>
          <div className="text-xs font-mono font-bold tracking-widest uppercase text-text-secondary">
            {isDevLogin ? 'Developer Override' : 'System Initialization'}
          </div>
        </div>

        {isLocalhostInProd && (
          <div className="p-3.5 mb-6 bg-accent/15 border-l-4 border-accent text-xs font-mono text-text-primary leading-relaxed shadow-xs">
            <div className="flex items-center gap-1.5 font-bold text-accent mb-1">
              <AlertTriangle size={14} />
              <span>BACKEND CONFIGURATION NOTICE</span>
            </div>
            <p className="text-3xs text-text-secondary mb-1.5">
              This deployment is trying to connect to local Docker on <span className="font-bold text-text-primary">127.0.0.1:54321</span>. Other devices cannot reach your local machine.
            </p>
            <p className="text-3xs text-text-muted">
              Add <code className="text-accent font-bold">VITE_SUPABASE_URL</code> and <code className="text-accent font-bold">VITE_SUPABASE_ANON_KEY</code> to your Vercel Environment Variables, then click <strong>Redeploy</strong>.
            </p>
          </div>
        )}

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
