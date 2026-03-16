import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('密碼與確認密碼不一致');
      return;
    }

    if (password.length < 6) {
      setStatus('error');
      setMessage('密碼至少需要 6 個字元');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      await authAPI.resetPassword({ password, token });
      setStatus('success');
      setMessage('密碼重設成功！');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error?.message || '重設失敗');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            重設密碼
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            輸入您的新密碼
          </p>
        </div>

        <div className="card">
          {status === 'success' ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-green-600 dark:text-green-400 mb-6">{message}</p>
              <Link to="/login" className="btn-primary">
                前往登入
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
                  新密碼
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="至少 6 個字元"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  確認密碼
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="再次輸入新密碼"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? '處理中...' : '重設密碼'}
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

export default ResetPassword;
