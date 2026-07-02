import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { RegisterDto, LoginDto, AuthResponse } from '../models/auth.model';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5205/api';
    }
  }
  return 'https://api-task.anhnguyen.click/api';
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${getApiBaseUrl()}/auth`;

  // Signals để lưu trạng thái đăng nhập
  readonly currentUser = signal<string | null>(null);
  readonly token = signal<string | null>(null);
  readonly userRole = signal<string | null>(null);

  // Computed signal kiểm tra trạng thái đăng nhập
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  constructor() {
    this.loadSession();
  }

  /**
   * Đăng ký tài khoản người dùng mới.
   */
  register(dto: RegisterDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, dto);
  }

  /**
   * Đăng nhập tài khoản.
   */
  login(dto: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, dto).pipe(
      tap(response => {
        this.saveSession(response);
      })
    );
  }

  /**
   * Đăng xuất hệ thống, xóa session cục bộ.
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
    }
    this.currentUser.set(null);
    this.token.set(null);
    this.userRole.set(null);
  }

  /**
   * Lưu thông tin đăng nhập vào localStorage và cập nhật signals.
   */
  private saveSession(response: AuthResponse): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.token);
      localStorage.setItem('username', response.username);
      localStorage.setItem('role', response.role);
    }
    this.token.set(response.token);
    this.currentUser.set(response.username);
    this.userRole.set(response.role);
  }

  /**
   * Khôi phục phiên đăng nhập khi khởi động ứng dụng.
   */
  private loadSession(): void {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      const role = localStorage.getItem('role');

      if (token && username && role) {
        this.token.set(token);
        this.currentUser.set(username);
        this.userRole.set(role);
      }
    }
  }
}
