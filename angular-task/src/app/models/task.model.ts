/**
 * Định nghĩa các trạng thái của Task khớp với enum trên Backend .NET Core.
 * Vì database lưu dạng chuỗi (String), dữ liệu JSON trả về sẽ là các chuỗi này.
 */
export enum TaskItemStatus {
  Todo = 'Todo',
  InProgress = 'InProgress',
  Done = 'Done'
}

/**
 * Interface khớp với Model TaskItem trả về từ API Backend.
 */
export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  status: TaskItemStatus;
  createdDate: string; // Chuỗi định dạng ISO DateTime từ backend
  dueDate?: string;     // Chuỗi định dạng ISO DateTime (tùy chọn)
}

/**
 * Interface gửi dữ liệu khi tạo mới Task.
 */
export interface CreateTaskDto {
  title: string;
  description?: string;
  dueDate?: string;
}

/**
 * Interface gửi dữ liệu khi cập nhật đầy đủ Task.
 */
export interface UpdateTaskDto {
  title: string;
  description?: string;
  status: TaskItemStatus;
  dueDate?: string;
}

/**
 * Interface gửi dữ liệu khi chỉ cập nhật trạng thái của Task.
 */
export interface UpdateStatusDto {
  status: TaskItemStatus;
}
