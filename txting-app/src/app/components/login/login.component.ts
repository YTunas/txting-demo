import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <h2>Login</h2>
      <div class="login-form">
        <input 
          type="text" 
          [(ngModel)]="username" 
          placeholder="Username" 
          required
          [disabled]="isLoggingIn">
        <input 
          type="password" 
          [(ngModel)]="password" 
          placeholder="Password" 
          required
          [disabled]="isLoggingIn">
        <button 
          (click)="login()" 
          [disabled]="!username || !password || isLoggingIn">
          {{ isLoggingIn ? 'Logging in...' : 'Login' }}
        </button>
        <button class="secondary" (click)="goToRegister()" [disabled]="isLoggingIn">
          Create Account
        </button>
      </div>
      <div class="error-message" *ngIf="error">{{ error }}</div>
    </div>
  `,
  styles: [`
    .login-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    input {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
      }
    }
    button {
      padding: 0.5rem;
      background-color: #2196f3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      &:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
      &:hover:not(:disabled) {
        background-color: #1976d2;
      }
    }
    .error-message {
      color: #f44336;
      margin-top: 1rem;
      text-align: center;
      animation: fadeIn 0.3s ease-in;
    }
    button.secondary {
      background-color: #757575;
      &:hover:not(:disabled) {
        background-color: #616161;
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error: string = '';
  isLoggingIn: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login() {
    if (!this.username || !this.password || this.isLoggingIn) {
      return;
    }

    this.error = '';
    this.isLoggingIn = true;

    this.authService.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.isLoggingIn = false;
        if (err.status === 401) {
          this.error = 'Invalid username or password';
        } else if (err.status === 400) {
          this.error = 'Please enter both username and password';
        } else {
          this.error = err.message || 'Login failed. Please try again.';
        }
        console.error('Login error:', err);
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}