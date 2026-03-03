import React, { useEffect, useRef } from 'react';
import './AdBanner.css';

/**
 * AdBanner — non-invasive Google AdSense banner
 *
 * Replace PUBLISHER_ID and SLOT_ID with your actual values from
 * https://www.google.com/adsense/
 *
 * Set VITE_ADSENSE_PUBLISHER_ID and VITE_ADSENSE_SLOT_* in your
 * environment / .env file.
 */

const PUBLISHER_ID = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || 'ca-pub-XXXXXXXXXXXXXXXXX';

export default function AdBanner({ slot, format = 'auto', label = 'Advertisement' }) {
  const adRef  = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      }
    } catch (e) {
      // AdSense not loaded — development mode or ad blocker
    }
  }, []);

  // Don't render in development without a real publisher ID
  if (PUBLISHER_ID === 'ca-pub-XXXXXXXXXXXXXXXXX' && import.meta.env.DEV) {
    return (
      <div className="ad-banner-container ad-banner--placeholder" role="complementary" aria-label="Advertisement placeholder">
        <div className="ad-banner__placeholder-inner">
          <span className="ad-label">{label}</span>
          <div className="ad-banner__placeholder-box">
            <span>AdSense Banner</span>
            <span className="ad-banner__placeholder-hint">Configure VITE_ADSENSE_PUBLISHER_ID</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-banner-container" role="complementary" aria-label={label}>
      <div className="ad-banner__inner">
        <span className="ad-label">{label}</span>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={PUBLISHER_ID}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
