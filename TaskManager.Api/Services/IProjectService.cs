using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManager.Api.Models;

namespace TaskManager.Api.Services
{
    public interface IProjectService
    {
        Task<bool> InviteMemberByEmailAsync(int projectId, string email);
        Task<bool> UpdateTaskAssigneeAsync(int taskId, int? assigneeId);
        Task<IEnumerable<ProjectMemberResponseDto>> GetProjectMembersAsync(int projectId);
    }
}
