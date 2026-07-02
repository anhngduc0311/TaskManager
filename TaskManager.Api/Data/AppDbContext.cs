using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Models;

namespace TaskManager.Api.Data
{
    /// <summary>
    /// Lớp ngữ cảnh cơ sở dữ liệu (Database Context) kết nối ứng dụng với SQL Server thông qua EF Core.
    /// </summary>
    public class AppDbContext : DbContext
    {
        // Hàm khởi tạo nhận DbContextOptions để cấu hình connection string từ Program.cs
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Khai báo bảng TaskItems đại diện cho thực thể TaskItem trong Database
        public DbSet<TaskItem> TaskItems { get; set; }

        // Khai báo bảng Users đại diện cho tài khoản người dùng
        public DbSet<User> Users { get; set; }

        /// <summary>
        /// Hàm cấu hình các thiết lập nâng cao cho các bảng bằng Fluent API.
        /// </summary>
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Cấu hình bảng Users
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(u => u.Id);
                entity.HasIndex(u => u.Username).IsUnique();
                entity.HasIndex(u => u.Email).IsUnique();

                entity.Property(u => u.Username).IsRequired().HasMaxLength(100);
                entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
                entity.Property(u => u.PasswordHash).IsRequired();
                entity.Property(u => u.Role).IsRequired().HasMaxLength(50).HasDefaultValue("User");
                entity.Property(u => u.CreatedDate).HasDefaultValueSql("GETUTCDATE()").IsRequired();
            });

            // Cấu hình bảng TaskItems
            modelBuilder.Entity<TaskItem>(entity =>
            {
                // Đặt tên bảng rõ ràng trong Database
                entity.ToTable("TaskItems");

                // Cấu hình khóa chính
                entity.HasKey(t => t.Id);

                // Cấu hình thuộc tính Title: Bắt buộc, độ dài tối đa 150 ký tự
                entity.Property(t => t.Title)
                      .IsRequired()
                      .HasMaxLength(150);

                // Cấu hình thuộc tính Description: Độ dài tối đa 1000 ký tự
                entity.Property(t => t.Description)
                      .HasMaxLength(1000);

                // Cấu hình lưu trữ Enum Status dưới dạng chuỗi (String) thay vì số nguyên (Int) trong Database
                // Điều này giúp dữ liệu trong DB dễ đọc hơn (ví dụ lưu "Todo", "InProgress", "Done" thay vì 0, 1, 2)
                entity.Property(t => t.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20)
                      .IsRequired();

                // Cấu hình giá trị mặc định cho CreatedDate khi insert mới là thời gian hiện tại
                entity.Property(t => t.CreatedDate)
                      .HasDefaultValueSql("GETUTCDATE()")
                      .IsRequired();

                // Cấu hình quan hệ 1-N giữa User và TaskItem
                entity.HasOne(t => t.User)
                      .WithMany(u => u.TaskItems)
                      .HasForeignKey(t => t.UserId)
                      .OnDelete(DeleteBehavior.Cascade); // Xóa User thì tự động xóa các Task của User đó
            });
        }
    }
}
