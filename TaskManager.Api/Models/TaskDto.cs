using System;
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

        [MaxLength(1000, ErrorMessage = "Mô tả không được vượt quá 1000 ký tự.")]
        public string? Description { get; set; }

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

        [MaxLength(1000, ErrorMessage = "Mô tả không được vượt quá 1000 ký tự.")]
        public string? Description { get; set; }

        [Required(ErrorMessage = "Trạng thái công việc là bắt buộc.")]
        public TaskItemStatus Status { get; set; }

        public DateTime? DueDate { get; set; }
    }

    /// <summary>
    /// DTO dùng riêng cho việc cập nhật nhanh trạng thái của Task.
    /// </summary>
    public class UpdateStatusDto
    {
        [Required(ErrorMessage = "Trạng thái công việc là bắt buộc.")]
        public TaskItemStatus Status { get; set; }
    }
}
