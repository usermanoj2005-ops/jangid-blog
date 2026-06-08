import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LogOut, User, Edit2, Trash2, FileText, Check, X, Calendar, UserPlus, MessageSquare, Clock, UserMinus } from 'lucide-react';
import { auth, db, rtdb } from '../lib/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { ref as dbRef, update as dbUpdate, onValue, set, remove, get } from 'firebase/database';

import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';

export const AVATAR_GALLERY = [
  { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', label: 'Violet' },
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', label: 'Arthur' },
  { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80', label: 'Rose' },
  { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80', label: 'Liam' },
  { url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80', label: 'Clara' },
  { url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80', label: 'David' },
  { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80', label: 'Elena' },
  { url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80', label: 'Maya' },
  { url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80', label: 'Mark' },
  { url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80', label: 'Tara' },
];

export const CHAT_BG_PRESETS = [
  { id: 'default', name: 'Default', bgClass: 'bg-neutral-50/50', previewBg: 'bg-neutral-100 border-neutral-300' },
  { id: 'lavender', name: 'Lavender', bgClass: 'bg-indigo-50/60', previewBg: 'bg-indigo-150 border-indigo-200' },
  { id: 'emerald', name: 'Mint Green', bgClass: 'bg-emerald-50/60', previewBg: 'bg-emerald-150 border-emerald-200' },
  { id: 'amber', name: 'Warm Amber', bgClass: 'bg-amber-50/60', previewBg: 'bg-amber-150 border-amber-200' },
  { id: 'sky', name: 'Ocean Sky', bgClass: 'bg-sky-50/60', previewBg: 'bg-sky-150 border-sky-200' },
  { id: 'rose', name: 'Soft Rose', bgClass: 'bg-rose-50/60', previewBg: 'bg-rose-150 border-rose-200' },
  { id: 'dark', name: 'Charcoal', bgClass: 'bg-neutral-900', previewBg: 'bg-neutral-800 border-neutral-700' },
];

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
  const [chatBgColor, setChatBgColor] = useState('default');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Connection states
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'received'>('none');
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [hasSentRequest, setHasSentRequest] = useState<boolean | null>(null);
  const [hasRecvRequest, setHasRecvRequest] = useState<boolean | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (targetUid) {
      fetchProfileData();
    }
  }, [targetUid]);

  // Integrated connection status logic with proper cleanups
  useEffect(() => {
    if (!targetUid || isMe || !user?.uid) {
      setConnectionStatus('none');
      setHasConnection(false);
      setHasSentRequest(false);
      setHasRecvRequest(false);
      return;
    }

    const connsRef = dbRef(rtdb, `connections/${user.uid}/${targetUid}`);
    const sentReqRef = dbRef(rtdb, `chat_requests/${targetUid}/${user.uid}`);
    const recvReqRef = dbRef(rtdb, `chat_requests/${user.uid}/${targetUid}`);

    const u1 = onValue(connsRef, (snap) => {
      setHasConnection(snap.exists());
    }, (err) => {
      console.warn("Telemetry warning: connection read failed:", err);
      setHasConnection(false);
    });

    const u2 = onValue(sentReqRef, (snap) => {
      setHasSentRequest(snap.exists());
    }, (err) => {
      console.warn("Telemetry warning: sent request read failed:", err);
      setHasSentRequest(false);
    });

    const u3 = onValue(recvReqRef, (snap) => {
      setHasRecvRequest(snap.exists());
    }, (err) => {
      console.warn("Telemetry warning: received request read failed:", err);
      setHasRecvRequest(false);
    });

    return () => {
      u1();
      u2();
      u3();
    };
  }, [targetUid, isMe, user?.uid]);

  // Consolidate live states safely
  useEffect(() => {
    if (isMe) {
      setConnectionStatus('none');
      return;
    }
    if (hasConnection === null || hasSentRequest === null || hasRecvRequest === null) {
      return;
    }

    if (hasConnection) {
      setConnectionStatus('accepted');
    } else if (hasSentRequest) {
      setConnectionStatus('pending');
    } else if (hasRecvRequest) {
      setConnectionStatus('received');
    } else {
      setConnectionStatus('none');
    }
  }, [hasConnection, hasSentRequest, hasRecvRequest, isMe]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Fetch User Info from RTDB
      const userRef = dbRef(rtdb, `users/${targetUid}`);
      const userSnap = await get(userRef);
      if (userSnap.exists()) {
        const val = userSnap.val();
        setProfileUser(val);
        if (val.chatBgColor) {
          setChatBgColor(val.chatBgColor);
        }
      } else if (isMe) {
        setProfileUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          chatBgColor: 'default'
        });
        setChatBgColor('default');
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

  const handleSendRequest = async () => {
    if (!user || !targetUid || isMe || requestActionLoading) return;
    setRequestActionLoading(true);
    try {
      // Automatic Mutual Accept: If they already sent us a request, trying to "Add" them should just accept.
      if (connectionStatus === 'received') {
        try {
          const updates: any = {};
          updates[`connections/${user.uid}/${targetUid}`] = true;
          updates[`connections/${targetUid}/${user.uid}`] = true;
          updates[`chat_requests/${user.uid}/${targetUid}`] = null;
          await dbUpdate(dbRef(rtdb), updates);
        } catch (atomicErr) {
          console.warn("Atomic send-accept failed, using fallback set:", atomicErr);
          await set(dbRef(rtdb, `connections/${user.uid}/${targetUid}`), true);
          try {
            await set(dbRef(rtdb, `connections/${targetUid}/${user.uid}`), true);
          } catch (e) {}
          await remove(dbRef(rtdb, `chat_requests/${user.uid}/${targetUid}`));
        }
        setConnectionStatus('accepted');
        return;
      }

      await set(dbRef(rtdb, `chat_requests/${targetUid}/${user.uid}`), {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderPhoto: user.photoURL || '',
        timestamp: Date.now()
      });
      setConnectionStatus('pending');
    } catch (err) {
      console.error(err);
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user || !targetUid || isMe || requestActionLoading) return;
    setRequestActionLoading(true);
    try {
      await remove(dbRef(rtdb, `chat_requests/${targetUid}/${user.uid}`));
      setConnectionStatus('none');
    } catch (err) {
      console.error(err);
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user?.uid || !targetUid || isMe || requestActionLoading) return;
    setRequestActionLoading(true);
    try {
      try {
        // Atomic accept: Add to both connections and remove request in one call
        const updates: any = {};
        updates[`connections/${user.uid}/${targetUid}`] = true;
        updates[`connections/${targetUid}/${user.uid}`] = true;
        updates[`chat_requests/${user.uid}/${targetUid}`] = null;
        await dbUpdate(dbRef(rtdb), updates);
      } catch (atomicErr) {
        console.warn("Atomic accept failed, using fallback set:", atomicErr);
        await set(dbRef(rtdb, `connections/${user.uid}/${targetUid}`), true);
        try {
          await set(dbRef(rtdb, `connections/${targetUid}/${user.uid}`), true);
        } catch (otherErr) {
          console.warn("Could not write target connection:", otherErr);
        }
        await remove(dbRef(rtdb, `chat_requests/${user.uid}/${targetUid}`));
      }
      setConnectionStatus('accepted');
    } catch (err: any) {
      console.error(err);
      alert("Failed to accept request: " + (err.message || "Unknown error"));
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleRemoveConnection = async () => {
    if (!user?.uid || !targetUid || isMe || requestActionLoading) return;
    
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      setTimeout(() => {
        setConfirmDisconnect(false);
      }, 4000);
      return;
    }
    
    setRequestActionLoading(true);
    try {
      // Try atomic removal first
      try {
        const updates: any = {};
        updates[`connections/${user.uid}/${targetUid}`] = null;
        updates[`connections/${targetUid}/${user.uid}`] = null;
        await dbUpdate(dbRef(rtdb), updates);
      } catch (atomicErr) {
        console.warn("Atomic removal failed, trying individual nodes:", atomicErr);
        await remove(dbRef(rtdb, `connections/${user.uid}/${targetUid}`));
        try {
          await remove(dbRef(rtdb, `connections/${targetUid}/${user.uid}`));
        } catch (e) {}
      }

      // Also clean up lingering requests
      try {
        await remove(dbRef(rtdb, `chat_requests/${user.uid}/${targetUid}`));
      } catch (e) {}
      try {
        await remove(dbRef(rtdb, `chat_requests/${targetUid}/${user.uid}`));
      } catch (e) {}

      setConnectionStatus('none');
      setConfirmDisconnect(false);
    } catch (err: any) {
      console.error("Error removing connection:", err);
      alert("Failed to remove connection: " + (err.message || "Unknown error"));
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!user?.uid || !targetUid || isMe || requestActionLoading) return;
    setRequestActionLoading(true);
    try {
      await remove(dbRef(rtdb, `chat_requests/${user.uid}/${targetUid}`));
      setConnectionStatus('none');
    } catch (err) {
      console.error("Error declining request:", err);
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
    const bgChanged = chatBgColor !== (profileUser?.chatBgColor || 'default');

    if (!nameChanged && !photoChanged && !bgChanged) {
      setIsEditing(false);
      return;
    }
    
    setUpdateLoading(true);
    try {
      const finalName = newName.trim() || user.displayName;
      const finalPhoto = photoURL.trim() || null;
      if (auth.currentUser && (nameChanged || photoChanged)) {
        await updateProfile(auth.currentUser, { 
          displayName: finalName,
          photoURL: finalPhoto
        });
      }
      // Synchronize to Firebase Realtime Database
      try {
        await dbUpdate(dbRef(rtdb, `users/${user.uid}`), {
          displayName: finalName,
          photoURL: finalPhoto || '',
          chatBgColor: chatBgColor
        });
      } catch (dbErr) {
        console.warn("Could not sync profile update to presence database database", dbErr);
      }
      setIsEditing(false);
      setProfileUser((prev: any) => prev ? { ...prev, displayName: finalName, photoURL: finalPhoto || '', chatBgColor } : null);
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
                <label className="text-xs font-medium text-neutral-550 w-full text-left font-semibold">Profile Image Selection</label>
                
                {/* Avatar Gallery Selector Grid */}
                <div className="w-full text-left bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 mb-2">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">Gallery Presets (Click to choose)</span>
                  <div className="grid grid-cols-5 gap-1.5 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin">
                    {AVATAR_GALLERY.map((avatar, idx) => {
                      const isSelected = photoURL === avatar.url;
                      return (
                        <button
                          key={avatar.url}
                          type="button"
                          onClick={() => setPhotoURL(avatar.url)}
                          className={`w-9 h-9 rounded-full overflow-hidden border transition-all relative shrink-0 active:scale-95 hover:brightness-95 ${
                            isSelected 
                              ? 'border-indigo-600 ring-2 ring-indigo-200 ring-offset-1 scale-105' 
                              : 'border-neutral-200'
                          }`}
                          title={avatar.label}
                        >
                          <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <input
                  type="text"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="Custom image URL"
                  className="border border-neutral-200 rounded px-3 py-1.5 text-sm w-full text-center focus:outline-none focus:ring-2 focus:ring-neutral-900 mb-1"
                  disabled={updateLoading || uploadingImage}
                />
                
                <label className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-neutral-750 text-xs px-3 py-1.5 rounded transition-all w-full text-center border border-neutral-200">
                  {uploadingImage ? 'Uploading...' : 'Upload custom file'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                    disabled={updateLoading || uploadingImage}
                  />
                </label>
              </div>

              {/* Chat Background Custom Selector */}
              <div className="w-full text-left mt-2 border-t border-neutral-150 pt-2.5">
                <label className="text-xs font-semibold text-neutral-600 block mb-1.5">Chat Background Theme</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CHAT_BG_PRESETS.map((preset) => {
                    const isSelected = chatBgColor === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setChatBgColor(preset.id)}
                        className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all text-center group active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-100'
                            : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border border-neutral-350 shadow-inner mb-0.5 ${preset.id === 'default' ? 'bg-[#f5f5f5]' : preset.id === 'dark' ? 'bg-[#18181b]' : preset.bgClass}`} />
                        <span className={`text-[9px] font-semibold tracking-tight truncate w-full ${isSelected ? 'text-indigo-600 font-bold' : 'text-neutral-500'}`}>
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
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
                  className="w-full flex items-center justify-center px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-neutral-200 active:scale-95 disabled:bg-neutral-400"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {requestActionLoading ? 'Sending...' : 'Add Author'}
                </button>
              )}
              {connectionStatus === 'pending' && (
                <button
                  onClick={handleCancelRequest}
                  disabled={requestActionLoading}
                  className="w-full flex items-center justify-center px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-sm border border-rose-100 transition-all active:scale-95"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {requestActionLoading ? 'Cancelling...' : 'Cancel Request'}
                </button>
              )}
              {connectionStatus === 'received' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAcceptRequest}
                    disabled={requestActionLoading}
                    className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {requestActionLoading ? '...' : 'Accept'}
                  </button>
                  <button
                    onClick={handleDeclineRequest}
                    disabled={requestActionLoading}
                    className="flex items-center justify-center px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-500 font-semibold rounded-xl text-sm border border-neutral-200 transition-all active:scale-95"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {requestActionLoading ? '...' : 'Decline'}
                  </button>
                </div>
              )}
              {connectionStatus === 'accepted' && (
                <div className="space-y-2">
                  <Link
                    to={`/chat?userId=${targetUid}`}
                    className="w-full flex items-center justify-center px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-sm border border-indigo-200 transition-all active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Continue Chat
                  </Link>
                  <button
                    onClick={handleRemoveConnection}
                    disabled={requestActionLoading}
                    className={`w-full flex items-center justify-center px-6 py-2 rounded-xl text-[11px] uppercase tracking-wider font-bold transition-all border ${
                      confirmDisconnect 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 animate-pulse'
                        : 'bg-white hover:bg-neutral-50 text-neutral-400 hover:text-rose-500 border-transparent hover:border-rose-100'
                    }`}
                  >
                    <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                    {requestActionLoading ? 'Processing...' : confirmDisconnect ? 'Click again to confirm' : 'Remove Connection'}
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="pt-6 border-t border-neutral-100 text-left space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 flex items-center"><FileText className="w-4 h-4 mr-2"/> Stories Published</span>
              <span className="font-semibold text-neutral-900">{loading ? '-' : posts.length}</span>
            </div>
            {isMe && (
              <div className="flex items-center justify-between text-sm border-t border-neutral-100 pt-3">
                <span className="text-neutral-500 flex items-center">
                  <div className={`w-3.5 h-3.5 rounded-full border border-neutral-350 mr-2 ${
                    chatBgColor === 'default' ? 'bg-[#f5f5f5]' :
                    chatBgColor === 'dark' ? 'bg-[#18181b]' :
                    CHAT_BG_PRESETS.find(p => p.id === chatBgColor)?.bgClass || 'bg-neutral-100'
                  }`} />
                  Chat Backdrop Style
                </span>
                <span className="font-semibold text-neutral-900 capitalize">
                  {CHAT_BG_PRESETS.find(p => p.id === chatBgColor)?.name || 'Default'}
                </span>
              </div>
            )}
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
