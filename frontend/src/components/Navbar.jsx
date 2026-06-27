import { useLocation, useNavigate, Link } from 'react-router-dom';
import { neDiscoveryEnabled } from '../lib/featureFlags';
import './Navbar.css';

function Navbar({ className = "navbar" }) {
    const location = useLocation();
    const navigate = useNavigate();
    const isNeRoute = location.pathname.startsWith('/narrative-engine') || location.pathname.startsWith('/results');

    const handleNavClick = (e, sectionId) => {
        e.preventDefault();
        if (location.pathname === '/' || location.pathname === '') {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
                window.history.pushState(null, '', `#${sectionId}`);
            }
        } else {
            navigate('/', { state: { scrollTo: sectionId } });
        }
    };

    return (
        <nav className={className}>
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    <span className="logo-adpr">adpr</span>
                    <span className="logo-memetics">Memetic<br />Brand<br />Labs</span>
                </Link>

                <div className="navbar-links">
                    <a href="#home" onClick={(e) => handleNavClick(e, 'home')}>home</a>
                    <a href="#works" onClick={(e) => handleNavClick(e, 'works')}>works</a>
                    <a href="#about" onClick={(e) => handleNavClick(e, 'about')}>about us</a>
                    {/* {neDiscoveryEnabled && (
                        <Link to="/narrative-engine" className={isNeRoute ? 'navbar-link--active' : ''}>
                            narrative engine
                        </Link>
                    )} */}
                    <a href="https://adpr.work" target="_blank" rel="noopener noreferrer">adpr</a>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
