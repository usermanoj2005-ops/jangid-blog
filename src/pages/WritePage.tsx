import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, set, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { db, rtdb } from '../lib/firebase';
import { BookOpen, Radio } from 'lucide-react';

export default function WritePage({ user }: { user: any }) {
  // Story state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Technology');

  const categories = ['Technology', 'Lifestyle', 'Programming', 'Design', 'Business', 'Health', 'Other'];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    
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

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 italic">
      
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-neutral-100">
         <BookOpen className="w-6 h-6 text-neutral-900" />
         <h1 className="text-2xl font-serif font-bold text-neutral-900">Publish New Story</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      )}

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
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
             className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none h-20"
             disabled={isSubmitting}
           />
        </div>
        
        <div className="h-px bg-neutral-100 w-full" />
        
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Content</label>
          <div className="border border-neutral-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-neutral-900 transition-shadow bg-neutral-50">
            <div className="bg-neutral-100/50 border-b border-neutral-200 px-4 py-2.5 flex gap-4">
               <span className="font-bold text-neutral-500 cursor-default">Style Tools</span>
               <div className="w-px h-4 bg-neutral-300 self-center" />
               <span className="font-bold text-neutral-700 hover:text-neutral-900 cursor-pointer transition-colors">B</span>
               <span className="italic text-neutral-700 hover:text-neutral-900 cursor-pointer transition-colors">I</span>
               <span className="underline text-neutral-700 hover:text-neutral-900 cursor-pointer transition-colors">U</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tell your story..."
              className="w-full min-h-[400px] text-lg text-neutral-800 leading-relaxed border-none focus:outline-none focus:ring-0 placeholder-neutral-400 bg-transparent resize-none font-serif p-6"
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <div className="flex justify-end pt-6 border-t border-neutral-100">
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="px-8 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-neutral-200 active:scale-95"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Story'}
          </button>
        </div>
      </form>
    </div>
  );
}
