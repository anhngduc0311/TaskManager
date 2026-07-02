import { Component, Input, Output, EventEmitter, signal, computed, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../services/task.service';
import { AuthService } from '../services/auth.service';
import { TaskItem, TaskItemStatus, TaskPriority, TaskType, CustomFieldType, UpdateTaskDto, CustomFieldUpdateDto, SubTaskUpdateDto } from '../models/task.model';

interface CommentItem {
  author: string;
  time: string;
  text: string;
}

interface HistoryItem {
  author: string;
  time: string;
  text: string;
}

@Component({
  selector: 'app-task-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Lớp phủ nền mờ (Backdrop Overlay) -->
    <div class="drawer-backdrop" [class.open]="task !== null" (click)="close()"></div>

    <!-- Tấm Panel trượt (Slide-over Panel) -->
    <div class="drawer-panel" [class.open]="task !== null">
      <div class="drawer-container" *ngIf="task">
        
        <!-- Header của Drawer -->
        <div class="drawer-header">
          <div class="drawer-header-left">
            <span class="type-badge" [attr.data-type]="editingTaskType()">{{ editingTaskType() }}</span>
            <span class="drawer-task-id">#{{ task.id === 0 ? 'Mới' : task.id }}</span>
          </div>
          <div class="drawer-header-right">
            <button (click)="saveChanges()" class="btn btn-primary btn-save-drawer">💾 Lưu</button>
            <button (click)="close()" class="btn-close-drawer">✕</button>
          </div>
        </div>

        <!-- Body chia 2 cột thông minh -->
        <div class="drawer-body-grid">
          
          <!-- CỘT TRÁI (70%): Nội dung & Soạn thảo -->
          <div class="drawer-col-left">
            <!-- 1. Tiêu đề lớn (Inline Edit) -->
            <div class="inline-title-wrapper">
              <input
                type="text"
                [ngModel]="editingTitle()"
                (ngModelChange)="editingTitle.set($event)"
                (blur)="onTitleBlur()"
                placeholder="Tiêu đề công việc..."
                class="inline-title-input"
              />
            </div>

            <!-- 2. Soạn thảo mô tả Rich Text (HTML) -->
            <div class="drawer-section">
              <label class="section-label">Mô tả công việc</label>
              
              <div class="rich-editor-wrapper">
                <!-- Toolbar -->
                <div class="editor-toolbar">
                  <button type="button" (click)="execEditorCommand('bold')" title="Chữ đậm"><b>B</b></button>
                  <button type="button" (click)="execEditorCommand('italic')" title="Chữ nghiêng"><i>I</i></button>
                  <button type="button" (click)="execEditorCommand('underline')" title="Gạch chân"><u>U</u></button>
                  <button type="button" (click)="execEditorCommand('insertUnorderedList')" title="Danh sách chấm tròn">• List</button>
                  <button type="button" (click)="execEditorCommand('insertOrderedList')" title="Danh sách số">1. List</button>
                  <button type="button" (click)="insertLinkPrompt()" title="Chèn liên kết">🔗 Link</button>
                </div>
                
                <!-- Vùng soạn thảo -->
                <div
                  #editorDiv
                  contenteditable="true"
                  class="editor-textarea"
                  (input)="onEditorInput(editorDiv.innerHTML)"
                  [innerHTML]="initialDescriptionHTML()"
                  (drop)="onEditorDrop($event)"
                  (dragover)="$event.preventDefault()"
                  (paste)="onEditorPaste($event)"
                  (click)="onEditorClick($event)"
                  placeholder="Nhập mô tả HTML..."
                ></div>
              </div>
            </div>

            <!-- 3. Danh sách ảnh đính kèm (Thumbnail Grid) -->
            <div class="drawer-section">
              <label class="section-label">Tệp đính kèm & Hình ảnh</label>
              
              <!-- Kéo thả file đính kèm -->
              <div 
                class="drawer-dropzone"
                [class.dragover]="isDragOver"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                (click)="fileInput.click()"
              >
                <input 
                  #fileInput 
                  type="file" 
                  (change)="onFileSelected($event)" 
                  style="display: none;" 
                  accept="image/*"
                />
                <span class="dropzone-icon">📥</span>
                <span class="dropzone-text" *ngIf="!isUploading()">Kéo thả ảnh hoặc click để tải lên đính kèm</span>
                <span class="dropzone-text loading-text" *ngIf="isUploading()">Đang tải ảnh lên hệ thống...</span>
              </div>

              <!-- Lưới ảnh thu nhỏ (Thumbnails) -->
              <div class="attachments-thumbnail-grid" *ngIf="uploadedAttachments().length > 0">
                <div class="thumbnail-item" *ngFor="let url of uploadedAttachments()">
                  <img [src]="getFullUrl(url)" alt="Attachment" class="thumb-img" />
                  <a [href]="getFullUrl(url)" target="_blank" class="thumb-view-link">Xem lớn ↗</a>
                </div>
              </div>
            </div>

            <!-- 4. Danh sách Subtasks -->
            <div class="drawer-section">
              <label class="section-label">Danh sách Task con (Subtasks)</label>
              
              <div class="drawer-subtasks-container">
                <div class="drawer-subtasks-list" *ngIf="editingSubTasks().length > 0">
                  <div class="drawer-subtask-row" *ngFor="let sub of editingSubTasks(); let i = index">
                    <span class="subtask-index">#{{ sub.id || 'Mới' }}</span>
                    <input
                      type="text"
                      [(ngModel)]="sub.title"
                      class="subtask-inline-input"
                      placeholder="Tên task con..."
                    />
                    <select [(ngModel)]="sub.status" class="subtask-inline-status">
                      <option [value]="TaskStatus.Todo">Todo</option>
                      <option [value]="TaskStatus.InProgress">InProgress</option>
                      <option [value]="TaskStatus.Done">Done</option>
                    </select>
                    <button (click)="removeSubTaskLocal(i)" class="btn-delete-subtask" title="Xóa">✕</button>
                  </div>
                </div>

                <!-- Thêm nhanh Subtask -->
                <div class="add-subtask-bar">
                  <input
                    type="text"
                    [(ngModel)]="newSubTaskTitle"
                    (keyup.enter)="addSubTaskLocal()"
                    placeholder="Thêm nhanh việc con..."
                    class="add-subtask-input"
                  />
                  <button (click)="addSubTaskLocal()" class="btn btn-secondary btn-add-subtask">➕ Thêm</button>
                </div>
              </div>
            </div>

            <!-- 5. Khu vực Bình luận & Nhật ký Hoạt động (Activity/Comments) -->
            <div class="drawer-section comments-section">
              <label class="section-label">Bình luận & Hoạt động</label>
              
              <!-- Tab Chọn: Bình luận / Nhật ký -->
              <div class="activity-tabs">
                <button 
                  [class.active]="activeTab() === 'comments'" 
                  (click)="activeTab.set('comments')"
                  class="tab-btn"
                >
                  💬 Bình luận ({{ commentsList().length }})
                </button>
                <button 
                  [class.active]="activeTab() === 'history'" 
                  (click)="activeTab.set('history')"
                  class="tab-btn"
                >
                  ⏳ Nhật ký hoạt động
                </button>
              </div>

              <!-- VIEW 1: COMMENTS LIST -->
              <div class="tab-content" *ngIf="activeTab() === 'comments'">
                <!-- Khung nhập bình luận -->
                <div class="comment-input-box">
                  <textarea
                    [(ngModel)]="newCommentInput"
                    placeholder="Viết bình luận của bạn..."
                    class="comment-textarea"
                    rows="2"
                  ></textarea>
                  <div class="comment-input-footer">
                    <button (click)="postComment()" class="btn btn-primary btn-post-comment">Gửi bình luận</button>
                  </div>
                </div>

                <!-- Danh sách bình luận -->
                <div class="comments-scroll-list" *ngIf="commentsList().length > 0">
                  <div class="comment-item" *ngFor="let comment of commentsList()">
                    <div class="comment-header">
                      <span class="comment-author">👤 {{ comment.author }}</span>
                      <span class="comment-time">{{ comment.time }}</span>
                    </div>
                    <div class="comment-text">{{ comment.text }}</div>
                  </div>
                </div>
                <div class="activity-empty-state" *ngIf="commentsList().length === 0">
                  Chưa có bình luận nào. Hãy bắt đầu thảo luận!
                </div>
              </div>

              <!-- VIEW 2: HISTORY LOGS -->
              <div class="tab-content" *ngIf="activeTab() === 'history'">
                <div class="history-scroll-list">
                  <div class="history-item" *ngFor="let log of historyList()">
                    <span class="history-dot"></span>
                    <div class="history-content">
                      <span class="history-time">{{ log.time }}</span>
                      <p class="history-text"><strong>{{ log.author }}</strong> {{ log.text }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CỘT PHẢI (30%): Các Thuộc tính Dọc -->
          <div class="drawer-col-right">
            <!-- Người xử lý (Assignee) -->
            <div class="attribute-group">
              <label class="attribute-label">Người thực hiện</label>
              <select
                [ngModel]="taskAssignee()"
                (ngModelChange)="onAssigneeChange($event)"
                class="attribute-control"
              >
                <option value="unassigned">Chưa phân công</option>
                <option [value]="authService.currentUser()">{{ authService.currentUser() }} (Tôi)</option>
                <option value="Alex">Alex</option>
                <option value="Sarah">Sarah</option>
                <option value="John">John</option>
              </select>
            </div>

            <!-- Nhãn (Labels) -->
            <div class="attribute-group">
              <label class="attribute-label">Nhãn (Labels)</label>
              <input
                type="text"
                [ngModel]="taskLabelsInput()"
                (ngModelChange)="onLabelsChange($event)"
                placeholder="Ví dụ: Frontend, Design"
                class="attribute-control"
              />
            </div>

            <!-- Trạng thái (Status Dropdown) -->
            <div class="attribute-group">
              <label class="attribute-label">Trạng thái công việc</label>
              <select
                [ngModel]="editingStatus()"
                (ngModelChange)="onStatusChange($event)"
                class="attribute-control status-select"
              >
                <option [value]="TaskStatus.Todo">Todo</option>
                <option [value]="TaskStatus.InProgress">InProgress</option>
                <option [value]="TaskStatus.InReview">In Review</option>
                <option [value]="TaskStatus.Done">Done</option>
              </select>
            </div>

            <!-- Độ ưu tiên -->
            <div class="attribute-group">
              <label class="attribute-label">Độ ưu tiên</label>
              <select
                [ngModel]="editingPriority()"
                (ngModelChange)="editingPriority.set($event)"
                class="attribute-control"
              >
                <option [value]="TaskPriority.Critical">Critical</option>
                <option [value]="TaskPriority.High">High</option>
                <option [value]="TaskPriority.Medium">Medium</option>
                <option [value]="TaskPriority.Low">Low</option>
              </select>
            </div>

            <!-- Kiểu Task -->
            <div class="attribute-group">
              <label class="attribute-label">Loại Task</label>
              <select
                [ngModel]="editingTaskType()"
                (ngModelChange)="editingTaskType.set($event)"
                class="attribute-control"
              >
                <option [value]="TaskType.Task">Task</option>
                <option [value]="TaskType.Bug">Bug</option>
                <option [value]="TaskType.Story">Story</option>
                <option [value]="TaskType.Epic">Epic</option>
              </select>
            </div>

            <!-- Story Points -->
            <div class="attribute-group">
              <label class="attribute-label">Story Points</label>
              <input
                type="number"
                [ngModel]="editingStoryPoints()"
                (ngModelChange)="editingStoryPoints.set($event)"
                placeholder="Ví dụ: 5"
                class="attribute-control"
              />
            </div>

            <!-- Hạn chót -->
            <div class="attribute-group">
              <label class="attribute-label">Hạn chót (Due Date)</label>
              <input
                type="datetime-local"
                [ngModel]="editingDueDate()"
                (ngModelChange)="editingDueDate.set($event)"
                class="attribute-control"
              />
            </div>

            <hr class="attr-divider" />

            <!-- DYNAMIC CUSTOM FIELDS (Mô hình EAV) -->
            <div class="custom-fields-panel">
              <label class="custom-fields-header">Các trường tự định nghĩa (Custom Fields)</label>
              
              <div *ngIf="task.customFields && task.customFields.length > 0" class="custom-fields-list">
                <div class="attribute-group" *ngFor="let cf of task.customFields">
                  <label class="attribute-label">{{ cf.fieldName }}</label>
                  
                  <!-- Render động input tùy theo DataType -->
                  <ng-container [ngSwitch]="cf.dataType">
                    <!-- Kiểu Boolean (Checkbox) -->
                    <input
                      *ngSwitchCase="CustomFieldType.Boolean"
                      type="checkbox"
                      [checked]="getCustomFieldValue(cf.customFieldId) === 'true'"
                      (change)="updateCustomFieldLocal(cf.customFieldId, $event, CustomFieldType.Boolean)"
                      class="cf-checkbox"
                    />

                    <!-- Kiểu Date (DatePicker) -->
                    <input
                      *ngSwitchCase="CustomFieldType.Date"
                      type="date"
                      [value]="getCustomFieldValue(cf.customFieldId)"
                      (change)="updateCustomFieldLocal(cf.customFieldId, $event, CustomFieldType.Date)"
                      class="attribute-control"
                    />

                    <!-- Kiểu Number (Number box) -->
                    <input
                      *ngSwitchCase="CustomFieldType.Number"
                      type="number"
                      [value]="getCustomFieldValue(cf.customFieldId)"
                      (change)="updateCustomFieldLocal(cf.customFieldId, $event, CustomFieldType.Number)"
                      class="attribute-control"
                    />

                    <!-- Mặc định: Kiểu Text (Textbox thường) -->
                    <input
                      *ngSwitchDefault
                      type="text"
                      [value]="getCustomFieldValue(cf.customFieldId)"
                      (change)="updateCustomFieldLocal(cf.customFieldId, $event, CustomFieldType.Text)"
                      class="attribute-control"
                    />
                  </ng-container>
                </div>
              </div>

              <div *ngIf="!task.customFields || task.customFields.length === 0" class="cf-empty-state">
                Không có trường động nào được cấu hình cho công việc này.
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    /* 1. Backdrop Overlay */
    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }

    .drawer-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    /* 2. Centered Modal Panel */
    .drawer-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      width: 950px;
      max-width: 95%;
      height: 85vh;
      max-height: 850px;
      background: #ffffff;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
      z-index: 1001;
      border-radius: 20px;
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, -46%) scale(0.96);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
      display: flex;
      flex-direction: column;
    }

    .drawer-panel.open {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, -50%) scale(1);
    }

    .drawer-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* 3. Header */
    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #f1f5f9;
      background: #f8fafc;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .drawer-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .drawer-task-id {
      font-family: monospace;
      font-size: 1.1rem;
      font-weight: 700;
      color: #64748b;
    }

    .drawer-header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-close-drawer {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s;
    }

    .btn-close-drawer:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* 4. Grid Body Layout (70 / 30) */
    .drawer-body-grid {
      display: grid;
      grid-template-columns: 7fr 3fr;
      flex: 1;
      overflow-y: auto;
      background: #ffffff;
    }

    @media (max-width: 768px) {
      .drawer-body-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Cột trái (70%) */
    .drawer-col-left {
      padding: 24px;
      border-right: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    /* Cột phải (30%) */
    .drawer-col-right {
      padding: 24px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* 5. Inline Editable Title */
    .inline-title-wrapper {
      width: 100%;
    }

    .inline-title-input {
      border: 1px solid transparent;
      background: transparent;
      font-family: 'Outfit', sans-serif;
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      outline: none;
      padding: 6px 10px;
      border-radius: 8px;
      transition: all 0.15s;
    }

    .inline-title-input:hover {
      background: #f1f5f9;
    }

    .inline-title-input:focus {
      background: #ffffff;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    /* 6. Section Labels */
    .drawer-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-label {
      font-size: 0.88rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Rich Editor text */
    .rich-editor-wrapper {
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      background: #ffffff;
    }

    .editor-toolbar {
      display: flex;
      gap: 4px;
      padding: 6px;
      background: #f8fafc;
      border-bottom: 1px solid #cbd5e1;
      flex-wrap: wrap;
    }

    .editor-toolbar button {
      background: none;
      border: none;
      padding: 6px 10px;
      cursor: pointer;
      border-radius: 6px;
      font-size: 0.82rem;
      color: #475569;
      font-weight: 500;
    }

    .editor-toolbar button:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .editor-textarea {
      min-height: 180px;
      padding: 16px;
      outline: none;
      color: #1e293b;
      font-size: 0.95rem;
      line-height: 1.6;
    }

    /* Attachments grid */
    .drawer-dropzone {
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      background: #f8fafc;
    }

    .drawer-dropzone:hover, .drawer-dropzone.dragover {
      border-color: #4f46e5;
      background: #f5f3ff;
      color: #4f46e5;
    }

    .dropzone-icon {
      font-size: 1.8rem;
    }

    .dropzone-text {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 500;
    }

    .attachments-thumbnail-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 12px;
    }

    .thumbnail-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      padding: 4px;
    }

    .thumb-img {
      width: 100%;
      height: 90px;
      object-fit: cover;
      border-radius: 6px;
    }

    .thumb-view-link {
      font-size: 0.7rem;
      text-align: center;
      padding: 4px 0;
      color: #4f46e5;
      text-decoration: none;
      font-weight: 600;
    }

    .thumb-view-link:hover {
      text-decoration: underline;
    }

    /* Subtasks Manager */
    .drawer-subtasks-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .drawer-subtask-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .subtask-index {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .subtask-inline-input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.88rem;
      color: #1e293b;
      font-weight: 500;
    }

    .subtask-inline-status {
      padding: 4px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      font-size: 0.78rem;
      cursor: pointer;
    }

    .btn-delete-subtask {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.95rem;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .btn-delete-subtask:hover {
      color: #ef4444;
      background: #fee2e2;
    }

    .add-subtask-bar {
      display: flex;
      gap: 10px;
    }

    .add-subtask-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      outline: none;
      font-size: 0.88rem;
    }

    .btn-add-subtask {
      padding: 8px 16px;
      white-space: nowrap;
    }

    /* Comments Section */
    .activity-tabs {
      display: flex;
      gap: 16px;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }

    .tab-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.88rem;
      color: #64748b;
      padding-bottom: 8px;
      position: relative;
    }

    .tab-btn.active {
      color: #4f46e5;
    }

    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 100%;
      height: 2px;
      background: #4f46e5;
    }

    .comment-input-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 10px;
      margin-bottom: 16px;
    }

    .comment-textarea {
      width: 100%;
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 0.9rem;
      resize: none;
      color: #1e293b;
    }

    .comment-input-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 6px;
    }

    .btn-post-comment {
      font-size: 0.8rem;
      padding: 6px 12px;
    }

    .comments-scroll-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 250px;
      overflow-y: auto;
    }

    .comment-item {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
      padding: 12px;
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 0.78rem;
    }

    .comment-author {
      font-weight: 700;
      color: #334155;
    }

    .comment-time {
      color: #94a3b8;
    }

    .comment-text {
      color: #1e293b;
      font-size: 0.88rem;
      line-height: 1.5;
    }

    .history-scroll-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 250px;
      overflow-y: auto;
      padding-left: 8px;
    }

    .history-dot {
      width: 8px;
      height: 8px;
      background: #cbd5e1;
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;
    }

    .history-content {
      display: flex;
      flex-direction: column;
    }

    .history-time {
      font-size: 0.72rem;
      color: #94a3b8;
      font-family: monospace;
    }

    .history-text {
      font-size: 0.85rem;
      color: #475569;
      margin-top: 2px;
    }

    .activity-empty-state {
      text-align: center;
      padding: 20px;
      color: #94a3b8;
      font-size: 0.8rem;
      font-style: italic;
    }

    /* Right column properties styling */
    .attribute-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .attribute-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .assignee-display {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-weight: 600;
      font-size: 0.88rem;
    }

    .attribute-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      outline: none;
      font-family: inherit;
      font-size: 0.88rem;
      background: #ffffff;
      color: #1e293b;
      font-weight: 500;
    }

    .attribute-control:focus {
      border-color: #4f46e5;
    }

    .status-select {
      background: #ffffff;
      font-weight: 700;
      color: #4f46e5;
      border-color: #c7d2fe;
    }

    .attr-divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 10px 0;
    }

    .custom-fields-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .custom-fields-header {
      font-size: 0.85rem;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .cf-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #4f46e5;
    }

    .cf-empty-state {
      font-size: 0.8rem;
      color: #94a3b8;
      font-style: italic;
    }

    /* Badges */
    .type-badge {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .type-badge[data-type="Bug"] { background: #fef2f2; color: #dc2626; }
    .type-badge[data-type="Epic"] { background: #fdf4ff; color: #c084fc; border: 1px solid #fae8ff; }
    .type-badge[data-type="Story"] { background: #eff6ff; color: #3b82f6; }
    .type-badge[data-type="Task"] { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

    .loading-text {
      color: #4f46e5;
      font-weight: 700;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class TaskDrawerComponent {
  private taskService = inject(TaskService);
  protected readonly authService = inject(AuthService);

  @ViewChild('editorDiv') editorDivElement?: ElementRef<HTMLDivElement>;

  // Inputs & Outputs
  @Output() onClose = new EventEmitter<void>();
  @Output() onSaved = new EventEmitter<void>();

  // Setter input để khởi tạo dữ liệu cục bộ khi task thay đổi
  @Input() set task(value: TaskItem | null) {
    this._task = value;
    if (value) {
      this.initializeDrawer(value);
    }
  }
  get task(): TaskItem | null {
    return this._task;
  }
  private _task: TaskItem | null = null;

  // Expose Enums ra template
  protected readonly TaskStatus = TaskItemStatus;
  protected readonly TaskPriority = TaskPriority;
  protected readonly TaskType = TaskType;
  protected readonly CustomFieldType = CustomFieldType;

  // Các trường cục bộ được chỉnh sửa trong Drawer
  protected readonly editingTitle = signal('');
  protected readonly editingDescription = signal('');
  protected readonly editingStatus = signal<TaskItemStatus>(TaskItemStatus.Todo);
  protected readonly editingDueDate = signal('');
  protected readonly editingProjectId = signal<number | null>(null);
  protected readonly editingSprintId = signal<number | null>(null);
  protected readonly editingStoryPoints = signal<number | null>(null);
  protected readonly editingPriority = signal<TaskPriority>(TaskPriority.Medium);
  protected readonly editingTaskType = signal<TaskType>(TaskType.Task);
  protected readonly editingCustomFields = signal<CustomFieldUpdateDto[]>([]);
  protected readonly editingSubTasks = signal<SubTaskUpdateDto[]>([]);
  protected readonly taskAssignee = signal('unassigned');
  protected readonly taskLabelsInput = signal('');
  
  // Biến giữ nội dung HTML mô tả ban đầu (ngăn con trỏ nhảy ngược khi đang nhập)
  protected readonly initialDescriptionHTML = signal('');

  // Bình luận & Hoạt động
  protected readonly activeTab = signal<'comments' | 'history'>('comments');
  protected readonly commentsList = signal<CommentItem[]>([]);
  protected readonly historyList = signal<HistoryItem[]>([]);
  protected newCommentInput = '';
  protected newSubTaskTitle = '';

  // File Upload State
  protected readonly isUploading = signal(false);
  protected readonly uploadedAttachments = signal<string[]>([]);
  protected isDragOver = false;

  // Lắng nghe phím Esc để đóng Drawer
  @HostListener('window:keydown.escape', ['$event'])
  onEscapePress(event: any) {
    if (this.task) {
      this.close();
    }
  }

  private initializeDrawer(task: TaskItem): void {
    this.editingTitle.set(task.title);
    this.editingDescription.set(task.description || '');
    this.initialDescriptionHTML.set(this.formatDescriptionForDisplay(task.description || ''));
    this.editingStatus.set(task.status);
    this.editingDueDate.set(task.dueDate ? task.dueDate.substring(0, 16) : '');
    this.editingProjectId.set(task.projectId || null);
    this.editingSprintId.set(task.sprintId || null);
    this.editingStoryPoints.set(task.storyPoints || null);
    this.editingPriority.set(task.priority);
    this.editingTaskType.set(task.taskType);

    // Custom Fields EAV
    const cfUpdates = (task.customFields || []).map(cf => ({
      customFieldId: cf.customFieldId,
      value: cf.value
    }));
    this.editingCustomFields.set(cfUpdates);

    // Subtasks
    const subUpdates = (task.subTasks || []).map(sub => ({
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

    // Reset danh sách ảnh đính kèm của phiên này và quét từ description xem có ảnh cũ không
    this.uploadedAttachments.set([]);
    this.extractImagesFromDescription(task.description || '');

    // Khởi tạo người gán và nhãn từ localStorage
    if (task.id > 0) {
      this.taskAssignee.set(localStorage.getItem(`task_assignee_${task.id}`) || this.authService.currentUser() || 'unassigned');
      this.taskLabelsInput.set(localStorage.getItem(`task_labels_${task.id}`) || '');
    } else {
      this.taskAssignee.set(this.authService.currentUser() || 'unassigned');
      this.taskLabelsInput.set('');
    }

    // Tải Bình luận & Lịch sử từ localStorage
    this.loadCommentsFromStorage(task.id);
    this.loadHistoryFromStorage(task.id);
  }

  protected onAssigneeChange(name: string): void {
    if (this.task && this.task.id > 0) {
      this.taskAssignee.set(name);
      localStorage.setItem(`task_assignee_${this.task.id}`, name);
      this.addHistoryLog(`đã gán công việc cho: ${name}`);
    }
  }

  protected onLabelsChange(val: string): void {
    if (this.task && this.task.id > 0) {
      this.taskLabelsInput.set(val);
      localStorage.setItem(`task_labels_${this.task.id}`, val);
    }
  }

  private extractImagesFromDescription(desc: string): void {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    const matches: string[] = [];
    let match;
    while ((match = imgRegex.exec(desc)) !== null) {
      matches.push(match[1]);
    }
    if (matches.length > 0) {
      this.uploadedAttachments.set(matches);
    }
  }

  // --- LOCAL COMMENTS & HISTORY PERSISTENCE IN LOCALSTORAGE ---
  private loadCommentsFromStorage(taskId: number): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(`task_comments_${taskId}`);
    if (data) {
      this.commentsList.set(JSON.parse(data));
    } else {
      this.commentsList.set([]);
    }
  }

  private loadHistoryFromStorage(taskId: number): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(`task_history_${taskId}`);
    if (data) {
      this.historyList.set(JSON.parse(data));
    } else {
      // Khởi tạo hoạt động ban đầu mẫu
      const initialLogs: HistoryItem[] = [
        {
          author: 'Hệ thống',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
          text: 'đã tạo công việc này.'
        }
      ];
      localStorage.setItem(`task_history_${taskId}`, JSON.stringify(initialLogs));
      this.historyList.set(initialLogs);
    }
  }

  protected postComment(): void {
    const text = this.newCommentInput.trim();
    if (!text || !this.task) return;

    const author = this.authService.currentUser() || 'Khách';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    const newComment: CommentItem = {
      author,
      time: timeStr,
      text
    };

    const currentComments = [...this.commentsList(), newComment];
    this.commentsList.set(currentComments);
    localStorage.setItem(`task_comments_${this.task.id}`, JSON.stringify(currentComments));
    
    // Ghi nhận vào Lịch sử
    this.addHistoryLog(`đã viết bình luận: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    
    this.newCommentInput = '';
  }

  private addHistoryLog(actionText: string): void {
    if (!this.task) return;
    const author = this.authService.currentUser() || 'Khách';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN');

    const newLog: HistoryItem = {
      author,
      time: timeStr,
      text: actionText
    };

    const currentLogs = [newLog, ...this.historyList()]; // Nhật ký mới xếp lên đầu
    this.historyList.set(currentLogs);
    localStorage.setItem(`task_history_${this.task.id}`, JSON.stringify(currentLogs));
  }

  // --- LOGIC CHI TIẾT ---
  protected onTitleBlur(): void {
    const title = this.editingTitle().trim();
    if (title && this.task && title !== this.task.title) {
      this.addHistoryLog(`đã đổi tiêu đề thành: "${title}"`);
    }
  }

  protected onStatusChange(newStatus: TaskItemStatus): void {
    const oldStatus = this.editingStatus();
    if (oldStatus !== newStatus) {
      this.editingStatus.set(newStatus);
      this.addHistoryLog(`đã chuyển trạng thái từ ${oldStatus} sang ${newStatus}`);
    }
  }

  // EAV custom fields
  protected getCustomFieldValue(fieldId: number): string {
    const field = this.editingCustomFields().find(f => f.customFieldId === fieldId);
    return field ? field.value : '';
  }

  protected updateCustomFieldLocal(fieldId: number, event: any, type: CustomFieldType): void {
    let value = '';
    if (type === CustomFieldType.Boolean) {
      value = event.target.checked ? 'true' : 'false';
    } else {
      value = event.target.value;
    }

    this.editingCustomFields.update(fields => {
      const idx = fields.findIndex(f => f.customFieldId === fieldId);
      if (idx !== -1) {
        const oldVal = fields[idx].value;
        if (oldVal !== value) {
          fields[idx].value = value;
          this.addHistoryLog(`đã cập nhật trường mở rộng ID #${fieldId} thành "${value}"`);
        }
        return [...fields];
      } else {
        this.addHistoryLog(`đã thêm giá trị trường mở rộng ID #${fieldId}: "${value}"`);
        return [...fields, { customFieldId: fieldId, value }];
      }
    });
  }

  // Subtasks
  protected addSubTaskLocal(): void {
    const title = this.newSubTaskTitle.trim();
    if (!title) return;

    const newSub: SubTaskUpdateDto = {
      title,
      status: TaskItemStatus.Todo,
      priority: TaskPriority.Medium,
      taskType: TaskType.Task
    };

    this.editingSubTasks.update(subs => [...subs, newSub]);
    this.addHistoryLog(`đã thêm task con mới cục bộ: "${title}"`);
    this.newSubTaskTitle = '';
  }

  protected removeSubTaskLocal(index: number): void {
    const removed = this.editingSubTasks()[index];
    this.editingSubTasks.update(subs => subs.filter((_, idx) => idx !== index));
    this.addHistoryLog(`đã xóa task con: "${removed.title}"`);
  }

  // WYSIWYG Editor
  protected execEditorCommand(command: string, value: string = ''): void {
    document.execCommand(command, false, value);
    this.updateDescriptionFromEditor();
  }

  protected insertLinkPrompt(): void {
    const url = prompt('Nhập địa chỉ liên kết (URL):', 'https://');
    if (url) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = selection.toString() || url;

        range.deleteContents();
        range.insertNode(link);
        this.updateDescriptionFromEditor();
        this.addHistoryLog(`đã chèn một liên kết vào mô tả`);
      }
    }
  }

  protected onEditorInput(html: string): void {
    this.editingDescription.set(html);
  }

  protected onEditorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const url = anchor.getAttribute('href');
      if (url) {
        window.open(url, '_blank');
        event.preventDefault();
      }
    }
  }

  private updateDescriptionFromEditor(): void {
    if (this.editorDivElement) {
      this.editingDescription.set(this.editorDivElement.nativeElement.innerHTML);
    }
  }

  // File Upload Handlers
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.uploadFile(file);
    }
  }

  protected onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      this.uploadFile(file);
    }
  }

  protected onEditorDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        this.uploadFile(file);
      }
    }
  }

  protected onEditorPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          event.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            this.uploadFile(file);
          }
        }
      }
    }
  }

  protected getFullUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const baseUrl = this.taskService.apiUrl.replace('/tasks', '');
    const cleanUrl = url.startsWith('/') ? url : '/' + url;
    return `${baseUrl}${cleanUrl}`;
  }

  protected formatDescriptionForDisplay(desc: string): string {
    if (!desc) return '';
    const baseUrl = this.taskService.apiUrl.replace('/tasks', '');
    let formatted = desc.replace(/src="\/uploads\//g, `src="${baseUrl}/uploads/`);
    formatted = formatted.replace(/src="uploads\//g, `src="${baseUrl}/uploads/`);
    
    // Tự động chuyển đổi bất kỳ URL nào trong văn bản (bắt đầu bằng http, https) thành link <a>
    if (typeof DOMParser !== 'undefined' && typeof document !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(formatted, 'text/html');
        this.linkifyHtmlNode(doc.body);
        formatted = doc.body.innerHTML;
      } catch (e) {
        console.error('Lỗi khi tự động chuyển đổi URL thành liên kết:', e);
      }
    }
    
    return formatted;
  }

  private linkifyHtmlNode(node: Node): void {
    if (!node) return;
    
    // Bỏ qua các thẻ <a>, <script>, <style> để không ghi đè liên kết hiện có hoặc mã script/style
    const name = node.nodeName.toLowerCase();
    if (name === 'a' || name === 'script' || name === 'style') {
      return;
    }

    const childNodes = Array.from(node.childNodes);
    for (const child of childNodes) {
      if (child.nodeType === 3) { // Thẻ text (Text Node)
        const text = child.textContent || '';
        const urlRegex = /(https?:\/\/[^\s"'<>\(\)]*[^\s"'<>\(\),;.!?])/g;
        if (urlRegex.test(text)) {
          const parts = text.split(urlRegex);
          const fragment = document.createDocumentFragment();
          
          for (const part of parts) {
            if (urlRegex.test(part)) {
              const link = document.createElement('a');
              link.href = part;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              link.className = 'text-primary hover:underline';
              link.textContent = part;
              fragment.appendChild(link);
            } else if (part) {
              fragment.appendChild(document.createTextNode(part));
            }
          }
          node.replaceChild(fragment, child);
        }
      } else if (child.nodeType === 1) { // Thẻ element (Element Node)
        this.linkifyHtmlNode(child);
      }
    }
  }

  private uploadFile(file: File): void {
    if (!this.task) return;

    if (this.task.id === 0) {
      alert('Vui lòng lưu công việc trước khi tải ảnh đính kèm.');
      return;
    }

    this.isUploading.set(true);

    this.taskService.uploadAttachment(this.task.id, file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.uploadedAttachments.update(current => [...current, res.url]);
        
        // Chèn vào editor
        if (this.editorDivElement) {
          const editor = this.editorDivElement.nativeElement;
          editor.focus();
          const imgHtml = `<img src="${res.url}" alt="${res.fileName}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" />`;
          document.execCommand('insertHTML', false, imgHtml);
          this.updateDescriptionFromEditor();
        }
        this.addHistoryLog(`đã tải lên đính kèm ảnh: "${res.fileName}"`);
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Lỗi upload file:', err);
        const msg = err.error?.message || err.error || 'Không thể tải ảnh đính kèm lên.';
        alert(msg);
      }
    });
  }

  // --- SAVE & CLOSE ---
  protected saveChanges(): void {
    if (!this.task) return;

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

    this.taskService.updateTask(this.task.id, updateDto).subscribe({
      next: () => {
        this.onSaved.emit();
        this.close();
      },
      error: (err) => {
        console.error('Lỗi cập nhật công việc:', err);
        alert(err.error?.message || 'Có lỗi xảy ra khi lưu công việc.');
      }
    });
  }

  protected close(): void {
    this.onClose.emit();
  }
}
