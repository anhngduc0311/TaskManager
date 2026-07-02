using System;
using System.Collections.Generic;

namespace TaskManager.Api.Models
{
    public class TypeDistributionDto
    {
        public string Type { get; set; } = string.Empty;
        public int Count { get; set; }
        public double Percentage { get; set; }
    }

    public class BurndownPointDto
    {
        public DateTime Date { get; set; }
        public string DateLabel { get; set; } = string.Empty;
        public int RemainingPoints { get; set; }
        public double IdealPoints { get; set; }
    }

    public class SprintReportDto
    {
        public int SprintId { get; set; }
        public string SprintName { get; set; } = string.Empty;
        public int TotalTasks { get; set; }
        public int TodoTasks { get; set; }
        public int InProgressTasks { get; set; }
        public int DoneTasks { get; set; }
        
        public int TotalStoryPoints { get; set; }
        public int DoneStoryPoints { get; set; }

        public List<TypeDistributionDto> TaskTypes { get; set; } = new List<TypeDistributionDto>();
        public List<BurndownPointDto> BurndownChart { get; set; } = new List<BurndownPointDto>();
    }
}
