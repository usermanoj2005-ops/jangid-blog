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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
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
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
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
