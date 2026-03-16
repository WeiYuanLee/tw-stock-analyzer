import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { adConfig, shouldShowAds } from '../config/ads';

/**
 * AdSense 廣告組件
 * - 免費會員顯示廣告
 * - Pro/VIP 會員隱藏廣告
 * - 支援多種廣告格式
 */
function AdSense({ position = 'content', className = '' }) {
  const { user } = useAuthStore();
  const [adUnitId, setAdUnitId] = useState('');
  const [isReady, setIsReady] = useState(false);

  // 檢查會員等級
  const membershipLevel = user?.membershipLevel || user?.membership_level || 'free';
  const showAds = shouldShowAds(membershipLevel);

  // 付費會員不顯示廣告
  if (!showAds || !adConfig.enabled) {
    return null;
  }

  // 根據位置設定廣告單元 ID
  useEffect(() => {
    setAdUnitId(adConfig.adUnits[position]?.id || adConfig.adUnits.content.id);
  }, [position]);

  // 載入 AdSense 腳本
  useEffect(() => {
    // 如果已經載入 AdSense，跳過
    if (window.adsbygoogle) {
      setIsReady(true);
      return;
    }

    // 建立 AdSense 腳本
    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adConfig.publisherId}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      setIsReady(true);
    };

    document.head.appendChild(script);

    return () => {
      // 清理腳本（可選）
    };
  }, []);

  // 根據位置渲染不同樣式的廣告容器
  const getAdContainerStyle = () => {
    switch (position) {
      case 'header':
        return 'w-full h-[90px] flex items-center justify-center';
      case 'sidebar':
        return 'w-full h-[600px] flex items-center justify-center';
      case 'content':
      default:
        return 'w-full h-[250px] flex items-center justify-center my-6';
    }
  };

  const getAdClassName = () => {
    switch (position) {
      case 'header':
        return 'adsense-header';
      case 'sidebar':
        return 'adsense-sidebar';
      case 'content':
      default:
        return 'adsense-content';
    }
  };

  return (
    <div className={`adsense-container ${className}`}>
      <div className={getAdContainerStyle()}>
        <ins
          className={`adsbygoogle ${getAdClassName()}`}
          style={{
            display: 'block',
            ...(position === 'sidebar' ? { width: '300px', height: '600px' } : {}),
            ...(position === 'header' ? { width: '728px', height: '90px' } : {}),
            ...(position === 'content' ? { width: '728px', height: '250px' } : {}),
          }}
          data-ad-client={adConfig.publisherId}
          data-ad-slot={adConfig.testAdUnits[position] || adUnitId}
          data-ad-format={position === 'sidebar' ? 'vertical' : 'auto'}
          data-full-width-responsive="true"
        />
        {isReady && window.adsbygoogle && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  (adsbygoogle = window.adsbygoogle || []).push({});
                } catch (e) {
                  console.error('AdSense error:', e);
                }
              `,
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 頁首橫幅廣告
 */
export function HeaderAd() {
  return <AdSense position="header" />;
}

/**
 * 側邊欄廣告
 */
export function SidebarAd({ className = '' }) {
  return (
    <div className={`sidebar-ad ${className}`}>
      <AdSense position="sidebar" />
    </div>
  );
}

/**
 * 內容區塊廣告
 */
export function ContentAd({ className = '' }) {
  return (
    <div className={`content-ad ${className}`}>
      <AdSense position="content" />
    </div>
  );
}

/**
 * 開發用廣告（顯示廣告框但不載入實際廣告）
 */
export function DevAd({ position = 'content', className = '' }) {
  const { user } = useAuthStore();
  const membershipLevel = user?.membershipLevel || user?.membership_level || 'free';
  const showAds = shouldShowAds(membershipLevel);

  if (!showAds) {
    return null;
  }

  const getDimensions = () => {
    switch (position) {
      case 'header':
        return { width: 728, height: 90 };
      case 'sidebar':
        return { width: 300, height: 600 };
      case 'content':
      default:
        return { width: 728, height: 250 };
    }
  };

  const { width, height } = getDimensions();

  return (
    <div className={`dev-ad-container ${className}`}>
      <div
        className="bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <p className="text-lg font-semibold">廣告區域</p>
          <p className="text-sm">
            {position === 'header' && '728 x 90 橫幅廣告'}
            {position === 'sidebar' && '300 x 600 側邊欄廣告'}
            {position === 'content' && '728 x 250 內容廣告'}
          </p>
          <p className="text-xs mt-2 text-gray-400">升級 Pro/VIP 移除廣告</p>
        </div>
      </div>
    </div>
  );
}

export default AdSense;
