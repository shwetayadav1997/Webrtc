class WebRTCCall {
    constructor() {
        this.socket = io();
        this.localStream = null;
        this.screenStream = null;
        this.peers = new Map();
        this.roomId = null;
        this.userId = this.generateUserId();
        this.username = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.isScreenSharing = false;
        this.isChatOpen = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
    }

    generateUserId() {
        return Math.random().toString(36).substr(2, 9);
    }

    initializeElements() {
        // Room selection elements
        this.roomSelection = document.getElementById('room-selection');
        this.videoCall = document.getElementById('video-call');
        this.usernameInput = document.getElementById('username');
        this.roomIdInput = document.getElementById('room-id');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        this.createRoomBtn = document.getElementById('create-room-btn');

        // Video call elements
        this.videoGrid = document.getElementById('video-grid');
        this.currentRoomId = document.getElementById('current-room-id');
        this.participantCount = document.getElementById('participant-count');
        this.copyRoomIdBtn = document.getElementById('copy-room-id');
        this.leaveCallBtn = document.getElementById('leave-call');

        // Control elements
        this.toggleVideoBtn = document.getElementById('toggle-video');
        this.toggleAudioBtn = document.getElementById('toggle-audio');
        this.screenShareBtn = document.getElementById('screen-share');
        this.chatToggleBtn = document.getElementById('chat-toggle');

        // Screen share elements
        this.screenShareContainer = document.getElementById('screen-share-container');
        this.screenShareVideo = document.getElementById('screen-share-video');
        this.screenShareUsername = document.getElementById('screen-share-username');
        this.closeScreenShareBtn = document.getElementById('close-screen-share');

        // Chat elements
        this.chatPanel = document.getElementById('chat-panel');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendMessageBtn = document.getElementById('send-message');
        this.closeChatBtn = document.getElementById('close-chat');
    }

    setupEventListeners() {
        // Room selection
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.createRoomBtn.addEventListener('click', () => this.createRoom());

        // Controls
        this.toggleVideoBtn.addEventListener('click', () => this.toggleVideo());
        this.toggleAudioBtn.addEventListener('click', () => this.toggleAudio());
        this.screenShareBtn.addEventListener('click', () => this.toggleScreenShare());
        this.chatToggleBtn.addEventListener('click', () => this.toggleChat());

        // Utility
        this.copyRoomIdBtn.addEventListener('click', () => this.copyRoomId());
        this.leaveCallBtn.addEventListener('click', () => this.leaveCall());
        this.closeScreenShareBtn.addEventListener('click', () => this.closeScreenShare());
        this.closeChatBtn.addEventListener('click', () => this.toggleChat());

        // Chat
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Enter key for joining room
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        this.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
    }

    setupSocketListeners() {
        this.socket.on('user-connected', (userId, username) => {
            console.log(`User ${username} connected`);
            this.addMessage(`${username} joined the call`, 'system');
            this.updateParticipantCount();
        });

        this.socket.on('user-disconnected', (userId) => {
            console.log(`User ${userId} disconnected`);
            this.removePeer(userId);
            this.updateParticipantCount();
        });

        this.socket.on('room-users', (users, screenSharer) => {
            console.log('Room users:', users);
            users.forEach(user => {
                if (user.userId !== this.userId) {
                    this.createPeerConnection(user.userId, user.username, false);
                }
            });
            this.updateParticipantCount();
        });

        this.socket.on('offer', async (offer, userId) => {
            console.log('Received offer from:', userId);
            const peer = this.peers.get(userId);
            if (peer) {
                await peer.connection.setRemoteDescription(offer);
                const answer = await peer.connection.createAnswer();
                await peer.connection.setLocalDescription(answer);
                this.socket.emit('answer', answer, userId);
            }
        });

        this.socket.on('answer', async (answer, userId) => {
            console.log('Received answer from:', userId);
            const peer = this.peers.get(userId);
            if (peer) {
                await peer.connection.setRemoteDescription(answer);
            }
        });

        this.socket.on('ice-candidate', async (candidate, userId) => {
            const peer = this.peers.get(userId);
            if (peer) {
                await peer.connection.addIceCandidate(candidate);
            }
        });

        this.socket.on('user-video-toggle', (userId, isEnabled) => {
            this.updateUserVideoStatus(userId, isEnabled);
        });

        this.socket.on('user-audio-toggle', (userId, isEnabled) => {
            this.updateUserAudioStatus(userId, isEnabled);
        });

        this.socket.on('user-started-screen-share', (userId) => {
            this.handleUserStartedScreenShare(userId);
        });

        this.socket.on('user-stopped-screen-share', (userId) => {
            this.handleUserStoppedScreenShare(userId);
        });

        this.socket.on('screen-share-error', (message) => {
            alert(message);
        });
    }

    async joinRoom() {
        const username = this.usernameInput.value.trim();
        const roomId = this.roomIdInput.value.trim();

        if (!username) {
            alert('Please enter your name');
            return;
        }

        this.username = username;
        this.roomId = roomId || this.generateRoomId();

        try {
            await this.initializeMedia();
            this.socket.emit('join-room', this.roomId, this.userId, this.username);
            this.showVideoCall();
        } catch (error) {
            console.error('Error accessing media:', error);
            alert('Error accessing camera/microphone. Please check permissions.');
        }
    }

    createRoom() {
        this.roomIdInput.value = this.generateRoomId();
        this.joinRoom();
    }

    generateRoomId() {
        return Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    async initializeMedia() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            this.addLocalVideo();
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }

    addLocalVideo() {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container local';
        videoContainer.id = `video-${this.userId}`;

        const video = document.createElement('video');
        video.srcObject = this.localStream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        const videoInfo = document.createElement('div');
        videoInfo.className = 'video-info';
        videoInfo.innerHTML = `<span>${this.username} (You)</span>`;

        videoContainer.appendChild(video);
        videoContainer.appendChild(videoInfo);
        this.videoGrid.appendChild(videoContainer);
    }

    createPeerConnection(userId, username, isInitiator) {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const peerConnection = new RTCPeerConnection(configuration);
        
        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            this.addRemoteVideo(userId, username, remoteStream);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', event.candidate, userId);
            }
        };

        const peer = {
            connection: peerConnection,
            username: username,
            isVideoEnabled: true,
            isAudioEnabled: true
        };

        this.peers.set(userId, peer);

        // Create offer if initiator
        if (isInitiator) {
            this.createOffer(userId);
        }

        return peer;
    }

    async createOffer(userId) {
        const peer = this.peers.get(userId);
        if (peer) {
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            this.socket.emit('offer', offer, userId);
        }
    }

    addRemoteVideo(userId, username, stream) {
        // Remove existing video if any
        const existingVideo = document.getElementById(`video-${userId}`);
        if (existingVideo) {
            existingVideo.remove();
        }

        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        videoContainer.id = `video-${userId}`;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;

        const videoInfo = document.createElement('div');
        videoInfo.className = 'video-info';
        videoInfo.innerHTML = `<span>${username}</span>`;

        videoContainer.appendChild(video);
        videoContainer.appendChild(videoInfo);
        this.videoGrid.appendChild(videoContainer);
    }

    removePeer(userId) {
        const peer = this.peers.get(userId);
        if (peer) {
            peer.connection.close();
            this.peers.delete(userId);
        }

        const videoElement = document.getElementById(`video-${userId}`);
        if (videoElement) {
            videoElement.remove();
        }
    }

    toggleVideo() {
        this.isVideoEnabled = !this.isVideoEnabled;
        
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = this.isVideoEnabled;
            }
        }

        this.toggleVideoBtn.className = `control-btn ${this.isVideoEnabled ? 'video-on' : 'video-off'}`;
        this.socket.emit('toggle-video', this.isVideoEnabled);
    }

    toggleAudio() {
        this.isAudioEnabled = !this.isAudioEnabled;
        
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = this.isAudioEnabled;
            }
        }

        this.toggleAudioBtn.className = `control-btn ${this.isAudioEnabled ? 'audio-on' : 'audio-off'}`;
        this.socket.emit('toggle-audio', this.isAudioEnabled);
    }

    async toggleScreenShare() {
        if (!this.isScreenSharing) {
            await this.startScreenShare();
        } else {
            this.stopScreenShare();
        }
    }

    async startScreenShare() {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // Replace video track in all peer connections
            const videoTrack = this.screenStream.getVideoTracks()[0];
            
            this.peers.forEach(async (peer) => {
                const sender = peer.connection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            });

            // Update local video
            const localVideo = document.querySelector(`#video-${this.userId} video`);
            if (localVideo) {
                localVideo.srcObject = this.screenStream;
            }

            // Handle screen share end
            videoTrack.onended = () => {
                this.stopScreenShare();
            };

            this.isScreenSharing = true;
            this.screenShareBtn.className = 'control-btn screen-sharing';
            this.socket.emit('start-screen-share');

        } catch (error) {
            console.error('Error starting screen share:', error);
            alert('Error starting screen share. Please try again.');
        }
    }

    async stopScreenShare() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        // Replace with camera stream
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            
            this.peers.forEach(async (peer) => {
                const sender = peer.connection.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                if (sender && videoTrack) {
                    await sender.replaceTrack(videoTrack);
                }
            });

            // Update local video
            const localVideo = document.querySelector(`#video-${this.userId} video`);
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
        }

        this.isScreenSharing = false;
        this.screenShareBtn.className = 'control-btn';
        this.socket.emit('stop-screen-share');
    }

    handleUserStartedScreenShare(userId) {
        const peer = this.peers.get(userId);
        if (peer) {
            this.screenShareUsername.textContent = peer.username;
            this.screenShareContainer.classList.remove('hidden');
        }
    }

    handleUserStoppedScreenShare(userId) {
        this.screenShareContainer.classList.add('hidden');
    }

    closeScreenShare() {
        this.screenShareContainer.classList.add('hidden');
    }

    updateUserVideoStatus(userId, isEnabled) {
        const peer = this.peers.get(userId);
        if (peer) {
            peer.isVideoEnabled = isEnabled;
        }
        
        const videoInfo = document.querySelector(`#video-${userId} .video-info`);
        if (videoInfo) {
            const indicator = videoInfo.querySelector('.status-indicator.video-off');
            if (!isEnabled && !indicator) {
                const newIndicator = document.createElement('span');
                newIndicator.className = 'status-indicator video-off';
                newIndicator.title = 'Video off';
                videoInfo.appendChild(newIndicator);
            } else if (isEnabled && indicator) {
                indicator.remove();
            }
        }
    }

    updateUserAudioStatus(userId, isEnabled) {
        const peer = this.peers.get(userId);
        if (peer) {
            peer.isAudioEnabled = isEnabled;
        }
        
        const videoInfo = document.querySelector(`#video-${userId} .video-info`);
        if (videoInfo) {
            const indicator = videoInfo.querySelector('.status-indicator.audio-off');
            if (!isEnabled && !indicator) {
                const newIndicator = document.createElement('span');
                newIndicator.className = 'status-indicator audio-off';
                newIndicator.title = 'Audio off';
                videoInfo.appendChild(newIndicator);
            } else if (isEnabled && indicator) {
                indicator.remove();
            }
        }
    }

    toggleChat() {
        this.isChatOpen = !this.isChatOpen;
        this.chatPanel.classList.toggle('hidden', !this.isChatOpen);
    }

    sendMessage() {
        const message = this.chatInput.value.trim();
        if (message) {
            this.addMessage(message, 'own');
            // Here you would emit the message to other users
            // this.socket.emit('chat-message', message);
            this.chatInput.value = '';
        }
    }

    addMessage(message, type = 'other', username = '') {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${type}`;
        
        if (type === 'system') {
            messageElement.innerHTML = `<div class="message-header">System</div><div>${message}</div>`;
        } else if (type === 'own') {
            messageElement.innerHTML = `<div class="message-header">You</div><div>${message}</div>`;
        } else {
            messageElement.innerHTML = `<div class="message-header">${username}</div><div>${message}</div>`;
        }
        
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    copyRoomId() {
        navigator.clipboard.writeText(this.roomId).then(() => {
            alert('Room ID copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.roomId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Room ID copied to clipboard!');
        });
    }

    updateParticipantCount() {
        const count = this.peers.size + 1; // +1 for local user
        this.participantCount.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
    }

    showVideoCall() {
        this.roomSelection.classList.add('hidden');
        this.videoCall.classList.remove('hidden');
        this.currentRoomId.textContent = `Room: ${this.roomId}`;
        this.updateParticipantCount();
    }

    leaveCall() {
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
        }

        // Close all peer connections
        this.peers.forEach(peer => peer.connection.close());
        this.peers.clear();

        // Disconnect socket
        this.socket.disconnect();

        // Reset UI
        this.videoCall.classList.add('hidden');
        this.roomSelection.classList.remove('hidden');
        this.videoGrid.innerHTML = '';
        this.chatMessages.innerHTML = '';
        this.chatPanel.classList.add('hidden');
        this.screenShareContainer.classList.add('hidden');

        // Reset state
        this.roomId = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.isScreenSharing = false;
        this.isChatOpen = false;

        // Reset button states
        this.toggleVideoBtn.className = 'control-btn video-on';
        this.toggleAudioBtn.className = 'control-btn audio-on';
        this.screenShareBtn.className = 'control-btn';

        // Reconnect socket
        this.socket.connect();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebRTCCall();
});
