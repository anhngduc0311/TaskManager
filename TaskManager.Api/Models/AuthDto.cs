using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Models
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "Tên tài khoản không được để trống.")]
        [MaxLength(100, ErrorMessage = "Tên tài khoản không được quá 100 ký tự.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email không được để trống.")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        [MaxLength(150, ErrorMessage = "Email không được quá 150 ký tự.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu không được để trống.")]
        [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự.")]
        public string Password { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Role { get; set; } = "User"; // Mặc định là User, có thể truyền Admin
    }

    public class LoginDto
    {
        [Required(ErrorMessage = "Tên tài khoản không được để trống.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu không được để trống.")]
        public string Password { get; set; } = string.Empty;
    }

    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }
}
