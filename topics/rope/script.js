"use strict";

const ORIGINAL_CONTEXT = 4096;
const DIMENSION = 128;
const ROPE_BASE = 10000;
const QUERY_ANGLE = 0.61;
const KEY_ANGLE = -0.34;
const TAU = Math.PI * 2;

const elements = {
  query: document.querySelector("#query-position"),
  queryValue: document.querySelector("#query-position-value"),
  key: document.querySelector("#key-position"),
  keyValue: document.querySelector("#key-position-value"),
  pair: document.querySelector("#pair-index"),
  pairValue: document.querySelector("#pair-index-value"),
  mode: document.querySelector("#scaling-mode"),
  context: document.querySelector("#context-length"),
  contextValue: document.querySelector("#context-length-value"),
  frequency: document.querySelector("#frequency-value"),
  score: document.querySelector("#score-value"),
  distance: document.querySelector("#distance-value"),
  rotationCanvas: document.querySelector("#rotation-canvas"),
  curveCanvas: document.querySelector("#curve-canvas"),
  toyForm: document.querySelector("#toy-form"),
  toyQuery: document.querySelector("#toy-query-position"),
  toyKey: document.querySelector("#toy-key-position"),
  toyResult: document.querySelector("#toy-result"),
};

const numberFormat = new Intl.NumberFormat("en-US");

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function getFrequency(pairIndex) {
  const original = ROPE_BASE ** (-2 * pairIndex / DIMENSION);
  const factor = Number(elements.context.value) / ORIGINAL_CONTEXT;
  const mode = elements.mode.value;

  if (mode === "linear") return original / factor;
  if (mode !== "yarn") return original;

  const low = Math.floor(
    DIMENSION * Math.log(ORIGINAL_CONTEXT / (32 * TAU)) / (2 * Math.log(ROPE_BASE)),
  );
  const high = Math.ceil(
    DIMENSION * Math.log(ORIGINAL_CONTEXT / TAU) / (2 * Math.log(ROPE_BASE)),
  );
  const blend = clamp((pairIndex - low) / (high - low), 0, 1);
  return (1 - blend) * (original / factor) + blend * original;
}

function setupCanvas(canvas) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  const context = canvas.getContext("2d");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { context, width: bounds.width, height: bounds.height };
}

function drawRotation(queryPosition, keyPosition, frequency) {
  const { context: ctx, width, height } = setupCanvas(elements.rotationCanvas);
  const centerX = width / 2;
  const centerY = height / 2 + 1;
  const radius = Math.min(width * 0.29, height * 0.39);
  const queryPhase = queryPosition * frequency + QUERY_ANGLE;
  const keyPhase = keyPosition * frequency + KEY_ANGLE;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#e9eeea";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX - radius - 17, centerY);
  ctx.lineTo(centerX + radius + 17, centerY);
  ctx.moveTo(centerX, centerY - radius - 17);
  ctx.lineTo(centerX, centerY + radius + 17);
  ctx.stroke();

  const vectors = [
    { phase: queryPhase, color: "#8871df", label: "qₘ", offsetX: -17, offsetY: 16 },
    { phase: keyPhase, color: "#e59a5b", label: "kₙ", offsetX: 7, offsetY: -9 },
  ];

  for (const vector of vectors) {
    const x = centerX + radius * Math.cos(vector.phase);
    const y = centerY - radius * Math.sin(vector.phase);
    ctx.strokeStyle = vector.color;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = vector.color;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, TAU);
    ctx.fill();
    ctx.font = "11px 'DM Mono', monospace";
    ctx.fillText(vector.label, x + vector.offsetX, y + vector.offsetY);
  }

  ctx.fillStyle = "#89968d";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 2.5, 0, TAU);
  ctx.fill();
}

function drawCurve(queryPosition, keyPosition, pairIndex, selectedFrequency) {
  const { context: ctx, width, height } = setupCanvas(elements.curveCanvas);
  const padding = { top: 13, right: 10, bottom: 23, left: 31 };
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = Math.max(1, height - padding.top - padding.bottom);
  const contextLength = Number(elements.context.value);
  const xMin = -contextLength;
  const xMax = contextLength;
  const phaseOffset = KEY_ANGLE - QUERY_ANGLE;
  const selectedDistance = keyPosition - queryPosition;
  const frequency = selectedFrequency;
  const xPosition = (distance) => padding.left + ((distance - xMin) / (xMax - xMin)) * plotWidth;
  const yPosition = (score) => padding.top + ((1.15 - score) / 2.3) * plotHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.font = "8px 'DM Mono', monospace";
  ctx.textAlign = "right";
  for (const value of [-1, 0, 1]) {
    const y = yPosition(value);
    ctx.strokeStyle = value === 0 ? "#dfe6df" : "#f0f3f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = "#9aa59c";
    ctx.fillText(String(value), padding.left - 8, y + 3);
  }

  ctx.strokeStyle = "#4e946a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= plotWidth; x += 1) {
    const distance = xMin + (x / plotWidth) * (xMax - xMin);
    const score = Math.cos(distance * frequency + phaseOffset);
    const y = yPosition(score);
    if (x === 0) ctx.moveTo(padding.left + x, y);
    else ctx.lineTo(padding.left + x, y);
  }
  ctx.stroke();

  const cursorX = xPosition(selectedDistance);
  const cursorY = yPosition(Math.cos(selectedDistance * frequency + phaseOffset));
  ctx.strokeStyle = "#a8c9b1";
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(cursorX, padding.top);
  ctx.lineTo(cursorX, height - padding.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#1e7659";
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, 4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#9aa59c";
  ctx.textAlign = "center";
  for (const value of [xMin, 0, xMax]) {
    const label = value === 0 ? "0" : `${value < 0 ? "−" : ""}${numberFormat.format(Math.abs(value) / 1024)}k`;
    ctx.fillText(label, xPosition(value), height - 7);
  }
  ctx.textAlign = "left";
  ctx.fillText(`pair ${pairIndex}`, padding.left + 5, padding.top + 9);
}

function update() {
  const contextLength = Number(elements.context.value);
  elements.query.max = String(contextLength);
  elements.key.max = String(contextLength);
  elements.query.parentElement.querySelector(".range-hints span:last-child").textContent =
    `${numberFormat.format(contextLength)} tokens`;
  elements.key.parentElement.querySelector(".range-hints span:last-child").textContent =
    `${numberFormat.format(contextLength)} tokens`;
  if (Number(elements.query.value) > contextLength) elements.query.value = String(contextLength);
  if (Number(elements.key.value) > contextLength) elements.key.value = String(contextLength);

  const queryPosition = Number(elements.query.value);
  const keyPosition = Number(elements.key.value);
  const pairIndex = Number(elements.pair.value);
  const frequency = getFrequency(pairIndex);
  const delta = keyPosition - queryPosition;
  const score = Math.cos(delta * frequency + KEY_ANGLE - QUERY_ANGLE);

  elements.queryValue.value = numberFormat.format(queryPosition);
  elements.queryValue.textContent = numberFormat.format(queryPosition);
  elements.keyValue.value = numberFormat.format(keyPosition);
  elements.keyValue.textContent = numberFormat.format(keyPosition);
  elements.pairValue.value = `${pairIndex} / 64`;
  elements.pairValue.textContent = `${pairIndex} / 64`;
  elements.contextValue.value = numberFormat.format(Number(elements.context.value));
  elements.contextValue.textContent = numberFormat.format(Number(elements.context.value));
  elements.frequency.textContent = `${frequency.toExponential(3)} rad/token`;
  elements.score.textContent = score.toFixed(3);
  elements.distance.textContent = `${delta < 0 ? "−" : ""}${numberFormat.format(Math.abs(delta))} tokens`;

  drawRotation(queryPosition, keyPosition, frequency);
  drawCurve(queryPosition, keyPosition, pairIndex, frequency);
}

elements.toyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const queryPosition = elements.toyQuery.valueAsNumber;
  const keyPosition = elements.toyKey.valueAsNumber;
  const validPosition = (value) => Number.isInteger(value) && value >= 0 && value <= 100000;

  if (!validPosition(queryPosition) || !validPosition(keyPosition)) {
    elements.toyResult.textContent = "Enter whole-number positions from 0 to 100,000.";
    return;
  }

  const delta = keyPosition - queryPosition;
  const score = Math.cos((delta * Math.PI) / 6);
  elements.toyResult.textContent =
    `Δ = ${delta}; angle difference = ${delta}π/6 radians; ` +
    `score = cos(${delta}π/6) = ${score.toFixed(3)}`;
});

for (const control of [elements.query, elements.key, elements.pair, elements.mode, elements.context]) {
  control.addEventListener("input", update);
  control.addEventListener("change", update);
}

let resizeTimer;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(update, 100);
});

update();
