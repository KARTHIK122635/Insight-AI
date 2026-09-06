import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import * as api from '../services/api';

declare global {
  interface Window {
    google?: any;
  }
}

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onLogout: () => Promise<void>;
  onUserUpdated?: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'ai_config' | 'api_keys'>('google');
  
  // Google OAuth Config State
  const [clientIdInput, setClientIdInput] = useState('');
  const [googleConfig, setGoogleConfig] = useState<any>(null);
  const [savingClientId, setSavingClientId] = useState(false);
  const [clientSaveMsg, setClientSaveMsg] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  // AI Configuration State (Google Gemini & Hugging Face)
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [hfTokenInput, setHfTokenInput] = useState('');
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [aiSaveMsg, setAiSaveMsg] = useState<string | null>(null);

  // API Keys State
  const [keysList, setKeysList] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRole, setNewKeyRole] = useState('Data Analyst');
  const [newKeyExpiry, setNewKeyExpiry] = useState(30);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Workbench Verification State
  const [testKeyInput, setTestKeyInput] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Load Security Configuration, AI Config, & Keys on open
  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadAiConfig();
      loadApiKeys();
    }
  }, [isOpen]);

  // Initialize Google Identity Services (GSI)
  useEffect(() => {
    if (!isOpen || activeTab !== 'google') return;

    const cid = clientIdInput.trim() || googleConfig?.google_oauth?.raw_client_id;
    if (cid && googleBtnRef.current && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: cid,
          callback: async (response: any) => {
            if (response?.credential) {
              try {
                await api.loginWithGoogle(response.credential, cid);
                onUserUpdated?.();
                setClientSaveMsg('Signed in successfully with Google!');
                setTimeout(() => setClientSaveMsg(null), 3000);
              } catch (err: any) {
                setClientSaveMsg(`Google Sign-In failed: ${err.message}`);
              }
            }
          }
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 320
        });
      } catch (err) {
        console.warn('Google Identity Services initialization notice:', err);
      }
    }
  }, [isOpen, activeTab, clientIdInput, googleConfig, onUserUpdated]);

  const loadConfig = async () => {
    try {
      const cfg = await api.fetchSecurityConfig();
      setGoogleConfig(cfg);
      if (cfg?.google_oauth?.raw_client_id) {
        setClientIdInput(cfg.google_oauth.raw_client_id);
      }
    } catch (err) {
      console.error('Failed to load security config:', err);
    }
  };

  const loadAiConfig = async () => {
    try {
      const cfg = await api.fetchAIConfig();
      setAiConfig(cfg);
    } catch (err) {
      console.error('Failed to load AI config:', err);
    }
  };

  const loadApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await api.fetchApiKeys();
      setKeysList(res.keys || []);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleSaveClientId = async () => {
    if (!clientIdInput.trim()) return;
    setSavingClientId(true);
    setClientSaveMsg(null);
    try {
      await api.setGoogleClientId(clientIdInput.trim());
      await loadConfig();
      setClientSaveMsg('Google Client ID updated successfully.');
      setTimeout(() => setClientSaveMsg(null), 3000);
    } catch (err: any) {
      setClientSaveMsg(`Failed: ${err.message}`);
    } finally {
      setSavingClientId(false);
    }
  };

  const handleSaveAiConfig = async () => {
    setSavingAiConfig(true);
    setAiSaveMsg(null);
    try {
      const payload: { gemini_api_key?: string; hf_token?: string } = {};
      if (geminiKeyInput.trim()) payload.gemini_api_key = geminiKeyInput.trim();
      if (hfTokenInput.trim()) payload.hf_token = hfTokenInput.trim();

      const res = await api.updateAIConfig(payload);
      await loadAiConfig();
      setAiSaveMsg(res.message || 'AI configuration updated successfully.');
      setGeminiKeyInput('');
      setHfTokenInput('');
      setTimeout(() => setAiSaveMsg(null), 3500);
    } catch (err: any) {
      setAiSaveMsg(`Update failed: ${err.message}`);
    } finally {
      setSavingAiConfig(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a descriptive name for the API Key.');
      return;
    }
    setGeneratingKey(true);
    try {
      const res = await api.createApiKey(newKeyName.trim(), newKeyRole, newKeyExpiry);
      if (res.key && res.key.raw_key) {
        setRevealedKey(res.key.raw_key);
        setTestKeyInput(res.key.raw_key);
        setNewKeyName('');
        await loadApiKeys();
      }
    } catch (err: any) {
      alert(`Key generation failed: ${err.message}`);
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to permanently revoke this API Key? Programmatic requests using it will immediately be rejected.')) {
      return;
    }
    try {
      await api.deleteApiKey(keyId);
      await loadApiKeys();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleTestKeyVerification = async () => {
    if (!testKeyInput.trim()) return;
    setTestingKey(true);
    setVerificationResult(null);
    try {
      const res = await api.verifyApiKey(testKeyInput.trim());
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationResult({ valid: false, status: 'ERROR', message: err.message, elapsed_ms: 0 });
    } finally {
      setTestingKey(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#12151c] border border-darkborder rounded-3xl p-6 w-full max-w-4xl shadow-2xl space-y-6 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-darkborder flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Icon name="shield" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Security, Identity &amp; AI Center</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  OAuth 2.0 • Gemini • API Keys
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage Google Single Sign-On identity, Google AI Studio / Gemini keys, and cryptographically hashed programmatic access.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-darkborder hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-darkborder pb-3 flex-shrink-0">
          <button
            onClick={() => setActiveTab('google')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'google'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-darksubpanel'
            }`}
          >
            <span className="text-sm">🌐</span>
            <span>Google Authentication</span>
            {currentUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ai_config')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ai_config'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-darksubpanel'
            }`}
          >
            <span className="text-sm">⚡</span>
            <span>AI Models &amp; Gemini Keys</span>
            <span className={`w-2 h-2 rounded-full ml-1 ${aiConfig?.gemini?.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </button>

          <button
            onClick={() => setActiveTab('api_keys')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'api_keys'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-darksubpanel'
            }`}
          >
            <span className="text-sm">🔑</span>
            <span>Programmatic API Keys</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300 border border-darkborder">
              {keysList.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Google Authentication */}
        {activeTab === 'google' && (
          <div className="space-y-6 overflow-y-auto custom-scrollbar pr-1 flex-1">
            {/* User Session Status Card */}
            <div className="p-5 rounded-2xl bg-[#181c26] border border-darkborder flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center space-x-3.5">
                {currentUser ? (
                  <img
                    src={currentUser.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&fit=crop&crop=faces'}
                    alt={currentUser.name}
                    className="w-12 h-12 rounded-2xl border-2 border-emerald-500/40 object-cover shadow"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
                    👤
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">
                      {currentUser ? currentUser.name : 'Unauthenticated Guest Session'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                      currentUser
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {currentUser ? 'Active Google Session' : 'Guest Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {currentUser ? currentUser.email : 'Public demo permissions active. Sign in with Google to link analytical workspace.'}
                  </p>
                  {currentUser && (
                    <span className="text-[10px] text-cyan-400 font-sans font-medium mt-1 block">
                      Role: {currentUser.role || 'Administrator'} • Provider: {currentUser.provider || 'Google Identity Services'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {currentUser ? (
                  <button
                    onClick={async () => {
                      await onLogout();
                      onUserUpdated?.();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-all shadow"
                  >
                    Sign Out
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Sign in with your personal Gmail to link workspace
                  </span>
                )}
              </div>
            </div>

            {/* Google Identity Services Render Target */}
            <div className="p-5 rounded-2xl bg-[#181c26] border border-darkborder space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <span>Google Identity Services (One-Tap &amp; OAuth Button)</span>
              </h4>
              <p className="text-xs text-slate-400">
                Official Google Identity Services button authenticated directly with <code className="text-cyan-400">accounts.google.com</code>.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center">
                  {!googleConfig?.google_oauth?.raw_client_id && (
                    <div className="text-xs text-slate-500 italic p-2 border border-dashed border-slate-700 rounded-xl">
                      Save a Google Client ID below to render the official Google Identity Services button, or use 1-Click Enterprise Sign-In above.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Google Identity Services Client Configuration */}
            <div className="p-5 rounded-2xl bg-[#181c26] border border-darkborder space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <span>Google Cloud Identity Configuration</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    OAuth 2.0 Web Client
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Connect your Google Cloud Console OAuth 2.0 Client ID (from console.cloud.google.com &gt; Credentials).
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 font-mono">
                  Google Client ID
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. 1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#0b0e14] border border-darkborder text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSaveClientId}
                    disabled={savingClientId || !clientIdInput.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center space-x-1.5"
                  >
                    {savingClientId ? (
                      <>
                        <Icon name="refresh-cw" className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Client ID</span>
                    )}
                  </button>
                </div>
                {clientSaveMsg && (
                  <p className={`text-xs font-mono mt-1 ${clientSaveMsg.includes('Failed') ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {clientSaveMsg}
                  </p>
                )}
              </div>

              {/* Security Telemetry Specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-darksubpanel/70 border border-darkborder text-xs space-y-1">
                  <span className="text-[10px] font-mono text-slate-400">Token Verification</span>
                  <p className="font-bold text-white flex items-center space-x-1">
                    <span className="text-emerald-400">✓</span>
                    <span>Google TokenInfo API</span>
                  </p>
                  <p className="text-[10px] text-slate-500">oauth2.googleapis.com</p>
                </div>

                <div className="p-3 rounded-xl bg-darksubpanel/70 border border-darkborder text-xs space-y-1">
                  <span className="text-[10px] font-mono text-slate-400">Session Issuer</span>
                  <p className="font-bold text-white flex items-center space-x-1">
                    <span className="text-cyan-400">⚡</span>
                    <span>HS256 Deterministic JWT</span>
                  </p>
                  <p className="text-[10px] text-slate-500">7-day cryptographic validity</p>
                </div>

                <div className="p-3 rounded-xl bg-darksubpanel/70 border border-darkborder text-xs space-y-1">
                  <span className="text-[10px] font-mono text-slate-400">Account Synchronization</span>
                  <p className="font-bold text-white flex items-center space-x-1">
                    <span className="text-purple-400">🍃</span>
                    <span>MongoDB insight_users</span>
                  </p>
                  <p className="text-[10px] text-slate-500">Automatic schema upsert</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI Intelligence & Gemini Keys */}
        {activeTab === 'ai_config' && (
          <div className="space-y-6 overflow-y-auto custom-scrollbar pr-1 flex-1">
            {/* Active Engine Card */}
            <div className="p-5 rounded-2xl bg-[#181c26] border border-darkborder flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">
                      {aiConfig?.active_provider || 'Deterministic DuckDB Analytical Engine'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                      aiConfig?.gemini?.configured
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      {aiConfig?.gemini?.configured ? 'Gemini 1.5/2.0 Flash' : 'Zero Arithmetic Hallucination'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Multi-tier analytics engine: DuckDB executes exact SQL math while Gemini produces executive narratives.
                  </p>
                </div>
              </div>
            </div>

            {/* Google Gemini API Key Setup */}
            <div className="p-5 rounded-2xl bg-[#181c26] border border-darkborder space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <span>Google AI Studio / Gemini API Key</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    aiConfig?.gemini?.configured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {aiConfig?.gemini?.configured ? 'Configured ✓' : 'Optional (Free Tier)'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Get your free Gemini API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Google AI Studio (aistudio.google.com)</a> for advanced reasoning and deep business narratives.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 font-mono">
                  Gemini API Key (AIzaSy...)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="password"
                    placeholder="Paste your Gemini API key from Google AI Studio"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#0b0e14] border border-darkborder text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSaveAiConfig}
                    disabled={savingAiConfig || !geminiKeyInput.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center space-x-1.5"
                  >
                    {savingAiConfig ? 'Saving...' : 'Apply Key'}
                  </button>
                </div>
                {aiSaveMsg && (
                  <p className={`text-xs font-mono mt-1 ${aiSaveMsg.includes('failed') ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {aiSaveMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Hugging Face / Qwen Token Setup */}
            <div className="p-5 rounded-2xl bg-[#181c26] border border-darkborder space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <span>Hugging Face Router Token (Optional Fallback)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Optional Hugging Face user access token (<code className="text-cyan-400">hf_...</code>) for Qwen 2.5 Coder fallback.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="password"
                    placeholder="e.g. hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={hfTokenInput}
                    onChange={(e) => setHfTokenInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#0b0e14] border border-darkborder text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSaveAiConfig}
                    disabled={savingAiConfig || !hfTokenInput.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                  >
                    Save Token
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Security API Keys */}
        {activeTab === 'api_keys' && (
          <div className="space-y-6 overflow-y-auto custom-scrollbar pr-1 flex-1">
            {/* Generate Key Form */}
            <div className="p-5 rounded-2xl bg-[#181c26] border border-darkborder space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Generate Secure API Key
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-300">Key Name / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Production Ingestion Worker"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0e14] border border-darkborder text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Access Role</label>
                  <select
                    value={newKeyRole}
                    onChange={(e) => setNewKeyRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0e14] border border-darkborder text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Administrator">Administrator (Full Control)</option>
                    <option value="Data Analyst">Data Analyst (Read &amp; Execute)</option>
                    <option value="Read-Only">Read-Only (Query Output Only)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Expiration Period</label>
                  <select
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0e14] border border-darkborder text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                    <option value={365}>1 Year (365 Days)</option>
                    <option value={0}>Never Expires</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleCreateApiKey}
                  disabled={generatingKey || !newKeyName.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow"
                >
                  {generatingKey ? (
                    <>
                      <Icon name="refresh-cw" className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Key...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="plus" className="w-3.5 h-3.5" />
                      <span>Generate API Key</span>
                    </>
                  )}
                </button>
              </div>

              {/* Newly Generated Key Reveal Banner */}
              {revealedKey && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center space-x-1.5">
                      <span>⚠️</span>
                      <span>Copy Your Secret API Key Now</span>
                    </span>
                    <span className="text-[10px] text-amber-400/80">Only shown once</span>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#0b0e14] p-2.5 rounded-xl border border-amber-500/30">
                    <code className="text-xs font-mono text-emerald-400 select-all flex-1 truncate">
                      {revealedKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(revealedKey)}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors flex items-center space-x-1 flex-shrink-0"
                    >
                      <span>{copiedKey ? 'Copied! ✓' : 'Copy Key'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Keys Table */}
            <div className="p-5 rounded-2xl bg-[#181c26] border border-darkborder space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Active API Keys ({keysList.length})
                </h4>
                <button
                  onClick={loadApiKeys}
                  disabled={loadingKeys}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <Icon name="refresh-cw" className={`w-3 h-3 ${loadingKeys ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {keysList.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-6">
                  No API keys created yet. Generate a key above to enable programmatic access to DuckDB analytical endpoints.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-darkborder text-slate-400 font-mono text-[11px]">
                        <th className="pb-2 font-medium">Name</th>
                        <th className="pb-2 font-medium">Key Prefix</th>
                        <th className="pb-2 font-medium">Role</th>
                        <th className="pb-2 font-medium">Created</th>
                        <th className="pb-2 font-medium">Expires</th>
                        <th className="pb-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-darkborder/50">
                      {keysList.map((k) => (
                        <tr key={k.key_id} className="hover:bg-darksubpanel/40 transition-colors">
                          <td className="py-2.5 font-medium text-white">{k.name}</td>
                          <td className="py-2.5 font-mono text-cyan-400 text-[11px]">{k.prefix}...</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono">
                              {k.role}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400 text-[11px]">
                            {new Date(k.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 text-slate-400 text-[11px]">
                            {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteApiKey(k.key_id)}
                              className="px-2 py-1 rounded bg-rose-950/30 hover:bg-rose-950/60 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-[11px] transition-colors"
                              title="Revoke and delete this key"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Test & Verification Workbench */}
            <div className="p-5 rounded-2xl bg-[#181c26] border border-darkborder space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Interactive API Key Tester
              </h4>
              <p className="text-xs text-slate-400">
                Test an API key to verify its cryptographic SHA-256 hash validation and latency.
              </p>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Paste an API key (iak_live_...)"
                  value={testKeyInput}
                  onChange={(e) => setTestKeyInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#0b0e14] border border-darkborder text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleTestKeyVerification}
                  disabled={testingKey || !testKeyInput.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center space-x-1.5"
                >
                  {testingKey ? (
                    <>
                      <Icon name="refresh-cw" className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Key</span>
                  )}
                </button>
              </div>

              {verificationResult && (
                <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                  verificationResult.valid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span>{verificationResult.valid ? 'VALID ACTIVE KEY ✓' : 'KEY REJECTED ✗'}</span>
                    <span className="text-[10px] text-slate-400">{verificationResult.elapsed_ms}ms</span>
                  </div>
                  <p>{verificationResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SecurityModal;
