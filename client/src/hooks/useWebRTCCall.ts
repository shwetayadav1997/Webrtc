import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { socketService } from '../services/socketService';
import { webRTCService } from '../services/webRTCService';
import { User, PeerConnection, ChatMessage } from '../types';

export const useWebRTCCall = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userId] = useState<string>(uuidv4().substring(0, 9));
  const [username, setUsername] = useState<string>('');
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [participants, setParticipants] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isInCall, setIsInCall] = useState<boolean>(false);
  
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  const addChatMessage = useCallback((message: string, type: 'user' | 'system', senderUsername?: string) => {
    const chatMessage: ChatMessage = {
      id: uuidv4(),
      message,
      username: senderUsername || 'System',
      timestamp: new Date(),
      type
    };
    setChatMessages(prev => [...prev, chatMessage]);
  }, []);

  const removePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(peerId);
        return newPeers;
      });
      peersRef.current.delete(peerId);
    }
    
    setParticipants(prev => prev.filter(p => p.userId !== peerId));
  }, []);

  const createPeerConnection = useCallback(async (peerId: string, peerUsername: string, isInitiator: boolean) => {
    const peerConnection = webRTCService.createPeerConnection();
    
    // Add local stream tracks
    if (localStream) {
      webRTCService.addTracksToPeerConnection(peerConnection, localStream);
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      // This will be handled in the component
      const customEvent = new CustomEvent('remote-stream', {
        detail: { userId: peerId, username: peerUsername, stream: remoteStream }
      });
      window.dispatchEvent(customEvent);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', event.candidate, peerId);
      }
    };

    const peer: PeerConnection = {
      connection: peerConnection,
      username: peerUsername,
      isVideoEnabled: true,
      isAudioEnabled: true
    };

    setPeers(prev => new Map(prev).set(peerId, peer));
    peersRef.current.set(peerId, peer);

    // Create offer if initiator
    if (isInitiator && socket) {
      const offer = await webRTCService.createOffer(peerConnection);
      socket.emit('offer', offer, peerId);
    }
  }, [localStream, socket]);

  // Initialize socket connection
  useEffect(() => {
    const socketConnection = socketService.connect();
    setSocket(socketConnection);

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleUserConnected = (userId: string, username: string) => {
      console.log(`User ${username} connected`);
      addChatMessage(`${username} joined the call`, 'system');
      createPeerConnection(userId, username, true);
    };

    const handleUserDisconnected = (userId: string) => {
      console.log(`User ${userId} disconnected`);
      removePeer(userId);
    };

    const handleRoomUsers = (users: User[], screenSharer: string | null) => {
      console.log('Room users:', users);
      setParticipants(users);
      users.forEach(user => {
        if (user.userId !== userId) {
          createPeerConnection(user.userId, user.username, false);
        }
      });
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit, senderId: string) => {
      console.log('Received offer from:', senderId);
      const peer = peersRef.current.get(senderId);
      if (peer) {
        await webRTCService.handleOffer(peer.connection, offer);
        const answer = await webRTCService.createAnswer(peer.connection);
        socket.emit('answer', answer, senderId);
      }
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit, senderId: string) => {
      console.log('Received answer from:', senderId);
      const peer = peersRef.current.get(senderId);
      if (peer) {
        await webRTCService.handleAnswer(peer.connection, answer);
      }
    };

    const handleIceCandidate = async (candidate: RTCIceCandidateInit, senderId: string) => {
      const peer = peersRef.current.get(senderId);
      if (peer) {
        await webRTCService.addIceCandidate(peer.connection, candidate);
      }
    };

    const handleUserVideoToggle = (userId: string, isEnabled: boolean) => {
      setParticipants(prev => 
        prev.map(p => p.userId === userId ? { ...p, isVideoEnabled: isEnabled } : p)
      );
    };

    const handleUserAudioToggle = (userId: string, isEnabled: boolean) => {
      setParticipants(prev => 
        prev.map(p => p.userId === userId ? { ...p, isAudioEnabled: isEnabled } : p)
      );
    };

    const handleScreenShareError = (message: string) => {
      alert(message);
    };

    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('room-users', handleRoomUsers);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-video-toggle', handleUserVideoToggle);
    socket.on('user-audio-toggle', handleUserAudioToggle);
    socket.on('screen-share-error', handleScreenShareError);

    return () => {
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('room-users', handleRoomUsers);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-video-toggle', handleUserVideoToggle);
      socket.off('user-audio-toggle', handleUserAudioToggle);
      socket.off('screen-share-error', handleScreenShareError);
    };
  }, [socket, userId, addChatMessage, createPeerConnection, removePeer]);

  const initializeMedia = useCallback(async () => {
    try {
      const stream = await webRTCService.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  const joinRoom = useCallback(async (roomIdInput: string, usernameInput: string) => {
    if (!socket) return;

    setUsername(usernameInput);
    const finalRoomId = roomIdInput || uuidv4().substring(0, 9).toUpperCase();
    setRoomId(finalRoomId);

    try {
      await initializeMedia();
      socket.emit('join-room', finalRoomId, userId, usernameInput);
      setIsInCall(true);
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }, [socket, userId, initializeMedia]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
        if (socket) {
          socket.emit('toggle-video', !isVideoEnabled);
        }
      }
    }
  }, [localStream, isVideoEnabled, socket]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
        if (socket) {
          socket.emit('toggle-audio', !isAudioEnabled);
        }
      }
    }
  }, [localStream, isAudioEnabled, socket]);

  const stopScreenShare = useCallback(async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    // Replace with camera stream
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      
      peersRef.current.forEach(async (peer) => {
        if (videoTrack) {
          await webRTCService.replaceVideoTrack(peer.connection, videoTrack);
        }
      });
    }

    setIsScreenSharing(false);
    if (socket) {
      socket.emit('stop-screen-share');
    }
  }, [screenStream, localStream, socket]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await webRTCService.getDisplayMedia({
        video: true,
        audio: true
      });
      setScreenStream(stream);

      // Replace video track in all peer connections
      const videoTrack = stream.getVideoTracks()[0];
      
      peersRef.current.forEach(async (peer) => {
        await webRTCService.replaceVideoTrack(peer.connection, videoTrack);
      });

      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);
      if (socket) {
        socket.emit('start-screen-share');
      }
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }, [socket, stopScreenShare]);

  const leaveCall = useCallback(() => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    // Close all peer connections
    peersRef.current.forEach(peer => peer.connection.close());
    setPeers(new Map());
    peersRef.current.clear();

    // Reset state
    setRoomId(null);
    setIsInCall(false);
    setParticipants([]);
    setChatMessages([]);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);

    // Disconnect and reconnect socket
    socketService.disconnect();
    const newSocket = socketService.connect();
    setSocket(newSocket);
  }, [localStream, screenStream]);

  return {
    // State
    socket,
    localStream,
    screenStream,
    peers,
    roomId,
    userId,
    username,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    participants,
    chatMessages,
    isInCall,
    
    // Actions
    joinRoom,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    leaveCall,
    addChatMessage
  };
};
