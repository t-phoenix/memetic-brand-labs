import React, { useState } from 'react';

const Navbar = () => {
    const [isNavCollapsed, setIsNavCollapsed] = useState(true);

    const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);

    return (
        <nav className="navbar navbar-expand-lg navbar-dark pb_navbar pb_scrolled-light scrolled awake py-3" id="pb-navbar">
            <div className="container">
                <a className="navbar-brand" href="#section-home">
                    <img className="img2" src="/assets/img/adpr_logo.png" alt="ADPR" style={{ maxHeight: '50px' }} />
                </a>
                <button
                    className="navbar-toggler"
                    type="button"
                    onClick={handleNavCollapse}
                    aria-controls="probootstrap-navbar"
                    aria-expanded={!isNavCollapsed}
                    aria-label="Toggle navigation"
                >
                    <span><i className="ion-navicon"></i></span>
                </button>
                <div className={`${isNavCollapsed ? 'collapse' : ''} navbar-collapse`} id="probootstrap-navbar">
                    <ul className="navbar-nav ms-auto">
                        <li className="nav-item"><a className="nav-link" href="#section-services" onClick={() => setIsNavCollapsed(true)}>Services</a></li>
                        <li className="nav-item"><a className="nav-link" href="#section-about" onClick={() => setIsNavCollapsed(true)}>About</a></li>
                        <li className="nav-item"><a className="nav-link" href="#section-perspective" onClick={() => setIsNavCollapsed(true)}>Perspective</a></li>
                        <li className="nav-item"><a className="nav-link" href="#section-contact" onClick={() => setIsNavCollapsed(true)}>Contact</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
