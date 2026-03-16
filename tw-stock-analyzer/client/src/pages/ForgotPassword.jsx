import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      await authAPI.forgotPassword(email);
      setStatus('success');
      setMessage('如果帳號存在，您將收到密碼重設郵件');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error?.message || '發生錯誤');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            忘記密碼
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            輸入您的 Email，我們會寄送密碼重設連結
          </p>
        </div>

        <div className="card">
          {status === 'success' ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <p className="text-green-600 dark:text-green-400 mb-6">{message}</p>
              <Link to="/login" className="btn-primary">
                返回登入
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {status === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? '寄送中...' : '寄送重設連結'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              返回登入
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
