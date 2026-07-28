import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { supabase } from './supabase';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import EmployeeLayout from './components/EmployeeLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import Attendance from './pages/admin/Attendance';
import LeaveRequests from './pages/admin/LeaveRequests';
import Schedule from './pages/admin/Schedule';
import Reports from './pages/admin/Reports';
import Vehicles from './pages/admin/Vehicles';
import EmployeeHome from './pages/employee/Home';
import QRScan from './pages/employee/QRScan';
import Shifts from './pages/employee/Shifts';
import Leave from './pages/employee/Leave';
import Notifications from './pages/employee/Notifications';
import Settings from './pages/employee/Settings';
import OpenShifts from './pages/employee/OpenShifts';

export default function App() {
  useEffect(() => {
    const handleOnline = async () => {
      console.log('App is back online. Checking for pending offline check-ins...');
      try {
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open('depotflow-offline', 1);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        if (!db.objectStoreNames.contains('offline-attendance')) return;

        const tx = db.transaction('offline-attendance', 'readwrite');
        const store = tx.objectStore('offline-attendance');
        const recordsReq = store.getAll();

        recordsReq.onsuccess = async () => {
          const records = recordsReq.result;
          if (records.length === 0) return;

          console.log(`Found ${records.length} offline records. Syncing...`);
          for (const record of records) {
            try {
              // Get shift to determine status
              const { data: shift } = await supabase
                .from('shifts')
                .select('*')
                .eq('employee_id', record.employee_id)
                .eq('date', record.date)
                .single();
                
              let attStatus = 'present';
              if (shift && shift.start_time) {
                const shiftStart = new Date(`${record.date}T${shift.start_time}`);
                if (new Date(record.check_in_time) > new Date(shiftStart.getTime() + 15 * 60000)) {
                  attStatus = 'late';
                }
              }

              // Insert to Supabase
              const { error } = await supabase.from('attendance').insert({
                employee_id: record.employee_id,
                shift_id: shift?.id || null,
                check_in_time: record.check_in_time,
                date: record.date,
                status: attStatus,
                selfie_url: record.selfie_url
              });

              if (!error) {
                // Delete from IndexedDB if successful
                const delTx = db.transaction('offline-attendance', 'readwrite');
                delTx.objectStore('offline-attendance').delete(record.id);
                console.log('Synced record ID:', record.id);
              }
            } catch (err) {
              console.error('Failed to sync offline record:', record, err);
            }
          }
        };
      } catch (err) {
        console.error('Offline sync check failed:', err);
      }
    };

    window.addEventListener('online', handleOnline);
    // Also trigger a check on app load just in case
    if (navigator.onLine) handleOnline();

    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<LeaveRequests />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="fleet" element={<Vehicles />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Employee routes */}
          <Route path="/employee" element={<ProtectedRoute role="employee"><EmployeeLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<EmployeeHome />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="openshifts" element={<OpenShifts />} />
            <Route path="leave" element={<Leave />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* QR scan is a full-screen page outside the layout */}
          <Route path="/employee/scan" element={<ProtectedRoute role="employee"><QRScan /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-surface">
              <div className="text-center">
                <p className="text-6xl font-bold text-navy-200">404</p>
                <p className="text-gray-500 mt-2">Page not found</p>
                <a href="/" className="btn btn-primary mt-4 inline-flex">Go Home</a>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
