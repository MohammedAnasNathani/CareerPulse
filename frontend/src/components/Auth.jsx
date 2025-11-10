import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Eye, EyeOff, Sparkles, TrendingUp, Users, Zap } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Auth({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    headline: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isSignup ? '/auth/signup' : '/auth/login';
      const response = await axios.post(`${API}${endpoint}`, formData);
      
      onLogin(response.data.token, response.data.user);
      toast.success(isSignup ? 'Welcome to CareerPulse!' : 'Welcome back!', {
        description: 'Your professional journey continues'
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eef3 100%)' }}>
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)' }}>
              <Sparkles size={20} />
              <span className="text-sm font-semibold">Professional Network</span>
            </div>
            
            <h1 className="text-5xl font-bold mt-8 mb-6 leading-tight">
              Your Career,<br />
              <span style={{ opacity: 0.9 }}>Amplified</span>
            </h1>
            
            <p className="text-xl mb-12" style={{ opacity: 0.95, lineHeight: 1.7 }}>
              Connect with professionals, share your journey, and unlock opportunities that matter.
            </p>
            
            <div className="space-y-6">
              {[
                { icon: Users, text: 'Connect with industry leaders', delay: '0.2s' },
                { icon: TrendingUp, text: 'Showcase your achievements', delay: '0.3s' },
                { icon: Zap, text: 'Discover career opportunities', delay: '0.4s' }
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-4 fade-in"
                  style={{ animationDelay: item.delay }}
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
                    <item.icon size={24} />
                  </div>
                  <span className="text-lg" style={{ opacity: 0.95 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 fade-in" data-testid="auth-title">
            <h2 className="text-4xl font-bold mb-2" style={{ color: '#1a202c' }}>
              {isSignup ? 'Join CareerPulse' : 'Welcome Back'}
            </h2>
            <p className="text-base" style={{ color: '#718096' }}>
              {isSignup ? 'Start building your professional network' : 'Continue your professional journey'}
            </p>
          </div>

          <div className="premium-card p-8 fade-in" data-testid="auth-form-container">
            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignup && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#2d3748' }} htmlFor="name">
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="input-field"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      data-testid="auth-name-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#2d3748' }} htmlFor="headline">
                      Professional Headline
                    </label>
                    <input
                      id="headline"
                      name="headline"
                      type="text"
                      className="input-field"
                      placeholder="Software Engineer at Tech Corp"
                      value={formData.headline}
                      onChange={handleChange}
                      data-testid="auth-headline-input"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#2d3748' }} htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input-field"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  data-testid="auth-email-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#2d3748' }} htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input-field pr-12"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    data-testid="auth-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#718096' }}
                    data-testid="auth-toggle-password"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-6"
                style={{ padding: '0.875rem' }}
                data-testid="auth-submit-button"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  isSignup ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="font-medium text-sm"
                style={{ color: '#0a66c2' }}
                data-testid="auth-toggle-mode"
              >
                {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Join now"}
              </button>
            </div>
          </div>
          
          <p className="text-center text-xs mt-6" style={{ color: '#a0aec0' }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}