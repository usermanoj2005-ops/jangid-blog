import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import WritePage from './pages/WritePage';
import PostPage from './pages/PostPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import Layout from './components/Layout';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Show error if loading takes too long (e.g. 8 seconds)
    const timeoutTimer = setTimeout(() => {
      if (loading) setLoadError(true);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      clearTimeout(timeoutTimer);
      
      // Update user presence in RTDB to enable finding users for direct messages
      if (currentUser) {
        import('firebase/database').then(({ ref, set, serverTimestamp }) => {
          import('./lib/firebase').then(({ rtdb }) => {
            set(ref(rtdb, `users/${currentUser.uid}`), {
              uid: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
              email: currentUser.email,
              photoURL: currentUser.photoURL || '',
              lastSeen: serverTimestamp()
            }).catch(err => {
              console.warn("Could not save user presence. Rules might prevent it.", err);
            });
          });
        });
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(timeoutTimer);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white flex-col gap-6 px-6 text-center">
        {!loadError ? (
          <>
            <div className="w-10 h-10 border-4 border-neutral-100 border-t-neutral-900 rounded-full animate-spin" />
            <p className="text-sm font-medium text-neutral-500 animate-pulse">Initializing Jangid Blog...</p>
          </>
        ) : (
          <div className="max-w-xs animate-in fade-in slide-in-from-bottom-3 duration-700">
            <h2 className="text-xl font-serif font-bold text-neutral-900 mb-2">Connection Issue</h2>
            <p className="text-sm text-neutral-500 mb-6 leading-relaxed">It's taking unusually long to connect. This might be due to a slow network or restricted device configuration.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 active:scale-95 transition-all shadow-lg shadow-neutral-200"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/write" element={<WritePage user={user} />} />
          <Route path="/post/:id" element={<PostPage user={user} />} />
          <Route path="/chat" element={<ChatPage user={user} />} />
          <Route path="/profile" element={<ProfilePage user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
