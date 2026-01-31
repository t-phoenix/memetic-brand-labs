import React from 'react';

const Hero = () => {
    return (
        <section className="pb_cover_v1 text-left" id="section-home">
            <div className="container">
                <div className="row align-items-center justify-content-end">
                    <div className="col-md-12">
                        <p className="mb-12 sub-heading" style={{ fontSize: '1.4rem', marginBottom: '1.6rem', fontWeight: '500' }}>
                            ADPR is named for the twin pillars of brand building and communications:
                            advertising and public relations. <br /> Whatever the channel, whoever the audience, and with the addition of
                            innovative web3 creative services, <br />ADPR puts these disciplines to work for you.
                        </p>
                        <div>
                            <p style={{ textAlign: 'center', paddingTop: '30px', color: '#aeaeaeff', fontSize: '1.2rem' }}>Connect with us</p>
                            <ul className="list-inline" style={{ textAlign: 'center' }}>
                                <li className="list-inline-item"><a href="https://www.instagram.com/adpr_sg/" target="_blank" className="p-2"><i className="fa fa-instagram"></i></a></li>
                                <li className="list-inline-item"><a href="https://twitter.com/@AnandPeter" target="_blank" className="p-2"><i className="fa fa-twitter"></i></a></li>
                                <li className="list-inline-item"><a href="https://www.linkedin.com/in/anand-peter-916b863/" target="_blank" className="p-2"><i className="fa fa-linkedin"></i></a></li>
                                <li className="list-inline-item"><a href="https://www.behance.net/adpr142" target="_blank" className="p-2"><i className="fa fa-behance"></i></a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
