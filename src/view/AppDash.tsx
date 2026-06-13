import { NavLink, Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import '../css/appDash.css';
import UserMenu from '../app/components/UserMenu';
import SubscriptionGuard from '../app/components/SubscriptionGuard';
import { useState, useEffect } from 'react';

const backendUrl = 'https://backend-nana-v2-production.up.railway.app';
//const backendUrl = 'http://localhost:3000';

const logOutl = async () => {
    const res = await fetch(backendUrl + '/logout', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
};

function getStoredOwnerId(): string {
    try {
        const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (raw) {
            const user = JSON.parse(raw);
            return user.promoted_by || user.id || '';
        }
    } catch (_) {}
    return '';
}

export default function Appdash() {
    const navigate  = useNavigate();
    const user      = JSON.parse(localStorage.getItem('user') || 'null');
    const connected = localStorage.getItem('connected');
    const owner_id  = getStoredOwnerId();

    const permitions = {
        ownerview:   { status: user?.owner },
        formview:    { status: true },
        dbview:      { status: true },
        settingview: { status: true },
        planview:    { status: false },
    };

    useEffect(() => {
        if (!connected || !user) {
            localStorage.removeItem('user');
            localStorage.removeItem('connected');
            navigate('/login');
        }
    }, [user, connected]);

    const logOut = async () => {
        try { await logOutl(); } catch { }
        finally {
            localStorage.removeItem('user');
            localStorage.removeItem('connected');
            navigate('/login');
        }
    };

    const [usermenu, setUserMenu]     = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const closeUserMenu = () => setUserMenu(false);

    // Close sidebar when a nav link is clicked on mobile
    const handleNavClick = () => setSidebarOpen(false);

    return (
        <SubscriptionGuard owner_id={owner_id}>
            <style>{`
                /* ── AppDash responsive overrides ── */

                /* Prevent body scroll bleed */
                html, body { height: 100%; overflow: hidden; }

                .appdash-root {
                    height: 100dvh;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                }

                /* ── Mobile top bar (hidden on desktop) ── */
                .appdash-topbar {
                    display: none;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.65rem 1rem;
                    background: #e4e9f0;
                    border-bottom: 2px solid #E4E4E7;
                    flex-shrink: 0;
                    z-index: 50;
                }
                .appdash-topbar__logo {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .appdash-topbar__hamburger {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    border-radius: var(--radius-xl, 1rem);
                    background: #e4e9f0;
                    border: none;
                    cursor: pointer;
                    box-shadow: 3px 3px 6px rgba(163,177,198,0.6), -3px -3px 6px rgba(255,255,255,0.8);
                    color: #2d3b4f;
                    font-size: 1.1rem;
                    flex-shrink: 0;
                }
                .appdash-topbar__hamburger:active {
                    box-shadow: inset 2px 2px 5px rgba(163,177,198,0.6), inset -2px -2px 5px rgba(255,255,255,0.8);
                }

                /* ── Overlay (mobile sidebar backdrop) ── */
                .appdash-overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.35);
                    z-index: 90;
                    backdrop-filter: blur(2px);
                }
                .appdash-overlay--visible { display: block; }

                /* ── Layout ── */
                .appdash-layout {
                    flex: 1;
                    display: flex;
                    flex-direction: row;
                    overflow: hidden;
                    min-height: 0;
                }

                /* ── Sidebar ── */
                .appdash-sidebar {
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    align-items: center;
                    width: 220px;
                    min-width: 220px;
                    height: 100%;
                    padding: 1.25rem 0.85rem 1.25rem;
                    gap: 1.75rem;
                    background: #e4e9f0;
                    border-right: 2px solid #E4E4E7;
                    overflow-y: auto;
                    overflow-x: hidden;
                    flex-shrink: 0;
                    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
                    scrollbar-width: none;
                }
                .appdash-sidebar::-webkit-scrollbar { display: none; }

                /* ── Sidebar brand / user toggle ── */
                .appdash-brand {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    border-radius: var(--radius-xl, 1rem);
                    background: #e4e9f0;
                    cursor: pointer;
                    box-shadow: 5px 5px 10px rgba(163,177,198,0.6), -5px -5px 10px rgba(255,255,255,0.8);
                    flex-shrink: 0;
                    transition: box-shadow 0.18s;
                }
                .appdash-brand:active {
                    box-shadow: inset 3px 3px 6px rgba(163,177,198,0.6), inset -3px -3px 6px rgba(255,255,255,0.8);
                }

                /* ── Nav ── */
                .appdash-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 0.65rem;
                    width: 100%;
                    flex: 1;
                }

                .appdash-nav-item {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 0.5rem;
                    text-decoration: none;
                    padding: 0.55rem 0.75rem;
                    border-radius: var(--radius-xl, 1rem);
                    color: #5a6a7e;
                    font-size: 0.85rem;
                    font-weight: 500;
                    transition: all 0.18s;
                    white-space: nowrap;
                }
                .appdash-nav-item:hover {
                    background: rgba(255,255,255,0.5);
                    color: #2d3b4f;
                }
                .appdash-nav-item.active {
                    background: #e4e9f0;
                    border: none;
                    border-radius: var(--radius-xl, 1rem);
                    color: #2d3b4f;
                    font-size: var(--text-sm, 0.875rem);
                    box-shadow: inset 4px 4px 8px rgba(163,177,198,0.6), inset -4px -4px 8px rgba(255,255,255,0.8);
                }
                .appdash-nav-item p { margin: 0; }
                .sidebar-icon { flex-shrink: 0; }

                /* ── Content zone ── */
                .appdash-content {
                    flex: 1;
                    height: 100%;
                    min-width: 0;
                    overflow: hidden;
                    position: relative;
                }

                /* ── User menu overlay ── */
                .appdash-usermenu {
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    z-index: 200;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.15);
                    backdrop-filter: blur(2px);
                }

                /* ══════════════════════════════════
                   TABLET (≤ 900px)
                   ══════════════════════════════════ */
                @media (max-width: 900px) {
                    .appdash-sidebar {
                        width: 180px;
                        min-width: 180px;
                        gap: 1.25rem;
                        padding: 1rem 0.65rem;
                    }
                    .appdash-nav-item { font-size: 0.8rem; padding: 0.5rem 0.65rem; }
                }

                /* ══════════════════════════════════
                   MOBILE (≤ 650px)
                   Sidebar becomes a slide-in drawer
                   ══════════════════════════════════ */
                @media (max-width: 650px) {
                    .appdash-topbar { display: flex; }

                    .appdash-sidebar {
                        position: fixed;
                        left: 0; top: 0;
                        height: 100dvh;
                        z-index: 100;
                        width: 240px !important;
                        min-width: 240px !important;
                        border-right: 2px solid #E4E4E7;
                        box-shadow: 4px 0 24px rgba(0,0,0,0.12);
                        transform: translateX(-100%);
                        padding-top: 1rem;
                    }
                    .appdash-sidebar--open { transform: translateX(0); }

                    /* Hide the brand toggle on desktop sidebar when on mobile
                       (we use the topbar hamburger instead) */
                    .appdash-brand { display: none; }

                    /* Mobile sidebar: show brand inside drawer header */
                    .appdash-drawer-header {
                        display: flex !important;
                        align-items: center;
                        justify-content: space-between;
                        width: 100%;
                        margin-bottom: 0.5rem;
                        padding: 0 0.25rem;
                        flex-shrink: 0;
                    }
                    .appdash-drawer-close {
                        width: 34px; height: 34px;
                        display: flex; align-items: center; justify-content: center;
                        border-radius: var(--radius-lg, 0.75rem);
                        background: #e4e9f0;
                        border: none; cursor: pointer;
                        box-shadow: 3px 3px 6px rgba(163,177,198,0.6), -3px -3px 6px rgba(255,255,255,0.8);
                        font-size: 1rem; color: #5a6a7e;
                    }
                    .appdash-drawer-close:active {
                        box-shadow: inset 2px 2px 4px rgba(163,177,198,0.6), inset -2px -2px 4px rgba(255,255,255,0.8);
                    }
                    .appdash-drawer-brand-icon {
                        display: flex; align-items: center; gap: 0.4rem;
                        color: #2d3b4f; font-weight: 600; font-size: 0.9rem;
                    }

                    .appdash-nav-item { font-size: 0.88rem; padding: 0.65rem 0.85rem; }
                }
            `}</style>

            <div className="appdash-root" data-style="neuro" data-mode="light">

                {/* ── USER MENU (modal overlay) ── */}
                {usermenu && (
                    <div className="appdash-usermenu" onClick={closeUserMenu}>
                        <div onClick={(e) => e.stopPropagation()}>
                            <UserMenu
                                onClose={closeUserMenu}
                                username={user.name}
                                userId={user.id}
                                showStatBtn={user?.owner || user?.role === 'superuser'}
                                onGoStats={() => navigate('/dashboard')}
                                onLogout={logOut}
                            />
                        </div>
                    </div>
                )}

                {/* ── MOBILE TOP BAR ── */}
                <div className="appdash-topbar">
                    <button
                        className="appdash-topbar__hamburger"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Ouvrir le menu"
                    >
                        ☰
                    </button>
                    <div className="appdash-topbar__logo">
                        <svg width="22" height="22" fill="#0b55cb" viewBox="0 0 24 24">
                            <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66Z" />
                        </svg>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2d3b4f' }}>App</span>
                    </div>
                    <button
                        className="appdash-topbar__hamburger"
                        onClick={() => { usermenu ? setUserMenu(false) : setUserMenu(true); }}
                        aria-label="Menu utilisateur"
                    >
                        <svg width="20" height="20" fill="#3f4a41" viewBox="0 0 24 24">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8Z"/>
                        </svg>
                    </button>
                </div>

                {/* ── MOBILE DRAWER OVERLAY ── */}
                <div
                    className={`appdash-overlay${sidebarOpen ? ' appdash-overlay--visible' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                />

                {/* ── LAYOUT ── */}
                <div className="appdash-layout">

                    {/* ── SIDEBAR ── */}
                    <aside className={`appdash-sidebar${sidebarOpen ? ' appdash-sidebar--open' : ''}`} data-style="neuro" data-mode="light">

                        {/* Drawer header (mobile only) */}
                        <div className="appdash-drawer-header" style={{ display: 'none' }}>
                            <div className="appdash-drawer-brand-icon">
                                <svg width="20" height="20" fill="#0b55cb" viewBox="0 0 24 24">
                                    <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66Z" />
                                </svg>
                                App
                            </div>
                            <button className="appdash-drawer-close" onClick={() => setSidebarOpen(false)}>✕</button>
                        </div>

                        {/* Brand / user toggle (desktop) */}
                        <div
                            className="appdash-brand"
                            onClick={() => { usermenu ? setUserMenu(false) : setUserMenu(true); }}
                            title="Menu utilisateur"
                        >
                            <svg width="24" height="24" fill="#3f4a41" viewBox="0 0 24 24">
                                <path d="M9.75 3H3v6.758h1.5V4.5h5.25V3Z" />
                                <path d="m22.118 9.843-6.75-3.75a.75.75 0 0 0-.75 0l-6.75 3.75a.75.75 0 0 0-.368.66v7.5a.75.75 0 0 0 .39.652l6.75 3.75a.75.75 0 0 0 .36.098.788.788 0 0 0 .368-.098l6.75-3.75a.75.75 0 0 0 .382-.652v-7.5a.749.749 0 0 0-.382-.66ZM14.25 20.478 9 17.56v-5.79l5.25 2.918v5.79ZM15 13.39l-5.205-2.887L15 7.608l5.205 2.895L15 13.39Zm6 4.17-5.25 2.918v-5.79L21 11.77v5.79Z" />
                            </svg>
                        </div>

                        {/* Nav links */}
                        <nav className="appdash-nav">
                            {permitions.formview.status && (
                                <NavLink
                                    className={({ isActive }) => `appdash-nav-item${isActive ? ' active' : ''}`}
                                    to="/app/formulaires"
                                    onClick={handleNavClick}
                                >
                                    <svg width="20" height="20" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24">
                                        <path d="M20 2H8c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2ZM8 16V4h12l.002 12H8Z" />
                                        <path d="M4 8H2v12c0 1.103.897 2 2 2h12v-2H4V8Zm11-2h-2v3h-3v2h3v3h2v-3h3V9h-3V6Z" />
                                    </svg>
                                    <p>Formulaires</p>
                                </NavLink>
                            )}

                            {permitions.dbview.status && (
                                <NavLink
                                    className={({ isActive }) => `appdash-nav-item${isActive ? ' active' : ''}`}
                                    to="/app/visualiseur-de-donnee"
                                    onClick={handleNavClick}
                                >
                                    <svg width="20" height="20" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24">
                                        <path d="M21.512 6.11 17.622 10l-3.535-3.537 3.89-3.889a6.501 6.501 0 0 0-8.485 8.486l-6.276 6.275a1 1 0 0 0 0 1.414l2.122 2.122a.998.998 0 0 0 1.414 0l6.275-6.276a6.501 6.501 0 0 0 8.485-8.485Z" />
                                    </svg>
                                    <p>Produits</p>
                                </NavLink>
                            )}

                            {permitions.settingview.status && (
                                <NavLink
                                    to="/app/charge-cashout"
                                    className={({ isActive }) => `appdash-nav-item${isActive ? ' active' : ''}`}
                                    onClick={handleNavClick}
                                >
                                    <svg width="20" height="20" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24">
                                        <path d="M12 16c2.206 0 4-1.794 4-4s-1.794-4-4-4-4 1.794-4 4 1.794 4 4 4Zm0-6c1.084 0 2 .916 2 2s-.916 2-2 2-2-.916-2-2 .916-2 2-2Z" />
                                        <path d="m2.845 16.136 1 1.73c.531.917 1.809 1.261 2.73.73l.529-.306A8.1 8.1 0 0 0 9 19.402V20c0 1.103.897 2 2 2h2c1.103 0 2-.897 2-2v-.598a8.132 8.132 0 0 0 1.896-1.111l.529.306c.923.53 2.198.188 2.731-.731l.999-1.729a2.001 2.001 0 0 0-.731-2.732l-.505-.292a7.723 7.723 0 0 0 0-2.224l.505-.292a2.002 2.002 0 0 0 .731-2.732l-.999-1.729c-.531-.92-1.808-1.265-2.731-.732l-.529.306A8.101 8.101 0 0 0 15 4.598V4c0-1.103-.897-2-2-2h-2c-1.103 0-2 .897-2 2v.598a8.132 8.132 0 0 0-1.896 1.111l-.529-.306c-.924-.531-2.2-.187-2.731.732l-.999 1.729a2.001 2.001 0 0 0 .731 2.732l.505.292a7.683 7.683 0 0 0 0 2.223l-.505.292a2.003 2.003 0 0 0-.731 2.733Z" />
                                    </svg>
                                    <p>Charges</p>
                                </NavLink>
                            )}

                            {permitions.planview.status && (
                                <NavLink
                                    className={({ isActive }) => `appdash-nav-item${isActive ? ' active' : ''}`}
                                    to="/app/abonnement"
                                    onClick={handleNavClick}
                                >
                                    <svg width="20" height="20" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24">
                                        <path d="M16 12h2v4h-2v-4Z" />
                                        <path d="M20 7V5c0-1.103-.897-2-2-2H5C3.346 3 2 4.346 2 6v12c0 2.201 1.794 3 3 3h15c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2ZM5 5h13v2H5a1.001 1.001 0 0 1 0-2Zm15 14H5.012C4.55 18.988 4 18.805 4 18V8.815c.314.113.647.185 1 .185h15v10Z" />
                                    </svg>
                                    <p>Abonnement</p>
                                </NavLink>
                            )}

                            {permitions.ownerview.status && (
                                <NavLink
                                    className={({ isActive }) => `appdash-nav-item${isActive ? ' active' : ''}`}
                                    to="/app/super-utilisateur"
                                    onClick={handleNavClick}
                                >
                                    <svg width="20" height="20" className="sidebar-icon" fill="#3f4a41" viewBox="0 0 24 24">
                                        <path d="M20.995 6.904a.997.997 0 0 0-.547-.797l-7.973-4a.997.997 0 0 0-.895-.002l-8.027 4c-.297.15-.502.437-.544.767-.013.097-1.145 9.741 8.54 15.008a.995.995 0 0 0 .97-.009c9.307-5.259 8.514-14.573 8.476-14.967Z" />
                                    </svg>
                                    <p>Super-utilisateur</p>
                                </NavLink>
                            )}

                            {/* Logout at bottom */}
                            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                <button
                                    className="appdash-nav-item"
                                    onClick={logOut}
                                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 500 }}
                                >
                                    <svg width="20" height="20" fill="#ef4444" viewBox="0 0 24 24">
                                        <path d="M16 13v-2H7V8l-5 4 5 4v-3z"/>
                                        <path d="M20 3h-9c-1.103 0-2 .897-2 2v4h2V5h9v14h-9v-4H9v4c0 1.103.897 2 2 2h9c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2z"/>
                                    </svg>
                                    <p>Déconnexion</p>
                                </button>
                            </div>
                        </nav>
                    </aside>

                    {/* ── CONTENT ── */}
                    <div className="appdash-content" data-style="neuro" data-mode="light">
                        <Outlet />
                    </div>
                </div>
            </div>
        </SubscriptionGuard>
    );
}