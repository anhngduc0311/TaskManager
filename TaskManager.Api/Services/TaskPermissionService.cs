using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Data;
using TaskManager.Api.Models;

namespace TaskManager.Api.Services
{
    public class TaskPermissionService : ITaskPermissionService
    {
        private readonly AppDbContext _context;

        public TaskPermissionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> CanEditOrDeleteTaskAsync(int taskId, int userId)
        {
            var task = await _context.TaskItems.FirstOrDefaultAsync(t => t.Id == taskId);
            if (task == null) return false;

            // Nếu người thực hiện là Reporter của Task -> Có quyền Sửa/Xóa
            if (task.ReporterId == userId)
            {
                return true;
            }

            // Nếu Task thuộc một dự án (ProjectId khác null)
            if (task.ProjectId != null)
            {
                // Kiểm tra xem User có vai trò là Admin trong Project đó không
                var member = await _context.ProjectMembers
                    .FirstOrDefaultAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == userId);
                
                if (member != null && member.Role == ProjectRole.Admin)
                {
                    return true;
                }
            }

            return false;
        }

        public async Task<bool> CanUpdateTaskStatusAsync(int taskId, int userId)
        {
            var task = await _context.TaskItems.FirstOrDefaultAsync(t => t.Id == taskId);
            if (task == null) return false;

            // Nếu người thực hiện là Reporter hoặc Assignee -> Có quyền cập nhật Status
            if (task.ReporterId == userId || task.AssigneeId == userId)
            {
                return true;
            }

            // Nếu Task thuộc một dự án (ProjectId khác null)
            if (task.ProjectId != null)
            {
                // Kiểm tra xem User có vai trò là Admin hoặc Member trong Project đó không
                var member = await _context.ProjectMembers
                    .FirstOrDefaultAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == userId);
                
                if (member != null && (member.Role == ProjectRole.Admin || member.Role == ProjectRole.Member))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
