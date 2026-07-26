import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Camera, CheckCircle2, XCircle, Keyboard, WifiOff, Wifi } from 'lucide-react';

// IndexedDB helper for offline queue
async function queueOfflineAttendance(record) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('depotflow-offline', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-attendance')) {
        db.createObjectStore('offline-attendance', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('offline-attendance', 'readwrite');
      tx.objectStore('offline-attendance').add(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export default function QRScan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('scanning'); // scanning | success | offline | error
  const [message, setMessage] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (manualMode) return;

    let scanner;
    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader');
        html5QrRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleScan(decodedText);
            scanner.stop().catch(() => {});
          },
          () => {}
        );
      } catch (err) {
        console.error('Camera error:', err);
        setManualMode(true);
      }
    };

    initScanner();

    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, [manualMode]);

  async function handleScan(qrToken) {
    if (!qrToken || qrToken.length < 5) {
      setStatus('error');
      setMessage('Invalid QR code');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const checkInTime = new Date();

    // If offline, save locally and register sync
    if (!navigator.onLine) {
      try {
        await queueOfflineAttendance({
          employee_id: user.id,
          date: today,
          check_in_time: checkInTime.toISOString(),
          qr_token: qrToken
        });

        // Register background sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const reg = await navigator.serviceWorker.ready;
          await reg.sync.register('sync-attendance');
        }

        setStatus('offline');
        setMessage(`Saved offline at ${checkInTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Will sync automatically when you reconnect.`);
      } catch (err) {
        setStatus('error');
        setMessage('Failed to save offline. Please try again.');
      }
      return;
    }

    // Online flow
    try {
      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .eq('date', today)
        .single();
        
      if (existing && existing.check_in_time) {
        throw new Error('Already checked in for today.');
      }
      
      const { data: shift } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', user.id)
        .eq('date', today)
        .single();
        
      let attStatus = 'present';
      if (shift && shift.start_time) {
        const shiftStart = new Date(`${today}T${shift.start_time}`);
        if (checkInTime > new Date(shiftStart.getTime() + 15 * 60000)) {
          attStatus = 'late';
        }
      }
      
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: user.id,
          shift_id: shift?.id || null,
          check_in_time: checkInTime.toISOString(),
          date: today,
          status: attStatus
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setStatus('success');
      setMessage(`Checked in at ${new Date(data.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} — Status: ${data.status === 'present' ? 'On Time ✅' : 'Late ⚠️'}`);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Check-in failed');
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    await handleScan(manualCode);
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background orbs */}
      <div className="glass-orb w-96 h-96 bg-amber-500 -top-48 -right-48" />
      <div className="glass-orb w-80 h-80 bg-blue-600 bottom-0 -left-48" />

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 relative z-10">
        <button onClick={() => navigate('/employee/home')} className="p-1.5 rounded-xl text-white hover:bg-white/8">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-semibold">Check In</h1>
        {/* Online/Offline indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          {isOnline ? (
            <><Wifi size={14} className="text-emerald-400" /><span className="text-emerald-400 text-xs">Online</span></>
          ) : (
            <><WifiOff size={14} className="text-amber-400" /><span className="text-amber-400 text-xs">Offline</span></>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 relative z-10">
        {status === 'scanning' && (
          <>
            {!manualMode ? (
              <>
                <div className="relative w-72 h-72 mb-6">
                  <div className="absolute inset-0 border-2 border-amber-400/50 rounded-2xl overflow-hidden glass">
                    <div id="qr-reader" ref={scannerRef} className="w-full h-full" />
                  </div>
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                  <div className="absolute left-4 right-4 h-0.5 bg-amber-400 animate-bounce opacity-60" style={{ top: '50%' }} />
                </div>
                <p className="text-white/40 text-center mb-2">Point your camera at the depot QR code</p>
                {!isOnline && <p className="text-amber-400 text-xs text-center mb-4">📴 You're offline. Check-in will be saved locally.</p>}
                <button onClick={() => setManualMode(true)} className="text-amber-400 text-sm hover:underline flex items-center gap-2">
                  <Keyboard size={16} /> Enter code manually
                </button>
              </>
            ) : (
              <form onSubmit={handleManualSubmit} className="w-full max-w-xs text-center">
                <Camera size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white mb-4">Enter the QR code value</p>
                <input type="text" className="input mb-4"
                  placeholder="Paste QR code here..." value={manualCode}
                  onChange={e => setManualCode(e.target.value)} autoFocus />
                <button type="submit" className="btn btn-primary w-full" disabled={!manualCode}>
                  Check In {!isOnline && '(Offline)'}
                </button>
                <button type="button" onClick={() => setManualMode(false)} className="text-amber-400 text-sm hover:underline mt-4 block mx-auto">
                  Try camera again
                </button>
              </form>
            )}
          </>
        )}

        {status === 'success' && (
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 glow-success shadow-2xl">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Checked In!</h2>
            <p className="text-emerald-300 text-sm mb-8">{message}</p>
            <button onClick={() => navigate('/employee/home')} className="btn btn-primary px-8">
              Go Home
            </button>
          </div>
        )}

        {status === 'offline' && (
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 glow-amber shadow-2xl">
              <WifiOff size={40} className="text-navy-900" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Saved Offline ✈️</h2>
            <p className="text-amber-300 text-sm mb-8">{message}</p>
            <button onClick={() => navigate('/employee/home')} className="btn btn-primary px-8">
              Go Home
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 glow-danger shadow-2xl">
              <XCircle size={40} className="text-white" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Check-in Failed</h2>
            <p className="text-red-300 text-sm mb-8">{message}</p>
            <div className="flex gap-3">
              <button onClick={() => { setStatus('scanning'); setManualMode(false); }} className="btn btn-outline">
                Try Again
              </button>
              <button onClick={() => navigate('/employee/home')} className="btn btn-primary">
                Go Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
