# Running AttendFlow Locally (Mac & Mobile)

This guide explains how to run the AttendFlow application locally on your Mac and access it from your phone or other devices on the same network.

## Prerequisite

-   Node.js & npm installed
-   MongoDB running (or Docker)

## 1. Start the Backend

The backend is configured to listen on all network interfaces (`0.0.0.0`), allowing access from other devices.

1.  Open a terminal.
2.  Navigate to `apps/backend`:
    ```bash
    cd apps/backend
    ```
3.  Install dependencies (if not already done):
    ```bash
    npm install
    ```
4.  Start the server:
    ```bash
    npm run dev
    ```
    You should see: `🚀 Server running on port 5001`

## 2. Start the Frontend

The frontend is now dynamic! It automatically detects whether you are accessing it via `localhost` or your network IP and points to the correct backend URL.

1.  Open a new terminal tab.
2.  Navigate to `apps/frontend`:
    ```bash
    cd apps/frontend
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start Vite with host exposure:
    ```bash
    npm run dev -- --host
    ```
    The `--host` flag is important! It tells Vite to expose the server to your local network.

## 3. Accessing the App

### On your Mac (Localhost)
-   **URL:** `http://localhost:3000`
-   **API:** Points to `http://localhost:5001`

### On your Phone (Same WiFi)
1.  Find your Mac's IP address (e.g., `192.168.1.5`).
2.  Open your phone's browser and go to `http://<YOUR_MAC_IP>:3000`.
3.  **Authorize your Network:**
    -   Log in as an **Admin**.
    -   Go to **Admin Settings** > **Network Settings** (Signal Icon).
    -   Click **"Add My Current IP"** to authorize your phone's network IP.
    -   Click **"Save Settings"**.
4.  **Mark Attendance:** You can now switch to an Employee account and check in/out!

## Accessing from different devices
The app automatically detects the host IP. If you access from a remote device, it will try to connect to the backend on that same host IP. Always ensure you have authorized the network IP in the Admin Dashboard if "Network Requirement" is enabled.

## Troubleshooting

-   **Backend not reachable?**
    -   Ensure your Mac's firewall allows incoming connections on port 5001 and 3000.
-   **Unauthorized Network Error?**
    -   If "Network Requirement" is ON, you MUST add your IP to the "Authorized IP Addresses" list in Admin Dashboard > Network Settings.
    -   Use the "Add My Current IP" button while logged in as admin from that device.
