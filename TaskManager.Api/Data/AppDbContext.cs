using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Models;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

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

        // Khai báo các DbSet đại diện cho thực thể trong Database
        public DbSet<TaskItem> TaskItems { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Sprint> Sprints { get; set; }
        public DbSet<CustomField> CustomFields { get; set; }
        public DbSet<TaskCustomValue> TaskCustomValues { get; set; }

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

            // Cấu hình bảng Projects
            modelBuilder.Entity<Project>(entity =>
            {
                entity.ToTable("Projects");
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Name).IsRequired().HasMaxLength(150);
                entity.Property(p => p.Code).IsRequired().HasMaxLength(10);
            });

            // Cấu hình bảng Sprints
            modelBuilder.Entity<Sprint>(entity =>
            {
                entity.ToTable("Sprints");
                entity.HasKey(s => s.Id);
                entity.Property(s => s.Name).IsRequired().HasMaxLength(100);

                entity.HasOne(s => s.Project)
                      .WithMany(p => p.Sprints)
                      .HasForeignKey(s => s.ProjectId)
                      .OnDelete(DeleteBehavior.Cascade); // Xóa Project thì tự động xóa các Sprint
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

                // Cấu hình thuộc tính Description: Độ dài tối đa 4000 ký tự (chứa HTML)
                entity.Property(t => t.Description)
                      .HasMaxLength(4000);

                // Cấu hình lưu trữ Enum Status dưới dạng chuỗi (String)
                entity.Property(t => t.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20)
                      .IsRequired();

                // Cấu hình lưu trữ Enum Priority và TaskType dưới dạng chuỗi (String)
                entity.Property(t => t.Priority)
                      .HasConversion<string>()
                      .HasMaxLength(20)
                      .IsRequired();

                entity.Property(t => t.TaskType)
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
                      .OnDelete(DeleteBehavior.SetNull); // Xóa User thì không xóa Task, chỉ đặt UserId = null

                // Cấu hình quan hệ Project - TaskItem
                entity.HasOne(t => t.Project)
                      .WithMany(p => p.Tasks)
                      .HasForeignKey(t => t.ProjectId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Cấu hình quan hệ Sprint - TaskItem
                entity.HasOne(t => t.Sprint)
                      .WithMany(s => s.Tasks)
                      .HasForeignKey(t => t.SprintId)
                      .OnDelete(DeleteBehavior.SetNull); // Xóa Sprint thì các Task mồ côi (SprintId = null)

                // Cấu hình quan hệ Cha - Con (Subtasks)
                entity.HasOne(t => t.ParentTask)
                      .WithMany(t => t.SubTasks)
                      .HasForeignKey(t => t.ParentTaskId)
                      .OnDelete(DeleteBehavior.Restrict); // Dùng Restrict ở DB, xử lý cascade xóa ở App
            });

            // Cấu hình bảng EAV: CustomFields
            modelBuilder.Entity<CustomField>(entity =>
            {
                entity.ToTable("CustomFields");
                entity.HasKey(cf => cf.Id);
                entity.Property(cf => cf.Name).IsRequired().HasMaxLength(100);
                entity.Property(cf => cf.DataType).HasConversion<string>().HasMaxLength(20).IsRequired();
            });

            // Cấu hình bảng EAV: TaskCustomValues
            modelBuilder.Entity<TaskCustomValue>(entity =>
            {
                entity.ToTable("TaskCustomValues");
                entity.HasKey(tcv => new { tcv.TaskId, tcv.CustomFieldId }); // Composite Key
                entity.Property(tcv => tcv.Value).IsRequired().HasMaxLength(2000);

                entity.HasOne(tcv => tcv.Task)
                      .WithMany(t => t.CustomValues)
                      .HasForeignKey(tcv => tcv.TaskId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(tcv => tcv.CustomField)
                      .WithMany(cf => cf.CustomValues)
                      .HasForeignKey(tcv => tcv.CustomFieldId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }

        // Ghi đè phương thức SaveChanges để thực thi nghiệp vụ logic cho cấu trúc Cha - Con
        public override int SaveChanges()
        {
            HandleSubTaskLogic();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            HandleSubTaskLogic();
            return base.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Xử lý logic nghiệp vụ cho mối quan hệ Cha - Con (Subtasks)
        /// </summary>
        private void HandleSubTaskLogic()
        {
            var modifiedEntries = ChangeTracker.Entries<TaskItem>().ToList();

            foreach (var entry in modifiedEntries)
            {
                // 1. Cập nhật CompletedDate và đồng bộ trạng thái Task con khi trạng thái thay đổi
                if (entry.State == EntityState.Modified)
                {
                    var oldStatus = entry.OriginalValues.GetValue<TaskItemStatus>("Status");
                    var newStatus = entry.Entity.Status;

                    if (oldStatus != newStatus)
                    {
                        if (newStatus == TaskItemStatus.Done)
                        {
                            entry.Entity.CompletedDate = System.DateTime.UtcNow;

                            var childTasks = TaskItems.Where(t => t.ParentTaskId == entry.Entity.Id).ToList();
                            foreach (var child in childTasks)
                            {
                                if (child.Status != TaskItemStatus.Done)
                                {
                                    child.Status = TaskItemStatus.Done;
                                    child.CompletedDate = System.DateTime.UtcNow;
                                    Entry(child).State = EntityState.Modified;
                                }
                            }
                        }
                        else
                        {
                            entry.Entity.CompletedDate = null;
                        }
                    }
                }
                else if (entry.State == EntityState.Added)
                {
                    if (entry.Entity.Status == TaskItemStatus.Done)
                    {
                        entry.Entity.CompletedDate = System.DateTime.UtcNow;
                    }
                }

                // 2. Do SQL Server không cho phép Cascade delete tự liên kết, ta tự xóa các Task con ở đây
                if (entry.State == EntityState.Deleted)
                {
                    DeleteSubTasksRecursively(entry.Entity.Id);
                }
            }
        }

        private void DeleteSubTasksRecursively(int parentTaskId)
        {
            var childTasks = TaskItems.Where(t => t.ParentTaskId == parentTaskId).ToList();
            foreach (var child in childTasks)
            {
                DeleteSubTasksRecursively(child.Id);
                TaskItems.Remove(child);
            }
        }
    }
}

