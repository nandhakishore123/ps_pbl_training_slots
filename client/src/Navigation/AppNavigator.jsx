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

//admin
import AdminDashboard from '../pages/Admin/Dashboard/Dashboard.jsx'
import Approvals from '../pages/Admin/Approvals/Approvals.jsx'
import FacultyAllocation from '../pages/Admin/FacultyAllocation/FacultyAllocation.jsx'
import Reports from '../pages/Admin/Reports/Reports.jsx'
import Settings from '../pages/Admin/Settings/Settings.jsx'
import Notifications from '../pages/Admin/Notifications/Notifications.jsx'
import Students from '../pages/Admin/StudentManagement/StudentManagement.jsx'
import VenueAllocation from '../pages/Admin/VenueAllocation/VenueAllocation.jsx'

import { AppProvider } from '../pages/Admin/context/AppContext.jsx'
import { DataProvider } from '../pages/Admin/context/DataContext.jsx'
import FileNotFound from '../pages/404/FileNotFound.jsx';
import FacultyDashboard from '../pages/Faculty/FacultyDashboard.jsx';
import RequestTransfer from '../pages/Faculty/RequestTransfer.jsx';
import MyVenues from '../pages/Faculty/MyVenues.jsx';


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
                <Route path="/assessment/mcq" element={<RequireAuth><RequireRole allowedRoles={[1]}><MCQAssessment/></RequireRole></RequireAuth>} />
                <Route path="/assessment/compiler" element={<RequireAuth><RequireRole allowedRoles={[1]}><Compiler/></RequireRole></RequireAuth>} />
                <Route path="/assessment/Student-feedback" element={<RequireAuth><RequireRole allowedRoles={[1]}><StudentFeedback/></RequireRole></RequireAuth>} />

                {/* Admin routes */}
                <Route path="/admin-dashboard" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><AdminDashboard/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/approvals" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Approvals/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/faculty-allocation" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><FacultyAllocation/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/reports" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Reports/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Settings/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/notification" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Notifications/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/view-students" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><Students/></AdminProviders></RequireRole></RequireAuth>} />
                <Route path="/venue-allocation" element={<RequireAuth><RequireRole allowedRoles={[3]}><AdminProviders><VenueAllocation/></AdminProviders></RequireRole></RequireAuth>} />

                {/* faculty  routes*/}
                <Route path="/faculty-dashboard" element={<RequireAuth><RequireRole allowedRoles={[2]}><FacultyDashboard/></RequireRole></RequireAuth>} />
                <Route path="/my-venues" element={<RequireAuth><RequireRole allowedRoles={[2]}><MyVenues/></RequireRole></RequireAuth>} />
                <Route path="/request-transfer" element={<RequireAuth><RequireRole allowedRoles={[2]}><RequestTransfer/></RequireRole></RequireAuth>} />


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
