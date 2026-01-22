import './WhoThisIsFor.css';
import finger1 from '../assets/graphics/Adpr Memetic Brand Labs_Pointing finger 1.svg';
import finger2 from '../assets/graphics/Adpr Memetic Brand Labs_Pointing finger 2.svg';
import bulletIcon from '../assets/graphics/Adpr Memetic Brand Labs_Icon 4.svg';

function WhoThisIsFor() {
    const listItems = [
        "Web3, DeFi, AI & on-chain startups",
        "Protocols, infra, privacy, security, payments",
        "Founders preparing for launch, growth, or repositioning"
    ];

    return (
        <section className="who-this-is-for" id="who-this-is-for">
            <div className="container">
                <div className="who-content-wrapper">
                    <div className="who-left">
                        <div className="who-title-container">
                            <img src={finger1} alt="" className="finger finger-top" />
                            <h2 className="who-title">
                                <span className="who-text">Who</span>
                                <span className="this-is-for-text">This Is For</span>
                            </h2>
                            <img src={finger2} alt="" className="finger finger-bottom" />
                        </div>
                    </div>

                    <div className="who-right">
                        <h3 className="who-subtitle">Built for teams who are serious about adoption.</h3>
                        <ul className="who-list">
                            {listItems.map((item, index) => (
                                <li key={index} className="who-list-item">
                                    <img src={bulletIcon} alt="" className="who-bullet" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="who-footer-text">
                            This is for builders who want their ideas to <br />
                            <span className="highlight-text">become culture, not just content.</span>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default WhoThisIsFor;
