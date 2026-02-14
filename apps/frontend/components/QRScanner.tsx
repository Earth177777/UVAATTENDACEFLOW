import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AlertTriangle, Zap, ZapOff, RefreshCw } from 'lucide-react';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onError?: (errorMessage: string) => void;
    onClose?: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, onClose }) => {
    const scannerId = "html5-qr-code-reader";
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [permissionError, setPermissionError] = useState(false);
    const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
    const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [hasFlash, setHasFlash] = useState(false);

    // Initialize scanner
    useEffect(() => {
        let mounted = true;

        const initScanner = async () => {
            // Cleanup any existing instance first
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                    }
                    scannerRef.current.clear();
                } catch (e) {
                    console.error("Error clearing scanner", e);
                }
                scannerRef.current = null;
            }

            // Create new instance
            try {
                scannerRef.current = new Html5Qrcode(scannerId, {
                    verbose: false,
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    }
                });
            } catch (err) {
                console.error("Error creating scanner instance", err);
                if (mounted) setPermissionError(true);
                return;
            }

            try {
                const devices = await Html5Qrcode.getCameras();
                if (mounted) setCameras(devices);

                if (devices && devices.length > 0) {
                    // Prefer back camera
                    const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'));
                    const cameraId = backCamera ? backCamera.id : devices[0].id;

                    if (mounted) startCamera(cameraId);
                } else {
                    if (mounted) setPermissionError(true);
                }
            } catch (err) {
                console.error("Error getting cameras", err);
                if (mounted) setPermissionError(true);
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(initScanner, 100);

        return () => {
            mounted = false;
            clearTimeout(timer);
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(err => console.error("Failed to stop scanner on unmount", err));
                }
                scannerRef.current.clear();
            }
        };
    }, []);

    const startCamera = async (cameraId: string) => {
        if (!scannerRef.current) return;

        try {
            // If already scanning, stop first
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }

            await scannerRef.current.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    disableFlip: false,
                },
                (decodedText) => {
                    onScan(decodedText);
                },
                (errorMessage) => {
                    // ignore errors for now
                }
            );

            setActiveCameraId(cameraId);
            setIsScanning(true);

            // Check torch capability
            try {
                // Capabilities might not be available immediately
                setTimeout(() => {
                    if (scannerRef.current) {
                        try {
                            const settings = scannerRef.current.getRunningTrackCameraCapabilities();
                            const torch = settings.torchFeature();
                            setHasFlash(!!torch.isSupported());
                        } catch (e) {
                            setHasFlash(false);
                        }
                    }
                }, 500);
            } catch (e) {
                setHasFlash(false);
            }

        } catch (err) {
            console.error("Error starting camera", err);
            setPermissionError(true);
        }
    };

    const toggleFlash = async () => {
        if (!scannerRef.current || !hasFlash) return;
        try {
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: !isFlashOn }]
            } as any);
            setIsFlashOn(!isFlashOn);
        } catch (err) {
            console.error("Error toggling flash", err);
        }
    };

    const switchCamera = () => {
        if (cameras.length <= 1 || !activeCameraId) return;
        const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        startCamera(cameras[nextIndex].id);
    };

    if (permissionError) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6 text-center bg-slate-50 text-rose-500 rounded-3xl">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">Camera Access Required</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                    Please allow camera access in your browser settings to scan QR codes.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[400px] bg-black overflow-hidden rounded-3xl group">
            {/* The ID must match what we passed to Html5Qrcode constructor */}
            <div id={scannerId} className="w-full h-full"></div>

            {/* Custom Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                {/* Visual Frame */}
                <div className="relative w-64 h-64">
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>

                    {/* Scan Line Animation */}
                    <div className="absolute w-full h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-y"></div>
                </div>

                {/* Helper Text */}
                <div className="absolute bottom-20 text-white/80 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                    Align QR code within frame
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 z-20 pointer-events-auto">
                {hasFlash && (
                    <button
                        onClick={toggleFlash}
                        className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-95 ${isFlashOn
                                ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_15px_rgba(250,204,21,0.5)]'
                                : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                    >
                        {isFlashOn ? <Zap size={20} fill="currentColor" /> : <ZapOff size={20} />}
                    </button>
                )}

                {cameras.length > 1 && (
                    <button
                        onClick={switchCamera}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-95 rotate-90"
                    >
                        <RefreshCw size={20} />
                    </button>
                )}
            </div>

            <style>{`
                #html5-qr-code-reader video {
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 24px;
                }
                @keyframes scan-y {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-y {
                    animation: scan-y 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default QRScanner;
