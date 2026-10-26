/**
 * Layer 2 (LLM semantic review) & Layer 3 (human arbitration) — SIMULATED.
 * This demo never calls a real model. Results are pre-set in data/samples.json
 * and labeled SIMULATED in the UI. Real deployments would call an LLM here.
 */
(function (global) {
  'use strict';

  function reviewSemantic(sample) {
    var mock = sample.mockLayer2 || {};
    var verdict = mock.verdict || 'pass';
    return {
      simulated: true,
      verdict: verdict,
      issues: mock.issues || [],
      confidence: typeof mock.confidence === 'number' ? mock.confidence : null,
      note_zh: mock.note_zh || '',
      note_en: mock.note_en || ''
    };
  }

  function arbitrate(sample) {
    var mock = sample.mockLayer3;
    if (!mock) return null;
    return {
      simulated: true,
      decision: mock.decision,
      reason_zh: mock.reason_zh || '',
      reason_en: mock.reason_en || ''
    };
  }

  global.PrecheckMockReview = {
    reviewSemantic: reviewSemantic,
    arbitrate: arbitrate,
    SIMULATED: true
  };
})(typeof window !== 'undefined' ? window : this);
