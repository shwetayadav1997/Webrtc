class WebRTCService {
  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  createPeerConnection(): RTCPeerConnection {
    return new RTCPeerConnection(this.configuration);
  }

  async createOffer(peerConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(peerConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleOffer(
    peerConnection: RTCPeerConnection,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    await peerConnection.setRemoteDescription(offer);
  }

  async handleAnswer(
    peerConnection: RTCPeerConnection,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    await peerConnection.setRemoteDescription(answer);
  }

  async addIceCandidate(
    peerConnection: RTCPeerConnection,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    await peerConnection.addIceCandidate(candidate);
  }

  addTracksToPeerConnection(
    peerConnection: RTCPeerConnection,
    stream: MediaStream
  ): void {
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });
  }

  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  async getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    return await navigator.mediaDevices.getDisplayMedia(constraints);
  }

  async replaceVideoTrack(
    peerConnection: RTCPeerConnection,
    newTrack: MediaStreamTrack
  ): Promise<void> {
    const sender = peerConnection.getSenders().find(s => 
      s.track && s.track.kind === 'video'
    );
    if (sender) {
      await sender.replaceTrack(newTrack);
    }
  }
}

export const webRTCService = new WebRTCService();
