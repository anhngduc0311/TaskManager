import { Component, Input, Output, EventEmitter, inject, signal, effect, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectMemberService, ProjectMember } from '../services/project-member.service';

@Component({
  selector: 'app-assignee-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full">
      <!-- Selector Trigger Button -->
      <button 
        type="button"
        (click)="toggleDropdown()"
        class="w-full flex items-center justify-between bg-surface-container-low border border-outline-variant hover:border-primary/50 rounded-lg px-3 py-2 text-left text-body-md transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
        [disabled]="disabled"
      >
        <div class="flex items-center gap-2">
          <!-- Current Assignee Info -->
          @if (selectedMember(); as member) {
            <div class="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold uppercase">
              {{ member.username.substring(0, 2) }}
            </div>
            <div class="flex flex-col">
              <span class="text-body-sm font-semibold text-on-surface line-clamp-1">{{ member.username }}</span>
              <span class="text-[10px] text-on-surface-variant line-clamp-1 leading-none mt-0.5">{{ member.email }}</span>
            </div>
          } @else {
            <div class="w-7 h-7 rounded-full border border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant">
              <span class="material-symbols-outlined text-sm">person_add</span>
            </div>
            <span class="text-body-sm text-on-surface-variant">Chưa gán (Unassigned)</span>
          }
        </div>
        <span class="material-symbols-outlined text-[18px] text-outline transition-transform duration-200" [class.rotate-180]="isOpen()">
          keyboard_arrow_down
        </span>
      </button>

      <!-- Dropdown Menu -->
      @if (isOpen()) {
        <div 
          class="absolute z-50 w-full mt-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl max-h-60 overflow-y-auto py-1 animate-fade-in"
        >
          <!-- Unassigned Option -->
          <button
            type="button"
            (click)="selectMember(null)"
            class="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-container transition-colors text-left cursor-pointer"
            [class.bg-secondary-container!]="currentAssigneeId === null"
          >
            <div class="w-7 h-7 rounded-full border border-dashed border-outline flex items-center justify-center text-outline">
              <span class="material-symbols-outlined text-sm">person_off</span>
            </div>
            <span class="text-body-sm text-on-surface-variant font-medium">Bỏ gán (Unassigned)</span>
          </button>

          <!-- Members List -->
          @if (isLoading()) {
            <div class="px-3 py-2.5 text-center text-body-sm text-on-surface-variant">
              <span class="inline-block animate-spin mr-1.5">⏳</span> Đang tải thành viên...
            </div>
          } @else if (members().length === 0) {
            <div class="px-3 py-2.5 text-center text-body-sm text-on-surface-variant">
              Không tìm thấy thành viên dự án
            </div>
          } @else {
            @for (member of members(); track member.userId) {
              <button
                type="button"
                (click)="selectMember(member)"
                class="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-container transition-colors text-left cursor-pointer"
                [class.bg-secondary-container!]="currentAssigneeId === member.userId"
              >
                <div class="flex items-center gap-2.5">
                  <!-- Avatar -->
                  <div class="w-7 h-7 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold uppercase">
                    {{ member.username.substring(0, 2) }}
                  </div>
                  <!-- Name & Email -->
                  <div class="flex flex-col">
                    <span class="text-body-sm font-semibold text-on-surface line-clamp-1">{{ member.username }}</span>
                    <span class="text-[10px] text-on-surface-variant line-clamp-1 leading-none mt-0.5">{{ member.email }}</span>
                  </div>
                </div>
                <!-- Role Badge -->
                <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                  {{ member.role }}
                </span>
              </button>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.15s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AssigneeSelectorComponent implements OnChanges {
  private memberService = inject(ProjectMemberService);

  @Input() projectId: number | null = null;
  @Input() currentAssigneeId: number | null | undefined = null;
  @Input() disabled = false;

  @Output() onAssigneeChanged = new EventEmitter<number | null>();

  protected readonly isOpen = signal(false);
  protected readonly members = signal<ProjectMember[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly selectedMember = signal<ProjectMember | null>(null);

  constructor() {
    // Tự động tìm selectedMember khi danh sách members hoặc currentAssigneeId thay đổi
    effect(() => {
      const activeAssigneeId = this.currentAssigneeId;
      const list = this.members();
      if (activeAssigneeId) {
        const found = list.find(m => m.userId === activeAssigneeId);
        if (found) {
          this.selectedMember.set(found);
        } else {
          this.selectedMember.set(null);
        }
      } else {
        this.selectedMember.set(null);
      }
    }, { allowSignalWrites: true });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId']) {
      const pid = this.projectId;
      if (pid && pid > 0) {
        this.loadProjectMembers(pid);
      } else {
        this.members.set([]);
      }
    }
  }

  private loadProjectMembers(projectId: number): void {
    this.isLoading.set(true);
    this.memberService.getProjectMembers(projectId).subscribe({
      next: (data) => {
        this.members.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi tải thành viên dự án:', err);
        this.isLoading.set(false);
      }
    });
  }

  protected toggleDropdown(): void {
    if (!this.disabled) {
      this.isOpen.set(!this.isOpen());
    }
  }

  protected selectMember(member: ProjectMember | null): void {
    this.selectedMember.set(member);
    this.isOpen.set(false);
    this.onAssigneeChanged.emit(member ? member.userId : null);
  }
}
