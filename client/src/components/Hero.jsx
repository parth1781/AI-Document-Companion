import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Hammer, ArrowRight, Zap } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="hero-container-new">
      <div className="hero-bg-glow"></div>
      <div className="hero-grid-overlay"></div>
      
      <div className="hero-content-split">
        {/* Left Text Content */}
        <div className="hero-text-side">
          {/* <div className="badge">
            <Zap size={14} color="#5e6ad2" />
            <span>Platform v2.0 is live</span>
          </div> */}
          <h1 className="hero-title-new">
            Supercharge your tech workspace <span className="text-gradient">with AI.</span>
          </h1>
          <p className="hero-subtitle-new">
            An intelligent study suite, multi-agent forum, and architectural builder unified in one premium ecosystem. Connect your tools and learn masterfully.
          </p>
          
          <div className="hero-cta-group">
            <button className="btn btn-primary btn-large" onClick={() => navigate('/login')}>
              Start Learning <ArrowRight size={18} style={{ marginLeft: '6px' }} />
            </button>
            <button className="btn btn-outline btn-large" onClick={() => navigate('/builder')}>
              Explore Builder
            </button>
          </div>
          
          <div className="hero-features-mini">
            <div className="feature-item" onClick={() => navigate('/study')}><BookOpen size={16} /> Document AI</div>
            <div className="feature-item" onClick={() => navigate('/forum')}><Users size={16} /> Personas</div>
            <div className="feature-item" onClick={() => navigate('/builder')}><Hammer size={16} /> Architecture</div>
          </div>
        </div>

        {/* Right Visual Content */}
        <div className="hero-visual-side">
          <div className="mock-ui-wrapper">
            {/* Background overlapping card */}
            <div className="mock-card mock-card-back">
              <div className="mock-header">
                <div className="mock-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
              <div className="mock-body">
                <div className="mock-line" style={{ width: '80%' }}></div>
                <div className="mock-line" style={{ width: '60%' }}></div>
                <div className="mock-line" style={{ width: '90%' }}></div>
              </div>
            </div>
            
            {/* Foreground card */}
            <div className="mock-card mock-card-front">
              <div className="mock-sidebar">
                <div className="mock-circle"></div>
                <div className="mock-sidebar-line"></div>
                <div className="mock-sidebar-line"></div>
                <div className="mock-sidebar-line"></div>
              </div>
              <div className="mock-main">
                <div className="mock-chat-bubble ai"></div>
                <div className="mock-chat-bubble user"></div>
                <div className="mock-image-block"></div>
                <div className="mock-input-box"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
