import heroLogoSun from '../assets/graphics/figma-v2/hero-logo-sun.png';
import mobileSun from '../assets/graphics/figma-v2/mobile-hero-sun.svg';
import mobileHand from '../assets/graphics/figma-v2/mobile-hero-hand.svg';
import mobileThumb from '../assets/graphics/figma-v2/mobile-hero-thumb.svg';
import mobileLogo from '../assets/graphics/figma-v2/mobile-hero-logo.svg';
import './Hero.css';

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero__splash">
        <img className="hero__brand-art" src={heroLogoSun} alt="adpr Memetic Brand Labs" />
      </div>
      <div className="hero__mobile-art" aria-label="adpr Memetic Brand Labs">
        <img className="hero__mobile-sun" src={mobileSun} alt="" />
        <img className="hero__mobile-hand" src={mobileHand} alt="" />
        <img className="hero__mobile-thumb" src={mobileThumb} alt="" />
        <img className="hero__mobile-logo" src={mobileLogo} alt="" />
        <p>
          A new initiative from <strong>adpr</strong>
        </p>
      </div>
    </section>
  );
}

export default Hero;
