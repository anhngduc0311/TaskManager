using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using TaskManager.Api.Data;
using TaskManager.Api.Models;

namespace TaskManager.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController] // Tự động kiểm tra tính hợp lệ của Model
    [Authorize] // Yêu cầu Đăng nhập cho tất cả các API trong controller này
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Tiêm DbContext thông qua Dependency Injection (DI)
        public TasksController(AppDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                throw new UnauthorizedAccessException("Người dùng chưa xác thực hoặc token không hợp lệ.");
            }
            return int.Parse(userIdClaim.Value);
        }

        /// <summary>
        /// GET: api/tasks
        /// Lấy danh sách toàn bộ công việc của người dùng hiện tại (chỉ lấy các task gốc, không lấy subtask lặp lại ở root).
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskDetailsResponseDto>>> GetTasks()
        {
            try
            {
                int userId = GetCurrentUserId();

                // Lấy các custom fields để xây dựng đầy đủ trường động cho DTO
                var allCustomFields = await _context.CustomFields.ToListAsync();

                // Chỉ lấy các Task gốc (không có ParentTaskId) của user đó
                var rootTasks = await _context.TaskItems
                                              .Include(t => t.SubTasks)
                                              .Include(t => t.CustomValues)
                                              .Where(t => t.UserId == userId && t.ParentTaskId == null)
                                              .ToListAsync();

                var response = rootTasks.Select(task => MapToDetailsDto(task, allCustomFields)).ToList();

                return Ok(response);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }

        /// <summary>
        /// GET: api/tasks/{id}
        /// Lấy thông tin chi tiết của một công việc theo Id (kèm SubTasks lồng nhau và CustomFields đầy đủ).
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskDetailsResponseDto>> GetTask(int id)
        {
            try
            {
                int userId = GetCurrentUserId();

                var taskItem = await _context.TaskItems
                                             .Include(t => t.SubTasks)
                                             .Include(t => t.CustomValues)
                                                 .ThenInclude(cv => cv.CustomField)
                                             .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

                if (taskItem == null)
                {
                    return NotFound(new { Message = $"Không tìm thấy công việc với Id = {id}" });
                }

                var allCustomFields = await _context.CustomFields.ToListAsync();
                var response = MapToDetailsDto(taskItem, allCustomFields);

                return Ok(response);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }

        /// <summary>
        /// POST: api/tasks
        /// Tạo mới một công việc.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<TaskDetailsResponseDto>> CreateTask([FromBody] CreateTaskDto createTaskDto)
        {
            try
            {
                int userId = GetCurrentUserId();

                // Ánh xạ dữ liệu từ DTO sang Entity Task
                var taskItem = new TaskItem
                {
                    Title = createTaskDto.Title,
                    Description = createTaskDto.Description, // Hỗ trợ HTML thô an toàn
                    Status = TaskItemStatus.Todo,
                    CreatedDate = DateTime.UtcNow,
                    DueDate = createTaskDto.DueDate,
                    UserId = userId,
                    ProjectId = createTaskDto.ProjectId,
                    SprintId = createTaskDto.SprintId,
                    StoryPoints = createTaskDto.StoryPoints,
                    Priority = createTaskDto.Priority,
                    TaskType = createTaskDto.TaskType,
                    ParentTaskId = createTaskDto.ParentTaskId
                };

                _context.TaskItems.Add(taskItem);
                await _context.SaveChangesAsync();

                // Load lại đầy đủ để build DTO trả về
                var allCustomFields = await _context.CustomFields.ToListAsync();
                var createdTask = await _context.TaskItems
                                                .Include(t => t.SubTasks)
                                                .Include(t => t.CustomValues)
                                                .FirstAsync(t => t.Id == taskItem.Id);

                var response = MapToDetailsDto(createdTask, allCustomFields);
                return CreatedAtAction(nameof(GetTask), new { id = taskItem.Id }, response);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }

        /// <summary>
        /// PUT: api/tasks/{id}
        /// Cập nhật toàn bộ thông tin công việc bao gồm: mô tả HTML, Custom Fields mở rộng, và các Subtasks lồng nhau.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskDto updateTaskDto)
        {
            try
            {
                int userId = GetCurrentUserId();

                // Load Task cha cùng các Subtask hiện tại và Custom Values hiện tại
                var taskItem = await _context.TaskItems
                                             .Include(t => t.SubTasks)
                                             .Include(t => t.CustomValues)
                                             .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

                if (taskItem == null)
                {
                    return NotFound(new { Message = $"Không tìm thấy công việc với Id = {id} để cập nhật." });
                }

                // 1. Cập nhật các thông tin cơ bản
                taskItem.Title = updateTaskDto.Title;
                taskItem.Description = updateTaskDto.Description; // Nhận & Lưu trữ chuỗi mô tả dạng HTML trực tiếp
                taskItem.Status = updateTaskDto.Status;
                taskItem.DueDate = updateTaskDto.DueDate;
                taskItem.ProjectId = updateTaskDto.ProjectId;
                taskItem.SprintId = updateTaskDto.SprintId;
                taskItem.StoryPoints = updateTaskDto.StoryPoints;
                taskItem.Priority = updateTaskDto.Priority;
                taskItem.TaskType = updateTaskDto.TaskType;
                taskItem.ParentTaskId = updateTaskDto.ParentTaskId;

                // 2. Cập nhật danh sách các trường động (EAV)
                var allCustomFields = await _context.CustomFields.ToListAsync();
                foreach (var customFieldUpdate in updateTaskDto.CustomFields)
                {
                    var definition = allCustomFields.FirstOrDefault(cf => cf.Id == customFieldUpdate.CustomFieldId);
                    if (definition == null)
                    {
                        return BadRequest(new { Message = $"Trường động với Id = {customFieldUpdate.CustomFieldId} không tồn tại trong hệ thống." });
                    }

                    // Validate tính hợp lệ của kiểu dữ liệu gửi lên (ví dụ: Number, Date, Boolean)
                    if (!ValidateCustomFieldValue(customFieldUpdate.Value, definition.DataType))
                    {
                        return BadRequest(new { Message = $"Giá trị '{customFieldUpdate.Value}' không đúng định dạng của kiểu '{definition.DataType}' cho trường '{definition.Name}'." });
                    }

                    var existingValue = taskItem.CustomValues.FirstOrDefault(cv => cv.CustomFieldId == customFieldUpdate.CustomFieldId);
                    if (existingValue != null)
                    {
                        existingValue.Value = customFieldUpdate.Value;
                    }
                    else
                    {
                        taskItem.CustomValues.Add(new TaskCustomValue
                        {
                            TaskId = taskItem.Id,
                            CustomFieldId = customFieldUpdate.CustomFieldId,
                            Value = customFieldUpdate.Value
                        });
                    }
                }

                // 3. Cập nhật danh sách Subtasks lồng nhau
                var sentSubTaskIds = updateTaskDto.SubTasks.Where(s => s.Id.HasValue).Select(s => s.Id!.Value).ToList();
                
                // Xóa các Subtask hiện tại không có trong danh sách gửi lên (semantics của PUT)
                var subTasksToRemove = taskItem.SubTasks.Where(s => !sentSubTaskIds.Contains(s.Id)).ToList();
                foreach (var subToRemove in subTasksToRemove)
                {
                    _context.TaskItems.Remove(subToRemove);
                }

                // Thêm mới hoặc cập nhật các Subtask gửi lên
                foreach (var subDto in updateTaskDto.SubTasks)
                {
                    if (subDto.Id.HasValue && subDto.Id.Value > 0)
                    {
                        // Cập nhật Subtask cũ
                        var existingSub = taskItem.SubTasks.FirstOrDefault(s => s.Id == subDto.Id.Value);
                        if (existingSub != null)
                        {
                            existingSub.Title = subDto.Title;
                            existingSub.Description = subDto.Description;
                            existingSub.Status = subDto.Status;
                            existingSub.Priority = subDto.Priority;
                            existingSub.TaskType = subDto.TaskType;
                            existingSub.StoryPoints = subDto.StoryPoints;
                            existingSub.DueDate = subDto.DueDate;
                        }
                    }
                    else
                    {
                        // Tạo mới Subtask lồng nhau
                        var newSub = new TaskItem
                        {
                            Title = subDto.Title,
                            Description = subDto.Description,
                            Status = subDto.Status,
                            Priority = subDto.Priority,
                            TaskType = subDto.TaskType,
                            StoryPoints = subDto.StoryPoints,
                            DueDate = subDto.DueDate,
                            CreatedDate = DateTime.UtcNow,
                            ParentTaskId = taskItem.Id,
                            UserId = userId,
                            ProjectId = taskItem.ProjectId // Đồng bộ theo project của task cha
                        };
                        _context.TaskItems.Add(newSub);
                    }
                }

                _context.Entry(taskItem).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                // Trả về kết quả sau khi update thành công
                var updatedTask = await _context.TaskItems
                                                .Include(t => t.SubTasks)
                                                .Include(t => t.CustomValues)
                                                    .ThenInclude(cv => cv.CustomField)
                                                .FirstAsync(t => t.Id == taskItem.Id);

                var response = MapToDetailsDto(updatedTask, allCustomFields);
                return Ok(new { Message = "Cập nhật công việc thành công.", Task = response });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }

        /// <summary>
        /// POST: api/tasks/{id}/attachments
        /// Upload hình ảnh đính kèm cho Task, lưu trữ cục bộ tại thư mục wwwroot/uploads/attachments/
        /// </summary>
        [HttpPost("{id}/attachments")]
        public async Task<IActionResult> UploadAttachment(int id, IFormFile file)
        {
            try
            {
                int userId = GetCurrentUserId();

                // Xác thực xem Task có tồn tại và thuộc sở hữu của User không
                var taskExists = await _context.TaskItems.AnyAsync(t => t.Id == id && t.UserId == userId);
                if (!taskExists)
                {
                    return NotFound(new { Message = $"Không tìm thấy công việc với Id = {id}" });
                }

                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { Message = "File đính kèm không hợp lệ hoặc rỗng." });
                }

                // Kiểm tra loại file tải lên (chỉ cho phép các file hình ảnh tiêu chuẩn)
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest(new { Message = "Chỉ cho phép tải lên các tệp tin hình ảnh (.jpg, .png, .gif, .webp)." });
                }

                // Cấu hình thư mục lưu file: wwwroot/uploads/attachments/
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "attachments");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                // Tạo tên file duy nhất tránh bị trùng lặp đè file
                var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                // Lưu file cục bộ
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Xây dựng URL trả về dựa vào Domain của server (Http / Https)
                var request = HttpContext.Request;
                var fileUrl = $"{request.Scheme}://{request.Host}/uploads/attachments/{uniqueFileName}";

                return Ok(new
                {
                    Message = "Tải lên ảnh đính kèm thành công.",
                    FileName = file.FileName,
                    Url = fileUrl
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống khi tải file: {ex.Message}");
            }
        }

        /// <summary>
        /// PATCH: api/tasks/{id}/status
        /// Cập nhật nhanh trạng thái của một công việc.
        /// </summary>
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateTaskStatus(int id, [FromBody] UpdateStatusDto updateStatusDto)
        {
            try
            {
                int userId = GetCurrentUserId();
                var taskItem = await _context.TaskItems
                                             .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

                if (taskItem == null)
                {
                    return NotFound(new { Message = $"Không tìm thấy công việc với Id = {id} để cập nhật trạng thái." });
                }

                taskItem.Status = updateStatusDto.Status;
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Cập nhật trạng thái công việc thành công.", Task = taskItem });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }

        /// <summary>
        /// DELETE: api/tasks/{id}
        /// Xóa một công việc khỏi hệ thống (Tự động xóa đệ quy subtasks và các EAV custom fields liên quan).
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                var taskItem = await _context.TaskItems
                                             .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
                if (taskItem == null)
                {
                    return NotFound(new { Message = $"Không tìm thấy công việc với Id = {id} để xóa." });
                }

                _context.TaskItems.Remove(taskItem);
                await _context.SaveChangesAsync();

                return Ok(new { Message = $"Đã xóa thành công công việc có Id = {id} cùng các subtask tương ứng." });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }

        // Helper check sự tồn tại của Task
        private bool TaskItemExists(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                return _context.TaskItems.Any(e => e.Id == id && e.UserId == userId);
            }
            catch
            {
                return false;
            }
        }

        // Helper ánh xạ Entity TaskItem sang TaskDetailsResponseDto kèm đầy đủ trường động và Subtasks rút gọn
        private TaskDetailsResponseDto MapToDetailsDto(TaskItem task, List<CustomField> allCustomFields)
        {
            var taskValuesDict = task.CustomValues.ToDictionary(cv => cv.CustomFieldId, cv => cv.Value);

            return new TaskDetailsResponseDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description, // Trả nguyên dạng chuỗi chứa mã HTML
                Status = task.Status,
                CreatedDate = task.CreatedDate,
                DueDate = task.DueDate,
                UserId = task.UserId,
                ProjectId = task.ProjectId,
                SprintId = task.SprintId,
                StoryPoints = task.StoryPoints,
                Priority = task.Priority,
                TaskType = task.TaskType,
                ParentTaskId = task.ParentTaskId,

                // Ánh xạ Subtasks rút gọn để tránh Reference Loop
                SubTasks = task.SubTasks.Select(sub => new SubTaskResponseDto
                {
                    Id = sub.Id,
                    Title = sub.Title,
                    Description = sub.Description,
                    Status = sub.Status,
                    Priority = sub.Priority,
                    TaskType = sub.TaskType,
                    StoryPoints = sub.StoryPoints,
                    DueDate = sub.DueDate,
                    CreatedDate = sub.CreatedDate
                }).ToList(),

                // Trả về danh sách tất cả trường động có trên hệ thống, kèm theo giá trị thực tế của Task này (hoặc rỗng)
                CustomFields = allCustomFields.Select(cf => new CustomFieldValueResponseDto
                {
                    CustomFieldId = cf.Id,
                    FieldName = cf.Name,
                    DataType = cf.DataType,
                    Value = taskValuesDict.TryGetValue(cf.Id, out var val) ? val : (cf.DefaultValue ?? string.Empty)
                }).ToList()
            };
        }

        // Helper validate giá trị Custom Field dạng String theo định nghĩa DataType
        private bool ValidateCustomFieldValue(string value, CustomFieldType type)
        {
            if (string.IsNullOrEmpty(value)) return true; // Cho phép rỗng (hoặc kiểm tra IsRequired ở tầng cao hơn)

            switch (type)
            {
                case CustomFieldType.Text:
                    return true; // Văn bản thuần túy luôn hợp lệ

                case CustomFieldType.Number:
                    return decimal.TryParse(value, out _);

                case CustomFieldType.Date:
                    return DateTime.TryParse(value, out _);

                case CustomFieldType.Boolean:
                    return bool.TryParse(value, out _) || value == "1" || value == "0";

                default:
                    return false;
            }
        }
    }
}

