import { Component, Input, Output, EventEmitter, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskItem, TaskItemStatus, TaskPriority, TaskType } from '../models/task.model';

interface TaskGroup {
  name: string;
  badgeClass?: string;
  tasks: TaskItem[];
}

@Component({
  selector: 'app-task-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="saas-table-card">
      <!-- 1. Thanh bộ lọc thông minh (Smart Filter Bar) -->
      <div class="saas-filter-bar">
        <!-- Ô Tìm kiếm -->
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Tìm kiếm theo tiêu đề hoặc mô tả..."
            class="filter-control search-input"
          />
          <button *ngIf="searchQuery()" (click)="searchQuery.set('')" class="clear-search-btn">✕</button>
        </div>

        <!-- Các Dropdown Lọc nhanh -->
        <div class="filters-dropdowns">
          <!-- Lọc theo Độ ưu tiên -->
          <div class="filter-dropdown-group">
            <span class="dropdown-label">Độ ưu tiên:</span>
            <select
              [ngModel]="filterPriority()"
              (ngModelChange)="filterPriority.set($event)"
              class="filter-control select-dropdown"
            >
              <option value="all">Tất cả</option>
              <option [value]="TaskPriority.Critical">Critical</option>
              <option [value]="TaskPriority.High">High</option>
              <option [value]="TaskPriority.Medium">Medium</option>
              <option [value]="TaskPriority.Low">Low</option>
            </select>
          </div>

          <!-- Nhóm theo (Group By) -->
          <div class="filter-dropdown-group">
            <span class="dropdown-label">Gom nhóm:</span>
            <select
              [ngModel]="groupBy()"
              (ngModelChange)="groupBy.set($event)"
              class="filter-control select-dropdown group-by-select"
            >
              <option value="none">Không nhóm (Dạng cây)</option>
              <option value="status">Trạng thái (Todo/Doing/Done)</option>
              <option value="epic">Epic (Theo nhóm Epic)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 2. Bảng dữ liệu chính (Main Tree Table) -->
      <div class="saas-table-wrapper">
        <table class="saas-data-table">
          <thead>
            <tr>
              <th style="width: 48px;"></th> <!-- Collapse arrow -->
              <th style="width: 80px;">Mã</th>
              <th style="width: 100px;">Loại</th>
              <th>Tiêu đề công việc</th>
              <th style="width: 100px; text-align: center;">Story Points</th>
              <th style="width: 120px;">Độ ưu tiên</th>
              <th style="width: 130px;">Trạng thái</th>
              <th style="width: 140px;">Ngày hết hạn</th>
              <th style="width: 120px; text-align: right;">Hành động</th>
            </tr>
          </thead>

          <!-- NHÓM 1: KHÔNG NHÓM (Dạng Cây lồng nhau chuẩn) -->
          <tbody *ngIf="groupBy() === 'none'">
            <tr *ngIf="rootTasks().length === 0" class="empty-row-container">
              <td colspan="9" class="table-empty-message">Không tìm thấy công việc nào thỏa mãn bộ lọc.</td>
            </tr>
            <ng-container *ngFor="let task of rootTasks()">
              <!-- Hàng Task cha -->
              <ng-container *ngTemplateOutlet="taskRowTemplate; context: { $implicit: task, indent: false }"></ng-container>
              <!-- Hàng chứa Subtasks nếu mở rộng -->
              <ng-container *ngIf="expandedTasks()[task.id] && task.subTasks && task.subTasks.length > 0">
                <ng-container *ngFor="let sub of task.subTasks">
                  <ng-container *ngTemplateOutlet="taskRowTemplate; context: { $implicit: sub, indent: true }"></ng-container>
                </ng-container>
              </ng-container>
            </ng-container>
          </tbody>

          <!-- NHÓM 2: GOM NHÓM THEO TRẠNG THÁI HOẶC EPIC -->
          <tbody *ngIf="groupBy() !== 'none'">
            <tr *ngIf="groupedTasks().length === 0" class="empty-row-container">
              <td colspan="9" class="table-empty-message">Không tìm thấy dữ liệu gom nhóm thỏa mãn bộ lọc.</td>
            </tr>
            <ng-container *ngFor="let group of groupedTasks()">
              <!-- Dòng tiêu đề Nhóm (Group Header Row) -->
              <tr class="table-group-header-row">
                <td colspan="9">
                  <div class="group-header-content">
                    <span class="group-dot" [class]="group.badgeClass"></span>
                    <strong class="group-name">{{ group.name }}</strong>
                    <span class="group-count-badge">{{ group.tasks.length }} tasks</span>
                  </div>
                </td>
              </tr>

              <!-- Các Task thuộc Nhóm -->
              <ng-container *ngFor="let task of group.tasks">
                <ng-container *ngTemplateOutlet="taskRowTemplate; context: { $implicit: task, indent: false }"></ng-container>
                <!-- Hàng chứa Subtasks nếu mở rộng -->
                <ng-container *ngIf="expandedTasks()[task.id] && task.subTasks && task.subTasks.length > 0">
                  <ng-container *ngFor="let sub of task.subTasks">
                    <ng-container *ngTemplateOutlet="taskRowTemplate; context: { $implicit: sub, indent: true }"></ng-container>
                  </ng-container>
                </ng-container>
              </ng-container>
            </ng-container>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TÁI SỬ DỤNG TEMPLATE ROW CHO CẢ CHA VÀ CON -->
    <ng-template #taskRowTemplate let-task let-indent="indent">
      <tr class="saas-task-row" 
          [class.subtask-row-indent]="indent"
          [class.overdue-row]="isOverdue(task)"
          [class.row-completed]="task.status === TaskStatus.Done">
        
        <!-- Cột icon mở rộng -->
        <td class="text-center font-bold">
          <button
            *ngIf="!indent && task.subTasks && task.subTasks.length > 0"
            (click)="toggleExpand(task.id, $event)"
            class="expand-toggle-btn"
          >
            {{ expandedTasks()[task.id] ? '▼' : '▶' }}
          </button>
          <span *ngIf="indent" class="subtask-arrow-indicator">↳</span>
        </td>

        <!-- Cột ID -->
        <td class="task-id-cell font-mono">#{{ task.id }}</td>

        <!-- Cột Loại Task -->
        <td>
          <span class="saas-badge type-badge" [attr.data-type]="task.taskType">{{ task.taskType }}</span>
        </td>

        <!-- Cột Tiêu đề công việc -->
        <td class="task-title-cell">
          <span class="task-title-text" (click)="onEdit.emit(task)">{{ task.title }}</span>
          <span *ngIf="!indent && task.subTasks && task.subTasks.length > 0" class="subtasks-count-pill">
            {{ task.subTasks.length }} con
          </span>
        </td>

        <!-- Cột Story Points -->
        <td class="text-center font-bold">{{ task.storyPoints || '-' }}</td>

        <!-- Cột Độ ưu tiên -->
        <td>
          <span class="saas-badge priority-badge" [attr.data-priority]="task.priority">{{ task.priority }}</span>
        </td>

        <!-- Cột Trạng thái -->
        <td>
          <span class="saas-badge status-badge" [attr.data-status]="task.status">{{ task.status }}</span>
        </td>

        <!-- Cột Ngày hết hạn -->
        <td class="date-time-cell">
          {{ (task.dueDate | date: 'dd/MM/yyyy HH:mm') || '-' }}
        </td>

        <!-- Cột Hành động nhanh (Quick Actions) -->
        <td class="quick-actions-cell">
          <div class="actions-wrapper">
            <!-- Thay đổi trạng thái nhanh -->
            <button
              *ngIf="task.status !== TaskStatus.Done"
              (click)="quickComplete(task, $event)"
              class="action-btn btn-quick-done"
              title="Đánh dấu hoàn thành"
            >
              ✓
            </button>
            <button
              (click)="onEdit.emit(task); $event.stopPropagation()"
              class="action-btn btn-quick-edit"
              title="Chỉnh sửa chi tiết"
            >
              ✏️
            </button>
            <button
              (click)="onDelete.emit(task.id); $event.stopPropagation()"
              class="action-btn btn-quick-delete"
              title="Xóa công việc"
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
    </ng-template>
  `,
  styles: [`
    .saas-table-card {
      background: #ffffff;
      border: 1px solid #c3c6d6;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(9, 30, 66, 0.13);
      padding: 20px;
      margin-bottom: 30px;
      transition: box-shadow 0.3s ease;
      color: #091c35;
    }

    .saas-table-card:hover {
      box-shadow: 0 4px 12px rgba(9, 30, 66, 0.15);
    }

    /* 1. Filter Bar */
    .saas-filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 280px;
      max-width: 450px;
    }

    .search-icon {
      position: absolute;
      left: 14px;
      color: #737685;
      font-size: 0.95rem;
      pointer-events: none;
    }

    .filter-control {
      padding: 10px 14px;
      border: 1px solid #c3c6d6;
      border-radius: 10px;
      font-family: inherit;
      font-size: 0.9rem;
      background: #f0f3ff;
      color: #091c35;
      outline: none;
      transition: all 0.2s ease;
    }

    .filter-control:focus {
      border-color: #003d9b;
      box-shadow: 0 0 0 3px rgba(0, 61, 155, 0.1);
    }

    .search-input {
      width: 100%;
      padding-left: 38px;
      padding-right: 36px;
    }

    .clear-search-btn {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: #737685;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 4px;
      border-radius: 50%;
    }

    .clear-search-btn:hover {
      background: #dfe8ff;
      color: #091c35;
    }

    .filters-dropdowns {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .filter-dropdown-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dropdown-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #434654;
    }

    .select-dropdown {
      min-width: 120px;
      cursor: pointer;
      font-weight: 500;
    }

    .group-by-select {
      min-width: 180px;
      background: #e7eeff;
      border-color: #c3c6d6;
      font-weight: 600;
      color: #091c35;
    }

    /* 2. Table Styles */
    .saas-table-wrapper {
      width: 100%;
      overflow-x: auto;
    }

    .saas-data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .saas-data-table th {
      background: #e7eeff;
      color: #434654;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 12px 16px;
      border-bottom: 2px solid #c3c6d6;
      user-select: none;
    }

    .saas-data-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #c3c6d6;
      font-size: 0.9rem;
      vertical-align: middle;
      color: #091c35;
    }

    .saas-task-row {
      transition: background-color 0.15s ease;
      height: 48px;
    }

    .saas-task-row:hover {
      background-color: rgba(223, 232, 255, 0.5);
    }

    .saas-task-row.overdue-row {
      background-color: rgba(186, 26, 26, 0.08);
    }

    .saas-task-row.overdue-row:hover {
      background-color: rgba(186, 26, 26, 0.15);
    }

    .saas-task-row.row-completed .task-title-text {
      color: #737685;
      text-decoration: line-through;
    }

    .subtask-row-indent {
      background-color: rgba(240, 243, 255, 0.6);
    }

    .subtask-row-indent td:nth-child(4) {
      padding-left: 20px;
    }

    .expand-toggle-btn {
      background: none;
      border: none;
      color: #737685;
      cursor: pointer;
      font-size: 0.72rem;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .expand-toggle-btn:hover {
      color: #003d9b;
      background: #dfe8ff;
    }

    .subtask-arrow-indicator {
      color: #003d9b;
      font-weight: 700;
      font-size: 1rem;
    }

    .saas-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      display: inline-block;
      text-align: center;
      min-width: 76px;
      text-transform: capitalize;
    }

    .status-badge[data-status="Todo"] { background: #dfe8ff; color: #003d9b; }
    .status-badge[data-status="InProgress"] { background: rgba(0, 61, 155, 0.1); color: #003d9b; border: 1px solid rgba(0, 61, 155, 0.3); }
    .status-badge[data-status="Done"] { background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3); }

    .priority-badge[data-priority="Critical"] { background: rgba(248, 113, 113, 0.15); color: #dc2626; border: 1px solid rgba(248, 113, 113, 0.4); }
    .priority-badge[data-priority="High"] { background: rgba(245, 158, 11, 0.12); color: #d97706; }
    .priority-badge[data-priority="Medium"] { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
    .priority-badge[data-priority="Low"] { background: #dfe8ff; color: #434654; }

    .type-badge[data-type="Bug"] { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
    .type-badge[data-type="Epic"] { background: rgba(192, 132, 252, 0.12); color: #9333ea; border: 1px solid rgba(192, 132, 252, 0.3); }
    .type-badge[data-type="Story"] { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
    .type-badge[data-type="Task"] { background: #dfe8ff; color: #434654; }

    .subtasks-count-pill {
      font-size: 0.72rem;
      background: #dfe8ff;
      color: #434654;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 99px;
      margin-left: 8px;
    }

    .task-title-cell {
      max-width: 320px;
    }

    .task-title-text {
      font-weight: 600;
      color: #091c35;
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .task-title-text:hover {
      color: #003d9b;
      text-decoration: underline;
    }

    .task-id-cell {
      color: #737685;
      font-weight: 600;
    }

    .date-time-cell {
      color: #737685;
      font-weight: 500;
    }

    .quick-actions-cell {
      text-align: right;
    }

    .actions-wrapper {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }

    .action-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid #c3c6d6;
      background: #f0f3ff;
      color: #434654;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      transition: all 0.15s ease;
    }

    .btn-quick-done:hover {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #059669;
    }

    .btn-quick-edit:hover {
      background: #dfe8ff;
      border-color: #c3c6d6;
      color: #003d9b;
    }

    .btn-quick-delete:hover {
      background: rgba(220, 38, 38, 0.1);
      border-color: rgba(220, 38, 38, 0.4);
      color: #dc2626;
    }

    .table-group-header-row {
      background: #f0f3ff;
    }

    .table-group-header-row td {
      padding: 10px 16px !important;
      border-bottom: 2px solid #c3c6d6 !important;
    }

    .group-header-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .group-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .group-dot.Todo { background: #003d9b; }
    .group-dot.InProgress { background: #f59e0b; }
    .group-dot.Done { background: #10b981; }
    .group-dot.Epic { background: #c084fc; }
    .group-dot.NoEpic { background: #737685; }

    .group-name {
      font-size: 0.85rem;
      color: #091c35;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .group-count-badge {
      font-size: 0.72rem;
      background: #e7eeff;
      color: #434654;
      border: 1px solid #c3c6d6;
      padding: 2px 8px;
      border-radius: 99px;
      font-weight: 600;
    }

    .table-empty-message {
      text-align: center;
      padding: 30px !important;
      color: #737685;
      font-style: italic;
    }

    .text-center { text-align: center; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
  `]
})
export class TaskTableComponent {
  readonly tasks = input<TaskItem[]>([]);

  @Output() onEdit = new EventEmitter<TaskItem>();
  @Output() onDelete = new EventEmitter<number>();
  @Output() onStatusChange = new EventEmitter<{ id: number, status: TaskItemStatus }>();

  // Expose Enums ra template
  protected readonly TaskStatus = TaskItemStatus;
  protected readonly TaskPriority = TaskPriority;
  protected readonly TaskType = TaskType;

  // Signal cho bộ lọc
  protected readonly searchQuery = signal('');
  protected readonly filterPriority = signal<string>('all');
  protected readonly filterAssignee = signal<string>('all');
  protected readonly filterSprint = signal<string>('all');
  protected readonly groupBy = signal<'none' | 'status' | 'epic'>('none');

  // Signal lưu đóng/mở hàng con
  protected readonly expandedTasks = signal<Record<number, boolean>>({});

  // 1. Danh sách Tasks sau khi lọc (Dùng chung cho cả 2 chế độ hiển thị)
  private readonly filteredTasks = computed(() => {
    const all = this.tasks();
    const query = this.searchQuery().toLowerCase().trim();
    const priority = this.filterPriority();

    return all.filter((t: TaskItem) => {
      const matchesSearch = t.title.toLowerCase().includes(query) || 
                            (t.description && t.description.toLowerCase().includes(query));
      const matchesPriority = priority === 'all' || t.priority === priority;
      return matchesSearch && matchesPriority;
    });
  });

  // 2. Chế độ 1: Danh sách Root Tasks dạng cây
  protected readonly rootTasks = computed(() => {
    // Chỉ lấy các Task gốc (không có parentTaskId) đã qua bộ lọc
    return this.filteredTasks().filter((t: TaskItem) => !t.parentTaskId);
  });

  // 3. Chế độ 2: Gom nhóm động
  protected readonly groupedTasks = computed<TaskGroup[]>(() => {
    const list = this.filteredTasks();
    const mode = this.groupBy();

    if (mode === 'status') {
      return [
        {
          name: 'Cần làm (Todo)',
          badgeClass: 'Todo',
          tasks: list.filter((t: TaskItem) => t.status === TaskItemStatus.Todo)
        },
        {
          name: 'Đang làm (In Progress)',
          badgeClass: 'InProgress',
          tasks: list.filter((t: TaskItem) => t.status === TaskItemStatus.InProgress)
        },
        {
          name: 'Đã xong (Done)',
          badgeClass: 'Done',
          tasks: list.filter((t: TaskItem) => t.status === TaskItemStatus.Done)
        }
      ].filter((g: TaskGroup) => g.tasks.length > 0);
    }

    if (mode === 'epic') {
      // Tìm tất cả các Epic có trong danh sách
      const epics = list.filter((t: TaskItem) => t.taskType === TaskType.Epic);
      
      const groups: TaskGroup[] = epics.map((epic: TaskItem) => {
        // Lấy tất cả task con trực tiếp của Epic này
        const children = list.filter((t: TaskItem) => t.parentTaskId === epic.id);
        return {
          name: `Epic: ${epic.title}`,
          badgeClass: 'Epic',
          // Đặt Epic lên đầu danh sách nhóm, theo sau là các task thuộc Epic
          tasks: [epic, ...children]
        };
      });

      // Lấy các task còn lại không phải Epic và không thuộc Epic nào
      const epicIds = epics.map((e: TaskItem) => e.id);
      const orphanTasks = list.filter((t: TaskItem) => 
        t.taskType !== TaskType.Epic && 
        (!t.parentTaskId || !epicIds.includes(t.parentTaskId))
      );

      if (orphanTasks.length > 0) {
        groups.push({
          name: 'Không thuộc Epic nào',
          badgeClass: 'NoEpic',
          tasks: orphanTasks
        });
      }

      return groups.filter((g: TaskGroup) => g.tasks.length > 0);
    }

    return [];
  });

  protected isOverdue(task: TaskItem): boolean {
    if (!task.dueDate || task.status === TaskItemStatus.Done) {
      return false;
    }
    return new Date(task.dueDate) < new Date();
  }

  protected toggleExpand(taskId: number, event: Event): void {
    event.stopPropagation();
    this.expandedTasks.update((current: Record<number, boolean>) => ({
      ...current,
      [taskId]: !current[taskId]
    }));
  }

  protected quickComplete(task: TaskItem, event: Event): void {
    event.stopPropagation();
    this.onStatusChange.emit({ id: task.id, status: TaskItemStatus.Done });
  }
}
