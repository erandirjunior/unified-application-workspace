import { useState, useRef } from 'react';

// Prepara a requisição: injeta headers de auth e garante tipos numéricos para o Go
const prepareRequest = (req) => {
  if (!req) return req;

  const headers = {};
  if (Array.isArray(req.headers)) {
    req.headers.forEach(h => { if (h.key) headers[h.key] = h.value; });
  } else if (typeof req.headers === 'object') {
    Object.assign(headers, req.headers);
  }

  if (req.authType && req.authType !== 'none') {
    if (req.authType === 'bearer' && req.authToken) {
      headers['Authorization'] = `Bearer ${req.authToken}`;
    } else if (req.authType === 'basic' && (req.authUsername || req.authPassword)) {
      const auth = btoa(`${req.authUsername || ''}:${req.authPassword || ''}`);
      headers['Authorization'] = `Basic ${auth}`;
    } else if (req.authType === 'apikey' && req.apiKeyName && req.apiKeyValue) {
      headers[req.apiKeyName] = req.apiKeyValue;
    }
  }

  return { 
    ...req, 
    headers,
    totalRequests: parseInt(req.totalRequests || req.threads || 0, 10),
    duration: parseInt(req.duration || 0, 10),
    rampUp: parseInt(req.rampUp || 0, 10)
  };
};

const processPayloadAuth = (payload) => {
  if (payload.requests) {
    const processStep = (step) => {
      if (step.type === 'parallel') {
        return { ...step, requests: step.requests.map(prepareRequest) };
      }
      if (step.type === 'loop') {
        return { ...step, steps: (step.steps || []).map(processStep) };
      }
      if (step.type === 'condition') {
        return { 
          ...step, 
          steps: (step.steps || []).map(processStep),
          elseSteps: (step.elseSteps || []).map(processStep)
        };
      }
      if (step.type === 'request' || !step.type) {
        return prepareRequest(step);
      }
      return step;
    };

    return {
      ...payload,
      totalRequests: parseInt(payload.totalRequests || 0, 10),
      duration: parseInt(payload.duration || 0, 10),
      rampUp: parseInt(payload.rampUp || 0, 10),
      requests: payload.requests.map(processStep)
    };
  }
  return prepareRequest(payload);
};

export function useTestRunner(activeCollection, getRequestFormPayload, showCustomToast, t) {
  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef(null);
  const [lastExecutedPayload, setLastExecutedPayload] = useState(null);
  const [requestLogs, setRequestLogs] = useState([]);
  const [reportData, setReportData] = useState(null);

  const stopTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const sendRequests = async (overridePayload = null) => {
    setRequestLogs([]);
    setReportData(null); // Limpa dados de relatório anteriores

    let payload;
    if (Array.isArray(overridePayload)) {
      payload = { requests: overridePayload };
    } else if (overridePayload && overridePayload.requests) {
      payload = overridePayload;
    } else if (overridePayload && typeof overridePayload === 'object' && 'url' in overridePayload) {
      payload = overridePayload;
    } else {
      // Se nenhum overridePayload for fornecido, pega do formulário ativo
      payload = getRequestFormPayload(); 
    }

    const envVars = {};
    if (activeCollection?.environments && activeCollection.activeEnvironmentId) {
      const activeEnv = activeCollection.environments.find(e => e.id === activeCollection.activeEnvironmentId);
      if (activeEnv) {
        activeEnv.variables.forEach(v => { if(v.key) envVars[v.key] = v.value; });
      }
    }

    const testStartTime = Date.now();
    let localSuccess = 0;
    let localErrors = 0;

    if (abortControllerRef.current) abortControllerRef.current.abort(); // Aborta qualquer teste anterior
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsRunning(true);

    try {
      showCustomToast(t?.toasts?.loadTestStarted || 'Teste de carga iniciado!', 'info');
      setLastExecutedPayload(payload); // Armazena o payload para reexecução

      const response = await fetch('http://localhost:8080/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Injeta os headers de autenticação antes de enviar
        body: JSON.stringify({ ...processPayloadAuth(payload), variables: envVars }), 
        signal: controller.signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Guarda o último fragmento (incompleto) para o próximo chunk

        lines.forEach(line => {
          if (line.trim() === '') return;
          try {
            const data = JSON.parse(line);
            if (data.type === 'summary') {
              setReportData(data);
            } else {
              if (data.success) localSuccess++; else localErrors++;
              setRequestLogs(prev => [data, ...prev].slice(0, 100)); // Limita o histórico de logs para evitar sobrecarga de memória
            }
          } catch (e) {
            console.error('Erro ao processar chunk:', e);
          }
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Teste interrompido pelo usuário');
        showCustomToast(t?.toasts?.loadTestStopped || 'Teste interrompido!', 'warning');
        setReportData({ totalRequests: localSuccess + localErrors, successCount: localSuccess, errorCount: localErrors, totalDuration: (Date.now() - testStartTime) / 1000 });
      } else {
        console.error(error);
        showCustomToast(t?.toasts?.backendError || 'Erro na conexão com o backend.', 'error');
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  return { isRunning, lastExecutedPayload, requestLogs, reportData, sendRequests, stopTest, setRequestLogs, setReportData };
}