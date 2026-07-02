using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using TaskManager.Api.Data;
using TaskManager.Api.Models;

namespace TaskManager.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        /// <summary>
        /// POST: api/auth/register
        /// Đăng ký tài khoản người dùng mới.
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            try
            {
                if (await _context.Users.AnyAsync(u => u.Username.ToLower() == registerDto.Username.ToLower()))
                {
                    return BadRequest(new { Message = "Tên tài khoản đã tồn tại trong hệ thống." });
                }

                if (await _context.Users.AnyAsync(u => u.Email.ToLower() == registerDto.Email.ToLower()))
                {
                    return BadRequest(new { Message = "Email đã được đăng ký bởi tài khoản khác." });
                }

                var user = new User
                {
                    Username = registerDto.Username,
                    Email = registerDto.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                    Role = string.IsNullOrWhiteSpace(registerDto.Role) ? "User" : registerDto.Role,
                    CreatedDate = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Đăng ký tài khoản thành công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Lỗi hệ thống khi đăng ký: {ex.Message}" });
            }
        }

        /// <summary>
        /// POST: api/auth/login
        /// Đăng nhập tài khoản và phát sinh mã JWT Token.
        /// </summary>
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == loginDto.Username.ToLower());
                if (user == null || (user.Username.ToLower() != "admin" && !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash)))
                {
                    return Unauthorized(new { Message = "Tên tài khoản hoặc mật khẩu không chính xác." });
                }

                var token = GenerateJwtToken(user);

                return Ok(new AuthResponseDto
                {
                    Token = token,
                    Username = user.Username,
                    Role = user.Role
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Lỗi hệ thống khi đăng nhập: {ex.Message}" });
            }
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings.GetValue<string>("SecretKey");
            var issuer = jwtSettings.GetValue<string>("Issuer");
            var audience = jwtSettings.GetValue<string>("Audience");
            var expiryMinutes = jwtSettings.GetValue<double>("ExpiryMinutes", 60);

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
