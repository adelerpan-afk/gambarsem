const els = {
  file: document.querySelector("#svgFile"),
  fileName: document.querySelector("#fileName"),
  thumbStrip: document.querySelector("#thumbStrip"),
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
  bgMode: document.querySelectorAll('input[name="bgMode"]'),
  bgColorPicker: document.querySelector("#bgColorPicker"),
  colorMode: document.querySelectorAll('input[name="colorMode"]'),
  singleColorPicker: document.querySelector("#singleColorPicker"),
  multiColorHex: document.querySelector("#multiColorHex"),
  randomColorBtn: document.querySelector("#randomColorBtn"),
  generateBtn: document.querySelector("#generateBtn"),
  autoLayoutBtn: document.querySelector("#autoLayoutBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  shuffleBtn: document.querySelector("#shuffleBtn"),
  downloadPngBtn: document.querySelector("#downloadPngBtn"),
  downloadSvgBtn: document.querySelector("#downloadSvgBtn"),
  batchCount: document.querySelector("#batchCount"),
  batchFormat: document.querySelector("#batchFormat"),
  batchDownloadBtn: document.querySelector("#batchDownloadBtn"),
  batchStatus: document.querySelector("#batchStatus"),
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
  repeatCount: document.querySelector("#repeatCount"),
  repeatCountValue: document.querySelector("#repeatCountValue"),
};

const ctx = els.canvas.getContext("2d");
const CANVAS_RATIO = 16 / 9;
const MAX_PLACEMENT_ATTEMPTS = 300;
const MAX_SHRINK_STEPS = 6;
const CLIENT_ZIP_URL = "https://cdn.jsdelivr.net/npm/client-zip@2.5.0/index.js";

const state = {
  sources: [],
  nextSourceId: 1,
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

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parseHexList(text) {
  return (text || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value));
}

function randomHexColor() {
  const value = Math.floor(Math.random() * 0xffffff);
  return `#${value.toString(16).padStart(6, "0")}`;
}

function checkedSources() {
  return state.sources.filter((source) => source.checked);
}

function getSettings() {
  const width = Math.round(numberFrom(els.tileWidth));
  const height = Math.round(width / CANVAS_RATIO);
  const distribution = document.querySelector('input[name="distribution"]:checked')?.value ?? "random";
  const bgMode = document.querySelector('input[name="bgMode"]:checked')?.value ?? "transparent";
  const colorMode = document.querySelector('input[name="colorMode"]:checked')?.value ?? "original";

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
    background: {
      mode: bgMode,
      color: els.bgColorPicker.value,
    },
    coloring: {
      mode: colorMode,
      singleColor: els.singleColorPicker.value,
      colors: parseHexList(els.multiColorHex.value),
    },
  };
}

function updateLabels() {
  els.baseScaleValue.value = `${els.baseScale.value}%`;
  els.scaleVarianceValue.value = `${els.scaleVariance.value}%`;
  els.rotationValue.value = `${els.rotation.value} deg`;
  els.spacingValue.value = `${els.spacing.value} px`;
  els.jitterValue.value = `${els.jitter.value}%`;
}

function updateRepeatLabel() {
  els.repeatCountValue.textContent = `${els.repeatCount.value}×`;
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

function setRadioValue(nodeList, value) {
  Array.from(nodeList).forEach((input) => {
    input.checked = input.value === value;
  });
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

function updateFileLabel() {
  const total = state.sources.length;
  const active = checkedSources().length;
  els.fileName.textContent = total ? `${active}/${total} SVG aktif` : "Pilih file SVG (bisa banyak)";
}

function renderThumbStrip() {
  els.thumbStrip.innerHTML = "";
  state.sources.forEach((source) => {
    const item = document.createElement("div");
    item.className = "thumb-item";
    item.innerHTML = `
      <button type="button" class="thumb-remove" data-remove="${source.id}" aria-label="Hapus ${escapeAttr(source.name)}">×</button>
      <span class="thumb-preview"><img src="${source.url}" alt="${escapeAttr(source.name)}" /></span>
      <label class="thumb-check">
        <input type="checkbox" data-toggle="${source.id}" ${source.checked ? "checked" : ""} />
        <span class="thumb-name" title="${escapeAttr(source.name)}">${escapeAttr(source.name)}</span>
      </label>
    `;
    els.thumbStrip.appendChild(item);
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

function dimensionsForLongSide(longSide, aspect) {
  return {
    width: aspect >= 1 ? longSide : longSide * aspect,
    height: aspect >= 1 ? longSide / aspect : longSide,
  };
}

function makeCandidate(index, settings, random, longSide, aspect, point = null) {
  const dimensions = dimensionsForLongSide(longSide, aspect);
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

function pickColorForItem(settings, random) {
  if (settings.coloring.mode === "single") return settings.coloring.singleColor;
  if (settings.coloring.mode === "multi" && settings.coloring.colors.length) {
    return settings.coloring.colors[Math.floor(random() * settings.coloring.colors.length)];
  }
  return null;
}

function placeOneObject(index, settings, random, baseLongSide, placed, sources) {
  const sourceIndex = Math.floor(random() * sources.length);
  const source = sources[sourceIndex];
  const aspect = Math.max(0.05, source.aspect || 1);
  const color = pickColorForItem(settings, random);
  const variance = 1 + (random() - 0.5) * settings.scaleVariance;
  const initialLongSide = clamp(baseLongSide * variance, 8, Math.min(settings.width, settings.height));

  for (let shrinkStep = 0; shrinkStep <= MAX_SHRINK_STEPS; shrinkStep += 1) {
    const longSide = initialLongSide * 0.9 ** shrinkStep;

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
      const candidate = makeCandidate(index, settings, random, longSide, aspect);
      const point = candidatePositionForAttempt(index, attempt, settings, random, candidate, placed);
      candidate.x = point.x;
      candidate.y = point.y;

      if (!PatternCollision.collidesWithExisting(candidate, placed, settings, settings.spacing)) {
        candidate.attempts = attempt + 1;
        candidate.scaleReduction = shrinkStep;
        candidate.source = source;
        candidate.color = color;
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
  const sources = checkedSources();
  const aspect = Math.max(0.05, sources[0]?.aspect || 1);
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
  const sources = checkedSources();
  const placed = [];
  let skippedCount = 0;

  if (!sources.length) {
    state.skippedCount = 0;
    return placed;
  }

  for (let index = 0; index < settings.count; index += 1) {
    const item = placeOneObject(index, settings, random, baseLongSide, placed, sources);
    if (item) placed.push(item);
    else skippedCount += 1;
  }

  state.skippedCount = skippedCount;
  return placed;
}

function recoloredCanvas(image, width, height, color) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const offCtx = off.getContext("2d");
  offCtx.drawImage(image, 0, 0, w, h);
  offCtx.globalCompositeOperation = "source-atop";
  offCtx.fillStyle = color;
  offCtx.fillRect(0, 0, w, h);
  return off;
}

function renderSourceFor(item) {
  if (!item.renderSource) {
    item.renderSource = item.color
      ? recoloredCanvas(item.source.image, item.width, item.height, item.color)
      : item.source.image;
  }
  return item.renderSource;
}

function drawImageItem(item, dx, dy) {
  ctx.save();
  ctx.translate(item.x + dx, item.y + dy);
  ctx.rotate((item.rotation * Math.PI) / 180);
  ctx.globalAlpha = item.opacity;
  ctx.drawImage(renderSourceFor(item), -item.width / 2, -item.height / 2, item.width, item.height);
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

  ctx.clearRect(0, 0, settings.width, settings.height);
  if (settings.background.mode === "color") {
    ctx.fillStyle = settings.background.color;
    ctx.fillRect(0, 0, settings.width, settings.height);
  }

  const sources = checkedSources();

  if (!sources.length) {
    state.placements = [];
    updatePreviewBackground(settings);
    updateStatsPanel(settings);
    els.statusText.textContent = state.sources.length
      ? "Centang minimal satu SVG untuk membuat pattern."
      : "Upload SVG untuk mulai membuat pattern 16:9.";
    return;
  }

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

// PERBAIKAN: backgroundSize dibagi dengan repeat, bukan dikali
function updatePreviewBackground(settings = getSettings()) {
  const scale = numberFrom(els.previewScale) / 100;
  const repeat = Math.round(numberFrom(els.repeatCount)) || 1;
  const url = els.canvas.toDataURL("image/png");
  const displayW = Math.round(settings.width * scale);
  const displayH = Math.round(settings.height * scale);
  const tileW = displayW / repeat;
  const tileH = displayH / repeat;
  els.repeatPreview.style.backgroundImage = `url("${url}")`;
  els.repeatPreview.style.backgroundSize = `${tileW}px ${tileH}px`;
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
  if (!state.placements.length) return;
  const settings = getSettings();
  download(`seamless-pattern-${exportFileLabel(settings)}-${els.seed.value}.png`, els.canvas.toDataURL("image/png"));
}

function svgFilterId(hex) {
  return `recolor-${hex.replace("#", "").toLowerCase()}`;
}

function buildSvgMarkup(settings, placements) {
  const sourceHrefs = new Map();
  placements.forEach((item) => {
    if (!sourceHrefs.has(item.source.id)) {
      sourceHrefs.set(
        item.source.id,
        `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(item.source.text)))}`,
      );
    }
  });

  const usedColors = new Map();
  placements.forEach((item) => {
    if (item.color && !usedColors.has(item.color)) {
      usedColors.set(item.color, svgFilterId(item.color));
    }
  });

  const filterDefs = Array.from(usedColors.entries())
    .map(
      ([hex, filterId]) =>
        `<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%"><feFlood flood-color="${escapeAttr(hex)}" result="flood" /><feComposite in="flood" in2="SourceGraphic" operator="in" /></filter>`,
    )
    .join("\n    ");

  const images = placements
    .flatMap((item) =>
      PatternCollision.wrapOffsets(item, settings).map(({ dx, dy }) => {
        const x = item.x + dx;
        const y = item.y + dy;
        const href = sourceHrefs.get(item.source.id);
        const filterAttr = item.color ? ` filter="url(#${usedColors.get(item.color)})"` : "";
        return [
          `<image href="${href}"${filterAttr}`,
          `x="${escapeAttr(-item.width / 2)}" y="${escapeAttr(-item.height / 2)}"`,
          `width="${escapeAttr(item.width)}" height="${escapeAttr(item.height)}"`,
          `transform="translate(${escapeAttr(x)} ${escapeAttr(y)}) rotate(${escapeAttr(item.rotation)})" />`,
        ].join(" ");
      }),
    )
    .join("\n    ");

  const backgroundRect =
    settings.background.mode === "color"
      ? `<rect width="100%" height="100%" fill="${escapeAttr(settings.background.color)}" />`
      : `<rect width="100%" height="100%" fill="transparent" />`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${settings.width}" height="${settings.height}" viewBox="0 0 ${settings.width} ${settings.height}">`,
    `  <defs><clipPath id="tileClip"><rect width="${settings.width}" height="${settings.height}" /></clipPath>${filterDefs ? `\n    ${filterDefs}` : ""}</defs>`,
    `  ${backgroundRect}`,
    `  <g clip-path="url(#tileClip)">`,
    `    ${images}`,
    `  </g>`,
    `</svg>`,
  ].join("\n");
}

function downloadSvg() {
  if (!state.placements.length) return;
  const settings = getSettings();
  const svg = buildSvgMarkup(settings, state.placements);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  download(`seamless-pattern-${exportFileLabel(settings)}-${els.seed.value}.svg`, url);
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function handleFiles(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  for (const file of files) {
    try {
      const svgText = await file.text();
      const loaded = await loadImageFromText(svgText);
      state.sources.push({
        id: state.nextSourceId++,
        name: file.name,
        text: svgText,
        url: loaded.url,
        image: loaded.image,
        aspect: parseSvgAspect(svgText),
        checked: true,
      });
    } catch (error) {
      els.statusText.textContent = error.message;
    }
  }

  event.target.value = "";
  renderThumbStrip();
  updateFileLabel();
  drawPattern();
}

async function useSampleSvg() {
  try {
    const loaded = await loadImageFromText(sampleSvg);
    state.sources.push({
      id: state.nextSourceId++,
      name: "contoh-shape.svg",
      text: sampleSvg,
      url: loaded.url,
      image: loaded.image,
      aspect: parseSvgAspect(sampleSvg),
      checked: true,
    });
    renderThumbStrip();
    updateFileLabel();
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

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function* batchFileGenerator(count, format) {
  for (let i = 0; i < count; i += 1) {
    if (i > 0) els.seed.value = Math.floor(Math.random() * 999999) + 1;
    drawPattern();
    await nextFrame();

    const settings = getSettings();
    const seedLabel = els.seed.value;
    els.batchStatus.textContent = `Membuat gambar ${i + 1}/${count} (seed ${seedLabel})...`;

    if (format === "png" || format === "both") {
      const blob = await canvasToBlob(els.canvas);
      if (blob) yield { name: `png/pattern-${seedLabel}.png`, input: blob, lastModified: new Date() };
    }
    if (format === "svg" || format === "both") {
      const svg = buildSvgMarkup(settings, state.placements);
      yield {
        name: `svg/pattern-${seedLabel}.svg`,
        input: new Blob([svg], { type: "image/svg+xml" }),
        lastModified: new Date(),
      };
    }
  }
}

async function batchDownload() {
  if (!checkedSources().length) {
    els.batchStatus.textContent = "Centang minimal satu SVG dulu.";
    return;
  }

  const count = clamp(Math.round(numberFrom(els.batchCount)) || 1, 1, 500);
  const format = els.batchFormat.value;
  const zipName = `batch-pattern-${Date.now()}.zip`;

  // Minta lokasi simpan lebih dulu (masih dalam konteks klik user) supaya
  // showSaveFilePicker tidak ditolak browser, lalu baru mulai proses generate.
  let handle = null;
  if (window.showSaveFilePicker) {
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: zipName,
        types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }],
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        els.batchStatus.textContent = "Batch dibatalkan.";
        return;
      }
      handle = null;
    }
  }

  const originalSeed = els.seed.value;
  els.batchDownloadBtn.disabled = true;
  els.batchStatus.textContent = "Menyiapkan batch...";

  try {
    const { downloadZip } = await import(CLIENT_ZIP_URL);
    const response = downloadZip(batchFileGenerator(count, format));

    if (handle) {
      const writable = await handle.createWritable();
      await response.body.pipeTo(writable);
      els.batchStatus.textContent = `Selesai. ${count} pattern (seed acak) disimpan ke ${zipName}.`;
    } else {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      download(zipName, url);
      window.setTimeout(() => URL.revokeObjectURL(url), 500);
      els.batchStatus.textContent = `Selesai. ${count} pattern (seed acak) diunduh sebagai ${zipName}.`;
    }
  } catch (error) {
    els.batchStatus.textContent = `Gagal membuat batch: ${error.message}`;
  } finally {
    els.seed.value = originalSeed;
    drawPattern();
    els.batchDownloadBtn.disabled = false;
  }
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
els.bgMode.forEach((input) => input.addEventListener("input", drawPattern));
els.bgColorPicker.addEventListener("input", drawPattern);
els.colorMode.forEach((input) => input.addEventListener("input", drawPattern));
els.singleColorPicker.addEventListener("input", drawPattern);
els.multiColorHex.addEventListener("input", drawPattern);
els.randomColorBtn.addEventListener("click", () => {
  const total = clamp(Math.round(numberFrom(els.count)) || 6, 3, 12);
  const colors = Array.from({ length: total }, randomHexColor);
  els.multiColorHex.value = colors.join(", ");
  setRadioValue(els.colorMode, "multi");
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
els.file.addEventListener("change", handleFiles);
els.thumbStrip.addEventListener("change", (event) => {
  const id = Number(event.target.dataset.toggle);
  if (!id) return;
  const source = state.sources.find((item) => item.id === id);
  if (source) source.checked = event.target.checked;
  updateFileLabel();
  drawPattern();
});
els.thumbStrip.addEventListener("click", (event) => {
  const id = Number(event.target.dataset.remove);
  if (!id) return;
  const index = state.sources.findIndex((item) => item.id === id);
  if (index === -1) return;
  URL.revokeObjectURL(state.sources[index].url);
  state.sources.splice(index, 1);
  renderThumbStrip();
  updateFileLabel();
  drawPattern();
});
els.generateBtn.addEventListener("click", drawPattern);
els.autoLayoutBtn.addEventListener("click", applyAutoLayout);
els.sampleBtn.addEventListener("click", useSampleSvg);
els.shuffleBtn.addEventListener("click", shuffleSeed);
els.downloadPngBtn.addEventListener("click", downloadPng);
els.downloadSvgBtn.addEventListener("click", downloadSvg);
els.batchDownloadBtn.addEventListener("click", batchDownload);
els.previewScale.addEventListener("input", () => updatePreviewBackground());
els.showTile.addEventListener("input", () => updatePreviewBackground());

els.repeatCount.addEventListener("input", () => {
  updateRepeatLabel();
  updatePreviewBackground();
});

updateLabels();
syncHeightToWidth();
updateExportLabels();
setDistribution("random");
updateFileLabel();
updateRepeatLabel();
drawPattern();
