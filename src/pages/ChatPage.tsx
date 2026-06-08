import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ref, 
  onValue, 
  push, 
  set, 
  remove, 
  update, 
  serverTimestamp as rtdbServerTimestamp 
} from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { 
  Send, 
  Smile, 
  Users, 
  User, 
  MessagesSquare, 
  MessageSquare,
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Lock, 
  Unlock, 
  Search, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Check, 
  X, 
  SmilePlus, 
  AlertCircle 
} from 'lucide-react';

// Categorized search library for emojis
const EMOJI_LIBRARY = [
  // Smilies & Feelings
  { char: '😀', category: 'Smileys', keywords: 'smile happy laugh face' },
  { char: '😂', category: 'Smileys', keywords: 'joy laugh tear crying face' },
  { char: '🤣', category: 'Smileys', keywords: 'rofl laugh face' },
  { char: '😊', category: 'Smileys', keywords: 'smile blush happy face' },
  { char: '😍', category: 'Smileys', keywords: 'love heart eyes beautiful face' },
  { char: '🥰', category: 'Smileys', keywords: 'hearts love warm adore face' },
  { char: '😘', category: 'Smileys', keywords: 'blow kiss wink love' },
  { char: '😜', category: 'Smileys', keywords: 'tongue wink silly poke' },
  { char: '😎', category: 'Smileys', keywords: 'cool sunglasses style' },
  { char: '🤔', category: 'Smileys', keywords: 'think wonder question' },
  { char: '🙄', category: 'Smileys', keywords: 'eye roll scroll look' },
  { char: '😴', category: 'Smileys', keywords: 'sleep tired zzz' },
  { char: '😭', category: 'Smileys', keywords: 'cry sad sob tear' },
  { char: '😡', category: 'Smileys', keywords: 'angry mad red' },
  { char: '🤯', category: 'Smileys', keywords: 'mind blown explode' },
  { char: '🥳', category: 'Smileys', keywords: 'party celebrate horn hat' },

  // Gestures & Actions
  { char: '👍', category: 'Gestures', keywords: 'thumbs up like agree ok' },
  { char: '👎', category: 'Gestures', keywords: 'thumbs down dislike no' },
  { char: '👊', category: 'Gestures', keywords: 'fist bump punch hit' },
  { char: '✌️', category: 'Gestures', keywords: 'peace victory sign' },
  { char: '🤞', category: 'Gestures', keywords: 'fingers crossed luck' },
  { char: '👌', category: 'Gestures', keywords: 'ok fine good' },
  { char: '👋', category: 'Gestures', keywords: 'wave hello greet bye' },
  { char: '🙌', category: 'Gestures', keywords: 'celebrate hands high five' },
  { char: '👏', category: 'Gestures', keywords: 'applause clap bravo' },
  { char: '🙏', category: 'Gestures', keywords: 'pray please thank high five' },

  // Sparkles & Hearts
  { char: '❤️', category: 'Symbols', keywords: 'heart love red' },
  { char: '💖', category: 'Symbols', keywords: 'sparkle heart love pink' },
  { char: '💔', category: 'Symbols', keywords: 'broken heart sad end' },
  { char: '✨', category: 'Symbols', keywords: 'sparkles stars shine magic' },
  { char: '🔥', category: 'Symbols', keywords: 'fire hot lit burn' },
  { char: '💯', category: 'Symbols', keywords: '100 perfect full grade' },
  { char: '💡', category: 'Symbols', keywords: 'idea lightbulb yellow brain' },
  { char: '🌟', category: 'Symbols', keywords: 'star gold shine' },
  { char: '🎉', category: 'Symbols', keywords: 'popper party celebrate' },
  { char: '🚀', category: 'Symbols', keywords: 'rocket fast space launch' },
  { char: '🎈', category: 'Symbols', keywords: 'balloon party light red' },
  { char: '💻', category: 'Symbols', keywords: 'computer laptop tech screen' }
];

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '💡'];

export default function ChatPage({ user }: { user: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeEmojiTab, setActiveEmojiTab] = useState<'All' | 'Smileys' | 'Gestures' | 'Symbols'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectUserParam = searchParams.get('userId');

  const [activeChat, setActiveChat] = useState<'global' | string>('global');
  const [usersInfo, setUsersInfo] = useState<any[]>([]);
  const [userSearchText, setUserSearchText] = useState('');

  // Handle load-time search params parameter for selecting specific user
  useEffect(() => {
    if (selectUserParam) {
      setActiveChat(selectUserParam);
      // Clean up search parameters to allow user to switch chats normally
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('userId');
      setSearchParams(newParams, { replace: true });
    }
  }, [selectUserParam, setSearchParams, searchParams]);

  // Blocking features
  const [blockedUsers, setBlockedUsers] = useState<Record<string, boolean>>({});

  // Calling features
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [outgoingCall, setOutgoingCall] = useState<any>(null);
  const [callActive, setCallActive] = useState(false);
  const [callMuted, setCallMuted] = useState(false);
  const [callSpeakerActive, setCallSpeakerActive] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Microphone audio visualizer refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Render variables for timing out users presence (within 5 minutes = online)
  const isUserOnline = (lastSeen: number) => {
    if (!lastSeen) return false;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    return Date.now() - lastSeen < FIVE_MINUTES_MS;
  };

  // 1. Fetch available users
  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const usersList = Object.values(data).filter((u: any) => u.uid !== user.uid) as any[];
        setUsersInfo(usersList);
      } else {
        setUsersInfo([]);
      }
    });

    return () => unsubscribeUsers();
  }, [user.uid]);

  // 2. Fetch my blocks
  useEffect(() => {
    const blocksRef = ref(rtdb, `blocks/${user.uid}`);
    const unsubscribeBlocks = onValue(blocksRef, (snapshot) => {
      if (snapshot.exists()) {
        setBlockedUsers(snapshot.val());
      } else {
        setBlockedUsers({});
      }
    });

    return () => unsubscribeBlocks();
  }, [user.uid]);

  // 3. Listen for incoming calls to me
  useEffect(() => {
    const callRef = ref(rtdb, `calls/${user.uid}`);
    const unsubscribeCall = onValue(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.status === 'ringing') {
          setIncomingCall(data);
          setCallActive(false);
        } else if (data.status === 'connected') {
          setIncomingCall(data);
          setCallActive(true);
        } else if (data.status === 'ended') {
          setIncomingCall(null);
          setCallActive(false);
          stopVoiceWaveform();
        }
      } else {
        setIncomingCall(null);
        setCallActive(false);
        stopVoiceWaveform();
      }
    });

    return () => {
      unsubscribeCall();
      stopVoiceWaveform();
    };
  }, [user.uid]);

  // 4. Track Call Duration timer
  useEffect(() => {
    let timerId: any;
    if (callActive) {
      setCallDuration(0);
      timerId = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timerId);
  }, [callActive]);

  // 5. Setup Live Voice Waveform Visualizer
  const startVoiceWaveform = async () => {
    // Make sure old streams are cleared first
    stopVoiceWaveform();

    try {
      // Audio permission is requested
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
        throw new Error("Local mic blocks or not granted: " + err.message);
      });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // small buffer for high responsiveness
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, width, height);

        // Circular or linear futuristic sound visualizer
        const barWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const value = dataArray[i];
          const percent = value / 255;
          const barHeight = percent * height * 0.85;

          // Multi-color beautiful gradient bars
          ctx.fillStyle = `rgba(99, 102, 241, ${0.45 + percent * 0.55})`; // Indigo glowing accent
          ctx.beginPath();
          ctx.roundRect(x + 1, (height - barHeight) / 2, barWidth - 2, barHeight, 2);
          ctx.fill();

          x += barWidth;
        }

        animationFrameIdRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err) {
      console.warn("Waveform audio capture simulation mode active:", err);
      // Fallback fallback: Generate elegant moving synthetic soundwaves
      let angle = 0;
      const drawMock = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';

        for (let x = 0; x < width; x++) {
          // Beautiful sine curves intersecting
          const y = height / 2 + Math.sin(x * 0.08 + angle) * (height / 3 * Math.sin(angle * 0.5 + 1.2));
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        angle += 0.08;
        animationFrameIdRef.current = requestAnimationFrame(drawMock);
      };
      drawMock();
    }
  };

  const stopVoiceWaveform = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  // Initiate call to receiver user
  const handleInitiateCall = async () => {
    if (activeChat === 'global') return;
    const receiverUser = usersInfo.find(u => u.uid === activeChat);
    if (!receiverUser) return;

    const callPayload = {
      id: `${user.uid}_${activeChat}`,
      callerId: user.uid,
      callerName: user.displayName || user.email?.split('@')[0] || 'Author',
      callerPhoto: user.photoURL || '',
      receiverId: activeChat,
      receiverName: receiverUser.displayName || 'Author',
      receiverPhoto: receiverUser.photoURL || '',
      status: 'ringing',
      timestamp: Date.now()
    };

    setOutgoingCall(callPayload);

    // Setup receiver's call node
    await set(ref(rtdb, `calls/${activeChat}`), callPayload);

    // Watch status of outgoing call node
    const receiverCallRef = ref(rtdb, `calls/${activeChat}`);
    let calledBefore = false;

    const cleanupWatcher = onValue(receiverCallRef, (snapshot) => {
      if (snapshot.exists()) {
        const currentData = snapshot.val();
        setOutgoingCall(currentData);

        if (currentData.status === 'connected') {
          if (!calledBefore) {
            calledBefore = true;
            setCallActive(true);
            startVoiceWaveform();
          }
        } else if (currentData.status === 'ended') {
          setOutgoingCall(null);
          setCallActive(false);
          stopVoiceWaveform();
          remove(receiverCallRef);
          cleanupWatcher();
        }
      } else {
        // Declined or ended
        setOutgoingCall(null);
        setCallActive(false);
        stopVoiceWaveform();
        cleanupWatcher();
      }
    });
  };

  // Accept incoming call
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;
    const callPath = ref(rtdb, `calls/${user.uid}`);
    await update(callPath, { status: 'connected' });
    setCallActive(true);
    startVoiceWaveform();
  };

  // Decline/End call
  const handleEndCall = async () => {
    if (incomingCall) {
      // Receiver ends/declines call
      const callPath = ref(rtdb, `calls/${user.uid}`);
      await update(callPath, { status: 'ended' });
      await remove(callPath);
      setIncomingCall(null);
    } else if (outgoingCall) {
      // Caller ends/declines call
      const callPath = ref(rtdb, `calls/${outgoingCall.receiverId}`);
      await update(callPath, { status: 'ended' });
      await remove(callPath);
      setOutgoingCall(null);
    }
    setCallActive(false);
    stopVoiceWaveform();
  };

  // Toggle Block/Unblock
  const handleToggleBlock = async (targetUserId: string) => {
    const isBlocked = !!blockedUsers[targetUserId];
    const blockRef = ref(rtdb, `blocks/${user.uid}/${targetUserId}`);
    if (isBlocked) {
      await remove(blockRef);
    } else {
      await set(blockRef, true);
    }
  };

  // 6. Fetch messages based on activeChat selection
  useEffect(() => {
    setLoading(true);
    let messagesNode = 'messages';
    if (activeChat !== 'global') {
      const ids = [user.uid, activeChat].sort();
      messagesNode = `direct_messages/${ids[0]}_${ids[1]}`;
    }

    const messagesRef = ref(rtdb, messagesNode);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      setLoading(false);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const msgs = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setMessages([]);
      }
    }, (err) => {
      console.error(err);
      if (err.message.includes('PERMISSION_DENIED')) {
         setError("Database Security Rules Error: You do not have permission to read these messages.");
      } else {
         setError(err.message);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeChat, user.uid]);

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    let messagesNode = 'messages';
    if (activeChat !== 'global') {
      const ids = [user.uid, activeChat].sort();
      messagesNode = `direct_messages/${ids[0]}_${ids[1]}`;
    }

    try {
      await push(ref(rtdb, messagesNode), {
        text: newMessage.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        authorPhoto: user.photoURL || '',
        timestamp: rtdbServerTimestamp()
      });
      setNewMessage('');
      setShowEmojis(false);
      setEmojiSearch('');
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('PERMISSION_DENIED')) {
         setError("Database Security Rules Error: You do not have permission to send messages here.");
      } else {
         setError(err.message);
      }
    }
  };

  // Quick or emoji picker insert
  const insertEmoji = (emojiChar: string) => {
    setNewMessage(prev => prev + emojiChar);
  };

  // Toggle quick reactions on any message
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    let messagesNode = 'messages';
    if (activeChat !== 'global') {
      const ids = [user.uid, activeChat].sort();
      messagesNode = `direct_messages/${ids[0]}_${ids[1]}`;
    }

    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const emojiClean = emoji.trim();
    // Path inside reactions for user
    const hasReacted = msg.reactions?.[emojiClean]?.[user.uid];
    const reactionUserRef = ref(rtdb, `${messagesNode}/${msgId}/reactions/${emojiClean}/${user.uid}`);

    if (hasReacted) {
      await remove(reactionUserRef);
    } else {
      await set(reactionUserRef, user.displayName || 'Authorized Client');
    }
  };

  // Delete option on messages sent by user
  const handleDeleteMessage = async (msgId: string) => {
    let messagesNode = 'messages';
    if (activeChat !== 'global') {
      const ids = [user.uid, activeChat].sort();
      messagesNode = `direct_messages/${ids[0]}_${ids[1]}`;
    }
    
    try {
      await remove(ref(rtdb, `${messagesNode}/${msgId}`));
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  // Memoized filter of emojis based on tab & search text
  const filteredEmojis = useMemo(() => {
    return EMOJI_LIBRARY.filter(item => {
      const categoryMatch = activeEmojiTab === 'All' || item.category === activeEmojiTab;
      const searchMatch = !emojiSearch.trim() || 
        item.char.includes(emojiSearch) || 
        item.keywords.toLowerCase().includes(emojiSearch.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [activeEmojiTab, emojiSearch]);

  // Direct conversations lists (all except blocked vs simple search)
  const filteredUsers = useMemo(() => {
    return usersInfo.filter(u => {
      const textMatch = !userSearchText.trim() || u.displayName.toLowerCase().includes(userSearchText.toLowerCase());
      // Show everyone or matched with search
      return textMatch;
    });
  }, [usersInfo, userSearchText]);

  // Sort: online users first, then everyone else
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aOnline = isUserOnline(a.lastSeen);
      const bOnline = isUserOnline(b.lastSeen);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [filteredUsers]);

  const activeUserObj = usersInfo.find(u => u.uid === activeChat);
  const isSelectedChatBlocked = activeChat !== 'global' && !!blockedUsers[activeChat];

  return (
    <div id="unified-chat-root" className="max-w-6xl mx-auto h-[calc(100vh-140px)] bg-white text-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col md:flex-row relative font-sans">
      
      {/* 📞 INCOMING CALL OVERLAY PANEL */}
      {incomingCall && !callActive && (
        <div id="incoming-call-portal" className="absolute inset-0 bg-white/95 backdrop-blur-xl z-55 flex flex-col items-center justify-center p-6 text-center animate-fade-in animate-duration-300">
          <div className="relative mb-8">
            <span className="absolute inset-0 rounded-full bg-indigo-500/25 animate-ping" />
            <div className="w-28 h-28 rounded-full border-4 border-indigo-500 bg-neutral-100 text-neutral-600 overflow-hidden flex items-center justify-center relative shadow-2xl">
              {incomingCall.callerPhoto ? (
                <img src={incomingCall.callerPhoto} alt={incomingCall.callerName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-14 h-14 text-indigo-400" />
              )}
            </div>
          </div>
          
          <h3 className="text-2xl font-serif font-semibold text-neutral-900 tracking-wide mb-2 animate-pulse">{incomingCall.callerName}</h3>
          <p className="text-neutral-500 text-sm tracking-widest uppercase mb-10">Incoming audio call...</p>
          
          <div className="flex gap-6">
            <button
              onClick={handleEndCall}
              id="decline-incoming-btn"
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all text-white flex items-center justify-center shadow-lg shadow-rose-900/30 cursor-pointer"
              title="Decline call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={handleAcceptIncomingCall}
              id="accept-incoming-btn"
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all text-white flex items-center justify-center shadow-lg shadow-emerald-950/40 cursor-pointer animate-bounce"
              title="Accept call"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* 🎙️ OUTGOING RINGING CALL DIALOG */}
      {outgoingCall && !callActive && (
        <div id="outgoing-call-portal" className="absolute inset-0 bg-white/95 backdrop-blur-xl z-55 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-8">
            <span className="absolute inset-0 rounded-full bg-indigo-500/25 animate-ping" />
            <div className="w-28 h-28 rounded-full border-4 border-indigo-400 bg-neutral-100 text-neutral-600 overflow-hidden flex items-center justify-center relative shadow-2xl">
              {outgoingCall.receiverPhoto ? (
                <img src={outgoingCall.receiverPhoto} alt={outgoingCall.receiverName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-14 h-14 text-indigo-400" />
              )}
            </div>
          </div>
          
          <h3 className="text-2xl font-serif font-semibold text-neutral-900 tracking-wide mb-2">{outgoingCall.receiverName}</h3>
          <p className="text-indigo-600 text-sm tracking-wider uppercase mb-12 animate-pulse">Ringing...</p>
          
          <button
            onClick={handleEndCall}
            id="cancel-outgoing-btn"
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all text-white flex items-center justify-center shadow-xl cursor-pointer"
            title="Cancel Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Sidebar - Users List */}
      <div className="w-full md:w-80 border-r border-neutral-200 flex flex-col bg-neutral-50 shrink-0">
        
        {/* Chat List Header */}
        <div className="p-4 md:p-5 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-serif tracking-tight text-neutral-900 flex items-center">
              <MessagesSquare className="w-5 h-5 mr-2.5 text-indigo-500" />
              Direct Messages
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-[11px] font-semibold tracking-wider text-indigo-600 rounded-full uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Live Online
            </div>
          </div>

          {/* Search Contacts */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="user-search-input"
              value={userSearchText}
              onChange={(e) => setUserSearchText(e.target.value)}
              placeholder="Search people..."
              className="w-full bg-white text-sm py-2 pl-9 pr-4 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-neutral-900 placeholder-neutral-450"
            />
            {userSearchText && (
              <button onClick={() => setUserSearchText('')} className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-900">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Chats / Users Queue */}
        <div id="users-sidebar-scroll" className="flex-1 overflow-y-auto scrollbar-none p-2 space-y-1">
          {/* Global Group Chat */}
          <button
            onClick={() => setActiveChat('global')}
            id="chat-item-global"
            className={`w-full text-left px-3 py-3 rounded-xl flex items-center transition-all ${
              activeChat === 'global' 
                ? 'bg-indigo-50 text-indigo-950 border border-indigo-200/50' 
                : 'hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center mr-3 shrink-0 shadow-md relative">
              <Users className="w-5 h-5" />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow"></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm flex items-center justify-between ${activeChat === 'global' ? 'text-indigo-950' : 'text-neutral-800'}`}>
                <span>Community Chat</span>
              </div>
              <p className="text-xs text-neutral-500 truncate mt-0.5">Public bulletin group</p>
            </div>
          </button>

          {/* Divider */}
          <div className="px-3 pt-3 pb-1">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Active Authors</h3>
          </div>
          
          {sortedUsers.map((u) => {
            const hasBlockedThisUser = !!blockedUsers[u.uid];
            const isOnline = isUserOnline(u.lastSeen);

            return (
              <button
                key={u.uid}
                onClick={() => setActiveChat(u.uid)}
                id={`chat-item-${u.uid}`}
                className={`w-full text-left px-3 py-3 rounded-xl flex items-center transition-all ${
                  activeChat === u.uid 
                    ? 'bg-indigo-50 text-indigo-950 border border-indigo-200/50' 
                    : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-neutral-150 text-neutral-500 flex items-center justify-center mr-3 shrink-0 relative overflow-hidden border border-neutral-200">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-550/10 to-violet-550/10 flex items-center justify-center text-sm font-bold text-indigo-600">
                      {u.displayName?.trim().charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm flex items-center justify-between ${activeChat === u.uid ? 'text-indigo-950' : 'text-neutral-850'}`}>
                    <span className="truncate">{u.displayName}</span>
                    {hasBlockedThisUser && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 font-semibold rounded-md font-sans">Blocked</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </button>
            );
          })}
          
          {sortedUsers.length === 0 && (
            <div className="px-3 py-6 text-xs text-neutral-500 text-center">
              No matching writers found.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Header */}
        <div className="bg-white border-b border-neutral-200 p-4 flex items-center justify-between z-10 shrink-0 relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 relative overflow-hidden border border-neutral-200">
              {activeChat === 'global' ? (
                <div className="w-full h-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                  <Users className="w-5 h-5" />
                </div>
              ) : activeUserObj?.photoURL ? (
                <img src={activeUserObj.photoURL} alt={activeUserObj.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-50 text-indigo-600/80 flex items-center justify-center text-base font-bold">
                  {activeUserObj?.displayName?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
            </div>
            <div>
              <h1 id="active-chat-title" className="text-base md:text-lg font-serif font-bold text-neutral-900 flex items-center gap-2">
                {activeChat === 'global' ? 'Community Chat' : `${activeUserObj?.displayName}`}
              </h1>
              <p className="text-xs text-neutral-500">
                {activeChat === 'global' 
                  ? 'Connect with all authors and readers.' 
                  : isUserOnline(activeUserObj?.lastSeen) ? 'Online now' : 'Offline'
                }
              </p>
            </div>
          </div>

          {/* Action Call & Block Toolbar for private chat */}
          {activeChat !== 'global' && activeUserObj && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleInitiateCall}
                id="call-init-btn"
                disabled={isSelectedChatBlocked}
                className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all text-indigo-600 hover:text-indigo-750 cursor-pointer"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleToggleBlock(activeChat)}
                id="block-toggle-btn"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold select-none cursor-pointer transition-all ${
                  isSelectedChatBlocked 
                    ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-medium' 
                    : 'bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all font-medium'
                }`}
              >
                {isSelectedChatBlocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    Unblock
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Block
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 🎙️ ACTIVE VOICE CALL EQUALIZER BAR (Pulls down from header when Call connects) */}
        {callActive && (incomingCall || outgoingCall) && (
          <div id="active-call-equalizer" className="bg-indigo-50 border-b border-indigo-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 transition-all duration-300 animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute -inset-1 rounded-full bg-indigo-500/20 animate-ping"></span>
                <div className="w-10 h-10 rounded-full border border-indigo-300 bg-indigo-100 overflow-hidden flex items-center justify-center">
                  <Phone className="w-4 h-4 text-indigo-600 animate-pulse" />
                </div>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest animate-pulse">Connected Voice Call</p>
                <p className="text-sm font-semibold text-indigo-950 mt-0.5">
                  {incomingCall ? incomingCall.callerName : outgoingCall?.receiverName}
                </p>
              </div>
            </div>

            {/* Canvas Analyzer Display */}
            <div className="flex-1 max-w-[200px] h-10 bg-white hover:bg-neutral-50 border border-indigo-200 rounded-xl px-2.5 flex items-center justify-center relative overflow-hidden">
              <canvas 
                ref={canvasRef} 
                width={180} 
                height={35} 
                className="w-full h-full"
                title="Microphone Analyzer Wave"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Call Timer duration */}
              <div id="call-timer-ticker" className="bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs px-3 py-1.5 rounded-lg font-mono tracking-wider font-semibold">
                {formatTime(callDuration)}
              </div>
              
              <button
                onClick={() => setCallMuted(!callMuted)}
                id="toggle-mic-btn"
                className={`p-2 rounded-lg transition-all cursor-pointer ${callMuted ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-950 border border-neutral-200'}`}
                title={callMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {callMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setCallSpeakerActive(!callSpeakerActive)}
                id="toggle-speaker-btn"
                className={`p-2 rounded-lg transition-all cursor-pointer ${!callSpeakerActive ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-950 border border-neutral-200'}`}
                title="Toggle Speaker"
              >
                {callSpeakerActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={handleEndCall}
                id="end-call-btn"
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white uppercase tracking-widest cursor-pointer hover:shadow-lg transition-all flex items-center justify-center"
                title="End Call Connection"
              >
                <PhoneOff className="w-4 h-4 mr-1.5" /> Stop
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm shrink-0 flex items-center animate-fade-in">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-4 md:p-6 space-y-6 bg-neutral-50/50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-4 border-neutral-200 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 space-y-2">
              <MessageSquare className="w-10 h-10 text-neutral-305" />
              <p className="text-sm font-serif">Empty dialog queue. Be the first to start!</p>
            </div>
          ) : (
            // Filter messages: if we blocked them, do not show their messages in community chat too (or show clearly)
            messages.map((msg, index) => {
              const isMe = msg.authorId === user.uid;
              const isSenderBlocked = !!blockedUsers[msg.authorId];
              
              // Skip blocked messages in normal view
              if (isSenderBlocked) return null;

              const showAuthorInfo = index === 0 || messages[index - 1].authorId !== msg.authorId;

              return (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-3 group relative max-w-full ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* Photo of Author */}
                  <div className="w-8 h-8 rounded-full bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0 border border-neutral-200 mt-1">
                    {msg.authorPhoto ? (
                      <img src={msg.authorPhoto} alt={msg.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-neutral-500">
                        {msg.authorName?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className={`flex flex-col max-w-[70%] sm:max-w-[60%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {showAuthorInfo && (
                      <span className="text-[11px] font-semibold text-neutral-550 mb-1 px-1">
                        {isMe ? 'You' : msg.authorName}
                      </span>
                    )}
                    
                    {/* Message Bubble */}
                    <div className="relative leading-relaxed">
                      <div 
                        className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed break-words shadow-sm relative group/bubble select-text ${
                          isMe 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white text-neutral-900 rounded-tl-none border border-neutral-2/100 border-neutral-200'
                        }`}
                      >
                        {msg.text}

                        {/* HOVER HOVER CONTROLS TOOLBAR (Quick reactions & deletes) */}
                        <div 
                          className={`absolute bottom-full mb-1 flex items-center bg-white border border-neutral-200 rounded-full py-1 px-2.5 shadow-lg scale-90 opacity-0 pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto transition-all transform hover:scale-100 z-10 flex-row gap-1.5 ${
                            isMe ? 'right-0' : 'left-0'
                          }`}
                        >
                          {/* Quick standard reactions */}
                          {QUICK_REACTIONS.map(reaction => (
                            <button
                              key={reaction}
                              onClick={() => handleToggleReaction(msg.id, reaction)}
                              className="text-sm px-1.5 py-0.5 hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                            >
                              {reaction}
                            </button>
                          ))}
                          
                          {/* If Me: allow message deletion */}
                          {isMe && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded cursor-pointer transition-colors border-l border-neutral-200 ml-1.5 pl-1.5"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Displayed reactions line below bubble */}
                      {msg.reactions && (
                        <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(msg.reactions).map(([reaction, usersMap]: [string, any]) => {
                            const reactArray = Object.values(usersMap || {});
                            const count = reactArray.length;
                            if (count === 0) return null;
                            const hasMyReaction = !!usersMap[user.uid];

                            return (
                              <button
                                key={reaction}
                                onClick={() => handleToggleReaction(msg.id, reaction)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all cursor-pointer ${
                                  hasMyReaction 
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-600 font-medium' 
                                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50'
                                }`}
                                title={`Reacted by: ${reactArray.join(', ')}`}
                              >
                                <span>{reaction}</span>
                                <span className="font-bold text-[10px]">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="bg-white border-t border-neutral-200 p-4 shrink-0 relative">
          
          {/* Blocking Banner Cover */}
          {isSelectedChatBlocked ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-semibold text-rose-700">This User is Blocked</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Unblock to start direct lines of communication, view metadata, or connect audio dials.</p>
              </div>
              <button
                onClick={() => handleToggleBlock(activeChat)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer select-none transition-all"
              >
                Unblock Writer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex items-end gap-2 relative">
              
              <div className="relative">
                {/* Improved Emoji Picker Icon Button */}
                <button
                  type="button"
                  onClick={() => setShowEmojis(!showEmojis)}
                  className={`p-3 rounded-full transition-all shrink-0 cursor-pointer ${
                    showEmojis ? 'text-indigo-600 bg-neutral-100' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                  title="Emoji Store"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* 🌟 OVERHAULED CATEGORIZED & SEARCHABLE EMOJI DRAWER */}
                {showEmojis && (
                  <div id="emoji-picker-drawer" className="absolute bottom-full left-0 mb-3 bg-white border border-neutral-200 shadow-2xl rounded-2xl p-3.5 w-72 sm:w-80 z-20 flex flex-col text-neutral-900 animate-slide-up">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">Express Yourself</span>
                      <button 
                        type="button" 
                        onClick={() => { setShowEmojis(false); setEmojiSearch(''); }} 
                        className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-900 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Emoji Category Search Input */}
                    <div className="relative mb-3">
                      <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        placeholder="Search emoji (e.g. smile)..."
                        className="w-full bg-neutral-50 text-xs py-2 pl-8 pr-4 rounded-lg border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Tabs row */}
                    <div className="flex gap-1 border-b border-neutral-100 pb-2 mb-2 justify-between">
                      {['All', 'Smileys', 'Gestures', 'Symbols'].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => { setActiveEmojiTab(tab as any); }}
                          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded font-semibold transition-all cursor-pointer ${
                            activeEmojiTab === tab 
                              ? 'bg-indigo-50 border border-indigo-200 text-indigo-600' 
                              : 'text-neutral-400 hover:text-neutral-900'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Emojis Grid display */}
                    <div className="grid grid-cols-6 gap-1 h-44 overflow-y-auto scrollbar-none pr-1">
                      {filteredEmojis.map(emoji => (
                        <button
                          key={emoji.char}
                          type="button"
                          onClick={() => insertEmoji(emoji.char)}
                          className="text-xl hover:bg-neutral-100 p-1 rounded-lg transition-transform hover:scale-125 cursor-pointer flex items-center justify-center animate-fade-in"
                          title={emoji.keywords}
                        >
                          {emoji.char}
                        </button>
                      ))}
                      {filteredEmojis.length === 0 && (
                        <div className="col-span-6 flex flex-col justify-center items-center h-full text-neutral-450 text-xs">
                          No matching emojis
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Text Box */}
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder={activeChat === 'global' ? "Write message to global channel... (Press Enter to send)" : `Write direct message to ${activeUserObj?.displayName || 'Author'}...`}
                className="flex-1 max-h-32 min-h-[48px] bg-white text-neutral-900 placeholder-neutral-500 border border-neutral-200 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 resize-none text-[14px]"
                rows={1}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:opacity-45 text-white rounded-full transition-all shrink-0 mb-1 cursor-pointer hover:shadow shadow active:scale-95 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
