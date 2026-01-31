import { useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Services from './components/Services'
import About from './components/About'
import Perspective from './components/Perspective'
import { Contact, Footer } from './components/FooterContact'

import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
    return (
        <div className="App">
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
