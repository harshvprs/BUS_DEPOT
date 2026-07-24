import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { ArrowLeft, Camera, CheckCircle2, XCircle, Keyboard } from 'lucide-react';

export default function QRScan() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('scanning'); // scanning | success | error
  const [message, setMessage] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

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
          () => {} // ignore scan errors
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
    try {
      const { data } = await api.post('/attendance/checkin', { qr_token: qrToken });
      setStatus('success');
      setMessage(`Checked in at ${new Date(data.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} — Status: ${data.status === 'present' ? 'On Time ✅' : 'Late ⚠️'}`);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Check-in failed');
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    await handleScan(manualCode);
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate('/employee/home')} className="p-1.5 rounded-lg text-white hover:bg-navy-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white font-semibold">Check In</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {status === 'scanning' && (
          <>
            {!manualMode ? (
              <>
                <div className="relative w-72 h-72 mb-6">
                  {/* Scanner frame */}
                  <div className="absolute inset-0 border-2 border-amber-400 rounded-2xl overflow-hidden">
                    <div id="qr-reader" ref={scannerRef} className="w-full h-full" />
                  </div>
                  {/* Corner decorations */}
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                  {/* Scanning line animation */}
                  <div className="absolute left-4 right-4 h-0.5 bg-amber-400 animate-bounce opacity-60" style={{ top: '50%' }} />
                </div>
                <p className="text-navy-300 text-center mb-6">Point your camera at the depot QR code</p>
                <button onClick={() => setManualMode(true)} className="text-amber-400 text-sm hover:underline flex items-center gap-2">
                  <Keyboard size={16} /> Enter code manually
                </button>
              </>
            ) : (
              <form onSubmit={handleManualSubmit} className="w-full max-w-xs text-center">
                <Camera size={48} className="text-navy-600 mx-auto mb-4" />
                <p className="text-white mb-4">Enter the QR code value</p>
                <input type="text" className="input bg-navy-800 border-navy-700 text-white placeholder-navy-500 mb-4"
                  placeholder="Paste QR code here..." value={manualCode}
                  onChange={e => setManualCode(e.target.value)} autoFocus />
                <button type="submit" className="btn btn-primary w-full" disabled={!manualCode}>
                  Check In
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
            <div className="w-20 h-20 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Checked In!</h2>
            <p className="text-success-300 text-sm mb-8">{message}</p>
            <button onClick={() => navigate('/employee/home')} className="btn btn-primary px-8">
              Go Home
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center animate-slide-up">
            <div className="w-20 h-20 bg-danger-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-white" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Check-in Failed</h2>
            <p className="text-danger-300 text-sm mb-8">{message}</p>
            <div className="flex gap-3">
              <button onClick={() => { setStatus('scanning'); setManualMode(false); }} className="btn btn-outline text-white border-white">
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
