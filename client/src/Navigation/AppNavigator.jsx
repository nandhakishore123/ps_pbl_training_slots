import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.jsx';
import { silentRefresh } from '../services/core/session.js';


//login
import Login from "../pages/Auth/Login.jsx"

//student
import StudentDashboard from '../pages/Student/StudentDashboard.jsx';
import PointsDashboard from '../pages/Student/PointsDashboard.jsx';
import MCQAssessment from '../pages/Student/McqAssessment.jsx';
import Compiler from "../pages/Student/Compiler.jsx";
import StudentFeedback from '../pages/Student/StudentFeedback .jsx';
import TrainingSlots from '../pages/Student/TrainingSlots.jsx';
import InventoryRequest from '../pages/Student/InventoryRequest.jsx';

//admin
import AdminDashboard from '../pages/Admin/Dashboard/Dashboard.jsx'
import Approvals from '../pages/Admin/Approvals/Approvals.jsx'
import ActivityPoints from '../pages/Admin/ActivityPoints/ActivityPoints.jsx'
import AdminRewardPoints from '../pages/Admin/RewardPoints/RewardPoints.jsx'
import Reports from '../pages/Admin/Reports/Reports.jsx'
import Settings from '../pages/Admin/Settings/Settings.jsx'
import Notifications from '../pages/Admin/Notifications/Notifications.jsx'
import Announcements from '../pages/Admin/Announcements/Announcements.jsx'
import Feedback from '../pages/Admin/Feedback/Feedback.jsx'
import Survey from '../pages/Admin/Survey/Survey.jsx'
import SurveyResponses from '../pages/Admin/Survey/SurveyResponses.jsx'
import Students from '../pages/Admin/StudentManagement/StudentManagement.jsx'
import VenueAllocation from '../pages/Admin/VenueAllocation/VenueAllocation.jsx'
import SlotScheduling from '../pages/Admin/SlotScheduling/SlotScheduling.jsx'
import AdminAttendance from '../pages/Admin/Attendance/AdminAttendance.jsx'
import AdminBookings from '../pages/Admin/Bookings/AdminBookings.jsx'
import FacultyManagement from '../pages/Admin/FacultyManagement/FacultyManagement.jsx'
// USER MANAGEMENT (non-student roles) — removable
import UserManagement from '../pages/Admin/UserManagement/UserManagement.jsx'
import AdminInventory from '../pages/Admin/AdminInventory.jsx'

import { AppProvider } from '../pages/Admin/context/AppContext.jsx'
import { DataProvider } from '../pages/Admin/context/DataContext.jsx'
import FileNotFound from '../pages/404/FileNotFound.jsx';
import FacultyDashboard from '../pages/Faculty/FacultyDashboard.jsx';
import RequestTransfer from '../pages/Faculty/RequestTransfer.jsx';
import MyVenues from '../pages/Faculty/MyVenues.jsx';
import FacultyApprovals from '../pages/Faculty/FacultyApprovals.jsx';
import FacultyActivityPoints from '../pages/Faculty/FacultyActivityPoints.jsx';
import FacultyInventoryApproval from '../pages/Faculty/FacultyInventoryApproval.jsx';

//inventory incharge (role 4)
import InventoryInchargeDashboard from '../pages/InventoryIncharge/InventoryInchargeDashboard.jsx';

//intern / lab technician (role 5) — removable
import InternDashboard from '../pages/Intern/InternDashboard.jsx';


function useBootstrapAuth() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                if (!accessToken) {
                    await silentRefresh();
                }
            } finally {
                if (alive) setReady(true);
            }
        })();

        return () => {
            alive = false;
        };
    }, [accessToken]);

    return { ready };
}

function HomeRedirect() {
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);

    if (!accessToken) return <Navigate to="/auth/login" replace />;
    // If token exists but user isn't ready yet, avoid bouncing.
    if (!user) return null;

    const roleId = Number(user.role_id);
    if (roleId === 3) {
        return <Navigate to="/admin-dashboard" replace />;
    }
    if (roleId === 1) {
        return <Navigate to="/student-dashboard" replace />;
    }

    if (roleId === 2) {
        return <Navigate to="/faculty-dashboard" replace />;
    }

    if (roleId === 4) {
        return <Navigate to="/inventory-incharge" replace />;
    }

    // ── INTERN (role 5) — removable ──
    if (roleId === 5) {
        return <Navigate to="/lab-purchases" replace />;
    }

    return <Navigate to="/auth/login" replace />;
}

function RequireAuth({ children }) {
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    if (!accessToken) return <Navigate to="/auth/login" replace />;
    // Token exists but user isn't ready yet; wait one render.
    if (!user) return null;
    return children;
}

function RequireRole({ allowedRoles, children }) {
    const user = useAuthStore((s) => s.user);

    // RequireAuth should already guarantee user exists; be defensive.
    if (!user) return null;

    const roleId = Number(user.role_id);
    if (!allowedRoles.includes(roleId)) {
        return <Navigate to="/not-found" replace />;
    }

    return children;
}

function AdminProviders({ children }) {
    return (
        <AppProvider>
            <DataProvider>
                {children}
            </DataProvider>
        </AppProvider>
    );
}

function AppNavigator() {
    const { ready } = useBootstrapAuth();
    const accessToken = useAuthStore((s) => s.accessToken);
    const baseName = import.meta.env.BASE_URL;

    if (!ready) return null;

    return (
        <Router basename={baseName}>
            <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/auth/login" element={<Login/>}/>

                {/* Student routes */}
                <Route path="/student-dashboard" element={<RequireAuth><RequireRole allowedRoles={[1]}><StudentDashboard/></RequireRole></RequireAuth>} />
                <Route path="/points-page" element={<RequireAuth><RequireRole allowedRoles={[1]}><PointsDashboard/></RequireRole></RequireAuth>} />
                <Route path="/training-slots" element={<RequireAuth><RequireRole allowedRoles={[1]}><TrainingSlots/></RequireRole></RequireAuth>} />
                <Route path="/inventory-request" element={<RequireAuth><RequireRole allowedRoles={[1]}><InventoryRequest/></RequireRole></RequireAuth>} />
                <Route path="/assessment/mcq" element={<RequireAuth><RequireRole allowedRoles={[1]}><MCQAssessment/></RequireRole></RequireAuth>} />
                <Route path="/assessment/compiler" element={<RequireAuth><RequireRole allowedRoles={[1]}><Compiler/></RequireRole></RequireAuth>} />
                <Route path="/assessment/Student-feedback" element={<RequireAuth><RequireRole allowedRoles={[1]}><StudentFeedback/></RequireRole></RequireAuth>} />

                {/* Admin routes */}
                <Route path="/admin-dashboard" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><AdminDashboard/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/approvals" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Approvals/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/activity-points" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><ActivityPoints/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/admin-reward-points" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminRewardPoints/></RequireRole></RequireAuth>} />
                <Route path="/reports" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Reports/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Settings/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/notification" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Notifications/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/announcements" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Announcements/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/feedback" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Feedback/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/survey" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Survey/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/survey-responses/:id" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><SurveyResponses/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/view-students" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Students/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/venue-allocation" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><VenueAllocation/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/slot-scheduling" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><SlotScheduling/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/admin-attendance" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><AdminAttendance/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/admin-bookings" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><AdminBookings/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/faculty-management" element={<RequireAuth><RequireRole allowedRoles={[3]}><FacultyManagement/></RequireRole></RequireAuth>} />
                {/* USER MANAGEMENT (non-student roles) — removable */}
                <Route path="/user-management" element={<RequireAuth><RequireRole allowedRoles={[3]}><UserManagement/></RequireRole></RequireAuth>} />
                <Route path="/admin-inventory" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminInventory/></RequireRole></RequireAuth>} />

                {/* faculty  routes*/}
                <Route path="/faculty-dashboard" element={<RequireAuth><RequireRole allowedRoles={[2]}><FacultyDashboard/></RequireRole></RequireAuth>} />
                <Route path="/my-venues" element={<RequireAuth><RequireRole allowedRoles={[2]}><MyVenues/></RequireRole></RequireAuth>} />
                <Route path="/request-transfer" element={<RequireAuth><RequireRole allowedRoles={[2]}><RequestTransfer/></RequireRole></RequireAuth>} />
                <Route path="/faculty-approvals" element={<RequireAuth><RequireRole allowedRoles={[2]}><FacultyApprovals/></RequireRole></RequireAuth>} />
                <Route path="/faculty-activity-points" element={<RequireAuth><RequireRole allowedRoles={[2]}><FacultyActivityPoints/></RequireRole></RequireAuth>} />
                <Route path="/faculty-inventory-approval" element={<RequireAuth><RequireRole allowedRoles={[2, 3]}><FacultyInventoryApproval/></RequireRole></RequireAuth>} />

                {/* inventory incharge routes (role 4) */}
                <Route path="/inventory-incharge" element={<RequireAuth><RequireRole allowedRoles={[4]}><InventoryInchargeDashboard/></RequireRole></RequireAuth>} />

                {/* intern / lab technician routes (role 5) — removable */}
                <Route path="/lab-purchases" element={<RequireAuth><RequireRole allowedRoles={[5]}><InternDashboard/></RequireRole></RequireAuth>} />
                {/* legacy path — forwards stale bookmarks; gating is applied by the target route */}
                <Route path="/intern" element={<Navigate to="/lab-purchases" replace />} />


                <Route path="/not-found" element={<FileNotFound/>}/>
                <Route
                    path="*"
                    element={
                        accessToken ? (
                            <FileNotFound />
                        ) : (
                            <Navigate to="/auth/login" replace />
                        )
                    }
                />
            </Routes>
        </Router>
    );
}

export default AppNavigator;
