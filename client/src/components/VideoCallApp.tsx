import React from 'react';
import { useWebRTCCall } from '../hooks/useWebRTCCall';
import { RoomSelection } from './RoomSelection';
import { VideoCall } from './VideoCall';

export const VideoCallApp: React.FC = () => {
  const webRTCCall = useWebRTCCall();

  return (
    <div className="video-call-app">
      {!webRTCCall.isInCall ? (
        <RoomSelection onJoinRoom={webRTCCall.joinRoom} />
      ) : (
        <VideoCall 
          {...webRTCCall}
        />
      )}
    </div>
  );
};
// excalidraw react embedding