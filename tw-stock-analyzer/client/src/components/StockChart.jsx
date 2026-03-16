import React, { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';

export function StockChart({ data, height = 400 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const ma5SeriesRef = useRef(null);
  const ma10SeriesRef = useRef(null);
  const ma20SeriesRef = useRef(null);
  const ma60SeriesRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#d1d5db',
      },
      rightPriceScale: {
        borderColor: '#d1d5db',
      },
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#93c5fd',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Add MA lines
    const ma5Series = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    ma5SeriesRef.current = ma5Series;

    const ma10Series = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    ma10SeriesRef.current = ma10Series;

    const ma20Series = chart.addLineSeries({
      color: '#06b6d4',
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    ma20SeriesRef.current = ma20Series;

    const ma60Series = chart.addLineSeries({
      color: '#ec4899',
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    ma60SeriesRef.current = ma60Series;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]);

  // Update data when it changes
  useEffect(() => {
    if (!data || data.length === 0) return;
    if (!candlestickSeriesRef.current) return;

    // Process candlestick data
    const candleData = data.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candlestickSeriesRef.current.setData(candleData);

    // Process volume data
    const volumeData = data.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));
    volumeSeriesRef.current.setData(volumeData);

    // Calculate and set MA
    if (data.length >= 5) {
      const ma5Data = calculateMA(data, 5);
      ma5SeriesRef.current.setData(ma5Data);
    }
    if (data.length >= 10) {
      const ma10Data = calculateMA(data, 10);
      ma10SeriesRef.current.setData(ma10Data);
    }
    if (data.length >= 20) {
      const ma20Data = calculateMA(data, 20);
      ma20SeriesRef.current.setData(ma20Data);
    }
    if (data.length >= 60) {
      const ma60Data = calculateMA(data, 60);
      ma60SeriesRef.current.setData(ma60Data);
    }

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [data]);

  return (
    <div ref={chartContainerRef} className="w-full" />
  );
}

// Helper function to calculate moving average
function calculateMA(data, period) {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({
      time: data[i].time,
      value: sum / period,
    });
  }
  return result;
}

export default StockChart;
