using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace TaskManager.Api.Data
{
    public static class DbSeeder
    {
        public static void Seed(AppDbContext context)
        {
            // Seed Users
            var adminUser = context.Users.FirstOrDefault(u => u.Username.ToLower() == "admin");
            if (adminUser == null)
            {
                adminUser = new ApplicationUser
                {
                    Username = "admin",
                    Email = "admin@taskmanager.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = "Admin",
                    CreatedDate = DateTime.UtcNow
                };
                context.Users.Add(adminUser);
            }

            var dev1 = context.Users.FirstOrDefault(u => u.Username.ToLower() == "developer1");
            if (dev1 == null)
            {
                dev1 = new ApplicationUser
                {
                    Username = "developer1",
                    Email = "dev1@taskmanager.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("dev123"),
                    Role = "User",
                    CreatedDate = DateTime.UtcNow
                };
                context.Users.Add(dev1);
            }

            var dev2 = context.Users.FirstOrDefault(u => u.Username.ToLower() == "developer2");
            if (dev2 == null)
            {
                dev2 = new ApplicationUser
                {
                    Username = "developer2",
                    Email = "dev2@taskmanager.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("dev223"),
                    Role = "User",
                    CreatedDate = DateTime.UtcNow
                };
                context.Users.Add(dev2);
            }

            var qaUser = context.Users.FirstOrDefault(u => u.Username.ToLower() == "qa_tester");
            if (qaUser == null)
            {
                qaUser = new ApplicationUser
                {
                    Username = "qa_tester",
                    Email = "qa@taskmanager.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("qa123"),
                    Role = "User",
                    CreatedDate = DateTime.UtcNow
                };
                context.Users.Add(qaUser);
            }

            context.SaveChanges();

            // Seed Project
            var project = context.Projects.FirstOrDefault(p => p.Code == "AGILE");
            if (project == null)
            {
                project = new Project
                {
                    Name = "Hệ thống Quản lý Công việc Agile",
                    Code = "AGILE",
                    Description = "Dự án phát triển hệ thống quản lý công việc TaskManager theo mô hình Agile/Scrum.",
                    CreatedDate = DateTime.UtcNow
                };
                context.Projects.Add(project);
                context.SaveChanges();
            }

            // Seed Project Members
            var members = context.ProjectMembers.Where(pm => pm.ProjectId == project.Id).Select(pm => pm.UserId).ToHashSet();
            
            void EnsureMember(ApplicationUser user, ProjectRole role)
            {
                if (!members.Contains(user.Id))
                {
                    context.ProjectMembers.Add(new ProjectMember
                    {
                        ProjectId = project.Id,
                        UserId = user.Id,
                        Role = role,
                        JoinedDate = DateTime.UtcNow
                    });
                }
            }

            EnsureMember(adminUser, ProjectRole.Admin);
            EnsureMember(dev1, ProjectRole.Member);
            EnsureMember(dev2, ProjectRole.Member);
            EnsureMember(qaUser, ProjectRole.Member);
            context.SaveChanges();

            // Seed Sprints
            var sprints = context.Sprints.Where(s => s.ProjectId == project.Id).ToList();
            var sprint1 = sprints.FirstOrDefault(s => s.Name.Contains("Sprint 1"));
            if (sprint1 == null)
            {
                sprint1 = new Sprint
                {
                    Name = "Sprint 1: Phân tích & Giao diện cơ bản",
                    StartDate = DateTime.UtcNow.AddDays(-30),
                    EndDate = DateTime.UtcNow.AddDays(-15),
                    IsActive = false,
                    ProjectId = project.Id
                };
                context.Sprints.Add(sprint1);
            }

            var sprint2 = sprints.FirstOrDefault(s => s.Name.Contains("Sprint 2"));
            if (sprint2 == null)
            {
                sprint2 = new Sprint
                {
                    Name = "Sprint 2: Tính năng Kanban & Custom Fields",
                    StartDate = DateTime.UtcNow.AddDays(-14),
                    EndDate = DateTime.UtcNow.AddDays(7),
                    IsActive = true,
                    ProjectId = project.Id
                };
                context.Sprints.Add(sprint2);
            }

            var sprint3 = sprints.FirstOrDefault(s => s.Name.Contains("Sprint 3"));
            if (sprint3 == null)
            {
                sprint3 = new Sprint
                {
                    Name = "Sprint 3: Tích hợp Gantt Chart & Báo cáo",
                    StartDate = DateTime.UtcNow.AddDays(8),
                    EndDate = DateTime.UtcNow.AddDays(22),
                    IsActive = false,
                    ProjectId = project.Id
                };
                context.Sprints.Add(sprint3);
            }

            context.SaveChanges();

            // Seed Custom Fields
            var customFields = context.CustomFields.ToList();
            var cfComplexity = customFields.FirstOrDefault(cf => cf.Name == "Độ phức tạp");
            if (cfComplexity == null)
            {
                cfComplexity = new CustomField
                {
                    Name = "Độ phức tạp",
                    DataType = CustomFieldType.Text,
                    IsRequired = false,
                    DefaultValue = "Trung bình"
                };
                context.CustomFields.Add(cfComplexity);
            }

            var cfEstimate = customFields.FirstOrDefault(cf => cf.Name == "Ước lượng giờ");
            if (cfEstimate == null)
            {
                cfEstimate = new CustomField
                {
                    Name = "Ước lượng giờ",
                    DataType = CustomFieldType.Number,
                    IsRequired = false,
                    DefaultValue = "4"
                };
                context.CustomFields.Add(cfEstimate);
            }

            var cfDeployDate = customFields.FirstOrDefault(cf => cf.Name == "Ngày triển khai");
            if (cfDeployDate == null)
            {
                cfDeployDate = new CustomField
                {
                    Name = "Ngày triển khai",
                    DataType = CustomFieldType.Date,
                    IsRequired = false
                };
                context.CustomFields.Add(cfDeployDate);
            }

            var cfAutomated = customFields.FirstOrDefault(cf => cf.Name == "Đã kiểm thử tự động");
            if (cfAutomated == null)
            {
                cfAutomated = new CustomField
                {
                    Name = "Đã kiểm thử tự động",
                    DataType = CustomFieldType.Boolean,
                    IsRequired = false,
                    DefaultValue = "False"
                };
                context.CustomFields.Add(cfAutomated);
            }

            context.SaveChanges();

            // Seed Tasks
            if (!context.TaskItems.Any(t => t.ProjectId == project.Id))
            {
                // Sprint 1 (All Done)
                var epic1 = new TaskItem
                {
                    Title = "Epic: Thiết lập hạ tầng dự án",
                    Description = "<p>Phân tích thiết kế hệ thống và cấu hình môi trường phát triển ban đầu.</p>",
                    Status = TaskItemStatus.Done,
                    CreatedDate = DateTime.UtcNow.AddDays(-29),
                    CompletedDate = DateTime.UtcNow.AddDays(-28),
                    AssigneeId = adminUser.Id,
                    ReporterId = adminUser.Id,
                    ProjectId = project.Id,
                    SprintId = sprint1.Id,
                    Priority = TaskPriority.Critical,
                    TaskType = TaskType.Epic,
                    StoryPoints = 5
                };
                context.TaskItems.Add(epic1);
                context.SaveChanges(); // Save to get epic1.Id

                var story1 = new TaskItem
                {
                    Title = "Story: Thiết kế Database Schema",
                    Description = "<p>Thiết kế các bảng và cấu hình Entity Framework Core Code-First.</p>",
                    Status = TaskItemStatus.Done,
                    CreatedDate = DateTime.UtcNow.AddDays(-28),
                    CompletedDate = DateTime.UtcNow.AddDays(-26),
                    AssigneeId = dev1.Id,
                    ReporterId = adminUser.Id,
                    ProjectId = project.Id,
                    SprintId = sprint1.Id,
                    Priority = TaskPriority.High,
                    TaskType = TaskType.Story,
                    ParentTaskId = epic1.Id,
                    StoryPoints = 3
                };
                context.TaskItems.Add(story1);
                context.SaveChanges(); // Save to get story1.Id

                var subtask1 = new TaskItem
                {
                    Title = "Task: Viết script tạo bảng DB",
                    Description = "<p>Tạo các Model class và cấu hình mối quan hệ Fluent API.</p>",
                    Status = TaskItemStatus.Done,
                    CreatedDate = DateTime.UtcNow.AddDays(-27),
                    CompletedDate = DateTime.UtcNow.AddDays(-26),
                    AssigneeId = dev1.Id,
                    ReporterId = dev1.Id,
                    ProjectId = project.Id,
                    SprintId = sprint1.Id,
                    Priority = TaskPriority.Medium,
                    TaskType = TaskType.Task,
                    ParentTaskId = story1.Id
                };
                var subtask2 = new TaskItem
                {
                    Title = "Task: Viết unit test cho DbContext",
                    Description = "<p>Kiểm thử các ràng buộc cascade delete và composite key.</p>",
                    Status = TaskItemStatus.Done,
                    CreatedDate = DateTime.UtcNow.AddDays(-27),
                    CompletedDate = DateTime.UtcNow.AddDays(-26),
                    AssigneeId = dev2.Id,
                    ReporterId = dev1.Id,
                    ProjectId = project.Id,
                    SprintId = sprint1.Id,
                    Priority = TaskPriority.Low,
                    TaskType = TaskType.Task,
                    ParentTaskId = story1.Id
                };
                context.TaskItems.AddRange(subtask1, subtask2);

                var story2 = new TaskItem
                {
                    Title = "Story: Thiết lập API Authentication với JWT",
                    Description = "<p>Tích hợp JWT Bearer Token, phân quyền người dùng và dự án.</p>",
                    Status = TaskItemStatus.Done,
                    CreatedDate = DateTime.UtcNow.AddDays(-28),
                    CompletedDate = DateTime.UtcNow.AddDays(-25),
                    AssigneeId = dev2.Id,
                    ReporterId = adminUser.Id,
                    ProjectId = project.Id,
                    SprintId = sprint1.Id,
                    Priority = TaskPriority.Critical,
                    TaskType = TaskType.Story,
                    StoryPoints = 3
                };
                context.TaskItems.Add(story2);

                // Sprint 2 (Active - Mixed Statuses)
                var epic2 = new TaskItem
                {
                    Title = "Epic: Phát triển tính năng Agile Boards",
                    Description = "<p>Phát triển Kanban Board, Gantt Chart và chức năng quản lý Custom Fields.</p>",
                    Status = TaskItemStatus.InProgress,
                    CreatedDate = DateTime.UtcNow.AddDays(-13),
                    AssigneeId = adminUser.Id,
                    ReporterId = adminUser.Id,
                    ProjectId = project.Id,
                    SprintId = sprint2.Id,
                    Priority = TaskPriority.High,
                    TaskType = TaskType.Epic,
                    StoryPoints = 8
                };
                context.TaskItems.Add(epic2);
                context.SaveChanges();

                var story3 = new TaskItem
                {
                    Title = "Story: Xây dựng giao diện kéo thả Kanban",
                    Description = "<p>Cho phép người dùng kéo thả các task giữa các cột Todo, InProgress, InReview, Done.</p>",
                    Status = TaskItemStatus.InProgress,
                    CreatedDate = DateTime.UtcNow.AddDays(-12),
                    AssigneeId = dev1.Id,
                    ReporterId = adminUser.Id,
                    ProjectId = project.Id,
                    SprintId = sprint2.Id,
                    Priority = TaskPriority.High,
                    TaskType = TaskType.Story,
                    ParentTaskId = epic2.Id,
                    StoryPoints = 5
                };
                context.TaskItems.Add(story3);
                context.SaveChanges();

                var subtask3 = new TaskItem
                {
                    Title = "Task: Tích hợp Angular CDK Drag & Drop",
                    Description = "<p>Cấu hình các container drag-drop list trên frontend.</p>",
                    Status = TaskItemStatus.Done,
                    CreatedDate = DateTime.UtcNow.AddDays(-11),
                    CompletedDate = DateTime.UtcNow.AddDays(-10),
                    AssigneeId = dev1.Id,
                    ReporterId = dev1.Id,
                    ProjectId = project.Id,
                    SprintId = sprint2.Id,
                    Priority = TaskPriority.High,
                    TaskType = TaskType.Task,
                    ParentTaskId = story3.Id
                };
                var subtask4 = new TaskItem
                {
                    Title = "Task: API cập nhật trạng thái Task khi kéo thả",
                    Description = "<p>Xử lý cập nhật DB khi user kéo thả thẻ.</p>",
                    Status = TaskItemStatus.InProgress,
                    CreatedDate = DateTime.UtcNow.AddDays(-10),
                    AssigneeId = dev2.Id,
                    ReporterId = dev1.Id,
                    ProjectId = project.Id,
                    SprintId = sprint2.Id,
                    Priority = TaskPriority.Medium,
                    TaskType = TaskType.Task,
                    ParentTaskId = story3.Id
                };
                context.TaskItems.AddRange(subtask3, subtask4);

                var story4 = new TaskItem
                {
                    Title = "Story: Quản lý Custom Fields linh hoạt (EAV)",
                    Description = "<p>Thiết kế giao diện cho phép tự thêm bớt các trường dữ liệu tùy biến cho Task.</p>",
                    Status = TaskItemStatus.InReview,
                    CreatedDate = DateTime.UtcNow.AddDays(-10),
                    AssigneeId = dev2.Id,
                    ReporterId = adminUser.Id,
                    ProjectId = project.Id,
                    SprintId = sprint2.Id,
                    Priority = TaskPriority.Medium,
                    TaskType = TaskType.Story,
                    StoryPoints = 3
                };
                context.TaskItems.Add(story4);
                context.SaveChanges();

                // Add Custom Values for story4
                context.TaskCustomValues.AddRange(
                    new TaskCustomValue { TaskId = story4.Id, CustomFieldId = cfComplexity.Id, Value = "Cao" },
                    new TaskCustomValue { TaskId = story4.Id, CustomFieldId = cfEstimate.Id, Value = "16" },
                    new TaskCustomValue { TaskId = story4.Id, CustomFieldId = cfAutomated.Id, Value = "False" }
                );

                var bug1 = new TaskItem
                {
                    Title = "Bug: Lỗi crash app khi thêm Custom Field trùng tên",
                    Description = "<p>Khi thêm Custom Field bị trùng tên, backend ném exception 500 thay vì báo lỗi thân thiện.</p>",
                    Status = TaskItemStatus.Todo,
                    CreatedDate = DateTime.UtcNow.AddDays(-8),
                    AssigneeId = dev1.Id,
                    ReporterId = qaUser.Id,
                    ProjectId = project.Id,
                    SprintId = sprint2.Id,
                    Priority = TaskPriority.Critical,
                    TaskType = TaskType.Bug
                };
                var bug2 = new TaskItem
                {
                    Title = "Bug: Hiển thị sai ngày kết thúc trên Gantt Chart",
                    Description = "<p>Thanh biểu đồ Gantt bị lệch múi giờ múi giờ UTC+7.</p>",
                    Status = TaskItemStatus.InReview,
                    CreatedDate = DateTime.UtcNow.AddDays(-6),
                    AssigneeId = dev2.Id,
                    ReporterId = qaUser.Id,
                    ProjectId = project.Id,
                    SprintId = sprint2.Id,
                    Priority = TaskPriority.High,
                    TaskType = TaskType.Bug
                };
                var task1 = new TaskItem
                {
                    Title = "Task: Viết tài liệu hướng dẫn sử dụng API",
                    Description = "<p>Tạo file OpenAPI specification và hướng dẫn tích hợp.</p>",
                    Status = TaskItemStatus.Todo,
                    CreatedDate = DateTime.UtcNow.AddDays(-4),
                    AssigneeId = adminUser.Id,
                    ReporterId = adminUser.Id,
                    ProjectId = project.Id,
                    SprintId = sprint2.Id,
                    Priority = TaskPriority.Low,
                    TaskType = TaskType.Task
                };
                context.TaskItems.AddRange(bug1, bug2, task1);

                // Backlog Tasks (SprintId is null)
                var backlogStory = new TaskItem
                {
                    Title = "Story: Tối ưu hiệu năng truy vấn SQL với Dapper",
                    Description = "<p>Thay thế một số truy vấn EF Core phức tạp bằng Dapper raw SQL để tăng tốc độ load báo cáo.</p>",
                    Status = TaskItemStatus.Todo,
                    CreatedDate = DateTime.UtcNow.AddDays(-1),
                    AssigneeId = dev1.Id,
                    ReporterId = adminUser.Id,
                    ProjectId = project.Id,
                    SprintId = null,
                    Priority = TaskPriority.Low,
                    TaskType = TaskType.Story,
                    StoryPoints = 8
                };
                context.TaskItems.Add(backlogStory);

                context.SaveChanges();
            }
        }
    }
}
