import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from './services/task.service';
import { AuthService } from './services/auth.service';
import { TaskItem, TaskItemStatus, TaskPriority, TaskType, CustomFieldType, CreateTaskDto, UpdateTaskDto, CustomFieldUpdateDto, SubTaskUpdateDto, SprintReportDto } from './models/task.model';

import { TaskTableComponent } from './components/task-table.component';
import { TaskDrawerComponent } from './components/task-drawer.component';
import { TaskDashboardComponent } from './components/task-dashboard.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, TaskTableComponent, TaskDrawerComponent, TaskDashboardComponent], // Register standalone components
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Tiêm các services bằng inject()
  private taskService = inject(TaskService);
  protected readonly authService = inject(AuthService);

  @ViewChild('editorDiv') editorDivElement?: ElementRef<HTMLDivElement>;

  // Expose enums ra template
  protected readonly TaskStatus = TaskItemStatus;
  protected readonly TaskPriority = TaskPriority;
  protected readonly TaskType = TaskType;
  protected readonly CustomFieldType = CustomFieldType;

  // Signal quản lý View Mode (Bảng Kanban, Bảng IT Table hoặc Dashboard Báo cáo & Timeline)
  protected readonly viewMode = signal<'kanban' | 'table' | 'report'>('kanban');

  // Signal lưu danh sách Tasks gốc (tải từ API)
  protected readonly tasks = signal<TaskItem[]>([]);

  // Signal lưu dữ liệu báo cáo Sprint
  protected readonly sprintReport = signal<SprintReportDto | null>(null);

  // Quản lý đóng/mở của các hàng Subtask trong bảng
  protected readonly expandedTasks = signal<Record<number, boolean>>({});

  // Lưu trữ lỗi kết nối hoặc thao tác và thông báo thành công
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Signals cho Form tạo mới Task nhanh
  protected readonly newTitle = signal('');
  protected readonly newDescription = signal('');
  protected readonly newDueDate = signal('');
  protected readonly newQuickTaskTitle = signal('');

  // Signal cho Sprint ID được chọn trong báo cáo
  protected readonly selectedSprintId = signal<number>(0);

  // Signals cho Form Đăng nhập / Đăng ký
  protected readonly authUsername = signal('');
  protected readonly authEmail = signal('');
  protected readonly authPassword = signal('');
  protected readonly isRegisterMode = signal(false);

  // Signals cho Modal chỉnh sửa nâng cao
  protected readonly isEditModalOpen = signal(false);
  protected readonly selectedTaskForEdit = signal<TaskItem | null>(null);
  protected readonly editingTitle = signal('');
  protected readonly editingDescription = signal(''); // HTML Mô tả
  protected readonly editingStatus = signal<TaskItemStatus>(TaskItemStatus.Todo);
  protected readonly editingDueDate = signal('');
  protected readonly editingProjectId = signal<number | null>(null);
  protected readonly editingSprintId = signal<number | null>(null);
  protected readonly editingStoryPoints = signal<number | null>(null);
  protected readonly editingPriority = signal<TaskPriority>(TaskPriority.Medium);
  protected readonly editingTaskType = signal<TaskType>(TaskType.Task);
  protected readonly editingCustomFields = signal<CustomFieldUpdateDto[]>([]);
  protected readonly editingSubTasks = signal<SubTaskUpdateDto[]>([]);
  
  // File Upload State
  protected readonly isUploading = signal(false);
  protected readonly uploadedAttachments = signal<string[]>([]);
  protected isDragOver = false;

  // New Subtask local field inside modal
  protected newSubTaskTitle = '';

  // Helper: trả về style cho icon filled/unfilled
  protected filledIconStyle(active: boolean): any {
    return { 'font-variation-settings': active ? '"FILL" 1' : '"FILL" 0' };
  }

  // Bộ lọc dạng Signal
  protected readonly searchQuery = signal('');
  protected readonly selectedAssignee = signal('all');
  protected readonly selectedLabel = signal('all');

  // Trạng thái kéo thả
  protected draggedTask: TaskItem | null = null;
  protected readonly activeDropCol = signal<TaskItemStatus | null>(null);

  protected readonly mockAssignees = [
    { id: 'all', name: 'Tất cả thành viên' },
    { id: 'current', name: 'Chỉ mình tôi' },
    { id: 'Alex', name: 'Alex' },
    { id: 'Sarah', name: 'Sarah' },
    { id: 'John', name: 'John' }
  ];

  protected readonly mockLabels = [
    'Frontend', 'Backend', 'Database', 'Design', 'BugFix', 'API'
  ];

  protected getTaskAssignee(task: TaskItem): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`task_assignee_${task.id}`) || this.authService.currentUser() || 'Chưa gán';
    }
    return 'Chưa gán';
  }

  protected getTaskAssigneeInitials(task: TaskItem): string {
    const name = this.getTaskAssignee(task);
    if (name === 'Chưa gán') return '?';
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  protected getTaskLabels(task: TaskItem): string[] {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`task_labels_${task.id}`);
      if (saved) return saved.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    if (task.taskType === TaskType.Bug) return ['BugFix'];
    if (task.title.toLowerCase().includes('api') || task.title.toLowerCase().includes('gateway')) return ['API', 'Backend'];
    if (task.title.toLowerCase().includes('giao diện') || task.title.toLowerCase().includes('css') || task.title.toLowerCase().includes('design')) return ['Frontend', 'Design'];
    return [];
  }

  protected getTasksByStatus(status: TaskItemStatus): TaskItem[] {
    return this.filteredTasks().filter(t => t.status === status);
  }

  protected readonly filteredTasks = computed(() => {
    let list = this.tasks();
    const query = this.searchQuery().toLowerCase().trim();
    const assignee = this.selectedAssignee();
    const label = this.selectedLabel();

    if (query) {
      list = list.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.description && t.description.toLowerCase().includes(query)) ||
        `proj-${t.id}`.toLowerCase().includes(query)
      );
    }

    if (assignee !== 'all') {
      list = list.filter(t => {
        const tAssignee = this.getTaskAssignee(t);
        if (assignee === 'current') {
          return tAssignee === this.authService.currentUser();
        }
        return tAssignee.toLowerCase() === assignee.toLowerCase();
      });
    }

    if (label !== 'all') {
      list = list.filter(t => {
        const labels = this.getTaskLabels(t);
        return labels.some((l: string) => l.toLowerCase() === label.toLowerCase());
      });
    }

    return list;
  });

  // Kéo thả Handlers
  protected onDragStart(task: TaskItem, event?: DragEvent): void {
    this.draggedTask = task;
    if (event?.dataTransfer) {
      event.dataTransfer.setData('text/plain', task.id.toString());
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOverCol(event: DragEvent, status: TaskItemStatus): void {
    event.preventDefault();
    this.activeDropCol.set(status);
  }

  protected onDragLeaveCol(): void {
    this.activeDropCol.set(null);
  }

  protected onDropCol(event: DragEvent, status: TaskItemStatus): void {
    event.preventDefault();
    this.activeDropCol.set(null);
    if (this.draggedTask && this.draggedTask.status !== status) {
      this.moveTask(this.draggedTask.id, status);
      this.draggedTask = null;
    }
  }

  // Các Computed Signals lọc danh sách cột trạng thái (chỉ áp dụng cho Task gốc)
  protected readonly todoTasks = computed(() => 
    this.filteredTasks().filter(t => t.status === TaskItemStatus.Todo)
  );

  protected readonly inProgressTasks = computed(() => 
    this.filteredTasks().filter(t => t.status === TaskItemStatus.InProgress)
  );

  protected readonly inReviewTasks = computed(() => 
    this.filteredTasks().filter(t => t.status === TaskItemStatus.InReview)
  );

  protected readonly doneTasks = computed(() => 
    this.filteredTasks().filter(t => t.status === TaskItemStatus.Done)
  );

  // Computed: Tính toán vẽ các điểm và đường của biểu đồ Burndown SVG
  protected readonly burndownChartData = computed(() => {
    const report = this.sprintReport();
    if (!report || report.burndownChart.length === 0) {
      return { idealPath: '', actualPath: '', idealPoints: [], actualPoints: [], maxPoints: 10 };
    }

    const points = report.burndownChart;
    const maxPoints = Math.max(10, report.totalStoryPoints);
    const width = 500;
    const height = 200; // Chiều cao đồ thị thực tế chừa biên

    // Tính toán tọa độ cho đường Ideal
    const idealPoints = points.map((p, idx) => {
      const x = idx * (width / (points.length - 1));
      const y = height - (p.idealPoints * (height / maxPoints));
      return { x, y, label: p.dateLabel, val: p.idealPoints };
    });
    const idealPath = 'M ' + idealPoints.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');

    // Tính toán tọa độ cho đường Actual
    const actualPoints = points.map((p, idx) => {
      const x = idx * (width / (points.length - 1));
      const y = height - (p.remainingPoints * (height / maxPoints));
      return { x, y, label: p.dateLabel, val: p.remainingPoints };
    });
    const actualPath = 'M ' + actualPoints.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');

    return { idealPath, actualPath, idealPoints, actualPoints, maxPoints };
  });

  // Computed: Lấy nhãn tiêu đề các cột mốc thời gian trên Gantt Chart
  protected readonly ganttColumns = computed(() => {
    const report = this.sprintReport();
    if (!report || report.burndownChart.length === 0) {
      // Fallback hiển thị 11 cột mặc định
      const cols = [];
      const now = Date.now();
      for (let i = 0; i <= 10; i++) {
        const d = new Date(now - 5 * 24 * 60 * 60 * 1000 + i * 24 * 60 * 60 * 1000);
        cols.push(d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }));
      }
      return cols;
    }
    return report.burndownChart.map(p => p.dateLabel);
  });

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

  loadTasks(): void {
    this.errorMessage.set(null);
    this.taskService.getTasks().subscribe({
      next: (data) => {
        this.tasks.set(data);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách công việc:', err);
        this.errorMessage.set('Không thể kết nối đến backend API. Hãy đảm bảo dự án backend dotnet đang chạy.');
      }
    });
  }

  // Chuyển đổi View Mode
  switchViewMode(mode: 'kanban' | 'table' | 'report'): void {
    this.viewMode.set(mode);
    if (mode === 'report') {
      this.loadSprintReport(0); // Load Sprint giả lập hoặc mặc định
    }
  }

  // Gọi API tải dữ liệu báo cáo Sprint
  loadSprintReport(sprintId: number): void {
    this.taskService.getSprintReport(sprintId).subscribe({
      next: (report) => {
        this.sprintReport.set(report);
      },
      error: (err) => {
        console.error('Lỗi khi tải báo cáo Sprint:', err);
      }
    });
  }

  addNewTask(): void {
    const title = this.newTitle().trim();
    if (!title) {
      alert('Vui lòng nhập tiêu đề công việc!');
      return;
    }

    const newTaskDto: CreateTaskDto = {
      title: title,
      description: this.newDescription().trim() || undefined,
      dueDate: this.newDueDate() ? new Date(this.newDueDate()).toISOString() : undefined,
      priority: TaskPriority.Medium,
      taskType: TaskType.Task
    };

    this.errorMessage.set(null);
    this.taskService.createTask(newTaskDto).subscribe({
      next: (createdTask) => {
        this.tasks.update(currentTasks => [...currentTasks, createdTask]);
        this.newTitle.set('');
        this.newDescription.set('');
        this.newDueDate.set('');
        
        // Nếu đang mở tab báo cáo thì reload lại báo cáo
        if (this.viewMode() === 'report') {
          this.loadSprintReport(0);
        }
      },
      error: (err) => {
        console.error('Lỗi khi tạo công việc mới:', err);
        this.errorMessage.set('Lỗi khi thêm mới công việc.');
      }
    });
  }

  protected addQuickTaskFromCol(event: any, status: TaskItemStatus): void {
    const inputEl = event.target as HTMLInputElement;
    const title = inputEl.value.trim();
    if (!title) return;

    const newTaskDto: CreateTaskDto = {
      title: title,
      priority: TaskPriority.Medium,
      taskType: TaskType.Task
    };

    this.errorMessage.set(null);
    this.taskService.createTask(newTaskDto).subscribe({
      next: (createdTask) => {
        if (status !== TaskItemStatus.Todo) {
          this.taskService.updateStatus(createdTask.id, status).subscribe({
            next: () => {
              createdTask.status = status;
              this.tasks.update(current => [...current, createdTask]);
            }
          });
        } else {
          this.tasks.update(current => [...current, createdTask]);
        }
        inputEl.value = '';
      },
      error: (err) => {
        console.error('Lỗi khi tạo nhanh công việc:', err);
        this.errorMessage.set('Lỗi khi tạo nhanh công việc.');
      }
    });
  }

  moveTask(id: number, newStatus: TaskItemStatus): void {
    this.errorMessage.set(null);
    this.taskService.updateStatus(id, newStatus).subscribe({
      next: () => {
        this.tasks.update(currentTasks => 
          currentTasks.map(t => t.id === id ? { ...t, status: newStatus } : t)
        );
        if (this.viewMode() === 'report') {
          this.loadSprintReport(0);
        }
      },
      error: (err) => {
        console.error('Lỗi khi cập nhật trạng thái:', err);
        this.errorMessage.set('Không thể cập nhật trạng thái công việc.');
      }
    });
  }

  deleteTask(id: number): void {
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này không?')) {
      return;
    }

    this.errorMessage.set(null);
    this.taskService.deleteTask(id).subscribe({
      next: () => {
        this.tasks.update(currentTasks => currentTasks.filter(t => t.id !== id));
        if (this.viewMode() === 'report') {
          this.loadSprintReport(0);
        }
      },
      error: (err) => {
        console.error('Lỗi khi xóa công việc:', err);
        this.errorMessage.set('Không thể xóa công việc.');
      }
    });
  }

  protected onTaskDrop(status: TaskItemStatus): void {
    this.onDropCol(new DragEvent('drop'), status);
  }

  protected onQuickStatusChange(event: { id: number, status: TaskItemStatus }): void {
    this.moveTask(event.id, event.status);
  }

  protected onSprintChange(sprintId: number): void {
    this.selectedSprintId.set(sprintId);
    this.loadSprintReport(sprintId);
  }

  // --- LOGIC CHO BẢNG DANH SÁCH (TABLE VIEW) ---
  toggleExpandTask(taskId: number): void {
    this.expandedTasks.update(current => ({
      ...current,
      [taskId]: !current[taskId]
    }));
  }

  // --- LOGIC CHO ROADMAP TIMELINE (GANTT CHART POSITIONING) ---
  protected getGanttStyle(startDateStr: string, dueDateStr?: string): { left: string, width: string } {
    const report = this.sprintReport();
    
    // Khởi tạo biên thời gian mặc định 10 ngày (trùng với sprint giả lập)
    let start = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    let end = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    
    if (report && report.burndownChart.length > 0) {
      start = new Date(report.burndownChart[0].date);
      end = new Date(report.burndownChart[report.burndownChart.length - 1].date);
    }
    
    const totalMs = end.getTime() - start.getTime();
    const taskStart = new Date(startDateStr);
    
    // Nếu không có DueDate, mặc định kéo dài trong 1 ngày
    const taskEnd = dueDateStr ? new Date(dueDateStr) : new Date(taskStart.getTime() + 24 * 60 * 60 * 1000);
    
    let left = ((taskStart.getTime() - start.getTime()) / totalMs) * 100;
    let width = ((taskEnd.getTime() - taskStart.getTime()) / totalMs) * 100;
    
    // Giới hạn biên độ hiển thị
    if (left < 0) {
      width += left;
      left = 0;
    }
    if (left + width > 100) {
      width = 100 - left;
    }
    if (width < 4) width = 4; // Tối thiểu 4% để hiển thị được thanh
    if (left > 100) left = 96;

    return {
      left: `${left.toFixed(1)}%`,
      width: `${width.toFixed(1)}%`
    };
  }

  // --- LOGIC CHO FORM CHỈNH SỬA MODAL ---
  openEditModal(task: TaskItem): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (task.id === 0) {
      // Bypass loading API endpoint for new tasks
      this.selectedTaskForEdit.set(task);
      this.editingTitle.set('');
      this.editingDescription.set('');
      this.editingStatus.set(TaskItemStatus.Todo);
      this.editingDueDate.set('');
      this.editingProjectId.set(null);
      this.editingSprintId.set(null);
      this.editingStoryPoints.set(null);
      this.editingPriority.set(TaskPriority.Medium);
      this.editingTaskType.set(TaskType.Task);
      this.editingCustomFields.set([]);
      this.editingSubTasks.set([]);
      this.uploadedAttachments.set([]);
      this.isEditModalOpen.set(true);
      return;
    }

    // Tải chi tiết task từ API để có thông tin đầy đủ nhất (kèm subtasks, custom fields)
    this.taskService.getTask(task.id).subscribe({
      next: (fullTask) => {
        this.selectedTaskForEdit.set(fullTask);
        this.editingTitle.set(fullTask.title);
        this.editingDescription.set(fullTask.description || '');
        this.editingStatus.set(fullTask.status);
        this.editingDueDate.set(fullTask.dueDate ? fullTask.dueDate.substring(0, 16) : '');
        this.editingProjectId.set(fullTask.projectId || null);
        this.editingSprintId.set(fullTask.sprintId || null);
        this.editingStoryPoints.set(fullTask.storyPoints || null);
        this.editingPriority.set(fullTask.priority);
        this.editingTaskType.set(fullTask.taskType);

        // Ánh xạ các trường động EAV
        const cfUpdates = fullTask.customFields.map(cf => ({
          customFieldId: cf.customFieldId,
          value: cf.value
        }));
        this.editingCustomFields.set(cfUpdates);

        // Ánh xạ các subtasks hiện tại
        const subUpdates = fullTask.subTasks.map(sub => ({
          id: sub.id,
          title: sub.title,
          description: sub.description,
          status: sub.status,
          priority: sub.priority,
          taskType: sub.taskType,
          storyPoints: sub.storyPoints,
          dueDate: sub.dueDate ? sub.dueDate.substring(0, 16) : undefined
        }));
        this.editingSubTasks.set(subUpdates);

        // Reset list ảnh đính kèm vừa tải lên trong phiên làm việc này
        this.uploadedAttachments.set([]);

        this.isEditModalOpen.set(true);
      },
      error: (err) => {
        console.error('Không thể tải chi tiết công việc:', err);
        alert('Có lỗi xảy ra khi tải chi tiết công việc.');
      }
    });
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedTaskForEdit.set(null);
  }

  // Cập nhật giá trị trường động cục bộ
  updateCustomFieldLocal(fieldId: number, event: any, type: CustomFieldType): void {
    let value = '';
    if (type === CustomFieldType.Boolean) {
      value = event.target.checked ? 'true' : 'false';
    } else {
      value = event.target.value;
    }

    this.editingCustomFields.update(fields => {
      const idx = fields.findIndex(f => f.customFieldId === fieldId);
      if (idx !== -1) {
        fields[idx].value = value;
        return [...fields];
      } else {
        return [...fields, { customFieldId: fieldId, value }];
      }
    });
  }

  getCustomFieldValue(fieldId: number): string {
    const field = this.editingCustomFields().find(f => f.customFieldId === fieldId);
    return field ? field.value : '';
  }

  // Thêm nhanh Subtask cục bộ trong modal
  addSubTaskLocal(): void {
    const title = this.newSubTaskTitle.trim();
    if (!title) return;

    const newSub: SubTaskUpdateDto = {
      title,
      status: TaskItemStatus.Todo,
      priority: TaskPriority.Medium,
      taskType: TaskType.Task
    };

    this.editingSubTasks.update(subs => [...subs, newSub]);
    this.newSubTaskTitle = '';
  }

  // Xóa Subtask cục bộ khỏi danh sách trong modal
  removeSubTaskLocal(index: number): void {
    this.editingSubTasks.update(subs => subs.filter((_, idx) => idx !== index));
  }

  // Thực hiện Lưu thông tin cập nhật (API PUT)
  saveTaskEdit(): void {
    const task = this.selectedTaskForEdit();
    if (!task) return;

    const updateDto: UpdateTaskDto = {
      title: this.editingTitle().trim(),
      description: this.editingDescription(),
      status: this.editingStatus(),
      dueDate: this.editingDueDate() ? new Date(this.editingDueDate()).toISOString() : undefined,
      projectId: this.editingProjectId() || undefined,
      sprintId: this.editingSprintId() || undefined,
      storyPoints: this.editingStoryPoints() || undefined,
      priority: this.editingPriority(),
      taskType: this.editingTaskType(),
      customFields: this.editingCustomFields(),
      subTasks: this.editingSubTasks()
    };

    this.errorMessage.set(null);
    this.taskService.updateTask(task.id, updateDto).subscribe({
      next: (res) => {
        // Cập nhật lại UI sau khi lưu thành công
        this.loadTasks();
        this.closeEditModal();
        if (this.viewMode() === 'report') {
          this.loadSprintReport(0);
        }
        alert('Đã cập nhật công việc thành công!');
      },
      error: (err) => {
        console.error('Lỗi khi cập nhật công việc:', err);
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi lưu thay đổi.');
      }
    });
  }

  // --- LOGIC CHO WYSIWYG RICH TEXT EDITOR ---
  execEditorCommand(command: string, value: string = ''): void {
    document.execCommand(command, false, value);
    this.updateDescriptionFromEditor();
  }

  insertLinkPrompt(): void {
    const url = prompt('Nhập địa chỉ liên kết (URL):', 'https://');
    if (url) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank'; // Mở tab mới
        link.rel = 'noopener noreferrer';
        link.textContent = selection.toString() || url;

        range.deleteContents();
        range.insertNode(link);

        this.updateDescriptionFromEditor();
      }
    }
  }

  onEditorInput(html: string): void {
    this.editingDescription.set(html);
  }

  private updateDescriptionFromEditor(): void {
    if (this.editorDivElement) {
      this.editingDescription.set(this.editorDivElement.nativeElement.innerHTML);
    }
  }

  // --- LOGIC CHO DRAG & DROP UPLOAD FILE ĐÍNH KÈM ---
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.uploadFile(file);
    }
  }

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      this.uploadFile(file);
    }
  }

  private uploadFile(file: File): void {
    const task = this.selectedTaskForEdit();
    if (!task) return;

    this.isUploading.set(true);
    this.taskService.uploadAttachment(task.id, file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.uploadedAttachments.update(current => [...current, res.url]);
        
        // Tự động chèn link ảnh vừa tải lên vào Rich Editor
        this.insertImageToEditor(res.url, res.fileName);
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Lỗi khi tải ảnh lên:', err);
        alert(err.error?.message || 'Không thể tải ảnh lên.');
      }
    });
  }

  private insertImageToEditor(url: string, fileName: string): void {
    if (this.editorDivElement) {
      const editor = this.editorDivElement.nativeElement;
      editor.focus();
      const imgHtml = `<img src="${url}" alt="${fileName}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`;
      document.execCommand('insertHTML', false, imgHtml);
      this.updateDescriptionFromEditor();
    }
  }

  // --- LOGIC ĐĂNG NHẬP / ĐĂNG KÝ (GIỮ NGUYÊN) ---
  handleAuthSubmit(): void {
    if (this.isRegisterMode()) {
      this.register();
    } else {
      this.login();
    }
  }

  login(): void {
    const username = this.authUsername().trim();
    const password = this.authPassword().trim();
    if (!username || (username.toLowerCase() !== 'admin' && !password)) {
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
        this.isRegisterMode.set(false);
      },
      error: (err) => {
        console.error('Đăng ký thất bại:', err);
        this.errorMessage.set(err.error?.message || 'Đăng ký thất bại. Tên đăng nhập hoặc Email đã tồn tại.');
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.tasks.set([]);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.authUsername.set('');
    this.authEmail.set('');
    this.authPassword.set('');
    this.isEditModalOpen.set(false);
    this.selectedTaskForEdit.set(null);
  }
}
