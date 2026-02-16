import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound: React.FC = () => {
    return (
        <div className="not-found-container">
            <div className="star-container">
                <div className="sparkle-star s1"><svg viewBox="0 0 24 24"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6Z" /></svg></div>
                <div className="sparkle-star s2"><svg viewBox="0 0 24 24"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6Z" /></svg></div>
                <div className="sparkle-star s3"><svg viewBox="0 0 24 24"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6Z" /></svg></div>
                <div className="sparkle-star s4"><svg viewBox="0 0 24 24"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6Z" /></svg></div>
                <div className="sparkle-star s5"><svg viewBox="0 0 24 24"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6Z" /></svg></div>
            </div>

            <div className="glass-card">
                <div className="logo-container">
                    <img src="/webtinouslogo.PNG" alt="Webtinous Logo" />
                </div>

                <h1>404</h1>

                <svg className="loop-loader" viewBox="0 0 100 100">
                    <circle className="loop-dot dot-1" cx="50" cy="15" r="10" />
                    <circle className="loop-dot dot-2" cx="85" cy="50" r="10" />
                    <circle className="loop-dot dot-3" cx="50" cy="85" r="10" />
                </svg>

                <h2>Stuck in a loop?</h2>
                <p>The page you are looking for has vanished.</p>

                <Link to="/" className="btn-modern">Back to Home</Link>

                <div className="contact-section">
                    <div className="contact-header">Still lost? Contact us</div>
                    <div className="contact-list">

                        <a href="mailto:webtinouscustomercare@gmail.com" className="contact-item">
                            <div className="c-icon bg-purple">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </div>
                            <span className="email-text">webtinouscustomercare@gmail.com</span>
                        </a>

                        <a href="mailto:sales@webtinous.com" className="contact-item">
                            <div className="c-icon bg-blue">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                            </div>
                            <span className="email-text">sales@webtinous.com</span>
                        </a>

                        <a href="mailto:webtinous@gmail.com" className="contact-item">
                            <div className="c-icon bg-orange">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </div>
                            <span className="email-text">webtinous@gmail.com</span>
                        </a>

                    </div>
                </div>

                <div className="footer-copy">
                    &copy; {new Date().getFullYear()} Webtinous. All rights reserved.
                </div>

            </div>
        </div>
    );
};

export default NotFound;
