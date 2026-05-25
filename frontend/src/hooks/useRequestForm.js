import { useState } from 'react';

const INITIAL_FORM = {
  url: 'https://api.example.com',
  method: 'GET',
  totalRequests: 1,
  duration: 10,
  rampUp: 0,
  headers: [{ key: '', value: '' }],
  bodyType: 'none',
  bodyRaw: '',
  bodyRawDoc: '',
  pathParams: [],
  bodyParams: [],
  authType: 'none',
  authDoc: '',
  assertions: [],
  extractions: [],
  requestName: '',
  description: '',
  activeRequestId: null,
  activeScenarioId: null,
  activeStepIndex: null
};

export function useRequestForm() {
  const [form, setForm] = useState(INITIAL_FORM);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateIndexedField = (field, index, subField, value) => {
    setForm(prev => {
      const newList = [...prev[field]];
      if (newList[index]) {
        newList[index] = { ...newList[index], [subField]: value };
      }
      return { ...prev, [field]: newList };
    });
  };

  const addListItem = (field, item) => {
    setForm(prev => ({ ...prev, [field]: [...prev[field], item] }));
  };

  const removeListItem = (field, index) => {
    setForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const resetForm = (defaults = {}) => {
    setForm({ ...INITIAL_FORM, ...defaults });
  };

  const loadRequest = (req, scenarioId = null, stepIndex = null) => {
    setForm({
      url: req.url || INITIAL_FORM.url,
      method: req.method || INITIAL_FORM.method,
      totalRequests: req.totalRequests || req.threads || INITIAL_FORM.totalRequests,
      duration: req.duration || INITIAL_FORM.duration,
      rampUp: req.rampUp || INITIAL_FORM.rampUp,
      headers: req.headers || [{ key: '', value: '' }],
      bodyType: req.bodyType || 'none',
      bodyRaw: req.bodyRaw || '',
      bodyRawDoc: req.bodyRawDoc || '',
      pathParams: req.pathParams || [],
      bodyParams: (req.bodyParams || []).filter(p => p.key !== ''),
      authType: req.authType || 'none',
      authDoc: req.authDoc || '',
      assertions: req.assertions || [],
      extractions: req.extractions || [],
      requestName: req.name || '',
      description: req.description || '',
      activeRequestId: req.id,
      activeScenarioId: scenarioId,
      activeStepIndex: stepIndex
    });
  };

  const getPayload = () => {
    const headerMap = {};
    form.headers.forEach(h => { if (h.key) headerMap[h.key] = h.value; });
    return {
      url: form.url,
      method: form.method,
      totalRequests: parseInt(form.totalRequests),
      duration: parseInt(form.duration),
      rampUp: parseInt(form.rampUp),
      headers: headerMap,
      body: form.bodyRaw,
      assertions: form.assertions,
      extractions: form.extractions
    };
  };

  return { form, updateField, updateIndexedField, addListItem, removeListItem, resetForm, loadRequest, getPayload };
}