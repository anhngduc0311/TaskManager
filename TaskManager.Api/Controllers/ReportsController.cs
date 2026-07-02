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
    [ApiController]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportsController(AppDbContext context)
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
        /// GET: api/reports/sprint/{sprintId}
        /// Lấy số liệu thống kê Dashboard và biểu đồ Burndown cho một Sprint.
        /// </summary>
        [HttpGet("sprint/{sprintId}")]
        public async Task<ActionResult<SprintReportDto>> GetSprintReport(int sprintId)
        {
            try
            {
                int userId = GetCurrentUserId();

                // Lấy tất cả task của user
                var userTasks = await _context.TaskItems
                                              .Where(t => t.UserId == userId)
                                              .ToListAsync();

                Sprint? sprint = null;
                if (sprintId > 0)
                {
                    sprint = await _context.Sprints.FirstOrDefaultAsync(s => s.Id == sprintId);
                }

                DateTime startDate;
                DateTime endDate;
                string sprintName;
                List<TaskItem> sprintTasks;

                // Nếu có Sprint thực tế
                if (sprint != null)
                {
                    sprintName = sprint.Name;
                    startDate = sprint.StartDate;
                    endDate = sprint.EndDate;
                    sprintTasks = userTasks.Where(t => t.SprintId == sprint.Id).ToList();
                }
                else
                {
                    // Fallback: Giả lập một Sprint chạy trong 10 ngày (từ 5 ngày trước đến 5 ngày sau)
                    sprintName = "Sprint Giả Lập (Mẫu)";
                    startDate = DateTime.UtcNow.AddDays(-5).Date;
                    endDate = DateTime.UtcNow.AddDays(5).Date;
                    sprintTasks = userTasks; // Gán toàn bộ task hiện tại của user để chạy báo cáo mẫu

                    // Đảm bảo các task mẫu có StoryPoints để hiển thị biểu đồ đẹp
                    Random rand = new Random(42);
                    foreach (var t in sprintTasks)
                    {
                        if (t.StoryPoints == null || t.StoryPoints == 0)
                        {
                            t.StoryPoints = rand.Next(1, 9); // Gán StoryPoint ngẫu nhiên từ 1 đến 8
                        }
                    }
                }

                int totalTasks = sprintTasks.Count;
                int todoCount = sprintTasks.Count(t => t.Status == TaskItemStatus.Todo);
                int progressCount = sprintTasks.Count(t => t.Status == TaskItemStatus.InProgress || t.Status == TaskItemStatus.InReview);
                int doneCount = sprintTasks.Count(t => t.Status == TaskItemStatus.Done);

                int totalSp = sprintTasks.Sum(t => t.StoryPoints ?? 0);
                int doneSp = sprintTasks.Where(t => t.Status == TaskItemStatus.Done).Sum(t => t.StoryPoints ?? 0);

                // 1. Phân bố loại Task
                var taskTypes = Enum.GetValues(typeof(TaskType))
                                    .Cast<TaskType>()
                                    .Select(type =>
                                    {
                                        int count = sprintTasks.Count(t => t.TaskType == type);
                                        double pct = totalTasks > 0 ? Math.Round((double)count / totalTasks * 100, 1) : 0;
                                        return new TypeDistributionDto
                                        {
                                            Type = type.ToString(),
                                            Count = count,
                                            Percentage = pct
                                        };
                                    }).ToList();

                // 2. Tính toán biểu đồ Burn-down (tổng điểm Story Points còn lại theo từng ngày)
                var burndownChart = new List<BurndownPointDto>();
                int totalDays = (endDate.Date - startDate.Date).Days;
                if (totalDays <= 0) totalDays = 1;

                for (int i = 0; i <= totalDays; i++)
                {
                    var currentDay = startDate.AddDays(i).Date;

                    // Tính tổng điểm của các task đã hoàn thành tính đến ngày 'currentDay'
                    int completedSpOnDay = sprintTasks
                        .Where(t => t.Status == TaskItemStatus.Done && 
                                    t.CompletedDate != null && 
                                    t.CompletedDate.Value.Date <= currentDay)
                        .Sum(t => t.StoryPoints ?? 0);

                    // Điểm còn lại
                    int remainingSp = Math.Max(0, totalSp - completedSpOnDay);

                    // Đường chéo lý tưởng (giảm đều về 0)
                    double idealSp = Math.Round(Math.Max(0, totalSp - (i * ((double)totalSp / totalDays))), 1);

                    burndownChart.Add(new BurndownPointDto
                    {
                        Date = currentDay,
                        DateLabel = currentDay.ToString("dd/MM"),
                        RemainingPoints = remainingSp,
                        IdealPoints = idealSp
                    });
                }

                var report = new SprintReportDto
                {
                    SprintId = sprintId,
                    SprintName = sprintName,
                    TotalTasks = totalTasks,
                    TodoTasks = todoCount,
                    InProgressTasks = progressCount,
                    DoneTasks = doneCount,
                    TotalStoryPoints = totalSp,
                    DoneStoryPoints = doneSp,
                    TaskTypes = taskTypes,
                    BurndownChart = burndownChart
                };

                return Ok(report);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }
    }
}
