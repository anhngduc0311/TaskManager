import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from './services/task.service';
import { AuthService } from './services/auth.service';
import { TaskItem, TaskItemStatus, CreateTaskDto } from './models/task.model';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule], // Import CommonModule và FormsModule để dùng [(ngModel)] và directives như *ngFor, *ngIf
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Tiêm các services bằng inject()
  private taskService = inject(TaskService);
  protected readonly authService = inject(AuthService);

  // Expose enum ra template để so sánh và gán trạng thái
  protected readonly TaskStatus = TaskItemStatus;

  // Sử dụng Angular Signals để quản lý danh sách tasks động
  protected readonly tasks = signal<TaskItem[]>([]);

  // Lưu trữ lỗi kết nối hoặc thao tác và thông báo thành công
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Signals cho Form tạo mới Task
  protected readonly newTitle = signal('');
  protected readonly newDescription = signal('');
  protected readonly newDueDate = signal('');

  // Signals cho Form Đăng nhập / Đăng ký
  protected readonly authUsername = signal('');
  protected readonly authEmail = signal('');
  protected readonly authPassword = signal('');
  protected readonly isRegisterMode = signal(false); // Mặc định hiển thị Đăng nhập

  // Các Computed Signals tự động lọc danh sách theo cột trạng thái
  protected readonly todoTasks = computed(() => 
    this.tasks().filter(t => t.status === TaskItemStatus.Todo)
  );

  protected readonly inProgressTasks = computed(() => 
    this.tasks().filter(t => t.status === TaskItemStatus.InProgress)
  );

  protected readonly doneTasks = computed(() => 
    this.tasks().filter(t => t.status === TaskItemStatus.Done)
  );

  /**
   * Kiểm tra xem task đã quá hạn hay chưa.
   * Chỉ kiểm tra với các task chưa hoàn thành và có thời hạn nhỏ hơn thời gian hiện tại.
   */
  protected isOverdue(task: TaskItem): boolean {
    if (!task.dueDate || task.status === TaskItemStatus.Done) {
      return false;
    }
    return new Date(task.dueDate) < new Date();
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadTasks();
    }
  }

  /**
   * Gọi service tải toàn bộ danh sách công việc từ backend.
   */
  loadTasks(): void {
    this.errorMessage.set(null); // Reset lỗi cũ
    this.taskService.getTasks().subscribe({
      next: (data) => {
        this.tasks.set(data);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách công việc:', err);
        this.errorMessage.set('Không thể kết nối đến backend API. Hãy đảm bảo dự án backend dotnet đang chạy (ví dụ ở cổng HTTP: http://localhost:5205).');
      }
    });
  }

  /**
   * Xử lý thêm mới công việc.
   */
  addNewTask(): void {
    const title = this.newTitle().trim();
    if (!title) {
      if (typeof window !== 'undefined') {
        alert('Vui lòng nhập tiêu đề công việc!');
      }
      return;
    }

    const newTaskDto: CreateTaskDto = {
      title: title,
      description: this.newDescription().trim() || undefined,
      dueDate: this.newDueDate() ? new Date(this.newDueDate()).toISOString() : undefined
    };

    this.errorMessage.set(null);
    this.taskService.createTask(newTaskDto).subscribe({
      next: (createdTask) => {
        // Cập nhật danh sách local bằng cách thêm phần tử mới vào signal
        this.tasks.update(currentTasks => [...currentTasks, createdTask]);
        
        // Reset form
        this.newTitle.set('');
        this.newDescription.set('');
        this.newDueDate.set('');
      },
      error: (err) => {
        console.error('Lỗi khi tạo công việc mới:', err);
        this.errorMessage.set('Lỗi khi thêm mới công việc. Hãy kiểm tra kết nối API.');
      }
    });
  }

  /**
   * Cập nhật trạng thái mới cho công việc (kéo/chuyển trạng thái cột).
   */
  moveTask(id: number, newStatus: TaskItemStatus): void {
    this.errorMessage.set(null);
    this.taskService.updateStatus(id, newStatus).subscribe({
      next: (response) => {
        // Cập nhật trạng thái cục bộ trong signal để UI phản hồi ngay lập tức
        this.tasks.update(currentTasks => 
          currentTasks.map(t => t.id === id ? { ...t, status: newStatus } : t)
        );
      },
      error: (err) => {
        console.error('Lỗi khi cập nhật trạng thái:', err);
        this.errorMessage.set('Không thể cập nhật trạng thái công việc. Hãy kiểm tra kết nối API.');
      }
    });
  }

  /**
   * Xóa một công việc.
   */
  deleteTask(id: number): void {
    if (typeof window !== 'undefined') {
      if (!confirm('Bạn có chắc chắn muốn xóa công việc này không?')) {
        return;
      }
    }

    this.errorMessage.set(null);
    this.taskService.deleteTask(id).subscribe({
      next: () => {
        // Lọc bỏ công việc đã xóa khỏi danh sách cục bộ
        this.tasks.update(currentTasks => currentTasks.filter(t => t.id !== id));
      },
      error: (err) => {
        console.error('Lỗi khi xóa công việc:', err);
        this.errorMessage.set('Không thể xóa công việc. Hãy kiểm tra kết nối API.');
      }
    });
  }

  /**
   * Xử lý đăng nhập hoặc đăng ký.
   */
  handleAuthSubmit(): void {
    if (this.isRegisterMode()) {
      this.register();
    } else {
      this.login();
    }
  }

  /**
   * Thực hiện Đăng nhập.
   */
  login(): void {
    const username = this.authUsername().trim();
    const password = this.authPassword().trim();
    if (!username || !password) {
      this.errorMessage.set('Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.login({ username, password }).subscribe({
      next: () => {
        this.authPassword.set('');
        this.loadTasks();
      },
      error: (err) => {
        console.error('Đăng nhập thất bại:', err);
        this.errorMessage.set(err.error?.message || 'Đăng nhập thất bại. Tài khoản hoặc mật khẩu không đúng.');
      }
    });
  }

  /**
   * Thực hiện Đăng ký tài khoản.
   */
  register(): void {
    const username = this.authUsername().trim();
    const email = this.authEmail().trim();
    const password = this.authPassword().trim();
    if (!username || !email || !password) {
      this.errorMessage.set('Vui lòng điền đầy đủ thông tin để đăng ký.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.register({ username, email, password }).subscribe({
      next: () => {
        this.successMessage.set('Đăng ký tài khoản thành công! Hãy đăng nhập.');
        this.authPassword.set('');
        this.isRegisterMode.set(false); // Chuyển sang chế độ đăng nhập
      },
      error: (err) => {
        console.error('Đăng ký thất bại:', err);
        this.errorMessage.set(err.error?.message || 'Đăng ký thất bại. Tên đăng nhập hoặc Email đã tồn tại.');
      }
    });
  }

  /**
   * Đăng xuất khỏi hệ thống.
   */
  logout(): void {
    this.authService.logout();
    this.tasks.set([]);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.authUsername.set('');
    this.authEmail.set('');
    this.authPassword.set('');
  }
}
