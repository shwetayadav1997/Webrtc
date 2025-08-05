import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';

interface VideoGridProps {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  peers: Map<string, any>;
  userId: string;
  username: string;
  participants: User[];
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

interface RemoteVideo {
  userId: string;
  username: string;
  stream: MediaStream;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  screenStream,
  peers,
  userId,
  username,
  participants,
  isVideoEnabled,
  isAudioEnabled
}) => {
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideo[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const isScreenSharing = screenStream !== null;

  // Handle local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = isScreenSharing ? screenStream : localStream;
    }
  }, [localStream, screenStream, isScreenSharing]);

  // Handle remote video streams
  useEffect(() => {
    const handleRemoteStream = (event: CustomEvent) => {
      const { userId: remoteUserId, username: remoteUsername, stream } = event.detail;
      
      setRemoteVideos(prev => {
        const existing = prev.find(v => v.userId === remoteUserId);
        if (existing) {
          return prev.map(v => 
            v.userId === remoteUserId 
              ? { ...v, stream }
              : v
          );
        } else {
          return [...prev, { userId: remoteUserId, username: remoteUsername, stream }];
        }
      });
    };

    window.addEventListener('remote-stream', handleRemoteStream as EventListener);
    
    return () => {
      window.removeEventListener('remote-stream', handleRemoteStream as EventListener);
    };
  }, []);

  // Clean up disconnected users
  useEffect(() => {
    setRemoteVideos(prev => 
      prev.filter(video => 
        participants.some(participant => participant.userId === video.userId)
      )
    );
  }, [participants]);

  const getParticipantInfo = (participantUserId: string) => {
    return participants.find(p => p.userId === participantUserId);
  };

  return (
    <div className="video-grid">
      {/* Local Video */}
      <div className="video-container local">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="video-element"
        />
        <div className="video-info">
          <span>{username} (You)</span>
          {!isVideoEnabled && <span className="status-indicator video-off" title="Video off"></span>}
          {!isAudioEnabled && <span className="status-indicator audio-off" title="Audio off"></span>}
        </div>
      </div>

      {/* Remote Videos */}
      {remoteVideos.map((remoteVideo) => {
        const participantInfo = getParticipantInfo(remoteVideo.userId);
        return (
          <RemoteVideoComponent
            key={remoteVideo.userId}
            stream={remoteVideo.stream}
            username={remoteVideo.username}
            isVideoEnabled={participantInfo?.isVideoEnabled ?? true}
            isAudioEnabled={participantInfo?.isAudioEnabled ?? true}
          />
        );
      })}
    </div>
  );
};

interface RemoteVideoComponentProps {
  stream: MediaStream;
  username: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

const RemoteVideoComponent: React.FC<RemoteVideoComponentProps> = ({
  stream,
  username,
  isVideoEnabled,
  isAudioEnabled
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
      />
      <div className="video-info">
        <span>{username}</span>
        {!isVideoEnabled && <span className="status-indicator video-off" title="Video off"></span>}
        {!isAudioEnabled && <span className="status-indicator audio-off" title="Audio off"></span>}
      </div>
    </div>
  );
};
