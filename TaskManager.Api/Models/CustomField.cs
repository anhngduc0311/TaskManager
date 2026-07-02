using System.Collections.Generic;

namespace TaskManager.Api.Models
{
    public class CustomField
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty; // e.g., "Link Pull Request", "Bug ID"
        public CustomFieldType DataType { get; set; }
        public bool IsRequired { get; set; }
        public string? DefaultValue { get; set; }

        // Navigation Properties
        public ICollection<TaskCustomValue> CustomValues { get; set; } = new List<TaskCustomValue>();
    }
}
