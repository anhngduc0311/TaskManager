export enum TaskItemStatus {
  Todo = 'Todo',
  InProgress = 'InProgress',
  InReview = 'InReview',
  Done = 'Done'
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export enum TaskType {
  Epic = 'Epic',
  Story = 'Story',
  Task = 'Task',
  Bug = 'Bug'
}

export enum CustomFieldType {
  Text = 'Text',
  Number = 'Number',
  Date = 'Date',
  Boolean = 'Boolean'
}

/**
 * DTO cho giá trị Custom Field trả về từ API.
 */
export interface CustomFieldValueResponseDto {
  customFieldId: number;
  fieldName: string;
  dataType: CustomFieldType;
  value: string;
}

/**
 * DTO cho Subtask lồng nhau rút gọn trả về từ API.
 */
export interface SubTaskResponseDto {
  id: number;
  title: string;
  description?: string;
  status: TaskItemStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints?: number;
  dueDate?: string;
  createdDate: string;
}

/**
 * Interface đầy đủ của Task kèm Subtasks và CustomFields từ API Backend.
 */
export interface TaskItem {
  id: number;
  title: string;
  description?: string; // HTML mô tả
  status: TaskItemStatus;
  createdDate: string;
  dueDate?: string;
  userId?: number;

  projectId?: number;
  sprintId?: number;
  storyPoints?: number;
  priority: TaskPriority;
  taskType: TaskType;
  parentTaskId?: number;

  subTasks: SubTaskResponseDto[];
  customFields: CustomFieldValueResponseDto[];
}

/**
 * DTO gửi dữ liệu khi tạo mới Task.
 */
export interface CreateTaskDto {
  title: string;
  description?: string;
  dueDate?: string;
  projectId?: number;
  sprintId?: number;
  storyPoints?: number;
  priority?: TaskPriority;
  taskType?: TaskType;
  parentTaskId?: number;
}

/**
 * DTO cập nhật giá trị Custom Field.
 */
export interface CustomFieldUpdateDto {
  customFieldId: number;
  value: string;
}

/**
 * DTO cập nhật/tạo mới Subtask lồng nhau từ Task cha.
 */
export interface SubTaskUpdateDto {
  id?: number;
  title: string;
  description?: string;
  status: TaskItemStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints?: number;
  dueDate?: string;
}

/**
 * DTO gửi dữ liệu khi cập nhật đầy đủ Task.
 */
export interface UpdateTaskDto {
  title: string;
  description?: string;
  status: TaskItemStatus;
  dueDate?: string;
  projectId?: number;
  sprintId?: number;
  storyPoints?: number;
  priority: TaskPriority;
  taskType: TaskType;
  parentTaskId?: number;
  customFields: CustomFieldUpdateDto[];
  subTasks: SubTaskUpdateDto[];
}

/**
 * DTO gửi dữ liệu khi chỉ cập nhật trạng thái của Task.
 */
export interface UpdateStatusDto {
  status: TaskItemStatus;
}

export interface TypeDistributionDto {
  type: string;
  count: number;
  percentage: number;
}

export interface BurndownPointDto {
  date: string;
  dateLabel: string;
  remainingPoints: number;
  idealPoints: number;
}

export interface SprintReportDto {
  sprintId: number;
  sprintName: string;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  totalStoryPoints: number;
  doneStoryPoints: number;
  taskTypes: TypeDistributionDto[];
  burndownChart: BurndownPointDto[];
}

