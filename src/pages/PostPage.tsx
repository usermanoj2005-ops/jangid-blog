import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, push, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { db, rtdb } from '../lib/firebase';
import { ArrowLeft, Heart, MessageSquare, Share2, Send } from 'lucide-react';

export default function PostPage({ user }: { user?: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction states
  const [commentInput, setCommentInput] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, 'posts', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setError("Post not found");
      }
    } catch (err: any) {
      console.error("Error fetching post:", err);
      if (err.message?.includes('Missing or insufficient permissions')) {
        setError('Firestore Security Rules Error: You do not have permission to read posts. Please update your Firestore Security Rules in the Firebase Console.');
      } else {
        setError(err.message || 'Failed to load post');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !post || isLiking) return;
    
    setIsLiking(true);
    try {
      const docRef = doc(db, 'posts', post.id);
      const hasLiked = post.likes?.includes(user.uid);
      
      await updateDoc(docRef, {
        likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      
      // Optimitistic update
      setPost((prev: any) => ({
        ...prev,
        likes: hasLiked 
          ? prev.likes.filter((uid: string) => uid !== user.uid)
          : [...(prev.likes || []), user.uid]
      }));
    } catch (err) {
      console.error("Failed to toggle like:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !post || !commentInput.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const newComment = {
        id: Date.now().toString(),
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        text: commentInput.trim(),
        createdAt: new Date().toISOString()
      };

      const docRef = doc(db, 'posts', post.id);
      await updateDoc(docRef, {
        comments: arrayUnion(newComment)
      });

      // Optimistic update
      setPost((prev: any) => ({
        ...prev,
        comments: [...(prev.comments || []), newComment]
      }));
      setCommentInput('');
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShareToChat = async () => {
    if (!user || !post || isSharing) return;

    setIsSharing(true);
    try {
      const shareText = `Check out this story: "${post.title}"\n${window.location.origin}/post/${post.id}`;
      
      // Push to global chat
      await push(ref(rtdb, 'messages'), {
        text: shareText,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        timestamp: rtdbServerTimestamp()
      });

      // Redirect to chat
      navigate('/chat');
    } catch (err: any) {
      console.error("Failed to share to chat:", err);
      alert('Failed to share to chat. Realtime Database rules might be blocking it.');
    } finally {
      setIsSharing(false);
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

  if (!post) return null;

  const likesCount = post.likes?.length || 0;
  const hasLiked = post.likes?.includes(user?.uid);
  const comments = post.comments || [];

  return (
    <article className="max-w-3xl mx-auto bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-neutral-100 mb-10">
      <Link to="/" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to latest
      </Link>
      
      {post.category && (
        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-sm font-medium tracking-wide uppercase">
            {post.category}
          </span>
        </div>
      )}

      {post.imageUrl && (
        <div className="mb-8 rounded-2xl overflow-hidden bg-neutral-100">
          <img src={post.imageUrl} alt={post.title} className="w-full h-auto" />
        </div>
      )}

      <h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-900 mb-6 leading-tight">
        {post.title}
      </h1>
      
      <div className="flex items-center text-sm text-neutral-500 mb-10 pb-8 border-b border-neutral-100">
        <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-600 font-bold mr-3">
          {post.authorName?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <div className="font-medium text-neutral-900">{post.authorName || 'Unknown Author'}</div>
          <div>{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Just now'}</div>
        </div>
      </div>
      
      <div className="whitespace-pre-wrap leading-relaxed text-neutral-800 text-lg md:text-xl font-serif mb-12">
        {post.content}
      </div>

      {/* Interactions Bar */}
      <div className="flex items-center justify-between py-4 border-t border-neutral-100">
        <div className="flex items-center space-x-6">
          <button 
            onClick={handleLike}
            disabled={!user || isLiking}
            className={`flex items-center space-x-2 transition-colors ${hasLiked ? 'text-red-500' : 'text-neutral-500 hover:text-red-500'}`}
          >
            <Heart className={`w-6 h-6 ${hasLiked ? 'fill-current' : ''}`} />
            <span className="font-medium text-lg">{likesCount}</span>
          </button>

          <div className="flex items-center space-x-2 text-neutral-500">
            <MessageSquare className="w-6 h-6" />
            <span className="font-medium text-lg">{comments.length}</span>
          </div>
        </div>

        <button 
          onClick={handleShareToChat}
          disabled={!user || isSharing}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-full font-medium transition-colors disabled:opacity-50"
        >
          <Share2 className="w-4 h-4" />
          <span>Share to Chat</span>
        </button>
      </div>

      {/* Comments Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-neutral-900 mb-6">Comments ({comments.length})</h3>
        
        {user ? (
          <form onSubmit={handleCommentSubmit} className="mb-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">
                {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[50px] resize-y"
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim() || isSubmittingComment}
                  className="absolute bottom-3 right-3 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-300 text-white rounded-lg transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-neutral-50 rounded-xl text-center text-neutral-600">
            <Link to="/auth" className="text-indigo-600 font-medium hover:underline mr-1">Log in</Link>
            to like, comment, and share.
          </div>
        )}

        <div className="space-y-6">
          {comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-4">
              <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-600 font-bold shrink-0">
                {comment.userName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <div className="bg-neutral-50 rounded-2xl p-4">
                  <div className="font-semibold text-neutral-900 text-sm mb-1">{comment.userName}</div>
                  <p className="text-neutral-800 break-words">{comment.text}</p>
                </div>
                <div className="text-xs text-neutral-500 mt-2 px-2">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          
          {comments.length === 0 && (
            <div className="text-center py-6 text-neutral-500 border border-dashed border-neutral-200 rounded-xl">
              No comments yet. Be the first to share your thoughts!
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
