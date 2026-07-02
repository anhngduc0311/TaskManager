import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5205/api';
    }
  }
  return 'https://api-task.anhnguyen.click/api';
};

export interface ProjectMember {
  userId: number;
  username: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectMemberService {
  private http = inject(HttpClient);
  private apiUrl = `${getApiBaseUrl()}/projects`;

  getProjectMembers(projectId: number): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`${this.apiUrl}/${projectId}/members`);
  }

  inviteMember(projectId: number, email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${projectId}/invite`, { email });
  }
}
