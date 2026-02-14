
# UVA ATTENDANCE FLOW

AttendFlow is a comprehensive, mobile-responsive attendance management system designed for modern workforces. It features role-based dashboards for Admins, Supervisors, and Employees, and supports multiple attendance verification methods including Geolocation, WiFi SSID verification, and Dynamic QR Codes.

## 🌟 Features

### 🏢 Admin Dashboard
- **Organization Control**: Manage Teams and Members.
- **Schedule Management**: 
  - **Weekly Routine**: Set standard working hours and grace periods per day.
  - **Calendar Exceptions**: Override specific dates for holidays or special working hours.
- **Global Configuration**: Toggle and configure check-in requirements (Location radius, WiFi SSID, QR rotation intervals).
- **Analytics**: View weekly activity charts.

### 👨‍💼 Supervisor Dashboard
- **Team Ops**: View real-time status of team members (Present, Late, Absent).
- **QR Station**: Generate and display dynamic check-in codes for specific departments.
- **History**: View and edit attendance records for the team.

### 👷 Employee Dashboard
- **Smart Check-In**: One-tap check-in based on active requirements.
- **Scanner**: Built-in QR code scanner with camera overlay.
- **Status Hub**: View current status, active shifts, and personal attendance history.
- **Requirements**: Visual indicators for GPS, WiFi, and QR compliance.

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Node.js, Express, MongoDB
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Containerization**: Docker, Docker Compose

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (for local dev)

### 🐳 Run with Docker (Production Mode)
1.  **Start Services**:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d --build
    ```
2.  **Access Application**:
    - Frontend: [http://localhost:3000](http://localhost:3000)
    - Backend: [http://localhost:5001](http://localhost:5001)

### 🛠 Manual Setup
**Backend**
```bash
cd apps/backend
npm install
npm run dev
```

**Frontend**
```bash
cd apps/frontend
npm install
npm run dev
```

## 📱 Mobile Responsiveness

The application is built with a "Mobile-First" approach but scales elegantly to desktop.
- **Tables**: Automatically convert to scrollable views or card layouts on small screens.
- **Modals**: Full-screen or bottom-sheet style adaptations for mobile.
- **Navigation**: Touch-friendly buttons and clear visual hierarchies.

## ⚙️ Key Configuration Logic

### Schedule Logic
The system determines if an employee is **LATE** based on the following priority:
1.  **Exception**: Is there a specific rule for `YYYY-MM-DD`?
2.  **Schedule**: If not, what is the rule for the current day of the week (e.g., Monday)?
3.  **Grace Period**: Is the check-in time within the allowed grace minutes after the start time?

### QR Security
- **Rotation**: QR codes rotate automatically (default 10s) to prevent sharing screenshots.
- **Team vs. Global**:
    - **Global Code**: Checks a user into *all* their departments.
    - **Team Code**: Checks a user into *only* that specific department.

## 🔐 Authentication
The system uses ID + Password authentication.

**Default Credentials:**
- **Admin**: `admin1` / `123456`
- **Supervisor**: `bob1` / `123456`
- **Employee**: `charlie1` / `123456`
