using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Models
{
    public enum TaskPriority
    {
        Low,
        Medium,
        High,
        Critical
    }

    public enum TaskType
    {
        Epic,
        Story,
        Task,
        Bug
    }

    public enum CustomFieldType
    {
        Text,
        Number,
        Date,
        Boolean
    }

    /// <summary>
    /// Enum định nghĩa các trạng thái của một công việc.
    /// Để tránh xung đột với System.Threading.Tasks.TaskStatus trong .NET, ta đặt tên là TaskItemStatus.
    /// </summary>
    public enum TaskItemStatus
    {
        Todo = 0,        // Việc cần làm
        InProgress = 1,  // Đang thực hiện
        Done = 2,        // Đã hoàn thành
        InReview = 3     // Đang đánh giá
    }

    /// <summary>
    /// Model TaskItem biểu diễn một công việc trong hệ thống.
    /// </summary>
    public class TaskItem
    {
        [Key] // Xác định đây là khóa chính
        public int Id { get; set; }

        [Required(ErrorMessage = "Tiêu đề công việc không được để trống.")]
        [MaxLength(150, ErrorMessage = "Tiêu đề không được vượt quá 150 ký tự.")]
        public string Title { get; set; } = string.Empty;

        // Cho phép lưu trữ HTML mô tả
        [MaxLength(4000, ErrorMessage = "Mô tả không được vượt quá 4000 ký tự.")]
        public string? Description { get; set; }

        [Required]
        public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;

        [Required]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime? DueDate { get; set; } // Ngày hết hạn (có thể null nếu không thiết lập hạn chót)

        public DateTime? CompletedDate { get; set; } // Ngày hoàn thành (phục vụ biểu đồ Burndown)

        // Khóa ngoại liên kết tới bảng Users (Assignee & Reporter)
        public int? AssigneeId { get; set; }
        public ApplicationUser? Assignee { get; set; }

        public int? ReporterId { get; set; }
        public ApplicationUser? Reporter { get; set; }

        // --- 1. Thông tin Dự án IT ---
        public int? ProjectId { get; set; } // Dạng Nullable để đảm bảo tương thích ngược dữ liệu cũ
        public Project? Project { get; set; }

        public int? SprintId { get; set; }
        public Sprint? Sprint { get; set; }

        public int? StoryPoints { get; set; }
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public TaskType TaskType { get; set; } = TaskType.Task;

        // --- 2. Cấu trúc Cha - Con (Subtasks) ---
        public int? ParentTaskId { get; set; }
        public TaskItem? ParentTask { get; set; }
        public ICollection<TaskItem> SubTasks { get; set; } = new List<TaskItem>();

        // --- 3. Liên kết giá trị trường động (EAV) ---
        public ICollection<TaskCustomValue> CustomValues { get; set; } = new List<TaskCustomValue>();
    }
}

