import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setError(null);
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password || (mode === 'register' && !name)) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 selection:bg-neutral-200">
      <div className="w-full max-w-md">
        
        {/* Header / Logo */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-serif text-4xl font-bold tracking-tight text-neutral-900 mb-2">
              Jangid Blog.
            </h1>
            <p className="text-neutral-500 font-sans text-sm">
              Discover stories, thinking, and expertise.
            </p>
          </motion.div>
        </div>

        {/* Card Container */}
        <div className="bg-white px-8 py-10 shadow-xl shadow-neutral-200/50 rounded-2xl border border-neutral-100 relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <h2 className="text-2xl font-semibold text-neutral-800 mb-1">
                {mode === 'login' ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                {mode === 'login' 
                  ? 'Enter your details to access your account.' 
                  : 'Join Jangid Blog to stay updated with stories.'}
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-neutral-700">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-lg text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow disabled:opacity-50"
                        placeholder="John Doe"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-lg text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow disabled:opacity-50"
                      placeholder="you@example.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-neutral-700">Password</label>
                    {mode === 'login' && (
                      <a href="#reset" className="text-xs font-medium text-neutral-900 hover:text-neutral-700 transition-colors">
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-lg text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-shadow disabled:opacity-50"
                      placeholder="••••••••"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-600 text-white font-medium rounded-lg text-sm flex items-center justify-center transition-colors group"
                >
                  {loading ? 'Processing...' : (mode === 'login' ? 'Sign in to account' : 'Create account')}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Toggle */}
        <p className="mt-8 text-center text-sm text-neutral-500">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={toggleMode}
            disabled={loading}
            className="font-medium text-neutral-900 hover:text-neutral-700 hover:underline transition-all disabled:opacity-50"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>

      </div>
    </div>
  );
}
