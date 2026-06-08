import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LogOut, User, Edit2, Trash2, FileText, Check, X, Calendar, UserPlus, MessageSquare, Clock } from 'lucide-react';
import { auth, db, rtdb } from '../lib/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { ref as dbRef, update as dbUpdate, onValue, set, remove, get } from 'firebase/database';

import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';

export default function ProfilePage({ user }: { user: any }) {
  const { userId } = useParams();
  const isMe = !userId || userId === user?.uid;
  const targetUid = isMe ? user?.uid : userId;

  const [profileUser, setProfileUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Connection states
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'received'>('none');
  const [requestActionLoading, setRequestActionLoading] = useState(false);

  useEffect(() => {
    if (targetUid) {
      fetchProfileData();
      if (!isMe) {
        checkConnectionStatus();
      }
    }
  }, [targetUid, isMe]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Fetch User Info from RTDB
      const userRef = dbRef(rtdb, `users/${targetUid}`);
      const userSnap = await get(userRef);
      if (userSnap.exists()) {
        setProfileUser(userSnap.val());
      } else if (isMe) {
        setProfileUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        });
      }

      // Fetch Posts from Firestore
      const q = query(collection(db, 'posts'), where('authorId', '==', targetUid));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetched.sort((a, b) => {
        const dateA = (a as any).createdAt?.toDate ? (a as any).createdAt.toDate().getTime() : 0;
        const dateB = (b as any).createdAt?.toDate ? (b as any).createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      setPosts(fetched);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = () => {
    if (!user || !targetUid || isMe) return;

    // Check Connections
    const connRef = dbRef(rtdb, `connections/${user.uid}/${targetUid}`);
    onValue(connRef, (snapshot) => {
      if (snapshot.exists()) {
        setConnectionStatus('accepted');
      } else {
        // Check Sent Requests
        const sentRef = dbRef(rtdb, `chat_requests/${targetUid}/${user.uid}`);
        onValue(sentRef, (sentSnap) => {
          if (sentSnap.exists()) {
            setConnectionStatus('pending');
          } else {
            // Check Received Requests
            const receivedRef = dbRef(rtdb, `chat_requests/${user.uid}/${targetUid}`);
            onValue(receivedRef, (recSnap) => {
              if (recSnap.exists()) {
                setConnectionStatus('received');
              } else {
                setConnectionStatus('none');
              }
            });
          }
        });
      }
    });
  };

  const handleSendRequest = async () => {
    if (!user || !targetUid || isMe || requestActionLoading) return;
    setRequestActionLoading(true);
    try {
      await set(dbRef(rtdb, `chat_requests/${targetUid}/${user.uid}`), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderPhoto: user.photoURL || '',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || !targetUid || isMe || requestActionLoading) return;
    setRequestActionLoading(true);
    try {
      // Add to both connections
      await dbUpdate(dbRef(rtdb), {
        [`connections/${user.uid}/${targetUid}`]: true,
        [`connections/${targetUid}/${user.uid}`]: true
      });
      // Remove request
      await remove(dbRef(rtdb, `chat_requests/${user.uid}/${targetUid}`));
    } catch (err) {
      console.error(err);
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setUploadingImage(true);
    try {
      const imageRef = storageRef(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setPhotoURL(downloadURL);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Make sure rules allow it, or Storage is initialized.");
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchMyPosts = async () => {
    if (!user || !user.uid) return;
    try {
      const q = query(collection(db, 'posts'), where('authorId', '==', user.uid));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort locally to avoid needing an immediate composite Firestore index
      fetched.sort((a, b) => {
        const aDoc = a as any;
        const bDoc = b as any;
        const dateA = aDoc.createdAt?.toDate ? aDoc.createdAt.toDate().getTime() : 0;
        const dateB = bDoc.createdAt?.toDate ? bDoc.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      setPosts(fetched);
    } catch (error) {
      console.error("Error fetching user posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    const nameChanged = newName.trim() && newName !== user.displayName;
    const photoChanged = photoURL.trim() !== (user.photoURL || '');

    if (!nameChanged && !photoChanged) {
      setIsEditing(false);
      return;
    }
    
    setUpdateLoading(true);
    try {
      const finalName = newName.trim() || user.displayName;
      const finalPhoto = photoURL.trim() || null;
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { 
          displayName: finalName,
          photoURL: finalPhoto
        });
      }
      // Synchronize to Firebase Realtime Database
      try {
        await dbUpdate(dbRef(rtdb, `users/${user.uid}`), {
          displayName: finalName,
          photoURL: finalPhoto || ''
        });
      } catch (dbErr) {
        console.warn("Could not sync profile update to presence database database", dbErr);
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setDeleteLoading(postId);
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* Sidebar - Profile Info */}
      <div className="md:col-span-1 space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-neutral-100 text-center">
          <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-600 mx-auto mb-6 relative group overflow-hidden border border-neutral-100">
            {profileUser?.photoURL ? (
              <img src={profileUser.photoURL} alt={profileUser.displayName || 'User'} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10" />
            )}
          </div>
          
          {isMe && isEditing ? (
            <div className="flex justify-center flex-col gap-3 mb-6">
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-neutral-600">Display Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Display Name"
                  className="border border-neutral-200 rounded px-3 py-1.5 text-sm w-full font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  autoFocus
                  disabled={updateLoading}
                />
              </div>

              <div className="flex flex-col items-center gap-2 pt-1">
                <label className="text-xs font-medium text-neutral-500 w-full text-left font-semibold">Profile Image</label>
                <input
                  type="text"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="Or paste image URL"
                  className="border border-neutral-200 rounded px-3 py-1.5 text-sm w-full text-center focus:outline-none focus:ring-2 focus:ring-neutral-900 mb-2"
                  disabled={updateLoading || uploadingImage}
                />
                <label className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs px-3 py-1.5 rounded transition-colors w-full text-center">
                  {uploadingImage ? 'Uploading...' : 'Upload from device'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                    disabled={updateLoading || uploadingImage}
                  />
                </label>
              </div>
              <div className="flex justify-center gap-2 mt-2">
                <button onClick={handleUpdateProfile} disabled={updateLoading} className="text-green-600 p-1.5 px-3 bg-green-50 hover:bg-green-100 rounded text-sm font-medium transition-colors flex items-center cursor-pointer">
                  <Check className="w-4 h-4 mr-1" /> Save
                </button>
                <button 
                  onClick={() => { 
                    setIsEditing(false); 
                    setNewName(user?.displayName || ''); 
                    setPhotoURL(user?.photoURL || ''); 
                  }} 
                  disabled={updateLoading} 
                  className="text-red-500 p-1.5 px-3 bg-red-50 hover:bg-red-100 rounded text-sm font-medium transition-colors flex items-center cursor-pointer"
                >
                  <X className="w-4 h-4 mr-1" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-2xl font-serif font-bold text-neutral-900">
                {profileUser?.displayName || 'Anonymous User'}
              </h1>
              {isMe && (
                <button onClick={() => { setIsEditing(true); }} className="text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer" title="Edit Profile Details">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          
          <p className="text-neutral-500 text-sm mb-8">{profileUser?.email}</p>
          
          {!isMe && (
            <div className="mb-8">
              {connectionStatus === 'none' && (
                <button
                  onClick={handleSendRequest}
                  disabled={requestActionLoading}
                  className="w-full flex items-center justify-center px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg text-sm transition-all shadow-md active:scale-95 disabled:bg-neutral-400"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {requestActionLoading ? 'Sending...' : 'Add Author'}
                </button>
              )}
              {connectionStatus === 'pending' && (
                <div className="w-full flex items-center justify-center px-6 py-2.5 bg-neutral-100 text-neutral-500 font-medium rounded-lg text-sm border border-neutral-200">
                  <Clock className="w-4 h-4 mr-2" />
                  Sent Request
                </div>
              )}
              {connectionStatus === 'received' && (
                <button
                  onClick={handleAcceptRequest}
                  disabled={requestActionLoading}
                  className="w-full flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-all shadow-md active:scale-95"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {requestActionLoading ? 'Accepting...' : 'Accept Request'}
                </button>
              )}
              {connectionStatus === 'accepted' && (
                <Link
                  to={`/chat?userId=${targetUid}`}
                  className="w-full flex items-center justify-center px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg text-sm border border-indigo-200 transition-all active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Continue Chat
                </Link>
              )}
            </div>
          )}
          
          <div className="pt-6 border-t border-neutral-100 text-left space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 flex items-center"><FileText className="w-4 h-4 mr-2"/> Stories Published</span>
              <span className="font-semibold text-neutral-900">{loading ? '-' : posts.length}</span>
            </div>
          </div>
          
          {isMe && (
            <div className="pt-8 mt-6 border-t border-neutral-100">
              <button
                onClick={() => signOut(auth)}
                className="w-full flex items-center justify-center px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg text-sm transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - User's Posts */}
      <div className="md:col-span-2 space-y-6">
        <h2 className="text-2xl font-serif font-bold text-neutral-900">{isMe ? 'Your Stories' : 'Stories Published'}</h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100 text-center">
            <p className="text-neutral-500 mb-4">{isMe ? "You haven't published any stories yet." : "This author hasn't published any stories yet."}</p>
            {isMe && (
              <Link to="/write" className="inline-flex items-center px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors">
                <Edit2 className="w-4 h-4 mr-2" /> Write your first story
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col sm:flex-row justify-between gap-4 group hover:shadow-md transition-all">
                <div className="flex-1">
                  <Link to={`/post/${post.id}`}>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2 group-hover:underline decoration-neutral-300 underline-offset-4 transition-colors">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-neutral-500 text-sm line-clamp-2 mb-3 leading-relaxed">
                    {post.content}
                  </p>
                  <div className="flex items-center text-xs text-neutral-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Just now'}
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 border-t sm:border-t-0 sm:border-l border-neutral-100 pt-4 sm:pt-0 sm:pl-4">
                   <Link 
                     to={`/post/${post.id}`}
                     className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded text-sm font-medium transition-colors whitespace-nowrap"
                   >
                     View
                   </Link>
                   {isMe && (
                     <button
                       onClick={() => handleDeletePost(post.id)}
                       disabled={deleteLoading === post.id}
                       className="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded text-sm font-medium transition-colors flex items-center cursor-pointer"
                     >
                       {deleteLoading === post.id ? (
                         <span className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin"></span>
                       ) : (
                         <><Trash2 className="w-4 h-4 mr-1 md:mr-0 lg:mr-1" /> <span className="md:hidden lg:inline">Delete</span></>
                       )}
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}
