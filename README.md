# WebRTC Group Video Calling Application

A real-time group video calling application built with Node.js, Socket.IO, and WebRTC. This application supports video calling, audio calling, and screen sharing in group calls.

## Features

- 🎥 **Group Video Calling**: Multiple participants can join video calls simultaneously
- 🔊 **Audio Calling**: High-quality audio communication
- 🖥️ **Screen Sharing**: Share your screen with other participants
- 💬 **Text Chat**: Send messages during the call
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎛️ **Media Controls**: Toggle video, audio, and screen sharing
- 🔗 **Easy Room Sharing**: Copy and share room IDs

## Technology Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **WebRTC**: Peer-to-peer communication
- **Real-time Communication**: Socket.IO for signaling

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /Users/srajkumaryadav/Desktop/Shweta/webrtc
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   
   Or for production:
   ```bash
   npm start
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

### Joining a Call

1. **Enter your name** in the username field
2. **Join existing room**: Enter a room ID and click "Join Room"
3. **Create new room**: Click "Create New Room" to generate a new room ID
4. **Grant permissions** when prompted for camera and microphone access

### During the Call

#### Media Controls
- **Video Toggle**: Click the camera button to turn video on/off
- **Audio Toggle**: Click the microphone button to mute/unmute
- **Screen Share**: Click the screen button to start/stop screen sharing
- **Chat**: Click the chat button to open/close the text chat panel

#### Room Management
- **Copy Room ID**: Click the copy button next to the room ID to share with others
- **Leave Call**: Click "Leave Call" to exit the room

### Screen Sharing
- Only one participant can share their screen at a time
- Click the screen share button to start sharing
- Other participants will see the shared screen in a full-screen overlay
- Click "Stop Sharing" or the X button to stop screen sharing

### Chat Feature
- Open the chat panel using the chat button
- Type messages and press Enter or click Send
- Messages are displayed with timestamps and sender names

## Project Structure

```
webrtc/
├── server.js              # Express server and Socket.IO setup
├── package.json           # Project dependencies and scripts
├── public/
│   ├── index.html         # Main HTML file
│   ├── styles.css         # CSS styles
│   └── script.js          # Frontend JavaScript logic
└── README.md              # This file
```

## API/Socket Events

### Client to Server Events
- `join-room`: Join a specific room
- `offer`: WebRTC offer for peer connection
- `answer`: WebRTC answer for peer connection
- `ice-candidate`: ICE candidate for peer connection
- `toggle-video`: Toggle video on/off
- `toggle-audio`: Toggle audio on/off
- `start-screen-share`: Start screen sharing
- `stop-screen-share`: Stop screen sharing

### Server to Client Events
- `user-connected`: New user joined the room
- `user-disconnected`: User left the room
- `room-users`: Current users in the room
- `offer`: Received WebRTC offer
- `answer`: Received WebRTC answer
- `ice-candidate`: Received ICE candidate
- `user-video-toggle`: User toggled video
- `user-audio-toggle`: User toggled audio
- `user-started-screen-share`: User started screen sharing
- `user-stopped-screen-share`: User stopped screen sharing
- `screen-share-error`: Error with screen sharing

## Browser Support

This application works on modern browsers that support WebRTC:
- Chrome 56+
- Firefox 51+
- Safari 11+
- Edge 79+

## Development

### Adding New Features

1. **Server-side**: Add new Socket.IO event handlers in `server.js`
2. **Client-side**: Add corresponding event listeners and UI handlers in `script.js`
3. **Styling**: Update `styles.css` for any UI changes

### Environment Variables

You can customize the server port:
```bash
PORT=3000 npm start
```

## Security Considerations

For production deployment, consider:
- Use HTTPS for secure WebRTC connections
- Implement user authentication
- Add rate limiting for Socket.IO events
- Use TURN servers for NAT traversal
- Validate and sanitize all user inputs

## Troubleshooting

### Common Issues

1. **Camera/Microphone not working**:
   - Check browser permissions
   - Ensure HTTPS is used (required for getUserMedia)
   - Try refreshing the page

2. **Connection issues**:
   - Check firewall settings
   - Ensure proper STUN/TURN server configuration
   - Verify network connectivity

3. **Screen sharing not working**:
   - Only works on HTTPS
   - Check browser compatibility
   - Ensure screen sharing permissions are granted

### Debug Mode

Open browser developer tools to see console logs for debugging WebRTC connections and Socket.IO events.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions, please create an issue in the project repository or contact the development team.
