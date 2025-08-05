import React, { useState } from 'react';

interface RoomSelectionProps {
  onJoinRoom: (roomId: string, username: string) => Promise<void>;
}

export const RoomSelection: React.FC<RoomSelectionProps> = ({ onJoinRoom }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  const generateRoomId = () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const handleJoinRoom = async () => {
    if (!username.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      await onJoinRoom(roomId, username);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Error accessing camera/microphone. Please check permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const newRoomId = generateRoomId();
      await onJoinRoom(newRoomId, username);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Error accessing camera/microphone. Please check permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  return (
    <div className="room-selection">
      <div className="container">
        <div className="form-container">
          <h1>Join Video Call</h1>
          <div className="input-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              required
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>
          <div className="input-group">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID (optional)"
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>
          <div className="button-group">
            <button 
              onClick={handleJoinRoom}
              disabled={loading}
              className="join-room-btn"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
            <button 
              onClick={handleCreateRoom}
              disabled={loading}
              className="create-room-btn"
            >
              {loading ? 'Creating...' : 'Create New Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
