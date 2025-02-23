import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

interface Message {
  content: string;
  sender: string;
  username: string;
  timestamp: Date;
  isWaving?: boolean;
  waveReceived?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private socket!: Socket;
  private messages = new BehaviorSubject<Message[]>([]);
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private roomId: string | null = null;
  private currentUser: any = null;
  private apiUrl = this.getApiUrl();

  constructor(private authService: AuthService) {
    this.currentUser = this.authService.getCurrentUser();
    this.initializeSocket();
  }

  private getApiUrl(): string {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:3000'
      : 'https://your-backend-url.onrender.com'; // This will be updated after deployment
  }

  private initializeSocket() {
    const token = this.authService.getAuthToken();
    if (!token) return;

    this.socket = io(this.apiUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connectionStatus.next(true);
      if (this.roomId) {
        this.joinRoom(this.roomId);
      }
    });

    this.socket.on('disconnect', () => {
      this.connectionStatus.next(false);
    });

    this.socket.on('message', (message: Message) => {
      const currentMessages = this.messages.value;
      // Add isOwn flag for styling
      this.messages.next([...currentMessages, {
        ...message,
        isWaving: false,
        waveReceived: false
      }]);
    });

    this.socket.on('wave', (data: { from: string, to: string }) => {
      const currentMessages = this.messages.value;
      const updatedMessages = currentMessages.map(msg => {
        if (msg.sender === data.from) {
          return { ...msg, waveReceived: true };
        }
        return msg;
      });
      this.messages.next(updatedMessages);
    });
  }

  createRoom(): string {
    const roomId = Math.random().toString(36).substring(7);
    this.joinRoom(roomId);
    return roomId;
  }

  joinRoom(roomId: string): void {
    this.roomId = roomId;
    if (this.socket.connected) {
      this.socket.emit('join-room', roomId);
    }
  }

  sendMessage(content: string): boolean {
    if (!this.roomId || !this.socket.connected) {
      return false;
    }
    
    const messageData = {
      content,
      roomId: this.roomId,
      timestamp: new Date(),
      sender: this.socket.id,
      username: this.currentUser?.username || 'Anonymous'
    };
    
    this.socket.emit('send-message', messageData);
    return true;
  }

  sendWave(to: string): void {
    if (this.socket.connected) {
      this.socket.emit('wave', {
        to,
        from: this.socket.id
      });
    }
  }

  getMessages(): Observable<Message[]> {
    return this.messages.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.initializeSocket();
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
