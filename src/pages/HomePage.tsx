import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { db, rtdb } from '../lib/firebase';
import { Heart, Send, Sparkles } from 'lucide-react';

export default function HomePage({ user }: { user?: any }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [news, setNews] = useState<string>('');
  const [feelings, setFeelings] = useState<any[]>([]);
  const [feelingInput, setFeelingInput] = useState('');
  const [isSubmittingFeeling, setIsSubmittingFeeling] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch live news
    const newsRef = ref(rtdb, 'liveNews');
    const unsubscribeNews = onValue(newsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setNews(data.text || '');
      } else {
        setNews('');
      }
    }, (err) => {
      console.error("RTDB Error:", err);
    });

    // Fetch feelings
    const feelingsRef = ref(rtdb, 'feelings');
    const unsubscribeFeelings = onValue(feelingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const feelingsList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 10);
        setFeelings(feelingsList);
      } else {
        setFeelings([]);
      }
    });

    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedPosts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(fetchedPosts);
      } catch (err: any) {
        console.error("Error fetching posts:", err);
        if (err.message?.includes('Missing or insufficient permissions')) {
          setError('Firestore Security Rules Error: You do not have permission to read posts. Please update your Firestore Security Rules in the Firebase Console to allow read access to the "posts" collection.');
        } else {
          setError(err.message || 'Failed to fetch posts. Check index constraints or rules.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();

    return () => {
      unsubscribeNews();
      unsubscribeFeelings();
    };
  }, []);

  const handleFeelingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feelingInput.trim() || !user) return;
    
    setIsSubmittingFeeling(true);
    try {
      await push(ref(rtdb, 'feelings'), {
        text: feelingInput.trim(),
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: serverTimestamp()
      });
      setFeelingInput('');
    } catch (err: any) {
      console.error("Error submitting feeling:", err);
    } finally {
      setIsSubmittingFeeling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {news && (
        <div className="bg-indigo-600 text-white px-4 py-3 rounded-xl mb-8 flex items-center shadow-sm overflow-hidden whitespace-nowrap">
          <span className="font-bold mr-4 shrink-0 flex items-center">
            <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
            LIVE
          </span>
          <div className="overflow-hidden relative w-full">
            <p className="animate-marquee inline-block">{news}</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Feed: Stories */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-8">Latest Stories</h1>
          
          {posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-neutral-100 shadow-sm">
              <p className="text-neutral-500 mb-4">No stories published yet.</p>
              <Link to="/write" className="text-neutral-900 font-medium hover:underline">
                Be the first to write one
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {posts.map(post => (
                <article key={post.id} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow">
                  {post.category && (
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium tracking-wide uppercase">
                        {post.category}
                      </span>
                    </div>
                  )}
                  {post.imageUrl && (
                    <div className="mb-6 rounded-xl overflow-hidden bg-neutral-100">
                      <img src={post.imageUrl} alt={post.title} className="w-full h-auto" />
                    </div>
                  )}
                  <Link to={`/post/${post.id}`}>
                    <h2 className="text-2xl font-bold text-neutral-900 mb-2 hover:underline decoration-neutral-300 underline-offset-4">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="text-neutral-600 mb-6 line-clamp-3 leading-relaxed">
                    {post.excerpt || post.content}
                  </p>
                  <div className="flex items-center text-sm text-neutral-500">
                    <span className="font-medium text-neutral-900">{post.authorName || 'Anonymous'}</span>
                    <span className="mx-2">•</span>
                    <span>{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                    <div className="ml-auto flex items-center space-x-4">
                      <span className="flex items-center"><Heart className="w-4 h-4 mr-1" /> {post.likes?.length || 0}</span>
                      <span className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square mr-1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> {post.comments?.length || 0}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Sponsor Stories */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles className="w-20 h-20" />
            </div>
            <h3 className="text-lg font-bold font-serif mb-2 relative z-10 flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Sponsor Our Stories
            </h3>
            <p className="text-sm text-indigo-100 mb-6 relative z-10 leading-relaxed">
              Support independent writers and keep the community thriving. Become a sponsor today to feature your brand.
            </p>
            <button className="w-full py-2.5 bg-white text-indigo-600 font-semibold rounded-lg text-sm hover:bg-indigo-50 transition-colors relative z-10">
              Explore Sponsorships
            </button>
          </div>
          
          {/* Feeling Form */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
            <h3 className="text-lg font-bold font-serif text-neutral-900 mb-2">How are you feeling?</h3>
            <p className="text-sm text-neutral-500 mb-4">Share your current mood with the community.</p>
            
            <form onSubmit={handleFeelingSubmit} className="flex gap-2">
              <input
                type="text"
                value={feelingInput}
                onChange={(e) => setFeelingInput(e.target.value)}
                placeholder="I'm feeling..."
                maxLength={50}
                disabled={isSubmittingFeeling}
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!feelingInput.trim() || isSubmittingFeeling}
                className="p-2 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            
            {/* Recent Feelings Feed */}
            <div className="mt-6 space-y-3">
              {feelings.map(feeling => (
                <div key={feeling.id} className="text-sm flex items-start gap-2 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs shrink-0 font-medium text-neutral-600">
                    {feeling.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-900">{feeling.authorName}</span>
                    <span className="text-neutral-500 ml-1">is feeling</span>
                    <p className="text-neutral-800 mt-0.5 font-medium">{feeling.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
