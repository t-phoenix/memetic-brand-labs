import React from 'react';

const Perspective = () => {
    return (
        <section className="pb_section pb_section_v1" data-section="about" id="section-perspective">
            <div className="container">
                <div className="row">
                    <div className="col-lg-6 pr-md-6 pr-sm-0">
                    </div>
                    <div className="col-lg-6 white_bg">
                        <h2 className="mt-0 heading-border-top mb-3 font-weight-bold">Perspective</h2>
                        <p>What the new age entrepreneurs can learn from age-old professions..</p>

                        {/* Original looked like it had img_1 here. If it was distinct from fisherman, keep it. If it was fisherman, use it. */}
                        <div className="images">
                            <img src="/assets/img/adpr_perspective.png" alt="ADPR Perspective" className="img-fluid mb-4" />
                        </div>

                        <p>#tobepublishedsoon #fisherman #hunter #shepherd #perspective #patience #bold #courage #skill</p>

                        <h3 className="headline font-weight-bold" style={{ lineHeight: '30px' }}>Lessons from <br />#1 A Fisherman</h3>
                        <br />
                        <div className="row">
                            <div className="col-md-12 col-sm-12 text-center">
                                <video autoPlay loop muted playsInline className="img-fluid mb-4">
                                    <source src="/assets/video/adpr_fisherman.mp4" type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                            <div className="col-md-12 col-sm-12">
                                <p>Do age-old professions like fishing have anything to teach new-age entrepreneurs? They do! Having the
                                    guts to set sail, the importance of doing your research so that you don’t get stuck in unpopulated
                                    waters and squally weather, the benefits of patience and perseverance, and the lurking dangers like
                                    sharks and changing conditions that can stymie the best-laid plans.</p>
                                <p>#perspective #skills #work #perseverance #entrepreneurs #fishing #lessons #learn #patience #risktaking
                                    #setting #sail #belief #totheunknown #calculative #risk #rough #sea #wait #grit #determination</p>
                            </div>
                        </div>

                        <h3 className="headline font-weight-bold" style={{ lineHeight: '30px' }}>#2 A Shepherd</h3>
                        <br />
                        <div className="row">
                            <div className="col-md-12 col-sm-12 text-center">
                                <video autoPlay loop muted playsInline className="img-fluid mb-4">
                                    <source src="/assets/video/adpr_farmer.mp4" type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                            <div className="col-md-12 col-sm-12">
                                <p>Do age-old professions like sheepherding have anything to teach new-age entrepreneurs? They do! Knowing
                                    the pastures as well as the flock, continuously observing and learning, filing away nuggets of
                                    information for future use, caring about each member of the flock (and showing it), teaming up with an
                                    efficient partner whose skills complement your own, always being alert, adaptable and able to avoid
                                    threats, counter attacks and exploit opportunities.</p>
                                <p>#leadership #serve #alert #adaptable #observation #perspective #skills #work #perseverance
                                    #entrepreneurs #lessons #learn #patience #risktaking #risk #grit #determination #guidance #sheepherding
                                    #shepherd #leadandserve</p>
                            </div>
                        </div>

                        <h3 className="headline font-weight-bold" style={{ lineHeight: '30px' }}>#3 An Explorer</h3>
                        <br />
                        <div className="row">
                            <div className="col-md-12 col-sm-12 text-center">
                                <video autoPlay loop muted playsInline className="img-fluid mb-4">
                                    <source src="/assets/video/adpr_explorer.mp4" type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                            <div className="col-md-12 col-sm-12">
                                <p>Exploration has never been more popular than today. An Explorer is somebody who makes risky and
                                    difficult journeys to achieve the impossible. Driven by curiosity and willpower.</p>
                                <p>#perspective #skills #entrepreneurs #explore #unfamiliar #area #aggressively #enterprising #deal #new
                                    #difficult #situations #challenges #willpower #gogetters #bold #dare #courageous</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Perspective;
