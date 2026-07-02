using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Models
{
    public class ApplicationUser
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = "User"; // E.g., "Admin", "User"

        [Required]
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        // Mối quan hệ: Một User có thể được phân công nhiều Task (Assignee)
        public ICollection<TaskItem> TasksAssigned { get; set; } = new List<TaskItem>();

        // Mối quan hệ: Một User có thể tạo/báo cáo nhiều Task (Reporter)
        public ICollection<TaskItem> TasksReported { get; set; } = new List<TaskItem>();

        // Mối quan hệ: Một User có thể là thành viên của nhiều dự án
        public ICollection<ProjectMember> ProjectMembers { get; set; } = new List<ProjectMember>();
    }
}
