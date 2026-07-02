using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Models
{
    public class User
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

        // Navigation property for 1-N relationship: A user can own multiple tasks.
        public ICollection<TaskItem> TaskItems { get; set; } = new List<TaskItem>();
    }
}
