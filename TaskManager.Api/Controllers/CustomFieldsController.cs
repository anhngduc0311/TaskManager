using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManager.Api.Data;
using TaskManager.Api.Models;

namespace TaskManager.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CustomFieldsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CustomFieldsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/customfields
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CustomField>>> GetCustomFields()
        {
            return await _context.CustomFields.ToListAsync();
        }

        // POST: api/customfields
        [HttpPost]
        public async Task<ActionResult<CustomField>> CreateCustomField([FromBody] CustomField customField)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            _context.CustomFields.Add(customField);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCustomFields), new { id = customField.Id }, customField);
        }

        // PUT: api/customfields/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomField(int id, [FromBody] CustomField customField)
        {
            if (id != customField.Id)
            {
                return BadRequest(new { Message = "ID không trùng khớp." });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var existing = await _context.CustomFields.FindAsync(id);
            if (existing == null)
            {
                return NotFound(new { Message = $"Không tìm thấy trường động với Id = {id}" });
            }

            existing.Name = customField.Name;
            existing.DefaultValue = customField.DefaultValue;
            existing.IsRequired = customField.IsRequired;
            existing.DataType = customField.DataType; // Cho phép sửa kiểu dữ liệu nếu cần, hoặc giữ nguyên

            _context.Entry(existing).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        // DELETE: api/customfields/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomField(int id)
        {
            var customField = await _context.CustomFields.FindAsync(id);
            if (customField == null)
            {
                return NotFound(new { Message = $"Không tìm thấy trường động với Id = {id}" });
            }

            _context.CustomFields.Remove(customField);
            await _context.SaveChangesAsync();

            return Ok(new { Message = $"Đã xóa thành công trường động có Id = {id}." });
        }
    }
}
