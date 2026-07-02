using System;
using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Models
{
    public enum ProjectRole
    {
        Admin,
        Member,
        Viewer
    }

    public class ProjectMember
    {
        [Required]
        public int ProjectId { get; set; }
        public Project? Project { get; set; }

        [Required]
        public int UserId { get; set; }
        public ApplicationUser? User { get; set; }

        [Required]
        public ProjectRole Role { get; set; } = ProjectRole.Member;

        [Required]
        public DateTime JoinedDate { get; set; } = DateTime.UtcNow;
    }

    public class ProjectMemberResponseDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}
