import { useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar({ className = "navbar" }) {
    const location = useLocation();
    const navigate = useNavigate();

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
                <a href="#home" className="navbar-logo" onClick={(e) => handleNavClick(e, 'home')}>
                    <span className="logo-adpr">adpr</span>
                    <span className="logo-memetics">Memetic<br />Brand<br />Labs</span>
                </a>

                <div className="navbar-links">
                    <a href="#home" onClick={(e) => handleNavClick(e, 'home')}>home</a>
                    <a href="#works" onClick={(e) => handleNavClick(e, 'works')}>works</a>
                    <a href="#about" onClick={(e) => handleNavClick(e, 'about')}>about us</a>
                    <a href="https://adpr.work" target="_blank" rel="noopener noreferrer">adpr</a>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
