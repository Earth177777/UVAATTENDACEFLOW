# Deploying AttendFlow to VPS

This guide explains how to deploy the AttendFlow application to a Virtual Private Server (VPS) running Ubuntu (or similar Linux distro) using Docker.

## Prerequisites

1.  **VPS**: A server with at least 1GB RAM (2GB recommended).
2.  **Domain (Optional)**: A domain name pointing to your VPS IP address.
3.  **Docker & Docker Compose**: Installed on the VPS.

## Step 1: Prepare the Server

Connect to your VPS via SSH:

```bash
ssh user@your-server-ip
```

Install Docker and Docker Compose (if not already installed):

```bash
# Update package list
sudo apt update

# Install Docker
sudo apt install -y docker.io

# Install Docker Compose
sudo apt install -y docker-compose

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker
```

## Step 2: Transfer Files

You need to transfer the project files to your server. You can use `git` or `scp`.

**Option A: Using Git (Recommended)**

1.  Push your code to a private GitHub/GitLab repository.
2.  Clone it on the server:
    ```bash
    git clone https://github.com/your-username/attendflow-ai.git
    cd attendflow-ai
    ```

**Option B: Using SCP (Copy from local)**

Run this command from your **local machine**:

```bash
# Copy the entire directory excluding node_modules (if possible, or just copy specific folders)
scp -r ./attendflow-ai user@your-server-ip:~/attendflow-ai
```

## Step 3: Configure Production Environment

1.  Navigate to the project directory:
    ```bash
    cd ~/attendflow-ai
    ```

2.  (Optional) Edit `docker-compose.yml` if you need to change ports or environment variables.
    *   By default, Frontend runs on port `3000`.
    *   Backend runs on port `5001`.
    *   MongoDB runs on port `27017`.

    For production, you might want to expose only the Frontend on port 80 or similar.

## Step 4: Build and Run

Run using Docker Compose:

```bash
# Build and start containers in the background using the production config
sudo docker-compose -f docker-compose.prod.yml up -d --build
```

**Verify status:**
```bash
sudo docker-compose ps
```

## Step 5: Access the Application

Open your browser and navigate to:

`http://your-server-ip:3000`

## Updates / Redeployment

To update the application after code changes:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
sudo docker-compose up -d --build
```

## Troubleshooting

- **Check Logs**:
  ```bash
  sudo docker-compose logs -f
  ```
- **Restart a specific service**:
  ```bash
  sudo docker-compose restart frontend
  ```
