import React, { useEffect, useRef } from 'react';
import { init, use } from 'echarts/core';
import { BarChart, FunnelChart, GraphChart, LineChart, PieChart, RadarChart, ScatterChart } from 'echarts/charts';
import { GridComponent, LegendComponent, RadarComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  BarChart,
  FunnelChart,
  GraphChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
  RadarComponent,
  CanvasRenderer,
]);

interface EChartComponentProps {
  options: any;
  className?: string;
  onEvents?: Record<string, (params: any) => void>;
}

export const EChartComponent: React.FC<EChartComponentProps> = ({
  options,
  className = 'chart-box',
  onEvents
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = init(chartRef.current, 'dark', {
        renderer: 'canvas',
      });
    }

    if (options) {
      const mergedOptions = {
        backgroundColor: 'transparent',
        ...options,
      };
      instanceRef.current.setOption(mergedOptions, true);
    }

    if (onEvents && instanceRef.current) {
      Object.entries(onEvents).forEach(([eventName, handler]) => {
        instanceRef.current?.off(eventName);
        instanceRef.current?.on(eventName, handler);
      });
    }

    const handleResize = () => {
      instanceRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => {
      instanceRef.current?.resize();
    });
    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, [options, onEvents]);

  return <div ref={chartRef} className={className} />;
};

export default EChartComponent;
