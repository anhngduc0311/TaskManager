import { Component, Input, OnInit, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskItem, TaskItemStatus, TaskPriority, TaskType } from '../models/task.model';

@Component({
  selector: 'app-gantt-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gantt-container bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-md">
      <!-- Header -->
      <div class="flex justify-between items-center pb-4 border-b border-outline-variant mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-3xl">timeline</span>
            Biểu đồ Gantt công việc (Team Roadmap)
          </h2>
          <p class="text-sm text-gray-500 mt-1">Theo dõi lộ trình, thời gian bắt đầu (Ngày tạo) và hạn chót (Due Date) của cả đội.</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-500 flex items-center gap-1">
            <span class="w-3 h-3 rounded-full bg-slate-300 inline-block"></span> Todo
          </span>
          <span class="text-xs text-gray-500 flex items-center gap-1">
            <span class="w-3 h-3 rounded-full bg-blue-400 inline-block"></span> InProgress
          </span>
          <span class="text-xs text-gray-500 flex items-center gap-1">
            <span class="w-3 h-3 rounded-full bg-purple-400 inline-block"></span> InReview
          </span>
          <span class="text-xs text-gray-500 flex items-center gap-1">
            <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Done
          </span>
        </div>
      </div>

      <!-- Gantt Wrapper -->
      <div class="gantt-scroll-wrapper border border-outline-variant/60 rounded-xl overflow-hidden bg-white">
        
        <!-- Header row of Gantt: Left pane header and Right timeline header -->
        <div class="gantt-header-row flex bg-slate-50 border-b border-outline-variant">
          <!-- Left side header -->
          <div class="gantt-left-pane-header w-[320px] min-w-[320px] p-3 text-sm font-bold text-gray-600 border-r border-outline-variant">
            Nhiệm vụ / Công việc
          </div>
          <!-- Right side header (Days timeline) -->
          <div class="gantt-timeline-header flex-1 overflow-x-auto select-none flex">
            <div 
              *ngFor="let day of timelineDays()" 
              class="gantt-day-header w-12 min-w-[48px] text-center py-2 border-r border-outline-variant/30 flex flex-col justify-center items-center"
              [class.bg-blue-50]="isToday(day)"
            >
              <span class="text-[10px] text-gray-400 font-bold uppercase">{{ getDayOfWeekName(day) }}</span>
              <span class="text-xs font-semibold" [class.text-primary]="isToday(day)">{{ day.getDate() }}</span>
            </div>
          </div>
        </div>

        <!-- Body Rows -->
        <div class="gantt-body">
          <div 
            *ngFor="let task of rootTasks()" 
            class="gantt-row flex border-b border-outline-variant/40 hover:bg-slate-50/50 transition-colors"
          >
            <!-- Left Pane: Task Details -->
            <div class="gantt-left-pane w-[320px] min-w-[320px] p-3 border-r border-outline-variant flex flex-col justify-center gap-1">
              <div class="flex items-center gap-1.5">
                <span 
                  class="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  [ngClass]="{
                    'bg-red-100 text-red-700': task.taskType === TaskType.Bug,
                    'bg-blue-100 text-blue-700': task.taskType === TaskType.Task,
                    'bg-green-100 text-green-700': task.taskType === TaskType.Story,
                    'bg-purple-100 text-purple-700': task.taskType === TaskType.Epic
                  }"
                >
                  {{ task.taskType }}
                </span>
                <span class="text-xs text-gray-400 font-mono">KAN-{{ task.id }}</span>
              </div>
              <span class="text-sm font-bold text-gray-800 truncate" [title]="task.title">
                {{ task.title }}
              </span>
              <div class="flex items-center justify-between text-[11px] text-gray-500 mt-0.5">
                <span class="flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-[12px]">calendar_today</span>
                  {{ task.createdDate | date: 'dd/MM' }} - {{ task.dueDate ? (task.dueDate | date: 'dd/MM') : '—' }}
                </span>
                <span class="font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                  {{ task.status }}
                </span>
              </div>
            </div>

            <!-- Right Pane: Timeline Bars -->
            <div class="gantt-right-pane flex-1 relative min-h-[64px] flex items-center bg-slate-50/25">
              <!-- Background grid lines -->
              <div class="absolute inset-0 flex pointer-events-none">
                <div 
                  *ngFor="let day of timelineDays()" 
                  class="w-12 min-w-[48px] h-full border-r border-outline-variant/20"
                  [class.bg-blue-50/10]="isToday(day)"
                ></div>
              </div>

              <!-- Bar -->
              <div 
                *ngIf="getBarProperties(task) as bar"
                class="absolute h-8 rounded-lg shadow-sm border px-3 flex items-center text-xs font-bold text-white transition-all cursor-pointer group/bar hover:scale-[1.01] hover:shadow-md"
                [ngClass]="{
                  'bg-slate-400 border-slate-500': task.status === TaskStatus.Todo,
                  'bg-blue-500 border-blue-600': task.status === TaskStatus.InProgress,
                  'bg-purple-500 border-purple-600': task.status === TaskStatus.InReview,
                  'bg-emerald-500 border-emerald-600': task.status === TaskStatus.Done
                }"
                [style.left.px]="bar.leftOffset"
                [style.width.px]="bar.width"
              >
                <span class="truncate pr-2 select-none">{{ task.title }}</span>

                <!-- Tooltip hover details -->
                <div class="invisible group-hover/bar:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900/95 text-white p-3 rounded-lg text-xs leading-relaxed z-50 shadow-xl pointer-events-none flex flex-col gap-1 border border-slate-700 backdrop-blur-sm">
                  <div class="font-bold border-b border-slate-700 pb-1 flex justify-between">
                    <span>KAN-{{ task.id }}</span>
                    <span class="text-yellow-400 font-semibold">{{ task.status }}</span>
                  </div>
                  <p class="font-semibold text-slate-200 mt-1 truncate">{{ task.title }}</p>
                  <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-400 mt-1">
                    <span>Bắt đầu:</span> <span class="text-white">{{ task.createdDate | date: 'dd/MM/yyyy' }}</span>
                    <span>Hạn chót:</span> <span class="text-white">{{ task.dueDate ? (task.dueDate | date: 'dd/MM/yyyy') : 'Chưa thiết lập' }}</span>
                    <span>Độ ưu tiên:</span> <span class="text-white">{{ task.priority }}</span>
                    <span>Story Points:</span> <span class="text-white">{{ task.storyPoints || 0 }} SP</span>
                  </div>
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

      <!-- Instruction note -->
      <div class="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed flex items-start gap-2">
        <span class="material-symbols-outlined text-blue-500 text-sm mt-0.5">info</span>
        <div>
          <strong>Cách cập nhật biểu đồ Gantt:</strong>
          <ul class="list-disc pl-4 mt-1 space-y-1">
            <li>Để thay đổi mốc thời gian của công việc trên biểu đồ, hãy click vào công việc (ở bảng Kanban hoặc danh sách), sau đó tại màn hình chi tiết, cập nhật lại **Hạn chót (Due Date)** và nhấn **Lưu**.</li>
            <li>Ngày bắt đầu được tự động gán là ngày tạo công việc.</li>
          </ul>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .gantt-scroll-wrapper {
      max-width: 100%;
      overflow-x: auto;
    }
  `]
})
export class GanttChartComponent implements OnInit {
  // Inputs
  tasks = input<TaskItem[]>([]);

  // Expose Enums
  protected readonly TaskStatus = TaskItemStatus;
  protected readonly TaskPriority = TaskPriority;
  protected readonly TaskType = TaskType;

  // Signal timeline days range
  protected readonly timelineDays = signal<Date[]>([]);
  protected readonly rootTasks = computed(() => {
    return this.tasks().filter(t => !t.parentTaskId);
  });

  // Calculate day width
  protected readonly dayWidth = 48; // Corresponding to w-12 min-w-[48px] in html

  ngOnInit(): void {
    this.generateTimeline();
  }

  protected generateTimeline(): void {
    // Tìm khoảng ngày lớn nhất trong các task
    let minDate = new Date();
    let maxDate = new Date();
    // Default range is current date - 7 days to + 21 days
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 21);

    const list = this.tasks();
    if (list.length > 0) {
      let earliest = new Date();
      let latest = new Date();
      let hasDates = false;

      list.forEach(t => {
        if (t.createdDate) {
          const created = new Date(t.createdDate);
          if (!hasDates || created < earliest) {
            earliest = created;
            hasDates = true;
          }
        }
        if (t.dueDate) {
          const due = new Date(t.dueDate);
          if (!hasDates || due > latest) {
            latest = due;
            hasDates = true;
          }
        }
      });

      if (hasDates) {
        // Cộng thêm buffer 2 ngày ở 2 đầu
        earliest.setDate(earliest.getDate() - 3);
        latest.setDate(latest.getDate() + 5);

        // Đảm bảo không quá rộng
        minDate = earliest;
        maxDate = latest;
      }
    }

    // Đưa về đầu ngày / cuối ngày
    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(23, 59, 59, 999);

    // Tạo danh sách các ngày
    const days: Date[] = [];
    const temp = new Date(minDate);
    // Limit to max 60 days to avoid performance issues
    let count = 0;
    while (temp <= maxDate && count < 60) {
      days.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
      count++;
    }
    this.timelineDays.set(days);
  }

  protected isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  protected getDayOfWeekName(date: Date): string {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
  }

  // Tính toán vị trí left và width cho thanh Bar (px)
  protected getBarProperties(task: TaskItem): { leftOffset: number, width: number } | null {
    const days = this.timelineDays();
    if (days.length === 0) return null;

    const timelineStart = days[0].getTime();
    const timelineEnd = days[days.length - 1].getTime();

    const start = new Date(task.createdDate).getTime();
    const end = task.dueDate ? new Date(task.dueDate).getTime() : start + (24 * 60 * 60 * 1000); // Mặc định 1 ngày nếu ko có hạn chót

    // Nếu khoảng thời gian hoàn toàn nằm ngoài timeline
    if (end < timelineStart || start > timelineEnd) {
      return null;
    }

    // Clamp vào khoảng timeline
    const barStart = Math.max(start, timelineStart);
    const barEnd = Math.min(end, timelineEnd);

    // Tính số ngày từ mốc start của timeline
    const diffStartMs = barStart - timelineStart;
    const startDaysOffset = diffStartMs / (24 * 60 * 60 * 1000);

    const diffBarMs = barEnd - barStart;
    const durationDays = Math.max(0.5, diffBarMs / (24 * 60 * 60 * 1000)); // Tối thiểu 0.5 ngày

    return {
      leftOffset: startDaysOffset * this.dayWidth,
      width: durationDays * this.dayWidth
    };
  }
}
