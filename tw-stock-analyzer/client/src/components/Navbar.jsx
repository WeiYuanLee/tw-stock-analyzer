import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { DevAd } from './AdSense';
import { shouldShowAds } from '../config/ads';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showHeaderAd, setShowHeaderAd] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // 檢查是否為付費會員
  const membershipLevel = user?.membershipLevel || user?.membership_level || 'free';
  const showAds = shouldShowAds(membershipLevel);

  return (
    <div>
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-primary-600">台股分析</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    儀表板
                  </Link>
                  <Link 
                    to="/analysis" 
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    股票分析
                  </Link>
                  <Link 
                    to="/ai" 
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    AI 助手
                  </Link>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {user?.name || user?.email}
                    </span>
                    {user?.membershipLevel !== 'free' && (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                        {user.membershipLevel.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary text-sm"
                  >
                    登出
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    登入
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-sm"
                  >
                    註冊
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Header Banner Ad - Only for free members */}
      {isAuthenticated && showAds && showHeaderAd && (
        <div className="bg-gray-50 dark:bg-gray-900 py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
            <DevAd position="header" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;
