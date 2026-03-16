import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export function RSIChart({ data, period = 14, height = 150 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const rsiSeriesRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      crosshair: {
        mode: 0,
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

    const rsiSeries = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      priceLineVisible: false,
    });
    rsiSeriesRef.current = rsiSeries;

    // Add overbought/oversold lines
    chart.addLineSeries({
      color: 'rgba(239, 68, 68, 0.5)',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    }).setData(data.map(d => ({ time: d.time, value: 70 })));

    chart.addLineSeries({
      color: 'rgba(34, 197, 94, 0.5)',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    }).setData(data.map(d => ({ time: d.time, value: 30 })));

    chart.addLineSeries({
      color: 'rgba(100, 100, 100, 0.3)',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    }).setData(data.map(d => ({ time: d.time, value: 50 })));

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

  useEffect(() => {
    if (!data || data.length === 0 || !rsiSeriesRef.current) return;

    const rsiData = calculateRSI(data, period);
    rsiSeriesRef.current.setData(rsiData);
    chartRef.current?.timeScale().fitContent();
  }, [data, period]);

  return (
    <div ref={chartContainerRef} className="w-full" />
  );
}

// Calculate RSI
function calculateRSI(data, period = 14) {
  if (data.length < period + 1) return [];

  const rsiData = [];
  let gains = 0;
  let losses = 0;

  // First RSI
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    rsiData.push({
      time: data[i].time,
      value: rsi,
    });
  }

  return rsiData;
}

export function MACDChart({ data, height = 150 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const macdSeriesRef = useRef(null);
  const signalSeriesRef = useRef(null);
  const histogramSeriesRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      crosshair: {
        mode: 0,
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

    // MACD line
    const macdSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      priceLineVisible: false,
    });
    macdSeriesRef.current = macdSeries;

    // Signal line
    const signalSeries = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 2,
      priceLineVisible: false,
    });
    signalSeriesRef.current = signalSeries;

    // Histogram
    const histogramSeries = chart.addHistogramSeries({
      color: '#22c55e',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'macd',
    });
    histogramSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0,
        bottom: 0,
      },
    });
    histogramSeriesRef.current = histogramSeries;

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

  useEffect(() => {
    if (!data || data.length === 0) return;

    const { macdLine, signalLine, histogram } = calculateMACD(data);

    if (macdSeriesRef.current) {
      macdSeriesRef.current.setData(macdLine);
    }
    if (signalSeriesRef.current) {
      signalSeriesRef.current.setData(signalLine);
    }
    if (histogramSeriesRef.current) {
      histogramSeriesRef.current.setData(histogram);
    }
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div ref={chartContainerRef} className="w-full" />
  );
}

// Calculate MACD
function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (data.length < slowPeriod) return { macdLine: [], signalLine: [], histogram: [] };

  // Calculate EMAs
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // MACD Line
  const macdLine = [];
  for (let i = 0; i < slowEMA.length; i++) {
    const fastIndex = i + (slowPeriod - fastPeriod);
    if (fastIndex < fastEMA.length) {
      macdLine.push({
        time: slowEMA[i].time,
        value: fastEMA[fastIndex].value - slowEMA[i].value,
      });
    }
  }

  // Signal Line (EMA of MACD)
  const signalLine = [];
  let prevSignal = null;
  for (let i = 0; i < macdLine.length; i++) {
    if (i === 0) {
      signalLine.push({ time: macdLine[i].time, value: macdLine[i].value });
      prevSignal = macdLine[i].value;
    } else {
      const signal = (prevSignal * (signalPeriod - 1) + macdLine[i].value) / signalPeriod;
      signalLine.push({ time: macdLine[i].time, value: signal });
      prevSignal = signal;
    }
  }

  // Histogram
  const histogram = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (i < signalLine.length) {
      histogram.push({
        time: macdLine[i].time,
        value: macdLine[i].value - signalLine[i].value,
        color: macdLine[i].value >= signalLine[i].value ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)',
      });
    }
  }

  return { macdLine, signalLine, histogram };
}

function calculateEMA(data, period) {
  if (data.length < period) return [];
  
  const result = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA starts with SMA (Simple Moving Average) of first 'period' prices
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  
  // Add SMA as first EMA value
  result.push({
    time: data[period - 1].time,
    value: ema,
  });
  
  // Calculate EMA from period onwards
  for (let i = period; i < data.length; i++) {
    // Correct EMA formula: EMA_today = (Close_today - EMA_yesterday) * multiplier + EMA_yesterday
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({
      time: data[i].time,
      value: ema,
    });
  }

  return result;
}

export default { RSIChart, MACDChart };
