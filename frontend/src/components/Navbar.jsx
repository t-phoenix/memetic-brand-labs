import './Navbar.css';

function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-logo">
                    <span className="logo-adpr">adpr</span>
                    <span className="logo-memetics">Memetics<br />Brand<br />Labs</span>
                </div>

                <div className="navbar-links">
                    <a href="#home">home</a>
                    <a href="#works">works</a>
                    <a href="#about">about us</a>
                    <a href="#adpr">adpr</a>
                </div>

                {/* <button className="navbar-menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button> */}
            </div>
        </nav>
    );
}

export default Navbar;
