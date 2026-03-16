import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminStore } from '../store/adminStore';
import { adminService } from '../services/adminService';

function AdminDashboard() {
  const navigate = useNavigate();
  const { admin, isAuthenticated, logout } = useAdminStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin');
      return;
    }

    const fetchDashboard = async () => {
      try {
        const dashboardData = await adminService.getDashboard();
        setData(dashboardData);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">載入中...</div>
      </div>
    );
  }

  const { stats = {}, monthlyRevenue = [], recentOrders = [] } = data || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                後台管理系統
              </h1>
              <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                歡迎, {admin?.name || admin?.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              to="/admin/dashboard"
              className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600 dark:text-blue-400"
            >
              儀表板
            </Link>
            <Link
              to="/admin/users"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              會員管理
            </Link>
            <Link
              to="/admin/orders"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              訂單管理
            </Link>
            <Link
              to="/admin/subscriptions"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              訂閱管理
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">總會員數</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.totalUsers || 0}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              活躍會員: {stats.activeUsers || 0}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">付費會員</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.paidMembers || 0}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              活躍訂閱: {stats.activeSubscriptions || 0}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">本月訂單</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.thisMonthOrders || 0}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              總訂單: {stats.totalOrders || 0}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">本月營收</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              ${(stats.thisMonthRevenue || 0).toLocaleString()}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              總營收: ${(stats.totalRevenue || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            月度營收趨勢
          </h2>
          <div className="h-64 flex items-end justify-between space-x-2">
            {monthlyRevenue.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{
                    height: `${Math.max(10, (item.revenue / Math.max(...monthlyRevenue.map(m => m.revenue), 1)) * 100)}%`,
                    minHeight: '10px'
                  }}
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {item.month.slice(5)}
                </div>
                <div className="text-xs font-medium text-gray-900 dark:text-white">
                  ${(item.revenue / 1000).toFixed(1)}k
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              最近訂單
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    訂單編號
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    用戶
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    方案
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    日期
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {order.orderNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.plan.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${order.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'paid' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('zh-TW')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
