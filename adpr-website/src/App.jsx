import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Services from './components/Services'
import About from './components/About'
import Perspective from './components/Perspective'
import { Contact, Footer } from './components/FooterContact'
import PrivacyPolicy from './components/PrivacyPolicy'
import ScamAlert from './components/ScamAlert'

import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
    const [currentPath, setCurrentPath] = useState(window.location.hash);

    useEffect(() => {
        const handleHashChange = () => {
            setCurrentPath(window.location.hash);
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    if (currentPath === '#/privacy') {
        return (
            <div className="App">
                <Navbar />
                <PrivacyPolicy />
                <Footer />
            </div>
        );
    }

    return (
        <div className="App">
            <ScamAlert />
            <Navbar />
            <Hero />
            <Services />
            <About />
            <Perspective />
            <Contact />
            <Footer />
        </div>
    )
}

export default App
