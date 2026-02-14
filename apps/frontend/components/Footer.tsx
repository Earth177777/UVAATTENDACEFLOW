import React from 'react';

const Footer: React.FC = () => {
    const year = new Date().getFullYear();
    const [activeModal, setActiveModal] = React.useState<'terms' | 'privacy' | 'support' | null>(null);

    const Modal = ({ title, content, onClose }: { title: string, content: React.ReactNode, onClose: () => void }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                    {content}
                </div>
                <button
                    onClick={onClose}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-medium rounded-xl transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );

    return (
        <>
            <footer className="w-full py-6 mt-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center md:text-left flex flex-col gap-1">
                        <span className="font-bold">&copy; {year} UVERS STUDIO</span>
                        <span>Produced by MITC (Maitreyawira Innovation Technology Club)</span>
                        <span className="text-[10px] opacity-75">Fully Right of Webtinous • All License under Webtinous</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 text-xs font-medium text-slate-500 dark:text-slate-400 items-center md:items-start">
                        <button
                            onClick={() => setActiveModal('terms')}
                            className="hover:text-[#004085] dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                            Terms & License
                        </button>
                        <button
                            onClick={() => setActiveModal('privacy')}
                            className="hover:text-[#004085] dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                            Privacy
                        </button>
                        <button
                            onClick={() => setActiveModal('support')}
                            className="hover:text-[#004085] dark:hover:text-blue-400 transition-colors flex flex-col md:inline text-center md:text-left"
                        >
                            <span>Support</span>
                            <span className="text-[10px] block md:hidden mt-1">+62 812-9292-4478</span>
                        </button>
                    </div>
                </div>
            </footer>

            {activeModal === 'terms' && (
                <Modal
                    title="Terms & License"
                    onClose={() => setActiveModal(null)}
                    content={
                        <div className="space-y-2">
                            <p><strong>License:</strong> Proprietary License under Webtinous.</p>
                            <p><strong>Rights:</strong> All rights reserved. This software is produced by MITC (Maitreyawira Innovation Technology Club) for Maitreyawira School.</p>
                            <p className="text-xs opacity-70 mt-2">Not for commercial redistribution without explicit permission.</p>
                        </div>
                    }
                />
            )}

            {activeModal === 'privacy' && (
                <Modal
                    title="Privacy Policy"
                    onClose={() => setActiveModal(null)}
                    content={
                        <div className="space-y-2">
                            <p><strong>Data Storage:</strong> All attendance data is stored securely within the organization's database.</p>
                            <p><strong>Usage:</strong> Data is used solely for attendance tracking and management purposes.</p>
                            <p><strong>Protection:</strong> No data is shared with third parties.</p>
                        </div>
                    }
                />
            )}

            {activeModal === 'support' && (
                <Modal
                    title="Contact Support"
                    onClose={() => setActiveModal(null)}
                    content={
                        <div className="space-y-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Email</p>
                                <a href="mailto:gilbert177777@gmail.com" className="text-[#004085] dark:text-blue-400 font-medium hover:underline">gilbert177777@gmail.com</a>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">WhatsApp / Phone</p>
                                <a href="tel:+6281292924478" className="text-[#004085] dark:text-blue-400 font-medium hover:underline">+62 812-9292-4478</a>
                            </div>
                            <p className="text-xs text-center mt-2">Available Mon-Fri, 08:00 - 17:00</p>
                        </div>
                    }
                />
            )}
        </>
    );
};

export default Footer;
