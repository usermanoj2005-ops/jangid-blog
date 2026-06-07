import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Home, PenTool, User as UserIcon, MessageSquare } from 'lucide-react';

export default function Layout({ children, user }: { children: ReactNode, user: any }) {
  const location = useLocation();
  
  const navLinks = [
    { path: '/', label: 'Home', icon: <Home className="w-4 h-4 mr-2 md:mr-1" /> },
    { path: '/write', label: 'Write', icon: <PenTool className="w-4 h-4 mr-2 md:mr-1" /> },
    { path: '/chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4 mr-2 md:mr-1" /> },
    { path: '/profile', label: 'Profile', icon: <UserIcon className="w-4 h-4 mr-2 md:mr-1" /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-serif font-bold text-neutral-900 tracking-tight">
              Jangid Blog.
            </Link>
            <nav className="hidden md:flex gap-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.path} 
                  to={link.path}
                  className={`flex items-center text-sm font-medium transition-colors ${location.pathname === link.path ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-neutral-600">
              {user?.displayName || user?.email}
            </div>
            <button
              onClick={() => signOut(auth)}
              className="px-3 py-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg text-sm font-medium transition-colors flex items-center"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-neutral-100 flex justify-around p-2">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path}
              className={`flex flex-col items-center justify-center p-2 text-xs font-medium ${location.pathname === link.path ? 'text-neutral-900' : 'text-neutral-500'}`}
            >
              {link.icon}
            </Link>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
