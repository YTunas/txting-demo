import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="chat-container">
      <div class="connection-status" [class.disconnected]="!isConnected">
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </div>
      <div class="messages" #messageContainer>
        <div *ngFor="let message of messages" 
             class="message" 
             [class.own-message]="message.username === currentUser?.username">
          <div class="message-header">
            <span class="username" [class.own-username]="message.username === currentUser?.username">
              {{ message.username }}
            </span>
            <span class="message-time">{{ message.timestamp | date:'short' }}</span>
            <button *ngIf="message.username !== currentUser?.username"
                    class="wave-button" 
                    [class.waving]="message.isWaving"
                    (click)="sendWave(message)"
                    title="Wave to {{ message.username }}">
              👋
            </button>
          </div>
          <div class="message-content">
            {{ message.content }}
            <span *ngIf="message.waveReceived" class="wave-received animate-wave">
              👋
            </span>
          </div>
        </div>
      </div>
      <div class="error-message" *ngIf="errorMessage">{{ errorMessage }}</div>
      <div class="input-container">
        <input [(ngModel)]="newMessage" 
               (keyup.enter)="sendMessage()"
               [disabled]="!isConnected"
               placeholder="Type a message...">
        <button (click)="sendMessage()" 
                [disabled]="!isConnected || !newMessage.trim()">
          Send
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
      gap: 1rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .message {
      padding: 0.8rem;
      border-radius: 12px;
      max-width: 80%;
      background: #e3f2fd;
      position: relative;
      align-self: flex-start;
      
      &.own-message {
        background: #e8f5e9;
        align-self: flex-end;
        
        .message-header {
          justify-content: flex-end;
          
          .username {
            order: 2;
          }
          
          .message-time {
            order: 1;
            margin-right: 8px;
          }
        }
      }

      .message-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
        
        .username {
          font-weight: 500;
          color: #2196f3;
          
          &.own-username {
            color: #4caf50;
          }
        }
        
        .message-time {
          font-size: 0.8rem;
          color: #757575;
        }
      }

      .wave-button {
        padding: 2px 8px;
        background: transparent;
        border: none;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
        font-size: 1.2rem;
        
        &:hover {
          transform: scale(1.2);
        }
      }

      &:hover .wave-button {
        opacity: 1;
      }
    }

    .message-content {
      position: relative;
      word-break: break-word;
    }

    .wave-received {
      position: absolute;
      right: -25px;
      top: 50%;
      transform: translateY(-50%);
    }

    @keyframes wave {
      0% { transform: rotate(0deg); }
      25% { transform: rotate(-20deg); }
      75% { transform: rotate(20deg); }
      100% { transform: rotate(0deg); }
    }

    .waving {
      animation: wave 0.5s ease-in-out;
    }

    .animate-wave {
      animation: wave 0.5s ease-in-out;
    }

    .input-container {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;
      background: white;
      border-radius: 8px;
      
      input {
        flex: 1;
        padding: 0.8rem;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-size: 1rem;
        
        &:focus {
          outline: none;
          border-color: #2196f3;
        }
        
        &:disabled {
          background-color: #f5f5f5;
        }
      }
      
      button {
        padding: 0.8rem 1.5rem;
        background-color: #2196f3;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.2s;
        
        &:hover:not(:disabled) {
          background-color: #1976d2;
        }
        
        &:disabled {
          background-color: #bdbdbd;
          cursor: not-allowed;
        }
      }
    }

    .connection-status {
      text-align: center;
      padding: 0.5rem;
      background-color: #4CAF50;
      color: white;
      border-radius: 4px;
      transition: background-color 0.3s;
      
      &.disconnected {
        background-color: #f44336;
      }
    }

    .error-message {
      color: #f44336;
      text-align: center;
      padding: 0.5rem;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ChatInterfaceComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  messages: any[] = [];
  newMessage: string = '';
  isConnected: boolean = false;
  errorMessage: string = '';
  currentUser: any = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.subscriptions.push(
      this.chatService.getMessages().subscribe(messages => {
        this.messages = messages;
        this.scrollToBottom();
      }),

      this.chatService.getConnectionStatus().subscribe(status => {
        this.isConnected = status;
        if (status) {
          this.errorMessage = '';
        } else {
          this.errorMessage = 'Connection lost. Attempting to reconnect...';
        }
      })
    );
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      const element = this.messageContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {}
  }

  sendMessage() {
    if (this.newMessage.trim() && this.isConnected) {
      this.chatService.sendMessage(this.newMessage);
      this.newMessage = '';
    }
  }

  sendWave(message: any) {
    if (!message.isWaving) {
      message.isWaving = true;
      this.chatService.sendWave(message.sender);
      setTimeout(() => {
        message.isWaving = false;
      }, 500);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
