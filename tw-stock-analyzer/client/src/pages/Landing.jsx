import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              台股智能分析系統
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8">
              專業技術分析工具，助您做出更好的投資決策
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                to="/register"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                免費註冊
              </Link>
              <Link
                to="/login"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                登入
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              功能特色
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              為不同需求的投資人打造
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Feature */}
            <div className="card text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">基本篩選</h3>
              <p className="text-gray-600 dark:text-gray-400">
                簡易篩選條件，快速找到符合條件的股票
              </p>
              <div className="mt-4 text-sm text-gray-500">免費</div>
            </div>

            {/* Pro Feature */}
            <div className="card text-center border-2 border-primary-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary-500 text-white px-3 py-1 text-sm rounded-full">
                熱門
              </div>
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pro 專業版</h3>
              <p className="text-gray-600 dark:text-gray-400">
                法人籌碼分析、無廣告體驗、進階篩選
              </p>
              <div className="mt-4 text-sm text-primary-600 font-semibold">NT$199/月</div>
            </div>

            {/* VIP Feature */}
            <div className="card text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👑</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">VIP 尊榮版</h3>
              <p className="text-gray-600 dark:text-gray-400">
                獨家選股策略、Line/Discord 通知提醒
              </p>
              <div className="mt-4 text-sm text-yellow-600 font-semibold">NT$399/月</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            準備好提升您的投資體驗了嗎？
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            立即註冊，免費使用基本功能
          </p>
          <Link
            to="/register"
            className="btn-primary inline-block px-8 py-3"
          >
            開始使用
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>© 2026 台股分析系統. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
