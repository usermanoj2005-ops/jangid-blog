import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Home, PenTool, User as UserIcon, MessageSquare } from 'lucide-react';

export default function Layout({ children, user }: { children: ReactNode, user: any }) {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  
  const navLinks = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/write', label: 'Write', icon: PenTool },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className={`bg-neutral-50 flex flex-col ${
      isChatPage 
        ? 'h-[100dvh] overflow-hidden md:h-auto md:min-h-screen md:overflow-visible' 
        : 'min-h-screen'
    }`}>
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10 shrink-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-serif font-bold text-neutral-900 tracking-tight">
              Jangid Blog.
            </Link>
            <nav className="hidden md:flex gap-6">
              {navLinks.map((link) => {
                const IconComponent = link.icon;
                return (
                  <Link 
                    key={link.path} 
                    to={link.path}
                    className={`flex items-center text-sm font-medium transition-colors ${location.pathname === link.path ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                  >
                    <IconComponent className="w-4 h-4 mr-1.5 shrink-0" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-neutral-600">
              {user?.displayName || user?.email}
            </div>
            <button
              onClick={() => signOut(auth)}
              className="px-3 py-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg text-sm font-medium transition-colors flex items-center cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className={`flex-1 w-full mx-auto ${
        isChatPage 
          ? 'p-0 pb-16 md:pb-0 max-w-none md:max-w-5xl md:px-8 md:py-8 flex flex-col min-h-0 overflow-hidden md:block md:overflow-visible' 
          : 'pb-16 md:pb-0 max-w-5xl px-4 md:px-8 py-4 md:py-8 pb-20'
      }`}>
        {children}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-neutral-200/80 flex justify-around py-2 bg-white/95 backdrop-blur-md z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] px-2 pb-[env(safe-area-inset-bottom,4px)]">
        {navLinks.map((link) => {
          const IconComponent = link.icon;
          const isActive = location.pathname === link.path || (link.path === '/profile' && location.pathname.startsWith('/profile'));
          return (
            <Link 
              key={link.path} 
              to={link.path}
              className={`flex flex-col items-center justify-center py-1 flex-1 text-[11px] font-semibold transition-all relative ${
                isActive ? 'text-indigo-600 font-bold scale-102' : 'text-neutral-450 hover:text-neutral-600'
              }`}
            >
              <IconComponent className={`w-5 h-5 mb-1 shrink-0 ${isActive ? 'text-indigo-600' : 'text-neutral-450'}`} />
              <span className="leading-none text-[10px]">{link.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-4 h-0.5 bg-indigo-600 rounded" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
