using System;
using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Models
{
    /// <summary>
    /// Enum định nghĩa các trạng thái của một công việc.
    /// Để tránh xung đột với System.Threading.Tasks.TaskStatus trong .NET, ta đặt tên là TaskItemStatus.
    /// </summary>
    public enum TaskItemStatus
    {
        Todo = 0,        // Việc cần làm
        InProgress = 1,  // Đang thực hiện
        Done = 2         // Đã hoàn thành
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

        [MaxLength(1000, ErrorMessage = "Mô tả không được vượt quá 1000 ký tự.")]
        public string? Description { get; set; }

        [Required]
        public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;

        [Required]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime? DueDate { get; set; } // Ngày hết hạn (có thể null nếu không thiết lập hạn chót)

        // Khóa ngoại liên kết tới bảng Users
        public int? UserId { get; set; }

        // Thuộc tính điều hướng liên kết tới thực thể User
        public User? User { get; set; }
    }
}
