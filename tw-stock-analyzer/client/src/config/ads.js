/**
 * 廣告系統配置
 * 用於管理 AdSense 廣告單元和開關
 */

export const adConfig = {
  // Google AdSense 發布商 ID
  publisherId: 'ca-pub-XXXXXXXXXX',

  // 廣告單元配置
  adUnits: {
    header: {
      id: 'header_banner',
      name: '頁首橫幅',
      size: { width: 728, height: 90 },
    },
    sidebar: {
      id: 'sidebar_ad',
      name: '側邊欄',
      size: { width: 300, height: 600 },
    },
    content: {
      id: 'content_ad',
      name: '內容區塊',
      size: { width: 728, height: 250 },
    },
  },

  // 廣告開關
  // 開發環境設為 false，生產環境設為 true
  enabled: false, // 開發模式使用 DevAd 組件

  // 測試廣告單元（用於測試）
  testAdUnits: {
    header: '1234567890',
    sidebar: '1234567891',
    content: '1234567892',
  },
};

/**
 * 檢查是否應顯示廣告
 * @param {string|undefined} membershipLevel - 用戶會員等級
 * @returns {boolean} 是否顯示廣告
 */
export function shouldShowAds(membershipLevel) {
  // 免費會員顯示廣告
  const level = membershipLevel?.toLowerCase() || 'free';
  return level === 'free';
}

/**
 * 取得會員等級顯示名稱
 * @param {string|undefined} membershipLevel - 用戶會員等級
 * @returns {string} 等級顯示名稱
 */
export function getMembershipDisplayName(membershipLevel) {
  const level = membershipLevel?.toLowerCase() || 'free';
  switch (level) {
    case 'pro':
      return 'Pro 專業版';
    case 'vip':
      return 'VIP 尊榮版';
    default:
      return '免費會員';
  }
}
