using System;
using System.Collections.Generic;

namespace TaskManager.Api.Models
{
    public class Sprint
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }

        // Foreign Key
        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;

        // Navigation Properties
        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    }
}
