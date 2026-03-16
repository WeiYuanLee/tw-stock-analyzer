import React, { useState, useEffect } from 'react';
import { useAuthStore, useWatchlistStore, useBookmarksStore } from '../store';
import { subscriptionAPI } from '../services/api';
import { DevAd } from '../components/AdSense';

function Dashboard() {
  const { user } = useAuthStore();
  const { watchlist, fetchWatchlist, addStock, removeStock } = useWatchlistStore();
  const { bookmarks, fetchBookmarks, createBookmark, deleteBookmark } = useBookmarksStore();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [newStockCode, setNewStockCode] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchWatchlist();
    fetchBookmarks();
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await subscriptionAPI.getStatus();
      setSubscription(response.data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!newStockCode.trim()) return;
    
    const result = await addStock(newStockCode);
    if (result.success) {
      setNewStockCode('');
      setMessage('股票已新增');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(result.error);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleUpgrade = async (plan) => {
    try {
      const response = await subscriptionAPI.upgrade(plan);
      setSubscription(response.data);
      setMessage(`已成功升級為 ${plan === 'pro' ? 'Pro' : 'VIP'} 會員`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error?.message || '升級失敗');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCreateBookmark = async (e) => {
    e.preventDefault();
    if (!newBookmarkName.trim()) return;
    
    // Demo bookmark with sample filters
    const result = await createBookmark(newBookmarkName, { price: '>50', volume: '>1000' });
    if (result.success) {
      setNewBookmarkName('');
      setMessage('書籤已建立');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const membershipLevel = user?.membershipLevel || 'free';
  const isPaidMember = membershipLevel !== 'free';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {message && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-lg">
          {message}
        </div>
      )}

      {/* Membership Banner */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              歡迎回來，{user?.name || user?.email}！
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              目前方案：{' '}
              <span className={`font-semibold ${isPaidMember ? 'text-yellow-600' : 'text-gray-600'}`}>
                {membershipLevel === 'free' ? '免費會員' : membershipLevel.toUpperCase() + ' 會員'}
              </span>
              {subscription?.daysRemaining && (
                <span className="ml-2">（剩餘 {subscription.daysRemaining} 天）</span>
              )}
            </p>
          </div>
          
          {!isPaidMember && (
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={() => handleUpgrade('pro')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                升級 Pro (NT$199)
              </button>
              <button
                onClick={() => handleUpgrade('vip')}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                升級 VIP (NT$399)
              </button>
            </div>
          )}
        </div>

        {/* Ad Banner - Only for free members */}
        {!isPaidMember && (
          <div className="mt-6">
            <DevAd position="content" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'watchlist', 'bookmarks', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'overview' && '總覽'}
              {tab === 'watchlist' && '自選股'}
              {tab === 'bookmarks' && '書籤'}
              {tab === 'settings' && '設定'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-4 gap-6">
          {/* Main Content - 3 columns */}
          <div className="md:col-span-3 space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">自選股</h3>
                <p className="text-3xl font-bold text-primary-600">{watchlist.length}</p>
                <p className="text-gray-500 text-sm mt-1">檔股票</p>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">書籤</h3>
                <p className="text-3xl font-bold text-primary-600">{bookmarks.length}</p>
                <p className="text-gray-500 text-sm mt-1">個篩選條件</p>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">會員狀態</h3>
                <p className={`text-3xl font-bold ${isPaidMember ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {membershipLevel === 'free' ? '免費' : membershipLevel.toUpperCase()}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {isPaidMember ? '完整功能' : '基本功能'}
                </p>
              </div>
            </div>

            {/* Content Ad between sections */}
            {!isPaidMember && (
              <DevAd position="content" />
            )}
          </div>

          {/* Sidebar - 1 column for ads */}
          {!isPaidMember && (
            <div className="md:col-span-1">
              <div className="sticky top-4">
                <DevAd position="sidebar" />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'watchlist' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">我的自選股</h3>
          
          {/* Add Stock Form */}
          <form onSubmit={handleAddStock} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newStockCode}
              onChange={(e) => setNewStockCode(e.target.value.toUpperCase())}
              placeholder="輸入股票代碼 (如: 2330)"
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary">
              新增
            </button>
          </form>

          {/* Watchlist */}
          {watchlist.length === 0 ? (
            <p className="text-gray-500 text-center py-8">尚無自選股</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {watchlist.map((stock) => (
                <li key={stock.id} className="py-3 flex items-center justify-between">
                  <span className="font-medium">{stock.stockCode}</span>
                  <button
                    onClick={() => removeStock(stock.stockCode)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Content Ad between watchlist and bookmarks */}
      {activeTab !== 'overview' && !isPaidMember && (
        <div className="my-6">
          <DevAd position="content" />
        </div>
      )}

      {activeTab === 'bookmarks' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">我的書籤</h3>
          
          {/* Add Bookmark Form */}
          <form onSubmit={handleCreateBookmark} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newBookmarkName}
              onChange={(e) => setNewBookmarkName(e.target.value)}
              placeholder="輸入書籤名稱"
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary">
              新增
            </button>
          </form>

          {/* Bookmarks */}
          {bookmarks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">尚無書籤</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {bookmarks.map((bookmark) => (
                <li key={bookmark.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{bookmark.name}</span>
                    <p className="text-xs text-gray-500">
                      {JSON.stringify(bookmark.filters)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteBookmark(bookmark.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'settings' && !isPaidMember && (
        <div className="my-6">
          <DevAd position="content" />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">個人設定</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                名稱
              </label>
              <input
                type="text"
                defaultValue={user?.name || ''}
                className="input-field"
                id="nameInput"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                className="input-field bg-gray-100 dark:bg-gray-700"
                disabled
              />
            </div>
            <button
              onClick={() => {
                const name = document.getElementById('nameInput').value;
                useAuthStore.getState().updateProfile({ name });
                setMessage('個人資料已更新');
                setTimeout(() => setMessage(''), 3000);
              }}
              className="btn-primary"
            >
              儲存變更
            </button>
          </div>

          {/* Change Password Section */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-semibold mb-4">變更密碼</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  當前密碼
                </label>
                <input
                  type="password"
                  className="input-field"
                  id="currentPassword"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  新密碼
                </label>
                <input
                  type="password"
                  className="input-field"
                  id="newPassword"
                />
              </div>
              <button
                onClick={async () => {
                  const current = document.getElementById('currentPassword').value;
                  const newPass = document.getElementById('newPassword').value;
                  const result = await useAuthStore.getState().changePassword(current, newPass);
                  if (result.success) {
                    setMessage('密碼已更新');
                    document.getElementById('currentPassword').value = '';
                    document.getElementById('newPassword').value = '';
                  } else {
                    setMessage(result.error);
                  }
                  setTimeout(() => setMessage(''), 3000);
                }}
                className="btn-secondary"
              >
                變更密碼
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
