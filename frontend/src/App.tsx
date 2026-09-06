import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Icon from './components/Icon';
import Header from './components/Header';
import Sidebar, { NavItem } from './components/Sidebar';
import FlowControlStepper from './components/FlowControlStepper';
import WorkspaceHomeView from './views/WorkspaceHomeView';
import ExecutiveDashboardView from './views/ExecutiveDashboardView';
import WhatIfAndForecastView from './views/WhatIfAndForecastView';
import SpatialGestureStudioView from './views/SpatialGestureStudioView';
import StoryDeckView from './views/StoryDeckView';
import MongoModal from './components/MongoModal';
import OneLakeModal from './components/OneLakeModal';
import SQLStudioModal from './components/SQLStudioModal';
import IntroModal from './components/IntroModal';
import AboutModal from './components/AboutModal';
import ShareModal from './components/ShareModal';
import SecurityModal from './components/SecurityModal';
import {
  DescriptiveStatisticsLabView,
  DataCleaningLabView,
  RelationshipsLabView,
  AnomalyLabView,
  DatasetExplorerGridView,
  AIAnalystView,
} from './views/AnalyticsLabs';
import * as api from './services/api';

const STUDIO_NAV_ITEMS: NavItem[] = [
  { id: 'workspace_home', label: 'Workspace Home', icon: 'home', badge: 'Hub' },
  { id: 'dashboard', label: 'Executive Dashboard', icon: 'layout-dashboard', badge: 'Primary' },
  { id: 'descriptive_stats', label: 'Descriptive Statistics Lab', icon: 'binary', badge: 'Exploratory' },
  { id: 'data_cleaning', label: 'Data Cleaning & Wrangling Lab', icon: 'wrench', badge: 'Transform' },
  { id: 'what_if', label: 'What-If & Forecasting', icon: 'trending-up', badge: 'Simulation' },
  { id: 'spatial_gestures', label: 'Spatial Gesture Studio', icon: 'move', badge: 'Figma' },
  { id: 'anomalies', label: 'Anomaly & Outlier Lab', icon: 'alert-triangle', badge: 'Audit' },
  { id: 'relationships', label: 'Relationship & Correlation Map', icon: 'network' },
  { id: 'explorer', label: 'Dataset Explorer Grid', icon: 'table' },
  { id: 'chat', label: 'Artificial Intelligence Analyst', icon: 'message-square' },
];

const DEFAULT_WHAT_IF_PARAMS = {
  price_change_pct: 0,
  volume_change_pct: 0,
  discount_change_pct: 0,
  cost_change_pct: 0,
};

export const App: React.FC = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('workspace_home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isPresentation, setIsPresentation] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshToast, setRefreshToast] = useState<string | null>(null);

  // Authentication & Security State
  const [currentUser, setCurrentUser] = useState<any>({
    name: 'Private Browser Session',
    role: 'Session User',
    provider: 'Temporary Session'
  });
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [sharedDatasetInfo, setSharedDatasetInfo] = useState<any>(null);

  // Modals Integration State
  const [mongoStatus, setMongoStatus] = useState<any>(null);
  const [showMongoModal, setShowMongoModal] = useState<boolean>(false);
  const [showOneLakeModal, setShowOneLakeModal] = useState<boolean>(false);
  const [showSQLModal, setShowSQLModal] = useState<boolean>(false);
  const [showIntroModal, setShowIntroModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);

  // Analytical State & DuckDB Execution Telemetry
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const filePickerRef = useRef<HTMLInputElement | null>(null);
  const [slicers, setSlicers] = useState<Record<string, any>>({});
  const [statsData, setStatsData] = useState<any>(null);
  const [correlationData, setCorrelationData] = useState<any>(null);
  const [anomalyData, setAnomalyData] = useState<any>(null);
  const [explorerData, setExplorerData] = useState<{ rows: any[]; columns: string[] }>({ rows: [], columns: [] });
  const [cleaningStatus, setCleaningStatus] = useState<string | null>(null);
  const [storyData, setStoryData] = useState<any>(null);
  const [storyLoading, setStoryLoading] = useState<boolean>(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  // What-If & Forecasting State
  const [whatIfParams, setWhatIfParams] = useState(DEFAULT_WHAT_IF_PARAMS);
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [whatIfLoading, setWhatIfLoading] = useState<boolean>(false);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastPeriods, setForecastPeriods] = useState<number>(6);

  // Custom Charts State
  const [customCharts, setCustomCharts] = useState<any[]>([]);
  const [showCustomChartModal, setShowCustomChartModal] = useState<boolean>(false);
  const [newChartType, setNewChartType] = useState<string>('bar');
  const [newChartDimension, setNewChartDimension] = useState<string>('');
  const [newChartMetric, setNewChartMetric] = useState<string>('');
  const [newChartTitle, setNewChartTitle] = useState<string>('');

  // AI Analyst Chat State
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant';
    text: string;
    sql?: string;
    followups?: string[];
    provider?: string;
    duration_ms?: number;
  }>>([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Business Analyst powered by DuckDB In-Memory OLAP and Google Gemini reasoning. Ask me any analytical question or click a suggested starter below.',
      followups: [
        '📊 Summarize this dataset',
        '🏆 What are the top 5 performers?',
        '💡 How can I increase profits?',
        '📈 Show monthly performance trend'
      ]
    },
  ]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const dashboardCacheRef = useRef<Record<string, any>>({});
  const whatIfCacheRef = useRef<Record<string, any>>({});
  const forecastCacheRef = useRef<Record<string, any>>({});
  const dashboardRequestRef = useRef<Record<string, boolean>>({});
  const whatIfRequestRef = useRef<Record<string, boolean>>({});
  const forecastRequestRef = useRef<Record<string, boolean>>({});

  // Load initial datasets list
  const loadDatasets = useCallback(async () => {
    try {
      const data = await api.fetchDatasets();
      const list = data.datasets || [];
      setDatasets(list);
      if (list.length > 0 && !activeDatasetId) {
        setActiveDatasetId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  }, [activeDatasetId]);

  const loadStory = useCallback(async (id: string) => {
    if (!id) return;
    setStoryLoading(true);
    setStoryError(null);
    try {
      const data = await api.generateStory(id);
      setStoryData(data);
    } catch (err: any) {
      setStoryError(err.message || 'Unable to generate the story deck.');
    } finally {
      setStoryLoading(false);
    }
  }, []);

  const exportStory = useCallback(async () => {
    if (!activeDatasetId) return;
    try {
      const blob = await api.exportStory(activeDatasetId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `InsightAI_Story_${activeDatasetId}.md`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setStoryError(err.message || 'Unable to export the story deck.');
    }
  }, [activeDatasetId]);

  const loadMongoStatus = useCallback(async () => {
    try {
      const data = await api.fetchMongoStatus();
      setMongoStatus(data);
    } catch (err) {
      console.error('Failed to load MongoDB status:', err);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.logoutUser();
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      api.cleanupBrowserSession();
      setDatasets([]);
      setActiveDatasetId('');
      setDashboardData(null);
      setWhatIfResult(null);
      setForecastData(null);
      setRefreshToast('Private browser session closed.');
      setTimeout(() => setRefreshToast(null), 3500);
    }
  };

  // Check URL for ?share= token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('share');
    if (token) {
      api.setActiveShareToken(token);
      api.getShareInfo(token)
        .then((info) => {
          setSharedDatasetInfo(info);
          if (info.dataset_id) {
            setActiveDatasetId(info.dataset_id);
          }
        })
        .catch((err) => {
          console.warn('Share token notice:', err);
        });
    }
  }, []);

  useEffect(() => {
    loadDatasets();
    loadMongoStatus();
  }, [loadDatasets, loadMongoStatus]);

  // Active dataset metadata
  const activeDataset = useMemo(() => datasets.find((d) => d.id === activeDatasetId), [datasets, activeDatasetId]);
  const datasetMeta = useMemo(() => activeDataset ? {
    name: activeDataset.name,
    domain: activeDataset.domain || 'Financial Services & Banking',
    rows: activeDataset.rows_count || 150,
    columns: activeDataset.columns_count || 12,
  } : null, [activeDataset]);

  // Load dashboard
  const loadDashboard = useCallback(async (id: string, currentSlicers = slicers) => {
    if (!id) return;
    const slicerKey = JSON.stringify(currentSlicers || {});
    const cacheKey = `${id}:${slicerKey}`;
    const cached = dashboardCacheRef.current[cacheKey];

    if (cached) {
      setDashboardData(cached);
      setDashboardLoading(false);
      return cached;
    }

    if (dashboardRequestRef.current[cacheKey]) {
      return null;
    }

    dashboardRequestRef.current[cacheKey] = true;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await api.fetchDashboard(id, currentSlicers);
      dashboardCacheRef.current[cacheKey] = data;
      setDashboardData(data);
      return data;
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setDashboardError(err.message || 'Failed to compute dashboard analytics');
      throw err;
    } finally {
      delete dashboardRequestRef.current[cacheKey];
      setDashboardLoading(false);
    }
  }, [slicers]);

  // Load What-If
  const loadWhatIf = useCallback(async (id: string, params = whatIfParams) => {
    if (!id) return;
    const paramKey = JSON.stringify(params || {});
    const cacheKey = `${id}:${paramKey}`;
    const cached = whatIfCacheRef.current[cacheKey];

    if (cached) {
      setWhatIfResult(cached);
      setWhatIfLoading(false);
      return cached;
    }

    if (whatIfRequestRef.current[cacheKey]) {
      return null;
    }

    whatIfRequestRef.current[cacheKey] = true;
    setWhatIfLoading(true);
    setWhatIfError(null);
    try {
      const data = await api.simulateWhatIf(id, params);
      whatIfCacheRef.current[cacheKey] = data;
      setWhatIfResult(data);
      return data;
    } catch (err: any) {
      setWhatIfError(err.message);
      throw err;
    } finally {
      delete whatIfRequestRef.current[cacheKey];
      setWhatIfLoading(false);
    }
  }, [whatIfParams]);

  // Load Forecast
  const loadForecast = useCallback(async (id: string, periods = forecastPeriods) => {
    if (!id) return;
    const cacheKey = `${id}:${periods}`;
    const cached = forecastCacheRef.current[cacheKey];

    if (cached) {
      setForecastData(cached);
      setForecastLoading(false);
      return cached;
    }

    if (forecastRequestRef.current[cacheKey]) {
      return null;
    }

    forecastRequestRef.current[cacheKey] = true;
    setForecastLoading(true);
    setForecastError(null);
    try {
      const data = await api.generateForecast(id, periods);
      forecastCacheRef.current[cacheKey] = data;
      setForecastData(data);
      return data;
    } catch (err: any) {
      setForecastError(err.message);
      throw err;
    } finally {
      delete forecastRequestRef.current[cacheKey];
      setForecastLoading(false);
    }
  }, [forecastPeriods]);

  // Tab lazy loader
  useEffect(() => {
    if (!activeDatasetId) return;

    if (activeTab === 'dashboard') {
      if ((!dashboardData || dashboardData.dataset_id !== activeDatasetId) && !dashboardLoading) {
        loadDashboard(activeDatasetId);
      }
    } else if (activeTab === 'what_if' && !whatIfResult && !whatIfLoading) {
      loadWhatIf(activeDatasetId);
      loadForecast(activeDatasetId);
    } else if (activeTab === 'descriptive_stats' && !statsData) {
      api.fetchDescriptiveStats(activeDatasetId).then(setStatsData).catch(console.error);
    } else if (activeTab === 'relationships' && !correlationData) {
      api.fetchCorrelationMatrix(activeDatasetId).then(setCorrelationData).catch(console.error);
    } else if (activeTab === 'anomalies' && !anomalyData) {
      api.fetchAnomalies(activeDatasetId).then(setAnomalyData).catch(console.error);
    } else if (activeTab === 'explorer' && explorerData.rows.length === 0) {
      api.fetchExplorerRows(activeDatasetId).then(data => {
        const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.rows) ? data.rows : []);
        const columns = Array.isArray(data?.columns) ? data.columns : [];
        setExplorerData({ rows, columns });
      }).catch(console.error);
    } else if (activeTab === 'story_deck' && !storyData && !storyLoading) {
      loadStory(activeDatasetId);
    }
  }, [activeTab, activeDatasetId, dashboardData, dashboardLoading, whatIfResult, whatIfLoading, statsData, correlationData, anomalyData, explorerData.rows.length, storyData, storyLoading, loadDashboard, loadWhatIf, loadForecast, loadStory]);

  // Universal Refresh
  const handleUniversalRefresh = async () => {
    setRefreshing(true);
    setRefreshToast(null);
    try {
      if (activeDatasetId) {
        await Promise.all([
          loadDashboard(activeDatasetId),
          activeTab === 'what_if' ? loadWhatIf(activeDatasetId) : Promise.resolve(),
          activeTab === 'what_if' ? loadForecast(activeDatasetId) : Promise.resolve(),
          activeTab === 'descriptive_stats' ? api.fetchDescriptiveStats(activeDatasetId).then(setStatsData) : Promise.resolve(),
          activeTab === 'relationships' ? api.fetchCorrelationMatrix(activeDatasetId).then(setCorrelationData) : Promise.resolve(),
          activeTab === 'anomalies' ? api.fetchAnomalies(activeDatasetId).then(setAnomalyData) : Promise.resolve(),
          activeTab === 'explorer' ? api.fetchExplorerRows(activeDatasetId).then(data => setExplorerData({ rows: data.rows || [], columns: data.columns || [] })) : Promise.resolve(),
        ]);
      }
      await loadDatasets();
      setRefreshToast('DuckDB cache invalidated. Analytics refreshed successfully.');
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = window.setTimeout(() => setRefreshToast(null), 3500);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Upload dataset
  const handleUploadFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await api.uploadDataset(file);
      await loadDatasets();
      if (res.dataset_id) {
        setActiveDatasetId(res.dataset_id);
        setDashboardData(null);
        const measures = res.summary?.measures || [];
        const dimensions = res.summary?.dimensions || [];
        const timeColumn = res.summary?.temporal_columns?.[0];
        const suggestions = [
          'Summarize this dataset',
          measures[0] && dimensions[0] ? `Show ${measures[0]} by ${dimensions[0]}` : 'Show the most important patterns',
          timeColumn && measures[0] ? `Show ${measures[0]} over time` : 'Find unusual values',
          measures.length > 1 ? `Compare ${measures[0]} and ${measures[1]}` : 'What should I investigate first?',
        ].filter(Boolean) as string[];
        setChatMessages((prev) => [...prev, {
          role: 'assistant',
          text: `Your dataset is ready. I found ${res.summary?.total_rows?.toLocaleString?.() || 'the'} rows in the ${res.summary?.domain || 'analytics'} domain. I can explain the data in plain language, find trends, compare groups, identify unusual patterns, and suggest what to investigate next. Choose a question below or ask me naturally.`,
          followups: suggestions,
          provider: 'InsightAI Personal Assistant',
        }]);
        setActiveTab('dashboard');
        loadDashboard(res.dataset_id);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Delete dataset
  const handleDeleteDataset = async (id: string) => {
    try {
      await api.deleteDataset(id);
      await loadDatasets();
      if (activeDatasetId === id) {
        setActiveDatasetId('');
        setActiveTab('workspace_home');
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Sample data loader (Power BI Desktop Learn with sample data)
  const handleLoadSampleData = async (domain: string = 'finance') => {
    setUploading(true);
    try {
      const res = await api.loadSampleDataset(domain);
      await loadDatasets();
      if (res.dataset_id) {
        setActiveDatasetId(res.dataset_id);
        setDashboardData(null);
        setActiveTab('dashboard');
        loadDashboard(res.dataset_id);
      }
      setRefreshToast(`Sample dataset for ${domain.toUpperCase()} loaded into DuckDB cache.`);
      setTimeout(() => setRefreshToast(null), 3500);
    } catch (err: any) {
      alert(`Sample data error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Start Blank Report
  const handleStartBlankReport = async () => {
    if (!activeDatasetId && datasets.length === 0) {
      await handleLoadSampleData();
    }
    setActiveTab('dashboard');
    if (activeDatasetId) {
      loadDashboard(activeDatasetId);
    }
  };

  // Safe tab navigation with dataset bootstrap
  const handleNavigateTab = async (tabId: string) => {
    if (!activeDatasetId) {
      if (datasets.length > 0) {
        setActiveDatasetId(datasets[0].id);
        loadDashboard(datasets[0].id);
      } else {
        await handleLoadSampleData('finance');
      }
    }
    setActiveTab(tabId);
  };


  // Slicer changes
  const handleSlicerChange = (column: string, val: any) => {
    const updated = { ...slicers, [column]: val };
    if (val === null) delete updated[column];
    setSlicers(updated);
    if (activeDatasetId) {
      loadDashboard(activeDatasetId, updated);
    }
  };

  const handleResetSlicers = () => {
    setSlicers({});
    if (activeDatasetId) {
      loadDashboard(activeDatasetId, {});
    }
  };

  // Chat message submit
  const handleSendChatMessage = async (text: string) => {
    if (!activeDatasetId) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Select or upload a dataset before asking the analyst a question.' },
      ]);
      return;
    }

    setChatMessages((prev) => [...prev, { role: 'user', text }]);
    setChatLoading(true);
    try {
      const res = await api.askAIAnalyst(activeDatasetId, text);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer || res.text || 'Analysis complete.',
          sql: res.sql,
          followups: res.suggested_followups,
          provider: res.provider,
          duration_ms: res.execution_duration_ms
        },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Query could not be executed: ${err.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Create custom chart
  const handleCreateCustomChart = async () => {
    if (!newChartDimension || !newChartMetric) {
      alert('Please select both a dimension and a metric.');
      return;
    }
    const chartTitle = newChartTitle.trim() || `${newChartMetric} by ${newChartDimension}`;
    try {
      const chart = await api.buildCustomChart({
        dataset_id: activeDatasetId,
        dimension: newChartDimension,
        measure: newChartMetric,
        chart_type: newChartType,
        title: chartTitle,
      });
      setCustomCharts((prev) => [...prev, { title: chart.title, options: chart.options }]);
      setShowCustomChartModal(false);
      setNewChartTitle('');
    } catch (err: any) {
      alert(`Chart could not be built: ${err.message}`);
    }
  };

  const activeTabTitle = useMemo(
    () => STUDIO_NAV_ITEMS.find((t) => t.id === activeTab)?.label || 'Executive Studio',
    [activeTab]
  );

  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-screen bg-darkbg text-slate-100 overflow-hidden font-sans select-none">
      {/* Sidebar (shown if not presentation and not on zero-dataset home) */}
      {!isPresentation && (
        <Sidebar
          navItems={STUDIO_NAV_ITEMS}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          datasetMeta={datasetMeta}
          datasets={datasets}
          activeDatasetId={activeDatasetId}
          onSelectDataset={(id) => {
            setActiveDatasetId(id);
            setWhatIfResult(null);
            setForecastData(null);
            setStatsData(null);
            loadDashboard(id);
          }}
          onOpenUpload={() => filePickerRef.current?.click()}
          onOpenMongoModal={() => setShowMongoModal(true)}
          onOpenAbout={() => setShowAboutModal(true)}
        />
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          activeTabTitle={activeTabTitle}
          onRefresh={handleUniversalRefresh}
          refreshing={refreshing}
          onTogglePresentation={() => setIsPresentation(!isPresentation)}
          isPresentation={isPresentation}
          onOpenCustomChartModal={() => setShowCustomChartModal(true)}
          onOpenAIAnalyst={() => setActiveTab('chat')}
          onOpenShareModal={() => setShowShareModal(true)}
          userPermission={activeDataset?.user_permission || sharedDatasetInfo?.permission}
          currentUser={currentUser}
          onOpenSecurityModal={() => setShowSecurityModal(true)}
          onLogout={handleLogout}
        />

        {/* 6-Step Analytical Pipeline Flow Control Stepper (Studio Labs) */}
        {activeTab !== 'workspace_home' && (
          <FlowControlStepper
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            datasetName={datasetMeta?.name}
          />
        )}

        {/* Main Content View Container */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-darkbg">
          {activeTab === 'workspace_home' && (
            <WorkspaceHomeView
              datasets={datasets}
              activeDatasetId={activeDatasetId}
              onSelectDataset={(id) => {
                setActiveDatasetId(id);
                setWhatIfResult(null);
                loadDashboard(id);
              }}
              onUploadFile={handleUploadFile}
              onDeleteDataset={handleDeleteDataset}
              onOpenStudio={() => {
                setActiveTab('dashboard');
                const targetId = activeDatasetId || (datasets.length > 0 ? datasets[0].id : null);
                if (targetId) loadDashboard(targetId);
              }}
              uploading={uploading}
              onOpenMongoModal={() => setShowMongoModal(true)}
              onLoadSampleData={handleLoadSampleData}
              onStartBlankReport={handleStartBlankReport}
              onOpenOneLake={() => setShowOneLakeModal(true)}
              onOpenSQLStudio={() => setShowSQLModal(true)}
              onOpenIntro={() => setShowIntroModal(true)}
              onNavigateTab={handleNavigateTab}
              mongoStatus={mongoStatus}
            />
          )}

          {activeTab === 'dashboard' && (
            <ExecutiveDashboardView
              dashboard={dashboardData}
              datasetMeta={datasetMeta}
              slicers={slicers}
              onSlicerChange={handleSlicerChange}
              onResetSlicers={handleResetSlicers}
              onOpenCustomChartModal={() => setShowCustomChartModal(true)}
              customCharts={customCharts}
              onDeleteCustomChart={(idx) => setCustomCharts(prev => prev.filter((_, i) => i !== idx))}
              loading={dashboardLoading}
              error={dashboardError}
              onRetry={() => activeDatasetId && loadDashboard(activeDatasetId)}
            />
          )}

          {activeTab === 'story_deck' && (
            <StoryDeckView
              story={storyData}
              loading={storyLoading}
              error={storyError}
              onGenerate={() => loadStory(activeDatasetId)}
              onExport={exportStory}
            />
          )}

          {activeTab === 'what_if' && (
            <WhatIfAndForecastView
              datasetMeta={datasetMeta}
              params={whatIfParams}
              setParams={setWhatIfParams}
              result={whatIfResult}
              whatIfLoading={whatIfLoading}
              forecastData={forecastData}
              forecastLoading={forecastLoading}
              onSimulate={(p) => loadWhatIf(activeDatasetId, p)}
              forecastPeriods={forecastPeriods}
              onPeriodsChange={(p) => {
                setForecastPeriods(p);
                loadForecast(activeDatasetId, p);
              }}
              onRecalculateForecast={(p) => loadForecast(activeDatasetId, p || forecastPeriods)}
              whatIfError={whatIfError}
              forecastError={forecastError}
            />
          )}

          {activeTab === 'spatial_gestures' && (
            <SpatialGestureStudioView
              datasetMeta={datasetMeta}
              activeDatasetId={activeDatasetId}
            />
          )}

          {activeTab === 'descriptive_stats' && (
            <DescriptiveStatisticsLabView stats={statsData} />
          )}

          {activeTab === 'data_cleaning' && (
            <DataCleaningLabView
              datasetId={activeDatasetId}
              onApplyCleaning={async (action) => {
                try {
                  const res = await api.applyDataCleaning(activeDatasetId, action);
                  setCleaningStatus(`Applied "${action}" successfully: ${res.message || 'Dataset updated'}`);
                  setTimeout(() => setCleaningStatus(null), 4000);
                  handleUniversalRefresh();
                } catch (err: any) {
                  alert(`Cleaning error: ${err.message}`);
                }
              }}
              cleaningStatus={cleaningStatus}
            />
          )}

          {activeTab === 'relationships' && (
            <RelationshipsLabView correlationData={correlationData} />
          )}

          {activeTab === 'anomalies' && (
            <AnomalyLabView anomalyData={anomalyData} />
          )}

          {activeTab === 'explorer' && (
            <DatasetExplorerGridView rows={explorerData.rows} columns={explorerData.columns} />
          )}

          {activeTab === 'chat' && (
            <AIAnalystView
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              loading={chatLoading}
              datasetSelected={Boolean(activeDatasetId)}
              onOpenSettings={() => setShowSecurityModal(true)}
            />
          )}
        </main>
      </div>

      {/* Floating Universal Refresh Toast */}
      {refreshToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl bg-darkpanel border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce">
          <Icon name="check" className="w-4 h-4 text-cyan-400" />
          <span>{refreshToast}</span>
        </div>
      )}

      {/* Custom Chart Builder Modal */}
      {showCustomChartModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-darkpanel border border-darkborder rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-darkborder">
              <h3 className="text-base font-bold text-white">Create Custom Analytics Chart</h3>
              <button onClick={() => setShowCustomChartModal(false)} className="text-slate-400 hover:text-slate-200">
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Chart Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sales Revenue by Region"
                  value={newChartTitle}
                  onChange={(e) => setNewChartTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Visualization Type</label>
                <select
                  value={newChartType}
                  onChange={(e) => setNewChartType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line / Trend Chart</option>
                  <option value="pie">Pie / Donut Chart</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Dimension (X-Axis / Category)</label>
                  <select
                    value={newChartDimension}
                    onChange={(e) => setNewChartDimension(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select a feature</option>
                    {(dashboardData?.dimensions || []).map((dimension: string) => <option key={dimension} value={dimension}>{dimension}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Metric (Y-Axis / Value)</label>
                  <select
                    value={newChartMetric}
                    onChange={(e) => setNewChartMetric(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select a metric</option>
                    {(dashboardData?.measures || []).map((measure: string) => <option key={measure} value={measure}>{measure}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-darkborder flex justify-end space-x-2">
              <button
                onClick={() => {
                  const dimensions = dashboardData?.dimensions || [];
                  const measures = dashboardData?.measures || [];
                  if (dimensions.length && measures.length) {
                    setNewChartDimension(dimensions[Math.floor(Math.random() * dimensions.length)]);
                    setNewChartMetric(measures[Math.floor(Math.random() * measures.length)]);
                  }
                }}
                className="mr-auto px-3 py-2 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 text-xs font-medium"
              >
                Random Feature Pair
              </button>
              <button
                onClick={() => setShowCustomChartModal(false)}
                className="px-4 py-2 rounded-xl border border-darkborder text-slate-400 hover:text-slate-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomChart}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Build Chart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MongoDB Document Database & Ingestion Modal */}
      <MongoModal
        isOpen={showMongoModal}
        onClose={() => setShowMongoModal(false)}
        status={mongoStatus}
        onStatusUpdated={loadMongoStatus}
        activeDatasetId={activeDatasetId}
        activeDatasetName={datasetMeta?.name}
        onDatasetImported={(id) => {
          loadDatasets();
          setActiveDatasetId(id);
          setActiveTab('dashboard');
          loadDashboard(id);
        }}
      />

      {/* OneLake Cloud Catalog Modal */}
      <OneLakeModal
        isOpen={showOneLakeModal}
        onClose={() => setShowOneLakeModal(false)}
        onIngestDataset={handleLoadSampleData}
      />

      {/* SQL Studio DuckDB ANSI Execution Modal */}
      <SQLStudioModal
        isOpen={showSQLModal}
        onClose={() => setShowSQLModal(false)}
        activeDatasetId={activeDatasetId}
      />

      {/* Platform Architecture & Intro Guide Modal */}
      <IntroModal
        isOpen={showIntroModal}
        onClose={() => setShowIntroModal(false)}
        onOpenSample={() => handleLoadSampleData('finance')}
      />

      {/* Engine Telemetry & System Specs Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        mongoStatus={mongoStatus}
      />

      {/* Google Authentication & Security API Keys Command Center */}
      <SecurityModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onUserUpdated={() => api.fetchCurrentUser().then(res => setCurrentUser(res.user)).catch(() => setCurrentUser(null))}
      />

      {/* Share Dataset Modal */}
      <ShareModal
        datasetId={activeDatasetId}
        datasetName={activeDataset?.name || sharedDatasetInfo?.name || 'Current Dataset'}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Hidden Universal File Picker for Native Sidebar / Workspace Triggers */}
      <input
        ref={filePickerRef}
        type="file"
        accept=".csv,.xlsx,.xls,.parquet,.json,.tsv"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />
    </div>
  );
};

export default App;
