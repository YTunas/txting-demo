import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatInterfaceComponent } from '../chat-interface/chat-interface.component';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatInterfaceComponent],
  template: `
    <div class="chat-room-container">
      <div *ngIf="!isInRoom" class="room-join-container">
        <h2>Join a Chat Room</h2>
        <div class="room-actions">
          <button (click)="createRoom()" class="create-room-btn">Create New Room</button>
          <div class="join-room-form">
            <input type="text" [(ngModel)]="roomId" placeholder="Enter Room ID">
            <button (click)="joinRoom()" [disabled]="!roomId.trim()">Join Room</button>
          </div>
        </div>
      </div>

      <div *ngIf="isInRoom" class="active-room">
        <div class="room-header">
          <h3>Room ID: {{ roomId }}</h3>
          <button class="leave-room-btn" (click)="leaveRoom()">Leave Room</button>
        </div>
        <app-chat-interface></app-chat-interface>
      </div>
    </div>
  `,
  styles: [`
    .chat-room-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .room-join-container {
      text-align: center;
      margin: 2rem auto;
      max-width: 500px;
      
      h2 {
        margin-bottom: 2rem;
        color: #333;
      }
    }

    .room-actions {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .join-room-form {
      display: flex;
      gap: 0.5rem;
      
      input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
    }

    .create-room-btn {
      width: 100%;
      padding: 1rem;
      font-size: 1.1rem;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      
      &:hover {
        background-color: #45a049;
      }
    }

    .active-room {
      .room-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f5f5f5;
        border-radius: 4px;
        margin-bottom: 1rem;

        h3 {
          margin: 0;
          color: #333;
        }

        .leave-room-btn {
          padding: 0.5rem 1rem;
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          
          &:hover {
            background-color: #d32f2f;
          }
        }
      }
    }

    button {
      padding: 0.5rem 1rem;
      background-color: #2196f3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      
      &:hover:not(:disabled) {
        background-color: #1976d2;
      }
      
      &:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
    }
  `]
})
export class ChatRoomComponent implements OnInit {
  roomId: string = '';
  isInRoom: boolean = false;
  currentUser: any = null;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
  }

  createRoom(): void {
    this.roomId = this.chatService.createRoom();
    this.isInRoom = true;
  }

  joinRoom(): void {
    if (this.roomId.trim()) {
      this.chatService.joinRoom(this.roomId);
      this.isInRoom = true;
    }
  }

  leaveRoom(): void {
    this.isInRoom = false;
    this.roomId = '';
    // Reconnect to reset room state
    this.chatService.reconnect();
  }
}
