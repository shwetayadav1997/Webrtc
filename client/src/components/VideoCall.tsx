import React, { useState } from 'react';
import { User, ChatMessage } from '../types';
import { VideoGrid } from './VideoGrid';
import { Controls } from './Controls';
import { Chat } from './Chat';
import { Header } from './Header';
import { Whiteboard } from './Whiteboard';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  socket: Socket | null;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  peers: Map<string, any>;
  roomId: string | null;
  userId: string;
  username: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  participants: User[];
  chatMessages: ChatMessage[];
  toggleVideo: () => void;
  toggleAudio: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  leaveCall: () => void;
  addChatMessage: (message: string, type: 'user' | 'system', username?: string) => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({
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
  toggleVideo,
  toggleAudio,
  startScreenShare,
  stopScreenShare,
  leaveCall,
  addChatMessage
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const toggleWhiteboard = () => {
    setIsWhiteboardOpen(!isWhiteboardOpen);
  };

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch (error) {
      console.error('Error with screen share:', error);
      alert('Error with screen sharing. Please try again.');
    }
  };

  const sendChatMessage = (message: string) => {
    addChatMessage(message, 'user', username);
    // Here you would emit the message to other users via socket
  };

  return (
    <div className="video-call">
      <Header 
        roomId={roomId}
        participantCount={participants.length + 1}
        onLeaveCall={leaveCall}
      />
      
      <VideoGrid 
        localStream={localStream}
        screenStream={screenStream}
        peers={peers}
        userId={userId}
        username={username}
        participants={participants}
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
      />
      
      <Controls 
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        isScreenSharing={isScreenSharing}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onScreenShare={handleScreenShare}
        onToggleChat={toggleChat}
        onToggleWhiteboard={toggleWhiteboard}
      />
      
      {isChatOpen && (
        <Chat 
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          onClose={toggleChat}
        />
      )}
      
      {isWhiteboardOpen && (
        <Whiteboard 
          socket={socket}
          roomId={roomId}
          isVisible={isWhiteboardOpen}
          onClose={toggleWhiteboard}
        />
      )}
    </div>
  );
};
