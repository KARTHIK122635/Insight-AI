export const API_BASE = '';

function getSessionId(): string {
  const storageKey = 'insight_ai_browser_session';
  let sessionId = sessionStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
}

export function cleanupBrowserSession() {
  fetch(`${API_BASE}/api/datasets/session/cleanup`, {
    method: 'POST',
    headers: { 'X-Session-ID': getSessionId() },
    keepalive: true,
  }).catch(() => {});
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const detail = data && typeof data === 'object' && 'detail' in data ? (data as any).detail : undefined;
    const message = data && typeof data === 'object' && 'message' in data ? (data as any).message : undefined;
    throw new Error(detail || message || 'Request failed');
  }

  return data as T;
}

// ─── AUTHENTICATION & SECURITY TOKEN MANAGEMENT ──────────────────────────────

export function getAuthToken(): string | null {
  return localStorage.getItem('insight_ai_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('insight_ai_auth_token', token);
  } else {
    localStorage.removeItem('insight_ai_auth_token');
  }
}

let activeShareToken: string | null = null;

export function setActiveShareToken(token: string | null) {
  activeShareToken = token;
  if (token) {
    sessionStorage.setItem('insight_active_share_token', token);
  } else {
    sessionStorage.removeItem('insight_active_share_token');
  }
}

export function getActiveShareToken(): string | null {
  if (!activeShareToken) {
    activeShareToken = sessionStorage.getItem('insight_active_share_token');
  }
  return activeShareToken;
}

export function getAuthHeaders(): Record<string, string> {
  const shareToken = getActiveShareToken();
  const headers: Record<string, string> = {};
  if (shareToken) {
    headers['X-Share-Token'] = shareToken;
  }
  headers['X-Session-ID'] = getSessionId();
  return headers;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', cleanupBrowserSession);
}

// ─── CORE DATASET ENDPOINTS ──────────────────────────────────────────────────

export async function fetchDatasets() {
  return requestJson('/api/datasets', { headers: getAuthHeaders() });
}

export async function uploadDataset(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestJson('/api/datasets/upload', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
}

export async function deleteDataset(id: string) {
  return requestJson(`/api/datasets/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function fetchDashboard(id: string, slicers: Record<string, any> = {}) {
  const hasFilters = Object.keys(slicers).length > 0;
  if (hasFilters) {
    return requestJson(`/api/dashboard/${id}/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ filters: slicers }),
    });
  }

  return requestJson(`/api/dashboard/${id}`, { headers: getAuthHeaders() });
}

export async function generateStory(id: string, tone: string = 'executive') {
  return requestJson(`/api/stories/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ tone }),
  });
}

export async function exportStory(id: string) {
  const response = await fetch(`${API_BASE}/api/stories/${id}/export`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Story export failed');
  return response.blob();
}

export async function buildCustomChart(request: {
  dataset_id: string;
  dimension: string;
  measure: string;
  chart_type: string;
  title?: string;
}) {
  return requestJson('/api/charts/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(request),
  });
}

export async function fetchDescriptiveStats(id: string) {
  return requestJson(`/api/statistics/${id}`, { headers: getAuthHeaders() });
}

export async function fetchCorrelationMatrix(id: string) {
  return requestJson(`/api/relationships/${id}`, { headers: getAuthHeaders() });
}

export async function fetchAnomalies(id: string) {
  return requestJson(`/api/analytics/${id}/anomalies`, { headers: getAuthHeaders() });
}

export async function fetchExplorerRows(id: string, limit: number = 100) {
  return requestJson(`/api/datasets/${id}/data?page=1&page_size=${limit}`, { headers: getAuthHeaders() });
}

export async function simulateWhatIf(id: string, params: any) {
  const data = await requestJson<any>(`/api/analytics/${id}/what_if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(params),
  });
  if (!data || !data.simulated) {
    throw new Error(data?.detail || 'What-If calculation failed');
  }
  return data;
}

export async function generateForecast(id: string, periods: number = 6) {
  const data = await requestJson<any>(`/api/analytics/${id}/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ periods_ahead: periods }),
  });
  return data;
}

export async function askAIAnalyst(id: string, question: string) {
  if (!id) {
    throw new Error('Select or upload a dataset before asking the analyst a question.');
  }

  return requestJson(`/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ question, dataset_id: id }),
  });
}

export async function applyDataCleaning(id: string, action: string) {
  let body: any = {};
  if (action === 'deduplicate') {
    body = { remove_duplicates: true };
  } else if (action === 'impute_median') {
    body = { imputations: {} };
  } else if (action === 'winsorize') {
    body = { handle_outliers: {} };
  }
  return requestJson(`/api/clean/${id}/transform`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
}

// ─── MONGODB INTEGRATION ENDPOINTS ──────────────────────────────────────────

export async function fetchMongoStatus() {
  const res = await fetch(`${API_BASE}/api/mongodb/status`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch MongoDB status');
  return res.json();
}

export async function connectMongo(uri: string, database?: string) {
  const res = await fetch(`${API_BASE}/api/mongodb/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ uri, database }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Connection failed' }));
    throw new Error(err.detail || 'Connection failed');
  }
  return res.json();
}

export async function importMongoCollection(collectionName: string, datasetName?: string, limit: number = 5000) {
  const res = await fetch(`${API_BASE}/api/mongodb/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      collection_name: collectionName,
      dataset_name: datasetName,
      limit,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data?.detail || data?.message || 'Import from MongoDB failed');
  }
  return data;
}

export async function exportMongoDataset(collectionName: string, datasetId?: string) {
  const res = await fetch(`${API_BASE}/api/mongodb/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      collection_name: collectionName,
      dataset_id: datasetId,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data?.detail || data?.message || 'Export to MongoDB failed');
  }
  return data;
}

export async function loadSampleDataset(domain: string = 'finance') {
  const res = await fetch(`${API_BASE}/api/datasets/sample/${domain}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load sample dataset' }));
    throw new Error(err.detail || 'Failed to load sample dataset');
  }
  return res.json();
}

export async function executeSQL(sql: string, limit: number = 100) {
  const res = await fetch(`${API_BASE}/api/sql/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ sql, limit }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'SQL query execution failed');
  }
  return data;
}

// ─── AUTHENTICATION ENDPOINTS ────────────────────────────────────────────────

export async function loginWithGoogle(credential: string, clientId?: string) {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, client_id: clientId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Google authentication failed');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function requestPhoneOtp(phoneNumber: string) {
  const res = await fetch(`${API_BASE}/api/auth/phone/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Unable to send verification code');
  }
  return data;
}

export async function verifyPhoneOtp(phoneNumber: string, verificationCode: string, name?: string) {
  const res = await fetch(`${API_BASE}/api/auth/phone/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, verification_code: verificationCode, name }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Phone verification failed');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function requestEmailOtp(email: string) {
  const res = await fetch(`${API_BASE}/api/auth/email/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Unable to send verification code');
  }
  return data;
}

export async function verifyEmailOtp(email: string, verificationCode: string, name?: string) {
  const res = await fetch(`${API_BASE}/api/auth/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, verification_code: verificationCode, name }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Email verification failed');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function loginWithDemoGoogle() {
  const res = await fetch(`${API_BASE}/api/auth/demo-google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Demo Google authentication failed');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function loginWithPersonalGmail(email: string, name?: string) {
  const res = await fetch(`${API_BASE}/api/auth/personal-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Personal Gmail login failed');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function fetchCurrentUser() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Unauthenticated');
  }
  return res.json();
}

export async function logoutUser() {
  setAuthToken(null);
  setActiveShareToken(null);
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
  });
  return res.json();
}

// ─── DATASET COLLABORATION & SHARING ENDPOINTS ──────────────────────────────

export async function createShareLink(datasetId: string, permission: 'view' | 'editor' = 'view', label?: string) {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ permission, label }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Failed to generate share link');
  }
  return data;
}

export async function getShareInfo(shareToken: string) {
  const res = await fetch(`${API_BASE}/api/shares/${shareToken}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Invalid or expired share link');
  }
  return data;
}

export async function listDatasetShares(datasetId: string) {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/shares`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Failed to fetch share links');
  }
  return data;
}

export async function revokeShareLink(shareToken: string) {
  const res = await fetch(`${API_BASE}/api/shares/${shareToken}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Failed to revoke share link');
  }
  return data;
}

// ─── API KEY MANAGEMENT ─────────────────────────────────────────────────────

export async function fetchApiKeys() {
  const res = await fetch(`${API_BASE}/api/security/keys`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch API keys');
  }
  return res.json();
}

export async function createApiKey(name: string, role: string = 'Data Analyst', expiresInDays: number = 30) {
  const res = await fetch(`${API_BASE}/api/security/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ name, role, expires_in_days: expiresInDays }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Failed to generate API key');
  }
  return data;
}

export async function deleteApiKey(keyId: string) {
  const res = await fetch(`${API_BASE}/api/security/keys/${keyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || 'Failed to revoke API key');
  }
  return data;
}

export async function verifyApiKey(apiKey: string) {
  const res = await fetch(`${API_BASE}/api/security/keys/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return res.json();
}

// ─── SECURITY & AI CONFIGURATION ─────────────────────────────────────────────

export async function fetchSecurityConfig() {
  const res = await fetch(`${API_BASE}/api/security/config`);
  if (!res.ok) {
    throw new Error('Failed to fetch security config');
  }
  return res.json();
}

export async function setGoogleClientId(clientId: string) {
  const res = await fetch(`${API_BASE}/api/security/config/google-client-id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ client_id: clientId }),
  });
  return res.json();
}

export async function fetchAIConfig() {
  const res = await fetch(`${API_BASE}/api/chat/config`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch AI configuration');
  }
  return res.json();
}

export async function updateAIConfig(params: { gemini_api_key?: string; hf_token?: string }) {
  const res = await fetch(`${API_BASE}/api/chat/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error('Failed to update AI configuration');
  }
  return res.json();
}
