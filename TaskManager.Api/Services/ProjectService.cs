using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Data;
using TaskManager.Api.Models;

namespace TaskManager.Api.Services
{
    public class ProjectService : IProjectService
    {
        private readonly AppDbContext _context;

        public ProjectService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> InviteMemberByEmailAsync(int projectId, string email)
        {
            // 1. Kiểm tra dự án có tồn tại không
            var projectExists = await _context.Projects.AnyAsync(p => p.Id == projectId);
            if (!projectExists)
            {
                throw new ArgumentException("Dự án không tồn tại.");
            }

            // 2. Kiểm tra email của người dùng có tồn tại trong hệ thống không
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
            if (user == null)
            {
                throw new ArgumentException("Email người dùng không tồn tại trong hệ thống.");
            }

            // 3. Kiểm tra xem người dùng đã là thành viên của dự án chưa
            var existingMember = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == user.Id);
            if (existingMember)
            {
                throw new InvalidOperationException("Người dùng đã là thành viên của dự án này.");
            }

            // 4. Thêm người dùng vào dự án với vai trò là Member
            var projectMember = new ProjectMember
            {
                ProjectId = projectId,
                UserId = user.Id,
                Role = ProjectRole.Member,
                JoinedDate = DateTime.UtcNow
            };

            _context.ProjectMembers.Add(projectMember);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> UpdateTaskAssigneeAsync(int taskId, int? assigneeId)
        {
            // 1. Kiểm tra Task có tồn tại không
            var task = await _context.TaskItems.FirstOrDefaultAsync(t => t.Id == taskId);
            if (task == null)
            {
                throw new ArgumentException("Công việc không tồn tại.");
            }

            // Nếu muốn bỏ gán (Unassign)
            if (assigneeId == null || assigneeId == 0)
            {
                task.AssigneeId = null;
                await _context.SaveChangesAsync();
                return true;
            }

            // 2. Nếu Task không thuộc Project nào (Task cá nhân)
            if (task.ProjectId == null)
            {
                var assigneeExists = await _context.Users.AnyAsync(u => u.Id == assigneeId.Value);
                if (!assigneeExists)
                {
                    throw new ArgumentException("Người nhận việc không tồn tại trong hệ thống.");
                }

                task.AssigneeId = assigneeId.Value;
                await _context.SaveChangesAsync();
                return true;
            }

            // 3. Nếu Task thuộc một Project, kiểm tra xem Assignee có thuộc cùng Project đó không
            var isMemberOfProject = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == task.ProjectId && pm.UserId == assigneeId.Value);
            
            if (!isMemberOfProject)
            {
                throw new InvalidOperationException("Người nhận việc phải là thành viên của dự án này.");
            }

            task.AssigneeId = assigneeId.Value;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<ProjectMemberResponseDto>> GetProjectMembersAsync(int projectId)
        {
            var projectExists = await _context.Projects.AnyAsync(p => p.Id == projectId);
            if (!projectExists)
            {
                throw new ArgumentException("Dự án không tồn tại.");
            }

            return await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId)
                .Include(pm => pm.User)
                .Select(pm => new ProjectMemberResponseDto
                {
                    UserId = pm.UserId,
                    Username = pm.User != null ? pm.User.Username : string.Empty,
                    Email = pm.User != null ? pm.User.Email : string.Empty,
                    Role = pm.Role.ToString()
                })
                .ToListAsync();
        }
    }
}
