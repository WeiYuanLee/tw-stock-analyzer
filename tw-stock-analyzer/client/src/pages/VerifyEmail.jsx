import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage('Email 驗證成功！');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.error?.message || '驗證失敗');
      }
    };

    if (token) {
      verify();
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">驗證中...</p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              驗證成功
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <Link to="/dashboard" className="btn-primary">
              前往儀表板
            </Link>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              驗證失敗
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <Link to="/login" className="btn-primary">
              返回登入
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
