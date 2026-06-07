import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { db, rtdb } from '../lib/firebase';
import { BookOpen, Radio } from 'lucide-react';

export default function WritePage({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'story' | 'news'>('story');

  // Story state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Technology');

  const categories = ['Technology', 'Lifestyle', 'Programming', 'Design', 'Business', 'Health', 'Other'];

  // News state
  const [newsText, setNewsText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      await addDoc(collection(db, 'posts'), {
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim(),
        excerpt: excerpt.trim(),
        category,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: serverTimestamp(),
      });
      navigate('/');
    } catch (err: any) {
      console.error("Error adding document: ", err);
      if (err.message?.includes('Missing or insufficient permissions')) {
        setError("Firestore Security Rules Error: You do not have permission to write posts. Please update your Firestore Security Rules in the Firebase Console to allow create access to the 'posts' collection.");
      } else {
        setError(err.message || "Failed to publish post.");
      }
      setIsSubmitting(false);
    }
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsText.trim()) {
      setError("News content is required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await set(ref(rtdb, 'liveNews'), {
        text: newsText.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        updatedAt: rtdbServerTimestamp(),
      });
      setSuccess("Live news updated successfully!");
      setNewsText('');
    } catch (err: any) {
      console.error("Error setting RTDB: ", err);
      if (err.message?.includes('PERMISSION_DENIED')) {
        setError("Database Security Rules Error: You do not have permission to update live news. Please update Realtime Database rules in Firebase Console.");
      } else {
        setError(err.message || "Failed to update live news.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100">
      
      {/* Tabs */}
      <div className="flex space-x-4 mb-8 border-b border-neutral-100 pb-2">
        <button
          onClick={() => { setActiveTab('story'); setError(null); setSuccess(null); }}
          className={`flex items-center pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'story' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Publish Story
        </button>
        <button
          onClick={() => { setActiveTab('news'); setError(null); setSuccess(null); }}
          className={`flex items-center pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'news' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Radio className="w-4 h-4 mr-2" />
          Update Live News
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">
          {success}
        </div>
      )}

      {activeTab === 'story' ? (
        <form onSubmit={handleStorySubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full text-4xl font-bold font-serif text-neutral-900 border-none focus:outline-none focus:ring-0 placeholder-neutral-300 bg-transparent mb-4"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Cover Image URL (optional)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                disabled={isSubmitting}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-neutral-700 mb-1">Summary / Excerpt</label>
             <textarea
               value={excerpt}
               onChange={(e) => setExcerpt(e.target.value)}
               placeholder="A brief summary of your story..."
               className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none h-20"
               disabled={isSubmitting}
             />
          </div>
          
          <div className="h-px bg-neutral-100 w-full" />
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Content</label>
            <div className="border border-neutral-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-neutral-900 transition-shadow bg-neutral-50">
              <div className="bg-neutral-100 border-b border-neutral-200 px-3 py-2 flex gap-2">
                {/* Fake formatting toolbar */}
                 <span className="font-bold text-neutral-600 px-2 cursor-pointer hover:text-neutral-900">B</span>
                 <span className="italic text-neutral-600 px-2 cursor-pointer hover:text-neutral-900">I</span>
                 <span className="underline text-neutral-600 px-2 cursor-pointer hover:text-neutral-900">U</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tell your story..."
                className="w-full min-h-[400px] text-lg text-neutral-800 leading-relaxed border-none focus:outline-none focus:ring-0 placeholder-neutral-400 bg-transparent resize-none font-serif p-4"
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-medium rounded-full text-sm transition-colors"
            >
              {isSubmitting ? 'Publishing...' : 'Publish story'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleNewsSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Live News Ticker Message
            </label>
            <textarea
              value={newsText}
              onChange={(e) => setNewsText(e.target.value)}
              placeholder="Type breaking news or an important update here..."
              className="w-full min-h-[150px] p-4 text-base text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
              autoFocus
            />
            <p className="mt-2 text-xs text-neutral-500">
              This message will appear instantly in the marquee on the home page for all users.
            </p>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={isSubmitting || !newsText.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-full text-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Updating...' : 'Update Live News'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
