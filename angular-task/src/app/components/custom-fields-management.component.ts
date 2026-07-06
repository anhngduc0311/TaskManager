import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../services/task.service';
import { CustomFieldType } from '../models/task.model';

// Import Angular Material modules
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-custom-fields-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatTableModule,
    MatCardModule
  ],
  template: `
    <div class="custom-fields-container p-6 space-y-6">
      <div class="flex justify-between items-center pb-4 border-b border-gray-200">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-3xl">settings_suggest</span>
            Quản lý các trường tự định nghĩa (Custom Fields)
          </h2>
          <p class="text-sm text-gray-500 mt-1">Định nghĩa các thuộc tính mở rộng cho công việc trong toàn bộ dự án.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- FORM TẠO MỚI -->
        <mat-card class="p-6 col-span-1 border border-outline-variant/50">
          <mat-card-header class="mb-4">
            <mat-card-title class="text-lg font-bold text-gray-700">Thêm trường động mới</mat-card-title>
          </mat-card-header>

          <form (submit)="createField(); $event.preventDefault()" class="space-y-4">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Tên trường động</mat-label>
              <input matInput [(ngModel)]="newName" name="name" required placeholder="Ví dụ: Link Pull Request, Mức độ rủi ro" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Kiểu dữ liệu</mat-label>
              <mat-select [(ngModel)]="newDataType" name="dataType" required>
                <mat-option [value]="CustomFieldType.Text">Văn bản (Text)</mat-option>
                <mat-option [value]="CustomFieldType.Number">Số (Number)</mat-option>
                <mat-option [value]="CustomFieldType.Date">Ngày tháng (Date)</mat-option>
                <mat-option [value]="CustomFieldType.Boolean">Đúng/Sai (Boolean)</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="py-2">
              <mat-checkbox [(ngModel)]="newIsRequired" name="isRequired" color="primary">
                Bắt buộc nhập liệu
              </mat-checkbox>
            </div>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Giá trị mặc định (Tùy chọn)</mat-label>
              <!-- Nếu kiểu boolean, hiển thị checkbox hoặc text placeholder tương ứng -->
              <input matInput [(ngModel)]="newDefaultValue" name="defaultValue" placeholder="Giá trị mặc định ban đầu..." />
            </mat-form-field>

            <div class="pt-4">
              <button mat-flat-button color="primary" type="submit" [disabled]="!newName.trim()" class="w-full py-2">
                <mat-icon>add</mat-icon> Tạo trường mới
              </button>
            </div>
          </form>
        </mat-card>

        <!-- DANH SÁCH TRƯỜNG ĐỘNG -->
        <mat-card class="p-6 col-span-2 border border-outline-variant/50">
          <mat-card-header class="mb-4">
            <mat-card-title class="text-lg font-bold text-gray-700">Danh sách trường hiện có</mat-card-title>
          </mat-card-header>

          <div class="overflow-x-auto">
            <table mat-table [dataSource]="fields()" class="w-full">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef class="font-bold text-gray-700">Tên trường</th>
                <td mat-cell *matCellDef="let field" class="font-semibold text-gray-800">{{ field.name }}</td>
              </ng-container>

              <!-- DataType Column -->
              <ng-container matColumnDef="dataType">
                <th mat-header-cell *matHeaderCellDef class="font-bold text-gray-700">Kiểu dữ liệu</th>
                <td mat-cell *matCellDef="let field">
                  <span class="px-2 py-1 text-xs font-bold rounded"
                        [ngClass]="{
                          'bg-blue-100 text-blue-800': field.dataType === CustomFieldType.Text,
                          'bg-green-100 text-green-800': field.dataType === CustomFieldType.Number,
                          'bg-purple-100 text-purple-800': field.dataType === CustomFieldType.Date,
                          'bg-amber-100 text-amber-800': field.dataType === CustomFieldType.Boolean
                        }">
                    {{ field.dataType }}
                  </span>
                </td>
              </ng-container>

              <!-- Required Column -->
              <ng-container matColumnDef="required">
                <th mat-header-cell *matHeaderCellDef class="font-bold text-gray-700 text-center">Bắt buộc</th>
                <td mat-cell *matCellDef="let field" class="text-center">
                  <span *ngIf="field.isRequired" class="text-red-500 font-bold text-lg">✓</span>
                  <span *ngIf="!field.isRequired" class="text-gray-400 font-bold text-lg">✗</span>
                </td>
              </ng-container>

              <!-- Default Value Column -->
              <ng-container matColumnDef="defaultValue">
                <th mat-header-cell *matHeaderCellDef class="font-bold text-gray-700">Giá trị mặc định</th>
                <td mat-cell *matCellDef="let field" class="text-gray-600 font-mono text-sm">
                  {{ field.defaultValue || '—' }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="font-bold text-gray-700 text-right">Thao tác</th>
                <td mat-cell *matCellDef="let field" class="text-right">
                  <button mat-icon-button color="warn" (click)="deleteField(field.id)" title="Xóa trường động này">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-gray-50"></tr>
            </table>

            <div *ngIf="fields().length === 0" class="text-center py-8 text-gray-400 font-medium">
              Chưa có trường tự định nghĩa nào. Hãy tạo trường mới ở form bên trái!
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep .mat-mdc-card {
      background: white !important;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05) !important;
    }
    table {
      background: transparent !important;
    }
  `]
})
export class CustomFieldsManagementComponent implements OnInit {
  private taskService = inject(TaskService);
  protected readonly CustomFieldType = CustomFieldType;

  // State
  protected readonly fields = signal<any[]>([]);
  protected readonly displayedColumns = ['name', 'dataType', 'required', 'defaultValue', 'actions'];

  // Form inputs
  protected newName = '';
  protected newDataType: CustomFieldType = CustomFieldType.Text;
  protected newIsRequired = false;
  protected newDefaultValue = '';

  ngOnInit(): void {
    this.loadFields();
  }

  protected loadFields(): void {
    this.taskService.getCustomFields().subscribe({
      next: (data) => {
        this.fields.set(data);
      },
      error: (err) => {
        console.error('Không thể tải các trường động:', err);
      }
    });
  }

  protected createField(): void {
    if (!this.newName.trim()) return;

    const payload = {
      name: this.newName,
      dataType: this.newDataType,
      isRequired: this.newIsRequired,
      defaultValue: this.newDefaultValue || null
    };

    this.taskService.createCustomField(payload).subscribe({
      next: () => {
        this.newName = '';
        this.newDefaultValue = '';
        this.newIsRequired = false;
        this.loadFields();
      },
      error: (err) => {
        console.error('Không thể tạo trường động:', err);
        alert('Lỗi tạo trường động: ' + (err.error?.Message || err.message));
      }
    });
  }

  protected deleteField(id: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa trường động này không? Hành động này sẽ xóa vĩnh viễn tất cả các giá trị của các nhiệm vụ liên kết với trường này.')) {
      this.taskService.deleteCustomField(id).subscribe({
        next: () => {
          this.loadFields();
        },
        error: (err) => {
          console.error('Không thể xóa trường động:', err);
          alert('Lỗi khi xóa: ' + (err.error?.Message || err.message));
        }
      });
    }
  }
}
