export interface User {
  userId: string;
  username: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

export interface PeerConnection {
  connection: RTCPeerConnection;
  username: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  message: string;
  username: string;
  timestamp: Date;
  type: 'user' | 'system';
}

export interface RoomState {
  roomId: string | null;
  users: User[];
  screenSharer: string | null;
}
