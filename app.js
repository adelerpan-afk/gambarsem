const els = {
  file: document.querySelector("#svgFile"),
  fileName: document.querySelector("#fileName"),
  tileWidth: document.querySelector("#tileWidth"),
  tileHeight: document.querySelector("#tileHeight"),
  count: document.querySelector("#count"),
  seed: document.querySelector("#seed"),
  baseScale: document.querySelector("#baseScale"),
  scaleVariance: document.querySelector("#scaleVariance"),
  rotation: document.querySelector("#rotation"),
  spacing: document.querySelector("#spacing"),
  jitter: document.querySelector("#jitter"),
  distribution: document.querySelectorAll('input[name="distribution"]'),
  randomMode: document.querySelector("#randomMode"),
  allowEdgeCuts: document.querySelector("#allowEdgeCuts"),
  showTile: document.querySelector("#showTile"),
  generateBtn: document.querySelector("#generateBtn"),
  autoLayoutBtn: document.querySelector("#autoLayoutBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  shuffleBtn: document.querySelector("#shuffleBtn"),
  downloadPngBtn: document.querySelector("#downloadPngBtn"),
  downloadSvgBtn: document.querySelector("#downloadSvgBtn"),
  repeatPreview: document.querySelector("#repeatPreview"),
  tileFrame: document.querySelector("#tileFrame"),
  canvas: document.querySelector("#tileCanvas"),
  previewScale: document.querySelector("#previewScale"),
  statusText: document.querySelector("#statusText"),
  baseScaleValue: document.querySelector("#baseScaleValue"),
  scaleVarianceValue: document.querySelector("#scaleVarianceValue"),
  rotationValue: document.querySelector("#rotationValue"),
  spacingValue: document.querySelector("#spacingValue"),
  jitterValue: document.querySelector("#jitterValue"),
  coverageLabel: document.querySelector("#coverageLabel"),
  coverageBar: document.querySelector("#coverageBar"),
  statCoverage: document.querySelector("#statCoverage"),
  statObjectCount: document.querySelector("#statObjectCount"),
  statAverageDistance: document.querySelector("#statAverageDistance"),
  statDuplicateEdge: document.querySelector("#statDuplicateEdge"),
  statLargest: document.querySelector("#statLargest"),
  statSmallest: document.querySelector("#statSmallest"),
  statCanvasSize: document.querySelector("#statCanvasSize"),
};

const ctx = els.canvas.getContext("2d");
const CANVAS_RATIO = 16 / 9;
const MAX_PLACEMENT_ATTEMPTS = 300;
const MAX_SHRINK_STEPS = 6;

const state = {
  sourceText: "",
  sourceUrl: "",
  image: null,
  sourceAspect: 1,
  placements: [],
  skippedCount: 0,
};

const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">
  <path d="M18 45 C18 22 37 10 60 10 C83 10 102 22 102 45 C102 68 83 80 60 80 C37 80 18 68 18 45Z" fill="#0e7c66"/>
  <path d="M40 28 C52 18 70 18 82 28" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <circle cx="45" cy="50" r="7" fill="#e0a458"/>
  <circle cx="75" cy="50" r="7" fill="#d65f68"/>
</svg>`;

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function numberFrom(el) {
  return Number.parseFloat(el.value);
}

function getSettings() {
  const width = Math.round(numberFrom(els.tileWidth));
  const height = Math.round(width / CANVAS_RATIO);
  const distribution = document.querySelector('input[name="distribution"]:checked')?.value ?? "random";

  return {
    width,
    height,
    count: Math.round(numberFrom(els.count)),
    seed: Math.round(numberFrom(els.seed)),
    baseScale: numberFrom(els.baseScale) / 100,
    scaleVariance: numberFrom(els.scaleVariance) / 100,
    rotation: numberFrom(els.rotation),
    spacing: numberFrom(els.spacing),
    minPoissonDistance: numberFrom(els.spacing),
    jitter: numberFrom(els.jitter) / 100,
    distribution,
    randomMode: els.randomMode.checked,
    allowEdgeCuts: els.allowEdgeCuts.checked,
  };
}

function updateLabels() {
  els.baseScaleValue.value = `${els.baseScale.value}%`;
  els.scaleVarianceValue.value = `${els.scaleVariance.value}%`;
  els.rotationValue.value = `${els.rotation.value} deg`;
  els.spacingValue.value = `${els.spacing.value} px`;
  els.jitterValue.value = `${els.jitter.value}%`;
}

function exportSizeLabel(settings = getSettings()) {
  return settings.width === 3840 && settings.height === 2160 ? "4K" : `${settings.width}x${settings.height}`;
}

function exportFileLabel(settings = getSettings()) {
  return exportSizeLabel(settings).toLowerCase();
}

function updateExportLabels() {
  const label = exportSizeLabel();
  els.downloadPngBtn.textContent = `Download PNG ${label}`;
  els.downloadSvgBtn.textContent = `Download SVG ${label}`;
}

function selectedDistributionInput(value) {
  return Array.from(els.distribution).find((input) => input.value === value);
}

function setDistribution(value) {
  const input = selectedDistributionInput(value);
  if (input) input.checked = true;
  els.randomMode.checked = value !== "grid";
}

function parseSvgAspect(svgText) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return 1;

  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) return parts[2] / parts[3];
  }

  const width = Number.parseFloat(svg.getAttribute("width"));
  const height = Number.parseFloat(svg.getAttribute("height"));
  return width > 0 && height > 0 ? width / height : 1;
}

function loadImageFromText(svgText) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG tidak bisa dibaca sebagai gambar."));
    };
    image.src = url;
  });
}

function edgeAnchor(index, settings, random) {
  const side = index % 4;
  const edgeBand = Math.min(64, Math.min(settings.width, settings.height) * 0.08);
  if (side === 0) return { x: random() * edgeBand, y: random() * settings.height };
  if (side === 1) return { x: settings.width - random() * edgeBand, y: random() * settings.height };
  if (side === 2) return { x: random() * settings.width, y: random() * edgeBand };
  return { x: random() * settings.width, y: settings.height - random() * edgeBand };
}

function dimensionsForLongSide(longSide) {
  return {
    width: state.sourceAspect >= 1 ? longSide : longSide * state.sourceAspect,
    height: state.sourceAspect >= 1 ? longSide / state.sourceAspect : longSide,
  };
}

function makeCandidate(index, settings, random, longSide, point = null) {
  const dimensions = dimensionsForLongSide(longSide);
  const rotation = settings.rotation === 0 ? 0 : (random() * 2 - 1) * settings.rotation;
  const base = { width: dimensions.width, height: dimensions.height, rotation };
  const edgePoint = settings.allowEdgeCuts && index < 4 ? edgeAnchor(index, settings, random) : null;
  const position = edgePoint ?? point ?? PatternDistribution.randomPosition(settings, random, base);

  return {
    x: position.x,
    y: position.y,
    width: dimensions.width,
    height: dimensions.height,
    rotation,
    opacity: 1,
  };
}

function candidatePositionForAttempt(index, attempt, settings, random, candidate, placed) {
  if (attempt === 0 && settings.allowEdgeCuts && index < 4) return { x: candidate.x, y: candidate.y };
  return PatternDistribution.positionForAttempt({
    index,
    attempt,
    settings,
    random,
    item: candidate,
    placed,
  });
}

function placeOneObject(index, settings, random, baseLongSide, placed) {
  const variance = 1 + (random() - 0.5) * settings.scaleVariance;
  const initialLongSide = clamp(baseLongSide * variance, 8, Math.min(settings.width, settings.height));

  for (let shrinkStep = 0; shrinkStep <= MAX_SHRINK_STEPS; shrinkStep += 1) {
    const longSide = initialLongSide * 0.9 ** shrinkStep;

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
      const candidate = makeCandidate(index, settings, random, longSide);
      const point = candidatePositionForAttempt(index, attempt, settings, random, candidate, placed);
      candidate.x = point.x;
      candidate.y = point.y;

      if (!PatternCollision.collidesWithExisting(candidate, placed, settings, settings.spacing)) {
        candidate.attempts = attempt + 1;
        candidate.scaleReduction = shrinkStep;
        return candidate;
      }
    }
  }

  return null;
}

function estimateObjectArea(longSide, aspect) {
  const width = aspect >= 1 ? longSide : longSide * aspect;
  const height = aspect >= 1 ? longSide / aspect : longSide;
  return width * height;
}

function calculateAutoLayout() {
  const settings = getSettings();
  const canvasArea = settings.width * settings.height;
  const targetCoverage = 0.3;
  const aspect = Math.max(0.05, state.sourceAspect || 1);
  const shortSide = Math.min(settings.width, settings.height);
  const canvasScale = Math.sqrt(canvasArea / (3840 * 2160));
  const baseCount = clamp(Math.round(30 * canvasScale), 14, 96);
  let count = baseCount;
  let longSide = Math.sqrt((canvasArea * targetCoverage) / (count * (aspect >= 1 ? 1 / aspect : aspect)));

  longSide = clamp(longSide, shortSide * 0.055, shortSide * 0.18);

  let objectArea = estimateObjectArea(longSide, aspect);
  count = clamp(Math.round((canvasArea * targetCoverage) / objectArea), 8, 140);
  const gridCellArea = canvasArea / count;
  const spacing = clamp(Math.sqrt(gridCellArea) * 0.12, shortSide * 0.012, 180);
  const scale = clamp((longSide / shortSide) * 100, 5, 80);
  const variance = clamp(24 + Math.abs(aspect - 1) * 8, 18, 44);
  const jitter = 72;

  return {
    count: Math.round(count),
    scale: Math.round(scale),
    spacing: Math.round(spacing),
    variance: Math.round(variance),
    jitter,
  };
}

function applyAutoLayout() {
  const layout = calculateAutoLayout();
  els.count.value = layout.count;
  els.baseScale.value = layout.scale;
  els.scaleVariance.value = layout.variance;
  els.spacing.value = layout.spacing;
  els.jitter.value = layout.jitter;
  setDistribution("blue-noise");
  updateLabels();
  drawPattern();
}

function buildPlacements(settings) {
  const random = mulberry32(settings.seed);
  const baseLongSide = Math.min(settings.width, settings.height) * settings.baseScale;
  const placed = [];
  let skippedCount = 0;

  for (let index = 0; index < settings.count; index += 1) {
    const item = placeOneObject(index, settings, random, baseLongSide, placed);
    if (item) placed.push(item);
    else skippedCount += 1;
  }

  state.skippedCount = skippedCount;
  return placed;
}

function drawImageItem(item, dx, dy) {
  ctx.save();
  ctx.translate(item.x + dx, item.y + dy);
  ctx.rotate((item.rotation * Math.PI) / 180);
  ctx.globalAlpha = item.opacity;
  ctx.drawImage(state.image, -item.width / 2, -item.height / 2, item.width, item.height);
  ctx.restore();
}

function updateStatsPanel(settings) {
  const stats = PatternStats.calculatePatternStats(
    state.placements,
    settings,
    PatternCollision.wrapOffsets,
  );
  const coverage = Math.max(0, stats.coverage);
  const progressWidth = Math.min(100, coverage);
  const coverageText = `${coverage.toFixed(1)}%`;

  els.coverageLabel.textContent = coverageText;
  els.statCoverage.textContent = coverageText;
  els.statObjectCount.textContent = `${stats.objectCount}`;
  els.statAverageDistance.textContent = `${Math.round(stats.averageDistance)} px`;
  els.statDuplicateEdge.textContent = `${stats.duplicateEdgeObjects}`;
  els.statLargest.textContent = `${Math.round(stats.largestObject)} px2`;
  els.statSmallest.textContent = `${Math.round(stats.smallestObject)} px2`;
  els.statCanvasSize.textContent = stats.canvasSize;
  els.coverageBar.style.width = `${progressWidth}%`;
  els.coverageBar.classList.remove("coverage-good", "coverage-warn", "coverage-danger");

  if (coverage >= 20 && coverage < 40) els.coverageBar.classList.add("coverage-good");
  if (coverage >= 40 && coverage <= 60) els.coverageBar.classList.add("coverage-warn");
  if (coverage > 60) els.coverageBar.classList.add("coverage-danger");
}

function drawPattern() {
  const settings = getSettings();
  els.canvas.width = settings.width;
  els.canvas.height = settings.height;

  if (!state.image) {
    ctx.clearRect(0, 0, settings.width, settings.height);
    updatePreviewBackground(settings);
    updateStatsPanel(settings);
    els.statusText.textContent = "Upload SVG untuk mulai membuat pattern 16:9.";
    return;
  }

  ctx.clearRect(0, 0, settings.width, settings.height);
  state.placements = buildPlacements(settings);
  state.placements.forEach((item) => {
    PatternCollision.wrapOffsets(item, settings).forEach(({ dx, dy }) => drawImageItem(item, dx, dy));
  });

  updatePreviewBackground(settings);
  updateStatsPanel(settings);

  const duplicateCount = state.placements.reduce((sum, item) => {
    return sum + PatternCollision.wrapOffsets(item, settings).length - 1;
  }, 0);
  const skipped = state.skippedCount ? `, ${state.skippedCount} objek dilewati karena collision` : "";
  els.statusText.textContent = `${state.placements.length} objek, ${duplicateCount} salinan tepi${skipped}, canvas ${settings.width} x ${settings.height}px, rasio 16:9.`;
}

function updatePreviewBackground(settings = getSettings()) {
  const scale = numberFrom(els.previewScale) / 100;
  const url = els.canvas.toDataURL("image/png");
  const displayW = Math.round(settings.width * scale);
  const displayH = Math.round(settings.height * scale);
  els.repeatPreview.style.backgroundImage = `url("${url}")`;
  els.repeatPreview.style.backgroundSize = `${displayW}px ${displayH}px`;
  els.tileFrame.style.width = `${displayW}px`;
  els.tileFrame.style.height = `${displayH}px`;
  els.tileFrame.classList.toggle("hidden-border", !els.showTile.checked);
}

function validateCurrentCollisions() {
  const settings = getSettings();
  for (let i = 0; i < state.placements.length; i += 1) {
    for (let j = i + 1; j < state.placements.length; j += 1) {
      if (
        PatternCollision.collidesWithExisting(
          state.placements[i],
          [state.placements[j]],
          settings,
          settings.spacing,
        )
      ) {
        return { valid: false, pair: [i, j] };
      }
    }
  }
  return { valid: true, pair: null };
}

window.PatternAppDebug = {
  getPlacements: () => state.placements.map((item) => ({ ...item })),
  validateCurrentCollisions,
};

function download(filename, href) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = href;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadPng() {
  if (!state.image) return;
  const settings = getSettings();
  download(`seamless-pattern-${exportFileLabel(settings)}-${els.seed.value}.png`, els.canvas.toDataURL("image/png"));
}

function imageHref() {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(state.sourceText)))}`;
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function downloadSvg() {
  if (!state.image) return;
  const settings = getSettings();
  const href = imageHref();
  const images = state.placements
    .flatMap((item) =>
      PatternCollision.wrapOffsets(item, settings).map(({ dx, dy }) => {
        const x = item.x + dx;
        const y = item.y + dy;
        return [
          `<image href="${href}"`,
          `x="${escapeAttr(-item.width / 2)}" y="${escapeAttr(-item.height / 2)}"`,
          `width="${escapeAttr(item.width)}" height="${escapeAttr(item.height)}"`,
          `transform="translate(${escapeAttr(x)} ${escapeAttr(y)}) rotate(${escapeAttr(item.rotation)})" />`,
        ].join(" ");
      }),
    )
    .join("\n  ");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${settings.width}" height="${settings.height}" viewBox="0 0 ${settings.width} ${settings.height}">`,
    `  <defs><clipPath id="tileClip"><rect width="${settings.width}" height="${settings.height}" /></clipPath></defs>`,
    `  <rect width="100%" height="100%" fill="transparent" />`,
    `  <g clip-path="url(#tileClip)">`,
    `  ${images}`,
    `  </g>`,
    `</svg>`,
  ].join("\n");
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  download(`seamless-pattern-${exportFileLabel(settings)}-${els.seed.value}.svg`, url);
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function handleFile(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const svgText = await file.text();
    const loaded = await loadImageFromText(svgText);
    if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
    state.sourceText = svgText;
    state.sourceUrl = loaded.url;
    state.image = loaded.image;
    state.sourceAspect = parseSvgAspect(svgText);
    els.fileName.textContent = file.name;
    drawPattern();
  } catch (error) {
    els.statusText.textContent = error.message;
  }
}

async function useSampleSvg() {
  try {
    const loaded = await loadImageFromText(sampleSvg);
    if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
    state.sourceText = sampleSvg;
    state.sourceUrl = loaded.url;
    state.image = loaded.image;
    state.sourceAspect = parseSvgAspect(sampleSvg);
    els.fileName.textContent = "contoh-shape.svg";
    drawPattern();
  } catch (error) {
    els.statusText.textContent = error.message;
  }
}

function shuffleSeed() {
  els.seed.value = Math.floor(Math.random() * 999999) + 1;
  drawPattern();
}

function syncHeightToWidth() {
  const width = Math.round(numberFrom(els.tileWidth));
  els.tileHeight.value = Math.round(width / CANVAS_RATIO);
}

function syncWidthToHeight() {
  const height = Math.round(numberFrom(els.tileHeight));
  els.tileWidth.value = Math.round(height * CANVAS_RATIO);
}

[
  els.count,
  els.seed,
  els.baseScale,
  els.scaleVariance,
  els.rotation,
  els.spacing,
  els.jitter,
  els.allowEdgeCuts,
].forEach((el) => {
  el.addEventListener("input", () => {
    updateLabels();
    drawPattern();
  });
});

els.distribution.forEach((input) => {
  input.addEventListener("input", () => {
    els.randomMode.checked = input.value !== "grid";
    drawPattern();
  });
});
els.randomMode.addEventListener("input", () => {
  setDistribution(els.randomMode.checked ? "random" : "grid");
  drawPattern();
});
els.tileWidth.addEventListener("input", () => {
  syncHeightToWidth();
  updateExportLabels();
  drawPattern();
});
els.tileHeight.addEventListener("input", () => {
  syncWidthToHeight();
  updateExportLabels();
  drawPattern();
});
els.file.addEventListener("change", handleFile);
els.generateBtn.addEventListener("click", drawPattern);
els.autoLayoutBtn.addEventListener("click", applyAutoLayout);
els.sampleBtn.addEventListener("click", useSampleSvg);
els.shuffleBtn.addEventListener("click", shuffleSeed);
els.downloadPngBtn.addEventListener("click", downloadPng);
els.downloadSvgBtn.addEventListener("click", downloadSvg);
els.previewScale.addEventListener("input", () => updatePreviewBackground());
els.showTile.addEventListener("input", () => updatePreviewBackground());

updateLabels();
syncHeightToWidth();
updateExportLabels();
setDistribution("random");
drawPattern();
