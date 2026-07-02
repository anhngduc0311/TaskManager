namespace TaskManager.Api.Models
{
    public class TaskCustomValue
    {
        public int TaskId { get; set; }
        public TaskItem Task { get; set; } = null!;

        public int CustomFieldId { get; set; }
        public CustomField CustomField { get; set; } = null!;

        public string Value { get; set; } = string.Empty;
    }
}
