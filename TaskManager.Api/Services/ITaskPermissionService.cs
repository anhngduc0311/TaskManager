using System.Threading.Tasks;

namespace TaskManager.Api.Services
{
    public interface ITaskPermissionService
    {
        Task<bool> CanEditOrDeleteTaskAsync(int taskId, int userId);
        Task<bool> CanUpdateTaskStatusAsync(int taskId, int userId);
    }
}
