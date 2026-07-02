using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using TaskManager.Api.Data;
using TaskManager.Api.Models;

namespace TaskManager.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController] // Tự động kiểm tra tính hợp lệ của Model (ModelState.IsValid)
    [Authorize] // Yêu cầu Đăng nhập (Authentication) cho tất cả các API trong controller này
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
        /// Lấy danh sách toàn bộ công việc của người dùng hiện tại.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskItem>>> GetTasks()
        {
            try
            {
                int userId = GetCurrentUserId();
                var tasks = await _context.TaskItems
                                          .Where(t => t.UserId == userId)
                                          .ToListAsync();
                return Ok(tasks); // Trả về HTTP 200 OK cùng danh sách tasks
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
        /// Lấy thông tin chi tiết của một công việc theo Id.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskItem>> GetTask(int id)
        {
            try
            {
                int userId = GetCurrentUserId();
                var taskItem = await _context.TaskItems
                                             .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

                if (taskItem == null)
                {
                    // Trả về HTTP 404 NotFound nếu không tìm thấy công việc
                    return NotFound(new { Message = $"Không tìm thấy công việc với Id = {id}" });
                }

                return Ok(taskItem);
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
        /// Tạo mới một công việc cho người dùng hiện tại.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody] CreateTaskDto createTaskDto)
        {
            try
            {
                int userId = GetCurrentUserId();
                // Ánh xạ dữ liệu từ DTO sang Model thực thể
                var taskItem = new TaskItem
                {
                    Title = createTaskDto.Title,
                    Description = createTaskDto.Description,
                    Status = TaskItemStatus.Todo, // Công việc mới mặc định có trạng thái Todo
                    CreatedDate = DateTime.UtcNow, // Gán thời gian tạo hiện tại
                    DueDate = createTaskDto.DueDate,
                    UserId = userId // Lưu UserId người tạo
                };

                // Thêm vào DbSet và lưu thay đổi vào cơ sở dữ liệu
                _context.TaskItems.Add(taskItem);
                await _context.SaveChangesAsync();

                // Trả về HTTP 201 Created cùng đường dẫn API lấy chi tiết task vừa tạo
                return CreatedAtAction(nameof(GetTask), new { id = taskItem.Id }, taskItem);
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
        /// Cập nhật thông tin chi tiết của một công việc (Tiêu đề, mô tả, trạng thái, hạn chót).
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskDto updateTaskDto)
        {
            try
            {
                int userId = GetCurrentUserId();
                var taskItem = await _context.TaskItems
                                             .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

                if (taskItem == null)
                {
                    return NotFound(new { Message = $"Không tìm thấy công việc với Id = {id} để cập nhật." });
                }

                // Cập nhật các trường thông tin
                taskItem.Title = updateTaskDto.Title;
                taskItem.Description = updateTaskDto.Description;
                taskItem.Status = updateTaskDto.Status;
                taskItem.DueDate = updateTaskDto.DueDate;

                _context.Entry(taskItem).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Cập nhật công việc thành công.", Task = taskItem });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TaskItemExists(id))
                {
                    return NotFound(new { Message = "Công việc không còn tồn tại trong hệ thống." });
                }
                throw;
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
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

                // Chỉ cập nhật trường Status
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
        /// Xóa một công việc khỏi hệ thống.
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

                return Ok(new { Message = $"Đã xóa thành công công việc có Id = {id}." });
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

        // Hàm helper kiểm tra sự tồn tại của Task
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
    }
}
