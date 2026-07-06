import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateTaskDto, TaskItem, TaskItemStatus, UpdateStatusDto, UpdateTaskDto, SprintReportDto } from '../models/task.model';

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
export class TaskService {
  // Tiêm HttpClient sử dụng hàm inject() hiện đại của Angular
  private http = inject(HttpClient);

  // URL gốc của backend Web API .NET Core (lấy từ launchSettings.json của backend)
  public apiUrl = `${getApiBaseUrl()}/tasks`;

  /**
   * Lấy danh sách toàn bộ công việc.
   */
  getTasks(): Observable<TaskItem[]> {
    return this.http.get<TaskItem[]>(this.apiUrl);
  }

  /**
   * Lấy chi tiết một công việc theo Id.
   */
  getTask(id: number): Observable<TaskItem> {
    return this.http.get<TaskItem>(`${this.apiUrl}/${id}`);
  }

  /**
   * Tạo mới một công việc.
   */
  createTask(task: CreateTaskDto): Observable<TaskItem> {
    return this.http.post<TaskItem>(this.apiUrl, task);
  }

  /**
   * Cập nhật thông tin chi tiết một công việc.
   */
  updateTask(id: number, task: UpdateTaskDto): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, task);
  }

  /**
   * Cập nhật nhanh trạng thái của công việc (Todo, InProgress, Done).
   * Sử dụng HTTP PATCH khớp với [HttpPatch("{id}/status")] ở backend.
   */
  updateStatus(id: number, status: TaskItemStatus): Observable<any> {
    const statusDto: UpdateStatusDto = { status };
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, statusDto);
  }

  /**
   * Cập nhật người nhận việc (AssigneeId) cho công việc.
   */
  updateAssignee(id: number, assigneeId: number | null): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/assignee`, { assigneeId });
  }

  /**
   * Xóa một công việc.
   */
  deleteTask(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  /**
   * Tải ảnh đính kèm lên server cho công việc.
   */
  uploadAttachment(id: number, file: File): Observable<{ message: string, fileName: string, url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ message: string, fileName: string, url: string }>(
      `${this.apiUrl}/${id}/attachments`, 
      formData
    );
  }

  /**
   * Tải dữ liệu báo cáo Sprint từ API.
   */
  getSprintReport(sprintId: number): Observable<SprintReportDto> {
    const reportsUrl = this.apiUrl.replace('/tasks', '/reports');
    return this.http.get<SprintReportDto>(`${reportsUrl}/sprint/${sprintId}`);
  }

  /**
   * Lấy danh sách toàn bộ định nghĩa trường động.
   */
  getCustomFields(): Observable<any[]> {
    const cfUrl = this.apiUrl.replace('/tasks', '/customfields');
    return this.http.get<any[]>(cfUrl);
  }

  /**
   * Tạo mới định nghĩa trường động.
   */
  createCustomField(cf: any): Observable<any> {
    const cfUrl = this.apiUrl.replace('/tasks', '/customfields');
    return this.http.post<any>(cfUrl, cf);
  }

  /**
   * Xóa một định nghĩa trường động.
   */
  deleteCustomField(id: number): Observable<any> {
    const cfUrl = this.apiUrl.replace('/tasks', '/customfields');
    return this.http.delete<any>(`${cfUrl}/${id}`);
  }

  /**
   * Lọc danh sách các công việc gốc theo điều kiện động trên các trường tùy chỉnh.
   */
  filterTasks(filter: any): Observable<TaskItem[]> {
    return this.http.post<TaskItem[]>(`${this.apiUrl}/filter`, filter);
  }
}
