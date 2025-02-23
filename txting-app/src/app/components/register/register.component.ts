import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="register-container">
      <div *ngIf="!registrationSuccess">
        <h2>Create Account</h2>
        <div class="password-rules">
          <h3>Password Requirements:</h3>
          <ul>
            <li [class.valid]="username.length >= 3">Username at least 3 characters</li>
            <li [class.valid]="hasMinLength">At least 6 characters long</li>
            <li [class.valid]="hasUpperCase">One uppercase letter</li>
            <li [class.valid]="hasNumber">One number</li>
            <li [class.valid]="passwordsMatch">Passwords match</li>
          </ul>
        </div>
        <div class="register-form">
          <input 
            type="text" 
            [(ngModel)]="username" 
            placeholder="Username" 
            required
            (input)="validateForm()">
          <input 
            type="password" 
            [(ngModel)]="password" 
            placeholder="Password" 
            required
            (input)="validateForm()">
          <input 
            type="password" 
            [(ngModel)]="confirmPassword" 
            placeholder="Confirm Password" 
            required
            (input)="validateForm()">
          <button 
            (click)="register()" 
            [disabled]="!isFormValid || isSubmitting">
            {{ isSubmitting ? 'Creating Account...' : 'Create Account' }}
          </button>
          <button class="secondary" (click)="goToLogin()">Back to Login</button>
        </div>
        <div class="error-message" *ngIf="error">{{ error }}</div>
      </div>

      <div *ngIf="registrationSuccess" class="success-container">
        <h2>🐱 Success! 🐱</h2>
        <p>Your account has been created!</p>
        <div class="checkmark">✓</div>
        <p class="redirect-message">Redirecting to login page in 3 seconds...</p>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .register-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .password-rules {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 4px;
      
      h3 {
        margin-top: 0;
        font-size: 1rem;
        color: #333;
      }
      
      ul {
        list-style: none;
        padding-left: 0;
        margin: 0;
      }
      
      li {
        margin: 0.5rem 0;
        color: #666;
        position: relative;
        padding-left: 1.5rem;
        
        &:before {
          content: "○";
          position: absolute;
          left: 0;
          color: #ccc;
        }
        
        &.valid {
          color: #4CAF50;
          &:before {
            content: "●";
            color: #4CAF50;
          }
        }
      }
    }
    input {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
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
      }
      &:hover:not(:disabled) {
        background-color: #1976d2;
      }
      &.secondary {
        background-color: #757575;
        &:hover {
          background-color: #616161;
        }
      }
    }
    .error-message {
      color: #f44336;
      margin-top: 1rem;
      text-align: center;
    }
    .success-container {
      text-align: center;
      animation: fadeIn 0.5s ease-in;
      
      h2 {
        color: #4CAF50;
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      
      p {
        font-size: 1.2rem;
        color: #333;
        margin-bottom: 2rem;
      }
      
      .checkmark {
        font-size: 4rem;
        color: #4CAF50;
        margin: 2rem 0;
        animation: scaleIn 0.5s ease-out;
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }
    .redirect-message {
      color: #666;
      font-size: 0.9rem;
      margin-top: 1rem;
    }
  `]
})
export class RegisterComponent {
  username: string = '';
  password: string = '';
  confirmPassword: string = '';
  error: string = '';
  registrationSuccess: boolean = false;
  isSubmitting: boolean = false;
  isFormValid: boolean = false;

  // Form validation flags
  hasMinLength: boolean = false;
  hasUpperCase: boolean = false;
  hasNumber: boolean = false;
  passwordsMatch: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  validateForm() {
    // Clear any previous errors
    this.error = '';
    
    this.hasMinLength = this.password.length >= 6;
    this.hasUpperCase = /[A-Z]/.test(this.password);
    this.hasNumber = /[0-9]/.test(this.password);
    this.passwordsMatch = this.password === this.confirmPassword;

    this.isFormValid = 
      this.username.trim().length >= 3 &&
      this.hasMinLength &&
      this.hasUpperCase &&
      this.hasNumber &&
      this.passwordsMatch;
  }

  register() {
    if (!this.isFormValid || this.isSubmitting) {
      if (!this.isFormValid) {
        this.error = 'Please meet all password requirements';
      }
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    this.authService.register(this.username.trim(), this.password).subscribe({
      next: (response) => {
        console.log('Registration response:', response);
        this.registrationSuccess = true;
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        console.error('Registration error:', err);
        this.isSubmitting = false;
        if (err.status === 409) {
          this.error = 'Username already exists. Please choose another one.';
        } else {
          this.error = err.error?.message || 'Registration failed. Please try again.';
        }
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}