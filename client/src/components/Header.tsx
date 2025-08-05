import React from 'react';

interface HeaderProps {
  roomId: string | null;
  participantCount: number;
  onLeaveCall: () => void;
}

export const Header: React.FC<HeaderProps> = ({ roomId, participantCount, onLeaveCall }) => {
  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId).then(() => {
        alert('Room ID copied to clipboard!');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = roomId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Room ID copied to clipboard!');
      });
    }
  };

  return (
    <div className="header">
      <div className="room-info">
        <span id="current-room-id">Room: {roomId}</span>
        <button onClick={copyRoomId} title="Copy room ID" className="copy-btn">
          📋
        </button>
      </div>
      <div className="participant-count">
        <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
      </div>
      <button onClick={onLeaveCall} className="leave-btn">
        Leave Call
      </button>
    </div>
  );
};
