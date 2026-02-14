
# Agent / Developer Guide

This document outlines the architectural decisions, data models, and core logic flows used in **AttendFlow AI**. It serves as a guide for understanding how the system functions internally.

## 🏗 Architecture

The application relies on a central **Context Provider (`AppContext`)** to manage state. This monolithic state approach was chosen for simplicity given the scope, allowing instantaneous updates across dashboards without complex prop drilling.

### Core Entities (`types.ts`)
- **User**: Contains `userId`, `password` (hashed), `role` (Admin/Supervisor/Employee), and `departments` array.
- **AttendanceRecord**: The source of truth. Linked to `userId` and `date`.
- **AppSettings**: Monolithic configuration object containing:
    - `schedule`: Weekly recurring rules.
    - `exceptions`: Date-specific overrides.
    - `qrGenerationConfig`: Security settings for codes.

## 🧠 Logic Flows

### 1. Authentication
- **Mechanism**: Standard ID + Password login.
- **Controller**: `authController.ts` handles login requests.
- **Security**: Passwords are hashed using `bcryptjs`.
- **Session**: Simple client-side persistence via `localStorage` (storing User object).

### 2. Attendance Marking (`markAttendance`)
When a user attempts to check in, the system performs validation in this order:
1.  **Requirement Check**:
    - **Location**: Calculates Haversine distance between user coords and office coords. Fails if > `radiusMeters`.
    - **WiFi**: Compares connected SSID (simulated) with allowed SSID.
2.  **Schedule Resolution**:
    - Looks up `settings.exceptions[today]`.
    - If null, looks up `settings.schedule[dayOfWeek]`.
    - If the day is disabled in settings, the status defaults to `PRESENT` (treated as overtime/voluntary work), never `LATE`.
    - If enabled, compares `now` vs `startTime + gracePeriod` to determine `LATE` vs `PRESENT`.
3.  **Record Creation**:
    - If using a **Global QR**, iterates through all user departments and creates a record for each.
    - If using a **Team QR**, creates a record only for that department.

### 2. QR Rotation System
- **Implementation**: `useEffect` in `AppContext`.
- **Mechanism**:
    - Runs every 1 second.
    - Checks `Date.now() > code.timestamp + code.expiresIn`.
    - If expired, calls `generateNewQr()`.
- **Format**: `PREFIX` + `RandomChars`. Configurable in Admin settings.

### 3. Schedule Exceptions
- **Storage**: Key-value map in `AppSettings` where key is `YYYY-MM-DD`.
- **UI**: The Admin Schedule tab uses a calendar view.
    - **Blue**: Custom working hours.
    - **Red**: Day off (Holiday).
    - **Clear**: Follows weekly routine.

## 🎨 UI/UX Decisions

- **Tailwind CSS**: Used exclusively for styling.
- **Glassmorphism**: Heavy use of `backdrop-blur`, semi-transparent whites (`bg-white/80`), and shadows to create a modern, depth-rich interface.
- **Animation**: `animate-in`, `zoom-in`, and `fade-in` utilities are used for all modals to ensure smooth transitions.
- **Mobile Optimization**:
    - Input fields on mobile have `16px` (text-base) font size to prevent iOS zoom.
    - Tables are wrapped in `overflow-x-auto`.
    - Flex directions switch from `col` (mobile) to `row` (desktop).


