# Base image for running the app
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 5205

# Base image for building the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["TaskManager.Api.csproj", "."]
RUN dotnet restore "./TaskManager.Api.csproj"
COPY . .
RUN dotnet build "TaskManager.Api.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "TaskManager.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final stage
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
# Ensure wwwroot directory exists for file uploads
RUN mkdir -p wwwroot
ENTRYPOINT ["dotnet", "TaskManager.Api.dll"]
