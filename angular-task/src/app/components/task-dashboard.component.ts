import { Component, Input, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskItem, TaskItemStatus, TaskPriority, TaskType, SprintReportDto } from '../models/task.model';

@Component({
  selector: 'app-task-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="saas-dashboard">
      <!-- 1. Hệ thống thẻ số liệu (Metrics Cards) -->
      <div class="metrics-grid">
        
        <!-- Thẻ 1: Số lượng Bug hiện tại -->
        <div class="metric-card bug-card">
          <div class="metric-icon-box">
            <!-- Icon con bọ (Bug icon) bằng SVG -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="metric-svg-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <div class="metric-details">
            <span class="metric-label">Bugs Chưa Xử Lý</span>
            <h3 class="metric-value">{{ bugsCount() }} Bugs</h3>
            <span class="metric-hint text-red-500" *ngIf="bugsCount() > 0">Cần ưu tiên khắc phục khẩn cấp</span>
            <span class="metric-hint text-green-500" *ngIf="bugsCount() === 0">Hệ thống sạch, không có Bug</span>
          </div>
        </div>

        <!-- Thẻ 2: Story Points hoàn thành -->
        <div class="metric-card sp-card">
          <div class="metric-icon-box">
            <!-- Icon mục tiêu (Target/Shield icon) bằng SVG -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="metric-svg-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>
          <div class="metric-details">
            <span class="metric-label">Story Points Đạt Được</span>
            <h3 class="metric-value">{{ report()?.doneStoryPoints || 0 }} / {{ report()?.totalStoryPoints || 0 }} SP</h3>
            
            <!-- Progress Bar -->
            <div class="metric-progress-track">
              <div class="metric-progress-fill" [style.width]="spPercentage() + '%'"></div>
            </div>
            <span class="metric-hint">{{ spPercentage() }}% hoàn thành</span>
          </div>
        </div>

        <!-- Thẻ 3: Tốc độ đội ngũ (Velocity) -->
        <div class="metric-card velocity-card">
          <div class="metric-icon-box">
            <!-- Icon sấm sét (Bolt icon) bằng SVG -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="metric-svg-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </div>
          <div class="metric-details">
            <span class="metric-label">Tốc độ Sprint (Velocity)</span>
            <h3 class="metric-value">{{ velocity() }} SP / Sprint</h3>
            <span class="metric-hint text-indigo-600 font-semibold">Tốc độ hoàn thành công việc hiện tại</span>
          </div>
        </div>

        <!-- Thẻ 4: Số công việc quá hạn -->
        <div class="metric-card overdue-card">
          <div class="metric-icon-box">
            <!-- Icon cảnh báo (Alert icon) bằng SVG -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="metric-svg-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div class="metric-details">
            <span class="metric-label">Công Việc Quá Hạn</span>
            <h3 class="metric-value" [class.text-red-600]="overdueCount() > 0">{{ overdueCount() }} Task</h3>
            <span class="metric-hint text-red-500 font-semibold" *ngIf="overdueCount() > 0">Yêu cầu kiểm tra ngay lập tức</span>
            <span class="metric-hint text-green-600" *ngIf="overdueCount() === 0">Tuyệt vời! Không có công việc trễ hạn</span>
          </div>
        </div>

      </div>

      <!-- 2. Hàng Biểu đồ (Burn-down & Type Distribution) -->
      <div class="charts-row">
        <!-- Biểu đồ Burndown SVG -->
        <div class="dashboard-chart-card">
          <div class="chart-header">
            <div>
              <h4>🔥 Sprint Burndown Chart</h4>
              <p class="chart-desc">Thống kê điểm Story Points còn lại theo từng ngày</p>
            </div>
            <span class="chart-badge">Reactive</span>
          </div>

          <div class="chart-svg-wrapper">
            <svg viewBox="0 0 520 240" class="saas-burndown-svg">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(79, 70, 229, 0.3)" />
                  <stop offset="100%" stop-color="rgba(79, 70, 229, 0.0)" />
                </linearGradient>
              </defs>

              <!-- Grid ngang và nhãn trục Y -->
              <line x1="0" y1="50" x2="500" y2="50" stroke="#f1f5f9" stroke-dasharray="4" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" stroke-dasharray="4" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" stroke-dasharray="4" />
              <line x1="0" y1="200" x2="500" y2="200" stroke="#cbd5e1" stroke-width="1.5" />

              <!-- Nhãn trục Y -->
              <text x="-12" y="204" text-anchor="end" class="chart-axis-text">0</text>
              <text x="-12" y="154" text-anchor="end" class="chart-axis-text">{{ (burndownData().maxPoints * 0.25) | number: '1.0-0' }}</text>
              <text x="-12" y="104" text-anchor="end" class="chart-axis-text">{{ (burndownData().maxPoints * 0.5) | number: '1.0-0' }}</text>
              <text x="-12" y="54" text-anchor="end" class="chart-axis-text">{{ (burndownData().maxPoints * 0.75) | number: '1.0-0' }}</text>
              <text x="-12" y="8" text-anchor="end" class="chart-axis-text">{{ burndownData().maxPoints }} SP</text>

              <!-- Gradient Fill Area -->
              <path *ngIf="burndownData().actualPoints.length > 0" 
                    [attr.d]="burndownData().actualPath + ' L ' + burndownData().actualPoints[burndownData().actualPoints.length-1].x + ' 200 L 0 200 Z'" 
                    fill="url(#areaGradient)" />

              <!-- Kế hoạch lý tưởng (Dotted Grey) -->
              <path [attr.d]="burndownData().idealPath" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4" />

              <!-- Thực tế còn lại (Solid Indigo) -->
              <path [attr.d]="burndownData().actualPath" fill="none" stroke="#4f46e5" stroke-width="3" />

              <!-- Điểm chấm kế hoạch -->
              <circle *ngFor="let p of burndownData().idealPoints" [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" fill="#94a3b8" />

              <!-- Điểm chấm thực tế -->
              <g *ngFor="let p of burndownData().actualPoints" class="svg-point-group">
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5.5" fill="#4f46e5" stroke="#ffffff" stroke-width="2" />
                <text [attr.x]="p.x" [attr.y]="p.y - 12" text-anchor="middle" class="svg-pt-tooltip">{{ p.val }} SP</text>
              </g>

              <!-- Nhãn trục X (Ngày) -->
              <text *ngFor="let p of burndownData().actualPoints" [attr.x]="p.x" y="222" text-anchor="middle" class="chart-axis-text font-mono">{{ p.label }}</text>
            </svg>
          </div>

          <div class="chart-footer-legend">
            <span class="legend-indicator"><span class="legend-color ideal-dot"></span> Đường lý thuyết</span>
            <span class="legend-indicator"><span class="legend-color actual-solid"></span> Thực tế còn lại</span>
          </div>
        </div>

        <!-- Biểu đồ phân bổ loại Task -->
        <div class="dashboard-chart-card">
          <div class="chart-header">
            <div>
              <h4>📊 Phân bố loại công việc</h4>
              <p class="chart-desc">Cơ cấu tỉ lệ các đầu việc trong dự án IT</p>
            </div>
          </div>

          <div class="distribution-list">
            <div class="dist-item-row" *ngFor="let item of report()?.taskTypes">
              <div class="dist-meta">
                <span class="type-tag" [attr.data-type]="item.type">{{ item.type }}</span>
                <span class="dist-text"><strong>{{ item.count }}</strong> việc ({{ item.percentage }}%)</span>
              </div>
              <div class="dist-track">
                <div class="dist-fill" [attr.data-type]="item.type" [style.width]="item.percentage + '%'"></div>
              </div>
            </div>
            
            <div *ngIf="!report() || !report()!.taskTypes || report()!.taskTypes.length === 0" class="dist-empty">
              Chưa có dữ liệu phân loại.
            </div>
          </div>
        </div>
      </div>

      <!-- 3. LỘ TRÌNH DỰ ÁN TIMELINE (GANTT CHART) -->
      <div class="gantt-section">
        <div class="gantt-title-header">
          <h4>📅 Lộ trình dự án & Dòng thời gian (Gantt Chart Roadmap)</h4>
          <p>Giao diện dòng thời gian trực quan hóa vòng đời các Epic, Task và Subtask</p>
        </div>

        <div class="gantt-grid-wrapper">
          <!-- Hàng Header các ngày -->
          <div class="gantt-header-row">
            <div class="gantt-title-col-header">Danh sách Epic / Task</div>
            <div class="gantt-timeline-header-grid">
              <div class="gantt-day-header-col" *ngFor="let label of timelineColumns()">{{ label }}</div>
            </div>
          </div>

          <!-- Danh sách các Hàng Gantt -->
          <div class="gantt-rows-container">
            <ng-container *ngFor="let task of rootTasks()">
              <!-- Hàng Task cha -->
              <div class="gantt-data-row parent-row">
                <div class="gantt-title-cell">
                  <span class="type-tag sub-tag" [attr.data-type]="task.taskType">{{ task.taskType }}</span>
                  <span class="gantt-title-text">{{ task.title }}</span>
                </div>
                
                <div class="gantt-bar-cell">
                  <!-- Đường kẻ vạch nền -->
                  <div class="gantt-bg-line" *ngFor="let c of timelineColumns()"></div>

                  <!-- Thanh tiến độ Gantt Bar -->
                  <div 
                    class="gantt-progress-bar"
                    [attr.data-status]="task.status"
                    [attr.data-priority]="task.priority"
                    [style.left]="getGanttPosition(task.createdDate, task.dueDate).left"
                    [style.width]="getGanttPosition(task.createdDate, task.dueDate).width"
                  >
                    <span class="gantt-bar-inner-text">#{{ task.id }} ({{ task.storyPoints || 0 }} SP)</span>
                    
                    <!-- Tooltip tương tác hiển thị khi hover -->
                    <div class="gantt-bar-tooltip">
                      <div class="tooltip-title">#{{ task.id }}: {{ task.title }}</div>
                      <div class="tooltip-info-row"><span>Loại:</span> <strong>{{ task.taskType }}</strong></div>
                      <div class="tooltip-info-row"><span>Trạng thái:</span> <strong>{{ task.status }}</strong></div>
                      <div class="tooltip-info-row"><span>Story Points:</span> <strong>{{ task.storyPoints || '-' }} SP</strong></div>
                      <div class="tooltip-info-row"><span>Độ ưu tiên:</span> <strong [attr.data-priority]="task.priority">{{ task.priority }}</strong></div>
                      <div class="tooltip-info-row"><span>Hạn chót:</span> <strong>{{ (task.dueDate | date: 'dd/MM/yyyy HH:mm') || 'Chưa thiết lập' }}</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Hàng Task con (Subtask) thụt lề -->
              <div class="gantt-data-row child-row" *ngFor="let sub of task.subTasks">
                <div class="gantt-title-cell cell-indented">
                  <span class="indent-connector">↳</span>
                  <span class="type-tag sub-tag" [attr.data-type]="sub.taskType">{{ sub.taskType }}</span>
                  <span class="gantt-title-text text-muted">{{ sub.title }}</span>
                </div>
                
                <div class="gantt-bar-cell">
                  <!-- Đường kẻ vạch nền -->
                  <div class="gantt-bg-line" *ngFor="let c of timelineColumns()"></div>

                  <!-- Thanh tiến độ Gantt Bar cho việc con -->
                  <div 
                    class="gantt-progress-bar subtask-bar"
                    [attr.data-status]="sub.status"
                    [attr.data-priority]="sub.priority"
                    [style.left]="getGanttPosition(sub.createdDate, sub.dueDate).left"
                    [style.width]="getGanttPosition(sub.createdDate, sub.dueDate).width"
                  >
                    <span class="gantt-bar-inner-text">#{{ sub.id }}</span>
                    
                    <!-- Tooltip cho Subtask -->
                    <div class="gantt-bar-tooltip">
                      <div class="tooltip-title">#{{ sub.id }}: {{ sub.title }}</div>
                      <div class="tooltip-info-row"><span>Trạng thái:</span> <strong>{{ sub.status }}</strong></div>
                      <div class="tooltip-info-row"><span>Story Points:</span> <strong>{{ sub.storyPoints || '-' }} SP</strong></div>
                      <div class="tooltip-info-row"><span>Độ ưu tiên:</span> <strong>{{ sub.priority }}</strong></div>
                    </div>
                  </div>
                </div>
              </div>

            </ng-container>

            <div *ngIf="tasks().length === 0" class="gantt-empty-state">
              Không có dữ liệu công việc để vẽ lộ trình thời gian.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saas-dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
      animation: fadeIn 0.4s ease-out;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }

    @media (max-width: 1024px) {
      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
    }

    .metric-card {
      background: #ffffff;
      border: 1px solid #c3c6d6;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(9, 30, 66, 0.13);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(9, 30, 66, 0.15);
    }

    .metric-icon-box {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      background: #f0f3ff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .metric-svg-icon {
      width: 26px;
      height: 26px;
      color: #737685;
    }

    .bug-card .metric-icon-box { background: rgba(239, 68, 68, 0.1); }
    .bug-card .metric-svg-icon { color: #dc2626; }
    .sp-card .metric-icon-box { background: rgba(2, 132, 199, 0.1); }
    .sp-card .metric-svg-icon { color: #0284c7; }
    .velocity-card .metric-icon-box { background: rgba(79, 70, 229, 0.1); }
    .velocity-card .metric-svg-icon { color: #6d28d9; }
    .overdue-card .metric-icon-box { background: rgba(249, 115, 22, 0.1); }
    .overdue-card .metric-svg-icon { color: #ea580c; }

    .metric-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .metric-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #737685;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: #091c35;
      margin: 0;
    }

    .metric-hint {
      font-size: 0.72rem;
      color: #737685;
    }

    .metric-progress-track {
      width: 100%;
      height: 5px;
      background: #dfe8ff;
      border-radius: 99px;
      margin-top: 4px;
      overflow: hidden;
    }

    .metric-progress-fill {
      height: 100%;
      background: #003d9b;
      border-radius: 99px;
      transition: width 0.4s ease;
    }

    .charts-row {
      display: grid;
      grid-template-columns: 7fr 5fr;
      gap: 24px;
    }

    @media (max-width: 960px) {
      .charts-row {
        grid-template-columns: 1fr;
      }
    }

    .dashboard-chart-card {
      background: #ffffff;
      border: 1px solid #c3c6d6;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(9, 30, 66, 0.13);
      color: #091c35;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .chart-header h4 {
      font-size: 1.1rem;
      font-weight: 800;
      color: #091c35;
      margin: 0;
    }

    .chart-desc {
      font-size: 0.82rem;
      color: #737685;
      margin: 2px 0 0 0;
    }

    .chart-badge {
      font-size: 0.68rem;
      background: #e7eeff;
      color: #434654;
      padding: 2px 8px;
      border-radius: 99px;
      font-weight: 700;
      border: 1px solid #c3c6d6;
    }

    .chart-svg-wrapper {
      background: #f9f9ff;
      border: 1px dashed #c3c6d6;
      border-radius: 12px;
      padding: 12px;
    }

    .saas-burndown-svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .chart-axis-text {
      font-size: 9px;
      fill: #737685;
      font-weight: 500;
    }

    .svg-point-group circle {
      cursor: pointer;
      transition: r 0.15s, fill 0.15s;
    }

    .svg-pt-tooltip {
      display: none;
      font-size: 9px;
      font-weight: 800;
      fill: #091c35;
      pointer-events: none;
    }

    .svg-point-group:hover circle {
      r: 8.5;
      fill: #dc2626;
    }

    .svg-point-group:hover text {
      display: block;
    }

    .chart-footer-legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 16px;
      font-size: 0.8rem;
      color: #737685;
      font-weight: 600;
    }

    .legend-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-color {
      width: 14px;
      height: 3px;
      display: inline-block;
    }

    .legend-color.ideal-dot {
      border-top: 2px dashed #737685;
    }

    .legend-color.actual-solid {
      background: #003d9b;
    }

    .distribution-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100%;
      justify-content: center;
    }

    .dist-item-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .dist-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;
    }

    .type-tag {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: capitalize;
    }

    .type-tag[data-type="Bug"] { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
    .type-tag[data-type="Epic"] { background: rgba(192, 132, 252, 0.12); color: #9333ea; border: 1px solid rgba(192, 132, 252, 0.3); }
    .type-tag[data-type="Story"] { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
    .type-tag[data-type="Task"] { background: #dfe8ff; color: #434654; }

    .dist-text {
      color: #434654;
    }

    .dist-track {
      width: 100%;
      height: 8px;
      background: #dfe8ff;
      border-radius: 99px;
      overflow: hidden;
    }

    .dist-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.4s ease;
    }

    .dist-fill[data-type="Bug"] { background: #dc2626; }
    .dist-fill[data-type="Epic"] { background: #c084fc; }
    .dist-fill[data-type="Story"] { background: #2563eb; }
    .dist-fill[data-type="Task"] { background: #737685; }

    .gantt-section {
      background: #ffffff;
      border: 1px solid #c3c6d6;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(9, 30, 66, 0.13);
      color: #091c35;
    }

    .gantt-title-header {
      margin-bottom: 20px;
    }

    .gantt-title-header h4 {
      font-size: 1.15rem;
      font-weight: 800;
      color: #091c35;
      margin: 0;
    }

    .gantt-title-header p {
      font-size: 0.82rem;
      color: #737685;
      margin: 2px 0 0 0;
    }

    .gantt-grid-wrapper {
      border: 1px solid #c3c6d6;
      border-radius: 12px;
      overflow: hidden;
      background: #f9f9ff;
    }

    .gantt-header-row {
      display: flex;
      background: #e7eeff;
      border-bottom: 2px solid #c3c6d6;
    }

    .gantt-title-col-header {
      width: 250px;
      min-width: 250px;
      padding: 12px 16px;
      font-weight: 700;
      color: #434654;
      font-size: 0.78rem;
      text-transform: uppercase;
      border-right: 1px solid #c3c6d6;
      display: flex;
      align-items: center;
    }

    .gantt-timeline-header-grid {
      display: flex;
      flex: 1;
    }

    .gantt-day-header-col {
      flex: 1;
      text-align: center;
      padding: 12px 4px;
      font-weight: 700;
      color: #737685;
      font-size: 0.75rem;
      border-right: 1px dashed #c3c6d6;
    }

    .gantt-day-header-col:last-child {
      border-right: none;
    }

    .gantt-rows-container {
      display: flex;
      flex-direction: column;
    }

    .gantt-data-row {
      display: flex;
      border-bottom: 1px solid #c3c6d6;
      height: 48px;
    }

    .gantt-data-row:hover {
      background: rgba(223, 232, 255, 0.5);
    }

    .gantt-title-cell {
      width: 250px;
      min-width: 250px;
      padding: 8px 16px;
      border-right: 1px solid #c3c6d6;
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }

    .cell-indented {
      padding-left: 28px;
      background: rgba(240, 243, 255, 0.6);
    }

    .indent-connector {
      color: #003d9b;
      font-weight: 700;
    }

    .gantt-title-text {
      font-size: 0.85rem;
      font-weight: 600;
      color: #091c35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .gantt-title-text.text-muted {
      font-weight: 500;
      color: #737685;
    }

    .gantt-bar-cell {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      height: 100%;
    }

    .gantt-bg-line {
      flex: 1;
      height: 100%;
      border-right: 1px dashed rgba(195, 198, 214, 0.5);
      pointer-events: none;
    }

    .gantt-bg-line:last-child {
      border-right: none;
    }

    .gantt-progress-bar {
      position: absolute;
      height: 24px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      padding: 0 8px;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      overflow: hidden;
      white-space: nowrap;
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .gantt-progress-bar:hover {
      transform: scaleY(1.08);
      box-shadow: 0 4px 10px rgba(9, 30, 66, 0.2);
      z-index: 100;
    }

    .subtask-bar {
      height: 18px;
      border-radius: 4px;
      font-size: 0.65rem;
    }

    .gantt-bar-inner-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .gantt-progress-bar[data-status="Todo"] { background: #c3c6d6; color: #434654; }
    .gantt-progress-bar[data-status="InProgress"] { background: #f59e0b; color: #fff; }
    .gantt-progress-bar[data-status="Done"] { background: #10b981; color: #fff; }

    .gantt-progress-bar[data-priority="Critical"] {
      border: 2px solid #dc2626;
    }

    .gantt-bar-tooltip {
      visibility: hidden;
      background: #ffffff;
      color: #091c35;
      text-align: left;
      border-radius: 8px;
      padding: 10px 14px;
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      width: 240px;
      box-shadow: 0 10px 25px rgba(9, 30, 66, 0.15);
      border: 1px solid #c3c6d6;
      display: flex;
      flex-direction: column;
      gap: 4px;
      white-space: normal;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s, visibility 0.2s;
    }

    .gantt-bar-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: #ffffff transparent transparent transparent;
    }

    .gantt-progress-bar:hover .gantt-bar-tooltip {
      visibility: visible;
      opacity: 1;
    }

    .tooltip-title {
      font-weight: 800;
      font-size: 0.85rem;
      border-bottom: 1px solid #c3c6d6;
      padding-bottom: 4px;
      margin-bottom: 4px;
      color: #091c35;
    }

    .tooltip-info-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: #737685;
    }

    .tooltip-info-row strong {
      color: #091c35;
    }

    .tooltip-info-row strong[data-priority="Critical"] {
      color: #dc2626;
    }

    .gantt-empty-state {
      padding: 32px;
      text-align: center;
      font-style: italic;
      color: #737685;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class TaskDashboardComponent {
  // Readonly signal inputs from Angular 22
  readonly tasks = input<TaskItem[]>([]);
  readonly report = input<SprintReportDto | null>(null);

  // 1. Thẻ 1: Số lượng Bug chưa xong
  protected readonly bugsCount = computed(() => 
    this.tasks().filter((t: TaskItem) => t.taskType === TaskType.Bug && t.status !== TaskItemStatus.Done).length
  );

  // 2. Thẻ 2: Tỉ lệ phần trạng thái Story Points
  protected readonly spPercentage = computed(() => {
    const rep = this.report();
    if (!rep || rep.totalStoryPoints === 0) return 0;
    return Math.round((rep.doneStoryPoints / rep.totalStoryPoints) * 100);
  });

  // 3. Thẻ 3: Tốc độ hoàn thành (Velocity)
  protected readonly velocity = computed(() => 
    this.report()?.doneStoryPoints || 0
  );

  // 4. Thẻ 4: Số việc trễ hạn (DueDate bé hơn hiện tại và chưa xong)
  protected readonly overdueCount = computed(() => {
    const now = new Date();
    return this.tasks().filter((t: TaskItem) => 
      t.status !== TaskItemStatus.Done && 
      t.dueDate && 
      new Date(t.dueDate) < now
    ).length;
  });

  // 5. Cột gốc vẽ cây trên Gantt (Chỉ hiển thị các Epic/Task lớn ở cột gốc)
  protected readonly rootTasks = computed(() => 
    this.tasks().filter((t: TaskItem) => !t.parentTaskId)
  );

  // 6. Tính toán các điểm tọa độ và đường vẽ đồ thị Burndown SVG
  protected readonly burndownData = computed(() => {
    const rep = this.report();
    if (!rep || rep.burndownChart.length === 0) {
      return { idealPath: '', actualPath: '', idealPoints: [], actualPoints: [], maxPoints: 10 };
    }

    const points = rep.burndownChart;
    const maxPoints = Math.max(10, rep.totalStoryPoints);
    const width = 500;
    const height = 200;

    const idealPoints = points.map((p, idx) => {
      const x = idx * (width / (points.length - 1));
      const y = height - (p.idealPoints * (height / maxPoints));
      return { x, y, label: p.dateLabel, val: p.idealPoints };
    });
    const idealPath = 'M ' + idealPoints.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');

    const actualPoints = points.map((p, idx) => {
      const x = idx * (width / (points.length - 1));
      const y = height - (p.remainingPoints * (height / maxPoints));
      return { x, y, label: p.dateLabel, val: p.remainingPoints };
    });
    const actualPath = 'M ' + actualPoints.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');

    return { idealPath, actualPath, idealPoints, actualPoints, maxPoints };
  });

  // 7. Nhãn các cột thời gian Gantt
  protected readonly timelineColumns = computed(() => {
    const rep = this.report();
    if (!rep || rep.burndownChart.length === 0) {
      const cols = [];
      const now = Date.now();
      for (let i = 0; i <= 10; i++) {
        const d = new Date(now - 5 * 24 * 60 * 60 * 1000 + i * 24 * 60 * 60 * 1000);
        cols.push(d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }));
      }
      return cols;
    }
    return rep.burndownChart.map(p => p.dateLabel);
  });

  // 8. Định vị thanh thời gian Gantt Bar theo tỉ lệ phần trăm
  protected getGanttPosition(startDateStr: string, dueDateStr?: string): { left: string, width: string } {
    const rep = this.report();
    let start = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    let end = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    if (rep && rep.burndownChart.length > 0) {
      start = new Date(rep.burndownChart[0].date);
      end = new Date(rep.burndownChart[rep.burndownChart.length - 1].date);
    }

    const totalMs = end.getTime() - start.getTime();
    const taskStart = new Date(startDateStr);
    const taskEnd = dueDateStr ? new Date(dueDateStr) : new Date(taskStart.getTime() + 24 * 60 * 60 * 1000);

    let left = ((taskStart.getTime() - start.getTime()) / totalMs) * 100;
    let width = ((taskEnd.getTime() - taskStart.getTime()) / totalMs) * 100;

    if (left < 0) {
      width += left;
      left = 0;
    }
    if (left + width > 100) {
      width = 100 - left;
    }
    if (width < 3) width = 3;
    if (left > 100) left = 97;

    return {
      left: `${left.toFixed(1)}%`,
      width: `${width.toFixed(1)}%`
    };
  }
}
