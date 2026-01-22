import './Hero.css';
import sunGlasses from '../assets/graphics/Adpr Memetic Brand Labs_Sun 1.svg';
import thumbsUp from '../assets/graphics/Adpr Memetic Brand Labs_Thums Up-.svg';
import hand from '../assets/graphics/Adpr Memetic Brand Labs_Hand 1.svg';
import text from '../assets/graphics/Adpr Memetic Brand Labs_Logo 1.png';

function Hero() {
    return (
        <section className="hero">
            <div className="hero-container">
                <div className="hero-content">
                    {/* Left side - Text */}
                    <div className='hero-left'>
                        <img src={text} alt="adpr Memetics Brand Labs" className="hero-text" />
                        <p className="hero-tagline">A new initiative from <span>adpr</span></p>
                    </div>

                    {/* Right side - Graphics */}
                    <div className="hero-right">
                        <div className="character-container">
                            <img src={sunGlasses} alt="Cool sun character" className="sun-character" />
                            <img src={thumbsUp} alt="" className="thumbs-up" />
                            <img src={hand} alt="" className="hand-pointer" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Hero;
