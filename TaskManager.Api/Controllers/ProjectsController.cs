using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;
using TaskManager.Api.Services;

namespace TaskManager.Api.Controllers
{
    public class InviteMemberDto
    {
        [Required(ErrorMessage = "Email không được để trống.")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        public string Email { get; set; } = string.Empty;
    }

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProjectsController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        /// <summary>
        /// POST: api/projects/{projectId}/invite
        /// Mời một thành viên vào Project qua Email.
        /// </summary>
        [HttpPost("{projectId}/invite")]
        public async Task<IActionResult> InviteMember(int projectId, [FromBody] InviteMemberDto inviteDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                await _projectService.InviteMemberByEmailAsync(projectId, inviteDto.Email);
                return Ok(new { Message = $"Đã mời thành viên '{inviteDto.Email}' vào dự án thành công với vai trò Member." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Lỗi hệ thống khi mời thành viên: {ex.Message}" });
            }
        }

        /// <summary>
        /// GET: api/projects/{projectId}/members
        /// Lấy danh sách thành viên của dự án.
        /// </summary>
        [HttpGet("{projectId}/members")]
        public async Task<IActionResult> GetProjectMembers(int projectId)
        {
            try
            {
                var members = await _projectService.GetProjectMembersAsync(projectId);
                return Ok(members);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Lỗi hệ thống khi lấy danh sách thành viên: {ex.Message}" });
            }
        }
    }
}
