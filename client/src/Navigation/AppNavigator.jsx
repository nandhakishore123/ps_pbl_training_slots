import React, { useEffect, useState } from 'react';
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
import PBLSlots from '../pages/Admin/PBLSlots/PBLSlots.jsx'
import PSSlots from '../pages/Admin/PSSlots/PSSlots.jsx'
import Students from '../pages/Admin/StudentManagement/StudentManagement.jsx'
import VenueAllocation from '../pages/Admin/VenueAllocation/VenueAllocation.jsx'

import { AppProvider } from '../pages/Admin/context/AppContext.jsx'
import { DataProvider } from '../pages/Admin/context/DataContext.jsx'
import FileNotFound from '../pages/404/FileNotFound.jsx';


function useBootstrapAuth() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [ready, setReady] = useState(false);
    const [authFailed, setAuthFailed] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                if (accessToken) {
                    if (alive) setAuthFailed(false);
                    return;
                }

                const refreshed = await silentRefresh();
                if (alive && !refreshed) {
                    setAuthFailed(true);
                }
            } finally {
                if (alive) setReady(true);
            }
        })();

        return () => {
            alive = false;
        };
    }, [accessToken]);

    return { ready, authFailed };
}

function HomeRedirect() {
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);

    if (!accessToken || !user) return <Navigate to="/auth/login" replace />;

    const roleId = Number(user.role_id);
    if (roleId === 3) {
        return <Navigate to="/admin-dashboard" replace />;
    }
    if (roleId === 1) {
        return <Navigate to="/student-dashboard" replace />;
    }

    if (roleId === 2) {
        return <Navigate to="/admin-dashboard" replace />;
    }

    return <Navigate to="/auth/login" replace />;
}

function RequireAuth({ children }) {
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    if (!accessToken || !user) return <Navigate to="/auth/login" replace />;
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
    const { ready, authFailed } = useBootstrapAuth();
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    const baseName = import.meta.env.BASE_URL;

    if (!ready) return null;

    if (authFailed && !accessToken) {
        return (
            <Router basename={baseName}>
                <Routes>
                    <Route path="/auth/login" element={<Login />} />
                    <Route path="*" element={<Navigate to="/auth/login" replace />} />
                </Routes>
            </Router>
        );
    }

    return (
        <Router basename={baseName}>
            <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/auth/login" element={<Login/>}/>

                {/* Routes are registered by role_id after auth */}
                {Number(user?.role_id) === 1 && (
                    <>
                    
                        <Route path="/student-dashboard" element={<RequireAuth><StudentDashboard/></RequireAuth>} />
                        <Route path="/points-page" element={<RequireAuth><PointsDashboard/></RequireAuth>} />
                        <Route path="/training-slots" element={<RequireAuth><TrainingSlots/></RequireAuth>} />
                        <Route path="/assessment/mcq" element={<RequireAuth><MCQAssessment/></RequireAuth>} />
                        <Route path="/assessment/compiler" element={<RequireAuth><Compiler/></RequireAuth>} />
                        <Route path="/assessment/Student-feedback" element={<RequireAuth><StudentFeedback/></RequireAuth>} />
                    </>
                )}

                {(Number(user?.role_id) === 3 || Number(user?.role_id) === 2) && (
                    <>
                        <Route path="/admin-dashboard" element={<RequireAuth><AdminProviders><AdminDashboard/></AdminProviders></RequireAuth>} />
                        <Route path="/approvals" element={<RequireAuth><AdminProviders><Approvals/></AdminProviders></RequireAuth>} />
                        <Route path="/faculty-allocation" element={<RequireAuth><AdminProviders><FacultyAllocation/></AdminProviders></RequireAuth>} />
                        <Route path="/reports" element={<RequireAuth><AdminProviders><Reports/></AdminProviders></RequireAuth>} />
                        <Route path="/settings" element={<RequireAuth><AdminProviders><Settings/></AdminProviders></RequireAuth>} />
                        <Route path="/notification" element={<RequireAuth><AdminProviders><Notifications/></AdminProviders></RequireAuth>} />
                        <Route path="/ps-slot-management" element={<RequireAuth><AdminProviders><PSSlots/></AdminProviders></RequireAuth>} />
                        <Route path="/pbl-slot-management" element={<RequireAuth><AdminProviders><PBLSlots/></AdminProviders></RequireAuth>} />
                        <Route path="/view-students" element={<RequireAuth><AdminProviders><Students/></AdminProviders></RequireAuth>} />
                        <Route path="/venue-allocation" element={<RequireAuth><AdminProviders><VenueAllocation/></AdminProviders></RequireAuth>} />
                    </>
                )}

                <Route path="/not-found" element={<FileNotFound/>}/>
                <Route
                    path="*"
                    element={
                        accessToken && user ? (
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
