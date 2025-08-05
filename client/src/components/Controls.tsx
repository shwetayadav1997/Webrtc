import React from 'react';

interface ControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onScreenShare: () => void;
  onToggleChat: () => void;
  onToggleWhiteboard: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  onToggleVideo,
  onToggleAudio,
  onScreenShare,
  onToggleChat,
  onToggleWhiteboard
}) => {
  return (
    <div className="controls">
      <button
        onClick={onToggleVideo}
        className={`control-btn ${isVideoEnabled ? 'video-on' : 'video-off'}`}
        title="Toggle Video"
      >
        🎥
      </button>
      
      <button
        onClick={onToggleAudio}
        className={`control-btn ${isAudioEnabled ? 'audio-on' : 'audio-off'}`}
        title="Toggle Audio"
      >
        🎤
      </button>
      
      <button
        onClick={onScreenShare}
        className={`control-btn ${isScreenSharing ? 'screen-sharing' : ''}`}
        title="Share Screen"
      >
        🖥️
      </button>
      
      <button
        onClick={onToggleChat}
        className="control-btn"
        title="Toggle Chat"
      >
        💬
      </button>
      
      <button
        onClick={onToggleWhiteboard}
        className="control-btn"
        title="Toggle Whiteboard"
      >
        📝
      </button>
    </div>
  );
};
