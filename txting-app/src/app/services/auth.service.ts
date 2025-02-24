import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

interface User {
  userId: string;
  username: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://192.168.1.91:3000/api';
  private userSubject = new BehaviorSubject<User | null>(null);
  private isBrowser: boolean;
  
  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (typeof window !== 'undefined') {
    if (this.isBrowser) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        this.userSubject.next(JSON.parse(storedUser));
      }
    }
  }
  }

  login(username: string, password: string): Observable<User> {
    console.log('Attempting login for:', username);
    return this.http.post<User>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(user => {
          console.log('Login successful:', user);
          this.setUser(user);
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Login error:', error);
          if (error.error instanceof ErrorEvent) {
            return throwError(() => new Error('Network error occurred. Please check your connection.'));
          }
          return throwError(() => ({
            status: error.status,
            message: error.error?.message || 'Login failed. Please try again.'
          }));
        })
      );
  }

  register(username: string, password: string): Observable<any> {
    console.log('Attempting registration for:', username);
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    
    return this.http.post(`${this.apiUrl}/register`, { username, password }, { headers })
      .pipe(
        tap(response => {
          console.log('Registration response:', response);
          // Don't store user data on registration, wait for login
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Registration error:', error);
          if (error.error instanceof ErrorEvent) {
            // Client-side error
            return throwError(() => new Error('Network error occurred. Please check your connection.'));
          }
          // Server-side error
          return throwError(() => ({
            status: error.status,
            message: error.error?.message || 'Registration failed. Please try again.'
          }));
        })
      );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Auth error occurred:', error);
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      return throwError(() => new Error('Network error occurred. Please check your connection.'));
    }
    
    // Server-side error
    const message = error.error?.message || 'An error occurred. Please try again.';
    return throwError(() => ({ status: error.status, message }));
  }

  private setUser(user: User): void {
    if (typeof window !== 'undefined') {
    if (this.isBrowser) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }
    this.userSubject.next(user);
  }

  logout(): void {
    if (typeof window !== 'undefined') {
    if (this.isBrowser) {
      localStorage.removeItem('user');
    }
  }
    this.userSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }

  getAuthToken(): string | null {
    return this.userSubject.value?.token || null;
  }
}