using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Models
{
    /// <summary>
    /// DTO (Data Transfer Object) dùng để nhận dữ liệu khi tạo mới một Task.
    /// </summary>
    public class CreateTaskDto
    {
        [Required(ErrorMessage = "Tiêu đề công việc không được để trống.")]
        [MaxLength(150, ErrorMessage = "Tiêu đề không được vượt quá 150 ký tự.")]
        public string Title { get; set; } = string.Empty;

        [MaxLength(4000, ErrorMessage = "Mô tả không được vượt quá 4000 ký tự.")]
        public string? Description { get; set; } // HTML Mô tả

        public DateTime? DueDate { get; set; }

        public int? ProjectId { get; set; }
        public int? SprintId { get; set; }
        public int? StoryPoints { get; set; }
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public TaskType TaskType { get; set; } = TaskType.Task;
        public int? ParentTaskId { get; set; }
    }

    /// <summary>
    /// DTO dùng để cập nhật giá trị trường động Custom Field.
    /// </summary>
    public class CustomFieldUpdateDto
    {
        [Required]
        public int CustomFieldId { get; set; }

        [Required]
        public string Value { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO dùng để cập nhật hoặc tạo mới một Subtask lồng nhau từ Task cha.
    /// </summary>
    public class SubTaskUpdateDto
    {
        public int? Id { get; set; } // Null nếu là tạo mới Subtask, có giá trị nếu là cập nhật Subtask cũ

        [Required(ErrorMessage = "Tiêu đề subtask không được để trống.")]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }
        public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public TaskType TaskType { get; set; } = TaskType.Task;
        public int? StoryPoints { get; set; }
        public DateTime? DueDate { get; set; }
    }

    /// <summary>
    /// DTO dùng để nhận dữ liệu khi cập nhật thông tin một Task.
    /// </summary>
    public class UpdateTaskDto
    {
        [Required(ErrorMessage = "Tiêu đề công việc không được để trống.")]
        [MaxLength(150, ErrorMessage = "Tiêu đề không được vượt quá 150 ký tự.")]
        public string Title { get; set; } = string.Empty;

        [MaxLength(4000, ErrorMessage = "Mô tả không được vượt quá 4000 ký tự.")]
        public string? Description { get; set; } // HTML Mô tả

        [Required(ErrorMessage = "Trạng thái công việc là bắt buộc.")]
        public TaskItemStatus Status { get; set; }

        public DateTime? DueDate { get; set; }

        public int? ProjectId { get; set; }
        public int? SprintId { get; set; }
        public int? StoryPoints { get; set; }
        public TaskPriority Priority { get; set; }
        public TaskType TaskType { get; set; }
        public int? ParentTaskId { get; set; }

        // Danh sách cập nhật các trường động
        public List<CustomFieldUpdateDto> CustomFields { get; set; } = new List<CustomFieldUpdateDto>();

        // Danh sách cập nhật hoặc tạo mới subtasks trực tiếp từ màn hình Task cha
        public List<SubTaskUpdateDto> SubTasks { get; set; } = new List<SubTaskUpdateDto>();
    }

    /// <summary>
    /// DTO dùng riêng cho việc cập nhật nhanh trạng thái của Task.
    /// </summary>
    public class UpdateStatusDto
    {
        [Required(ErrorMessage = "Trạng thái công việc là bắt buộc.")]
        public TaskItemStatus Status { get; set; }
    }

    /// <summary>
    /// DTO phản hồi của Custom Field.
    /// </summary>
    public class CustomFieldValueResponseDto
    {
        public int CustomFieldId { get; set; }
        public string FieldName { get; set; } = string.Empty;
        public CustomFieldType DataType { get; set; }
        public string Value { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO phản hồi của Subtask (Rút gọn để tránh vòng lặp JSON lồng vô hạn).
    /// </summary>
    public class SubTaskResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public TaskItemStatus Status { get; set; }
        public TaskPriority Priority { get; set; }
        public TaskType TaskType { get; set; }
        public int? StoryPoints { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    /// <summary>
    /// DTO trả về thông tin đầy đủ chi tiết của một Task (kèm theo Subtasks và CustomFields).
    /// </summary>
    public class TaskDetailsResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; } // HTML Mô tả
        public TaskItemStatus Status { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? DueDate { get; set; }
        public int? AssigneeId { get; set; }
        public int? ReporterId { get; set; }
        
        public int? ProjectId { get; set; }
        public int? SprintId { get; set; }
        public int? StoryPoints { get; set; }
        public TaskPriority Priority { get; set; }
        public TaskType TaskType { get; set; }
        public int? ParentTaskId { get; set; }

        public List<SubTaskResponseDto> SubTasks { get; set; } = new List<SubTaskResponseDto>();
        public List<CustomFieldValueResponseDto> CustomFields { get; set; } = new List<CustomFieldValueResponseDto>();
    }
}

