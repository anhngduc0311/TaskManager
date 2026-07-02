using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Data;
using TaskManager.Api.Services;
using TaskManager.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Scalar.AspNetCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Đăng ký AppDbContext sử dụng SQL Server kết nối với Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Đăng ký các Business Services cho quản lý Team và phân quyền
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ITaskPermissionService, TaskPermissionService>();

// Cấu hình Authentication sử dụng JWT Bearer
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings.GetValue<string>("SecretKey");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.GetValue<string>("Issuer"),
        ValidAudience = jwtSettings.GetValue<string>("Audience"),
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Cấu hình CORS cho phép ứng dụng Angular frontend truy cập API (mặc định Angular chạy ở http://localhost:4200)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:4200", "https://task.anhnguyen.click") // Địa chỉ của client Angular
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddSchemaTransformer((schema, context, cancellationToken) =>
    {
        if (schema.Format == "int32" || schema.Format == "int64")
        {
            schema.Type = JsonSchemaType.Integer;
        }
        return Task.CompletedTask;
    });

    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes.Add("Bearer", new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Hãy nhập JWT Token của bạn để xác thực."
        });

        document.Security ??= new List<OpenApiSecurityRequirement>();
        document.Security.Add(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecuritySchemeReference("Bearer", document),
                new List<string>()
            }
        });

        return Task.CompletedTask;
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "TaskManager API v1");
    });
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles(); // Kích hoạt phục vụ file tĩnh (ảnh upload)

// Kích hoạt chính sách CORS trước khi Routing/Authorization chạy
app.UseCors("AllowAngularApp");

app.UseAuthentication(); // Kích hoạt Authentication middleware
app.UseAuthorization();

app.MapControllers();

// Seed default project and default members on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Đảm bảo Database đã được migrate
    context.Database.Migrate();

    if (!context.Projects.Any())
    {
        var defaultProject = new Project
        {
            Name = "My Software Team",
            Code = "PROJ"
        };
        context.Projects.Add(defaultProject);
        context.SaveChanges();

        // Thêm tất cả user hiện có làm Admin của project này
        var users = context.Users.ToList();
        foreach (var u in users)
        {
            context.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = defaultProject.Id,
                UserId = u.Id,
                Role = ProjectRole.Admin,
                JoinedDate = System.DateTime.UtcNow
            });
        }

        // Gán tất cả TaskItem hiện có chưa có ProjectId vào Project này
        var tasks = context.TaskItems.Where(t => t.ProjectId == null).ToList();
        foreach (var t in tasks)
        {
            t.ProjectId = defaultProject.Id;
        }
        context.SaveChanges();
    }
    else
    {
        // Nếu đã có Project nhưng có Task nào chưa gán ProjectId, gán về Project đầu tiên
        var defaultProject = context.Projects.First();
        var tasks = context.TaskItems.Where(t => t.ProjectId == null).ToList();
        if (tasks.Any())
        {
            foreach (var t in tasks)
            {
                t.ProjectId = defaultProject.Id;
            }
            context.SaveChanges();
        }

        // Kiểm tra xem tất cả Users đã là thành viên dự án này chưa, nếu chưa thì thêm vào làm Admin để có thể gán việc
        var users = context.Users.ToList();
        var members = context.ProjectMembers.Where(pm => pm.ProjectId == defaultProject.Id).Select(pm => pm.UserId).ToHashSet();
        bool membersChanged = false;
        foreach (var u in users)
        {
            if (!members.Contains(u.Id))
            {
                context.ProjectMembers.Add(new ProjectMember
                {
                    ProjectId = defaultProject.Id,
                    UserId = u.Id,
                    Role = ProjectRole.Admin,
                    JoinedDate = System.DateTime.UtcNow
                });
                membersChanged = true;
            }
        }
        if (membersChanged)
        {
            context.SaveChanges();
        }
    }
}

app.Run();
