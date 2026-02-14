import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { X } from 'lucide-react';
import './IDCard.tsx.css';

interface IDCardProps {
    user: User;
}

interface IDCardInnerProps {
    user: User;
    isFlipped: boolean;
    isFullscreen: boolean;
}

const IDCardInner: React.FC<IDCardInnerProps> = ({ user, isFlipped, isFullscreen }) => (
    <div className={`id-card-inner ${isFlipped ? 'flipped' : ''} ${isFullscreen ? 'card-fullscreen' : ''}`}>
        {/* Front */}
        <div
            className="id-card-front"
            style={user.idCardFront ? { backgroundImage: `url(${user.idCardFront})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
            {!user.idCardFront && (
                <>
                    {/* UVERS Brand Pattern */}
                    <div className="id-card-watermark">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="watermark-row">UVERS STUDIO UVERS STUDIO UVERS STUDIO</div>
                        ))}
                    </div>

                    {/* Logo Top Right */}
                    <div className="id-card-brand-top">
                        <div className="id-card-brand-logo bg-white">
                            <img src="/xcxx.png" alt="UVERS Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="id-card-brand-text">
                            <span>UVERS</span>
                            <span>STUDIO</span>
                        </div>
                    </div>

                    <img
                        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                        alt={user.name}
                        className="id-card-avatar"
                    />

                    {/* Role and Name */}
                    <div className="id-card-info">
                        <div className="id-card-role text-[#004085]">{user.role} MEMBER</div>
                        <div className="id-card-name uppercase">{user.name}</div>
                        <div className="id-card-dept">
                            {user.departments.slice(0, 2).map(dept => (
                                <span key={dept} className="dept-tag">{dept}</span>
                            ))}
                            {user.departments.length > 2 && <span className="dept-tag">+{user.departments.length - 2}</span>}
                            {user.departments.length === 0 && <span className="dept-tag">Unassigned</span>}
                        </div>
                    </div>

                    {/* Academy Sidebar */}
                    <div className="id-card-sidebar">
                        <div className="sidebar-text">ACADEMY</div>
                    </div>

                    {/* Color Bars Footer */}
                    <div className="id-card-footer-branding">
                        <div className="footer-colors">
                            <div className="bar-red" />
                            <div className="bar-pink" />
                            <div className="bar-yellow" />
                        </div>
                        <div className="footer-motto">
                            SWIFT. PROFESSIONAL. EFFECTIVE. EFFICIENT.
                        </div>
                    </div>
                </>
            )}
        </div>

        {/* Back */}
        <div
            className="id-card-back"
            style={user.idCardBack ? { backgroundImage: `url(${user.idCardBack})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
            {!user.idCardBack && (
                <>
                    <div className="id-card-logo-back">UVERS</div>
                    <div className="id-card-motto">ACADEMY ACCESS</div>
                    <div className="mt-4 text-[10px] font-mono opacity-50 uppercase tracking-widest text-[#FFCC00]">
                        {user.userId || user.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="absolute bottom-10 flex gap-2">
                        <div className="w-8 h-1 bg-[#FF4B4B]" />
                        <div className="w-8 h-1 bg-[#FFCC00]" />
                        <div className="w-8 h-1 bg-white/50" />
                    </div>
                </>
            )}
        </div>
    </div>
);

const IDCard: React.FC<IDCardProps> = ({ user }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);

    const handleCardClick = (e: React.MouseEvent) => {
        const now = Date.now();
        // Check if double/triple click (within 500ms)
        if (now - lastClickTime < 500) {
            const newCount = clickCount + 1;
            setClickCount(newCount);
            if (newCount === 3) {
                setIsFullscreen(true);
                setClickCount(0); // Reset after activation
            }
        } else {
            // Normal click - flip the card
            setClickCount(1);
            setIsFlipped(!isFlipped);
        }
        setLastClickTime(now);
    };

    const closeFullscreen = useCallback(() => {
        setIsFullscreen(false);
        setClickCount(0);
    }, []);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeFullscreen();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [closeFullscreen]);

    return (
        <>
            <div className="id-card-container" onClick={handleCardClick}>
                <IDCardInner user={user} isFlipped={isFlipped} isFullscreen={false} />
            </div>

            {isFullscreen && (
                <div className="focus-mode-overlay animate-in fade-in duration-300">
                    <button className="focus-mode-close" onClick={closeFullscreen}>
                        <X size={32} />
                    </button>
                    <div className="id-card-container fullscreen-wrap" onClick={() => setIsFlipped(!isFlipped)}>
                        <IDCardInner user={user} isFlipped={isFlipped} isFullscreen={true} />
                    </div>
                    <div className="focus-mode-label">
                        <span className="font-black">UVERS</span> FOCUS MODE
                    </div>
                </div>
            )}
        </>
    );
};

export default IDCard;
