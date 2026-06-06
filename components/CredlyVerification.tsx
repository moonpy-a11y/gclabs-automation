
import React, { useState } from 'react';
import { CredlyProfile } from '../types';

interface Props {
  onVerified: (profile: CredlyProfile) => void;
}

const CredlyVerification: React.FC<Props> = ({ onVerified }) => {
  const [profileUrl, setProfileUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    setLoading(true);
    // Simulated Credly API Check for +10 badges requirement
    setTimeout(() => {
      const mockProfile: CredlyProfile = {
        name: "Cloud Expert User",
        badgeCount: 12,
        isVerified: true
      };
      onVerified(mockProfile);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg mx-auto mt-20 border border-blue-100">
      <div className="flex items-center justify-center mb-6">
        <div className="bg-blue-600 p-3 rounded-full">
           <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Advanced User Verification</h2>
      <p className="text-gray-600 text-center mb-6">
        This tool is exclusive to advanced users with 10+ Google Cloud accomplishments.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Credly Profile URL</label>
          <input 
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="https://www.credly.com/users/your-name"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
          />
        </div>
        <button 
          onClick={handleVerify}
          disabled={loading || !profileUrl}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex justify-center items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying Credentials...
            </>
          ) : 'Verify & Enter'}
        </button>
      </div>
      <p className="mt-4 text-xs text-center text-gray-400 italic">
        Requires: 10+ Badges including "Google Cloud Professional" certifications.
      </p>
    </div>
  );
};

export default CredlyVerification;
