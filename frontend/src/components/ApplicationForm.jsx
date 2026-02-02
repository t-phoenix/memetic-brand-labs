import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from './Navbar';
import './ApplicationForm.css';

// Graphics
import handshakePink from '../assets/graphics/Adpr Memetic Brand Labs_Shake hand 1.png';
import handshakeYellow from '../assets/graphics/Adpr Memetic Brand Labs_Shake hand 2.png';
import sun from '../assets/graphics/Adpr Memetic Brand Labs_Sun 1.png';
import thumbsUp from '../assets/graphics/Adpr Memetic Brand Labs_Thums Up-.png'; // Using the exact filename found
import yellowArrow from '../assets/graphics/Adpr Memetic Brand Labs_Yellow_Arrow.png';
import adprFooterLogo from '../assets/graphics/Adpr Memetic Brand Labs_adpr Logo.svg';

const ApplicationForm = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const step = parseInt(searchParams.get('step') || '1', 10);

    const [formData, setFormData] = useState(() => {
        const saved = localStorage.getItem('applicationFormData');
        return saved ? JSON.parse(saved) : {
            firstName: '',
            lastName: '',
            email: '',
            project: '',
            audience: '',
            challenge: ''
        };
    });

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
        document.body.style.overflow = 'auto';
    }, []);

    // Persist form data
    useEffect(() => {
        localStorage.setItem('applicationFormData', JSON.stringify(formData));
    }, [formData]);

    // Handle Step 3 Timeout
    useEffect(() => {
        if (step === 3) {
            const timer = setTimeout(() => {
                navigate('/');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [step, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleNext = () => {
        setSearchParams({ step: 2 });
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    // REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
    const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

    const handleSubmit = async () => {
        if (!formData.project || !formData.email) {
            alert("Please fill in the required fields.");
            return;
        }

        setIsSubmitting(true);

        try {
            // We use 'no-cors' mode or text/plain content type to play nice with Google Apps Script CORS
            // 'text/plain' prevents the browser from sending an OPTIONS preflight request which GAS doesn't handle
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
            });

            // Note: With Google Apps Script, the response might be opaque if there are redirects, 
            // but usually it works fine if we just check execution.
            // If you face CORS errors, the data usually still gets recorded.

            console.log('Form Submitted to Sheets');
        } catch (error) {
            console.error('Error submitting form:', error);
            // Optionally handle error (alert user), but often we proceed to 'Thank You' to not block the user
        } finally {
            setIsSubmitting(false);
            setSearchParams({ step: 3 });
        }
    };

    return (
        <div className={`application-form-page step-${step}`}>
            <Navbar className={`navbar visible step-${step}-nav`} />

            <div className="form-content-wrapper">
                {step === 1 && (
                    <div className="form-container step-1 fade-in">
                        <div className="left-panel">
                            <h1 className="title-yellow">Hello!<br />Welcome</h1>
                            <div className="handshake-container">
                                <img src={handshakePink} alt="Handshake" className="handshake-pink" />
                            </div>
                        </div>
                        <div className="right-panel">
                            <div className="input-group">
                                <input type="text" name="firstName" placeholder="First Name |" value={formData.firstName} onChange={handleChange} className="input-field" />
                                <input type="text" name="lastName" placeholder="Second Name |" value={formData.lastName} onChange={handleChange} className="input-field" />
                                <input type="email" name="email" placeholder="Mail Id |" value={formData.email} onChange={handleChange} className="input-field" />
                            </div>
                            <div className="next-action" onClick={handleNext}>
                                <span className="secure-text">Secure your spot</span>
                                <div className="arrow-btn-img">
                                    <img src={yellowArrow} alt="Next" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="form-container step-2 fade-in">
                        <div className="left-panel">
                            <h1 className="title-blue">Secure<br />your spot</h1>
                            <div className="handshake-container">
                                <img src={handshakeYellow} alt="Handshake" className="handshake-yellow" />
                            </div>
                        </div>
                        <div className="right-panel">
                            <p className="instruction">Fill in the application,<br />so we understand you more.</p>
                            <div className="input-group">
                                <input type="text" name="project" placeholder="What you're building |" value={formData.project} onChange={handleChange} className="input-field" />
                                <input type="text" name="audience" placeholder="who it's for (target audience) |" value={formData.audience} onChange={handleChange} className="input-field" />
                                <input type="text" name="challenge" placeholder="your current brand or adoption challenge |" value={formData.challenge} onChange={handleChange} className="input-field" />
                            </div>
                            <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'SENDING...' : 'SUBMIT'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="form-container step-3 fade-in">
                        <div className="thank-you-content">
                            <div className="sun-wrapper">
                                <img src={sun} alt="Sun" className="sun-icon" />
                            </div>
                            <div className="thumbs-row">
                                <div className="thumb-left">
                                    <img src={thumbsUp} alt="Thumbs Up" />
                                </div>
                                <div className="thank-you-text">
                                    <h1>Thank You</h1>
                                    <p>Our team will get back to you soon.</p>
                                </div>
                                <div className="thumb-right">
                                    <img src={thumbsUp} alt="Thumbs Up" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Footer for Step 3, or always? Image shows mainly on Step 3. Let's make it conditional or style it per step. */}
            <div className={`footer-bar ${step === 3 ? 'active' : ''}`}>
                <div className="footer-content">
                    <img src={adprFooterLogo} alt="adpr" className="footer-logo-img" />
                </div>
            </div>
        </div>
    );
};

export default ApplicationForm;
