import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface WhiteboardProps {
  socket: Socket | null;
  roomId: string | null;
  isVisible: boolean;
  onClose: () => void;
}

interface DrawingData {
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  color: string;
  lineWidth: number;
  isDrawing: boolean;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ 
  socket, 
  roomId, 
  isVisible, 
  onClose 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

  // Debug function
  const debugLog = useCallback((message: string, data?: any) => {
    console.log(`[Whiteboard] ${message}`, data);
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    debugLog('Initializing canvas', { isVisible, canvasExists: !!canvas });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      debugLog('Failed to get canvas context');
      return;
    }

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        // Set canvas size to container size
        const rect = container.getBoundingClientRect();
        canvas.width = Math.max(rect.width, 800);
        canvas.height = Math.max(600, Math.min(rect.height - 100, 500));
        
        debugLog('Canvas resized', { width: canvas.width, height: canvas.height });
        
        // Set default drawing properties
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        setCanvasReady(true);
      }
    };

    // Initial setup
    setTimeout(resizeCanvas, 100);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isVisible, brushColor, brushSize, debugLog]);

  // Socket event listeners for real-time collaboration
  useEffect(() => {
    if (!socket || !roomId) return;

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleRemoteDrawing = (data: DrawingData) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      drawOnCanvas(ctx, data);
    };

    const handleCanvasClear = () => {
      clearCanvas();
    };

    socket.on('whiteboard-draw', handleRemoteDrawing);
    socket.on('whiteboard-clear', handleCanvasClear);

    // Join whiteboard room
    socket.emit('join-whiteboard', roomId);

    return () => {
      socket.off('whiteboard-draw', handleRemoteDrawing);
      socket.off('whiteboard-clear', handleCanvasClear);
    };
  }, [socket, roomId]);

  const drawOnCanvas = (ctx: CanvasRenderingContext2D, data: DrawingData) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = data.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = data.color;

    if (data.prevX !== undefined && data.prevY !== undefined && data.isDrawing) {
      ctx.beginPath();
      ctx.moveTo(data.prevX, data.prevY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    } else {
      // Draw a dot for single click
      ctx.beginPath();
      ctx.arc(data.x, data.y, data.lineWidth / 2, 0, 2 * Math.PI);
      ctx.fillStyle = data.color;
      ctx.fill();
    }
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    debugLog('Start drawing event triggered');
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      debugLog('Canvas or context not available');
      return;
    }

    if (!canvasReady) {
      debugLog('Canvas not ready yet');
      return;
    }

    setIsDrawing(true);
    
    const { x, y } = getMousePos(e);
    setLastPos({ x, y });
    
    debugLog('Drawing started at', { x, y, brushColor, brushSize });

    const drawingData: DrawingData = {
      x,
      y,
      color: brushColor,
      lineWidth: brushSize,
      isDrawing: true
    };

    drawOnCanvas(ctx, drawingData);

    // Emit to other users
    if (socket && roomId) {
      socket.emit('whiteboard-draw', drawingData);
      debugLog('Emitted drawing data to socket');
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getMousePos(e);

    const drawingData: DrawingData = {
      x,
      y,
      prevX: lastPos?.x || x,
      prevY: lastPos?.y || y,
      color: brushColor,
      lineWidth: brushSize,
      isDrawing: true
    };

    drawOnCanvas(ctx, drawingData);

    // Update last position
    setLastPos({ x, y });

    // Emit to other users
    if (socket && roomId) {
      socket.emit('whiteboard-draw', drawingData);
    }
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDrawing(false);
    setLastPos(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Emit clear event to other users
    if (socket && roomId) {
      socket.emit('whiteboard-clear', roomId);
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (!isVisible) return null;

  return (
    <div className="whiteboard-container">
      <div className="whiteboard-header">
        <div className="whiteboard-title">
          Collaborative Whiteboard - Room: {roomId}
        </div>
        
        <div className="whiteboard-controls">
          <div className="tool-group">
            <label>Colors:</label>
            <div className="color-palette">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setBrushColor(color)}
                  className={`color-btn ${brushColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  title={`Select ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="tool-group">
            <label>Size:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="size-slider"
            />
            <span className="size-display">{brushSize}px</span>
          </div>

          <button
            onClick={clearCanvas}
            className="whiteboard-btn danger"
            title="Clear Canvas"
          >
            🗑️ Clear
          </button>

          <button
            onClick={downloadCanvas}
            className="whiteboard-btn primary"
            title="Download Canvas"
          >
            💾 Save
          </button>

          <button
            onClick={onClose}
            className="whiteboard-btn"
            title="Close Whiteboard"
          >
            ❌ Close
          </button>
        </div>
      </div>

      <div className="whiteboard-content">
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            className="whiteboard-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const mouseEvent = new MouseEvent("mousedown", {
                clientX: touch.clientX,
                clientY: touch.clientY
              });
              startDrawing(mouseEvent as any);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              const touch = e.touches[0];
              const mouseEvent = new MouseEvent("mousemove", {
                clientX: touch.clientX,
                clientY: touch.clientY
              });
              draw(mouseEvent as any);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopDrawing();
            }}
            style={{ touchAction: 'none' }}
          />
          {!canvasReady && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#666'
            }}>
              Loading canvas...
            </div>
          )}
        </div>
        <p className="canvas-help">
          Click and drag to draw on the whiteboard. Use the tools above to change colors and brush size.
        </p>
      </div>
    </div>
  );
};
