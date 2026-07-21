(function exposeDistribution(global) {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function wrap(value, size) {
    return ((value % size) + size) % size;
  }

  function keepInsideCanvas(point, settings, item) {
    if (settings.allowEdgeCuts) {
      return {
        x: wrap(point.x, settings.width),
        y: wrap(point.y, settings.height),
      };
    }

    const box = global.PatternCollision.computeRotatedBox(item.width, item.height, item.rotation);
    return {
      x: clamp(point.x, box.width / 2, settings.width - box.width / 2),
      y: clamp(point.y, box.height / 2, settings.height - box.height / 2),
    };
  }

  function randomPosition(settings, random, item) {
    return keepInsideCanvas(
      {
        x: random() * settings.width,
        y: random() * settings.height,
      },
      settings,
      item,
    );
  }

  function gridPosition(index, settings, random, jitterFactor = 1) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(settings.count * (settings.width / settings.height))));
    const rows = Math.max(1, Math.ceil(settings.count / cols));
    const col = index % cols;
    const row = Math.floor(index / cols) % rows;
    const cellW = settings.width / cols;
    const cellH = settings.height / rows;
    const jitter = settings.jitter * jitterFactor;

    return {
      x: (col + 0.5) * cellW + (random() - 0.5) * cellW * jitter,
      y: (row + 0.5) * cellH + (random() - 0.5) * cellH * jitter,
    };
  }

  // ----- LAYOUT FUNCTIONS -----
  function diagonalFlowPosition(index, settings, random) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(settings.count * (settings.width / settings.height))));
    const rows = Math.max(1, Math.ceil(settings.count / cols));
    const col = index % cols;
    const row = Math.floor(index / cols) % rows;
    const cellW = settings.width / cols;
    const cellH = settings.height / rows;
    const offsetX = (row - rows / 2) * cellW * 0.15;
    const offsetY = (col - cols / 2) * cellH * 0.15;
    return {
      x: (col + 0.5) * cellW + offsetX + (random() - 0.5) * cellW * 0.1,
      y: (row + 0.5) * cellH + offsetY + (random() - 0.5) * cellH * 0.1,
    };
  }

  function radialPosition(settings, random, item) {
    const radius = Math.min(settings.width, settings.height) * 0.4 * random();
    const angle = random() * 2 * Math.PI;
    const cx = settings.width / 2;
    const cy = settings.height / 2;
    return keepInsideCanvas(
      {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      },
      settings,
      item
    );
  }

  function stripePosition(index, settings, random) {
    const stripeCount = Math.max(2, Math.round(Math.sqrt(settings.count)));
    const stripeIndex = index % stripeCount;
    const itemsPerStripe = Math.ceil(settings.count / stripeCount);
    const posInStripe = Math.floor(index / stripeCount);
    const stripeWidth = settings.width / stripeCount;
    const x = (stripeIndex + 0.5) * stripeWidth + (random() - 0.5) * stripeWidth * 0.15;
    const y = (posInStripe / itemsPerStripe) * settings.height + (random() - 0.5) * settings.height * 0.05;
    return { x, y };
  }

  function tossedPosition(settings, random, item) {
    const baseX = random() * settings.width;
    const baseY = random() * settings.height;
    const offsetRange = Math.min(settings.width, settings.height) * 0.08;
    const x = baseX + (random() - 0.5) * offsetRange;
    const y = baseY + (random() - 0.5) * offsetRange;
    return keepInsideCanvas({ x, y }, settings, item);
  }

  function scatteredPosition(settings, random, item) {
    return randomPosition(settings, random, item);
  }

  function allOverPosition(index, settings, random) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(settings.count * (settings.width / settings.height))));
    const rows = Math.max(1, Math.ceil(settings.count / cols));
    const col = index % cols;
    const row = Math.floor(index / cols) % rows;
    const cellW = settings.width / cols;
    const cellH = settings.height / rows;
    const jitterAmount = 0.8;
    const x = (col + 0.5) * cellW + (random() - 0.5) * cellW * jitterAmount;
    const y = (row + 0.5) * cellH + (random() - 0.5) * cellH * jitterAmount;
    return { x, y };
  }

  // ----- POSITION FOR ATTEMPT (hanya layout) -----
  function positionForAttempt({ index, attempt, settings, random, item, placed, layout = 'default' }) {
    // Layout default = acak murni
    if (layout === 'default') {
      return randomPosition(settings, random, item);
    }

    switch (layout) {
      case 'neat-grid':
        return keepInsideCanvas(gridPosition(index, settings, random, 0.05), settings, item);
      case 'diagonal-flow':
        return keepInsideCanvas(diagonalFlowPosition(index, settings, random), settings, item);
      case 'radial-center':
        return keepInsideCanvas(radialPosition(settings, random, item), settings, item);
      case 'tossed':
        return keepInsideCanvas(tossedPosition(settings, random, item), settings, item);
      case 'scattered':
        return keepInsideCanvas(scatteredPosition(settings, random, item), settings, item);
      case 'stripe':
        return keepInsideCanvas(stripePosition(index, settings, random), settings, item);
      case 'all-over':
        return keepInsideCanvas(allOverPosition(index, settings, random), settings, item);
      default:
        return randomPosition(settings, random, item);
    }
  }

  // Ekspos ke global
  global.PatternDistribution = {
    positionForAttempt,
    randomPosition,
    // (fungsi lain tidak diekspos karena tidak dibutuhkan di luar)
  };
})(window);