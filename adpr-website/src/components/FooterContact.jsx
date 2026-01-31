import React from 'react';

export const Contact = () => {
    return (
        <section className="pb_section pb_section_v1" data-section="about" id="section-contact">
            <div className="container">
                <div className="row">
                    <div className="col-lg-6 pr-md-6 pr-sm-0">
                    </div>
                    <div className="col-lg-6 white_bg">
                        <h5><a href="https://www.designrush.com/agency/profile/adpr-pte-ltd" target="_blank" rel="noopener noreferrer">Adpr DesignRush Profile</a></h5>
                        <br /><br /><br /><br />
                        <h2 className="mt-0 heading-border-top mb-3 font-weight-normal">Contact</h2>
                        {/* Empty paragraphs from original */}
                        <p></p>
                        <p></p>
                        <p></p>
                        <ul className="pb_contact_details_v1">
                            <li>
                                <span className="text-uppercase">Phone</span>
                                +65 91754770 / +91 9844436538
                            </li>
                            <li>
                                <span className="text-uppercase">Email</span>
                                <a href="mailto:anand.peter@adpr.work">anand.peter@adpr.work</a>
                            </li>
                            <li>
                                <span className="text-uppercase">Website</span>
                                www.adpr.work
                            </li>
                            <li>
                                Adpr Pte. Ltd.<br />65 Chulia St, #46-00 OCBC Centre<br />Singapore 049513
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};

export const Footer = () => {
    return (
        <footer className="pb_footer bg-light" role="contentinfo">
            <div className="container">
                <div className="row text-center">
                    <div className="col">
                        <ul className="list-inline">
                            <li className="list-inline-item"><a href="https://www.instagram.com/adpr_sg/" target="_blank" className="p-2"><i className="fa fa-instagram"></i></a></li>
                            <li className="list-inline-item"><a href="https://twitter.com/@AnandPeter" target="_blank" className="p-2"><i className="fa fa-twitter"></i></a></li>
                            <li className="list-inline-item"><a href="https://www.linkedin.com/in/anand-peter-916b863/" target="_blank" className="p-2"><i className="fa fa-linkedin"></i></a></li>
                            <li className="list-inline-item"><a href="https://www.behance.net/adpr142" target="_blank" className="p-2"><i className="fa fa-behance"></i></a></li>
                        </ul>
                    </div>
                </div>
                <div className="row">
                    <div className="col text-center">
                        <p className="pb_font-14">© 2024. All Rights Reserved.</p>
                        <a className="pb_font-14" href="https://adpr.work/privacy-policy.html">Privacy Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
