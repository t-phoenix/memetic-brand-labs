import React, { useState } from 'react';

const ScamAlert = () => {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    return (
        <>
            <style>
                {`
                #adpr-popup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                }

                #adpr-popup {
                    background: #fff;
                    border: 2px solid #ed1c23;
                    color: #ed1c23;
                    max-width: 600px;
                    width: 90%;
                    padding: 20px;
                    border-radius: 8px;
                    font-family: Arial, sans-serif;
                    position: relative;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
                }

                #adpr-popup h2 {
                    margin-top: 0;
                    font-size: 20px;
                    font-weight: bold;
                }

                #adpr-popup button {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    color: #ed1c23;
                    font-size: 22px;
                    cursor: pointer;
                }

                #adpr-popup p {
                    line-height: 1.5;
                    font-size: 15px;
                }

                #adpr-popup a {
                    color: #ed1c23;
                    font-weight: bold;
                }
                `}
            </style>
            <div id="adpr-popup-overlay">
                <div id="adpr-popup">
                    <button 
                        id="adpr-popup-close" 
                        aria-label="Close popup" 
                        onClick={() => setVisible(false)}
                    >
                        &times;
                    </button>
                    <h2>⚠️ Important Notice: Scam Alert</h2>
                    <p>
                        Scammers are impersonating ADPR using our name, website content, and contact details
                        to conduct fraudulent outreach on WhatsApp, Telegram, and other channels.
                    </p>
                    <p>
                        These communications are <strong>not</strong> from ADPR. We do not request money,
                        revenue shares, or participation in such schemes.
                    </p>
                    <p>
                        For your safety, please disregard such messages and report them immediately to us at
                        <a href="mailto:anand.peter@adpr.work">anand.peter@adpr.work</a>.
                    </p>
                </div>
            </div>
        </>
    );
};

export default ScamAlert;
