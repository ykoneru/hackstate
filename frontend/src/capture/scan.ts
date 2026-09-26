// Turn a photo of paper into something closer to a scan: crop to the sheet, even out shadows,
// then push the paper to white and the ink to black so Gemini sees only the drawing.

type Rect = { x: number; y: number; width: number; height: number };
type Sheet = Rect & { threshold: number; cropped: boolean };

export function scan(source: HTMLCanvasElement): HTMLCanvasElement {
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) return source;
  const { width, height } = source;
  const rgba = context.getImageData(0, 0, width, height).data;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  }

  const sheet = findSheet(gray, width, height);
  const paper = paperLevel(gray, width, height);
  const out = document.createElement("canvas");
  out.width = sheet.width;
  out.height = sheet.height;
  const outContext = out.getContext("2d");
  if (!outContext) return source;
  const image = outContext.createImageData(sheet.width, sheet.height);
  for (let y = 0; y < sheet.height; y += 1) {
    for (let x = 0; x < sheet.width; x += 1) {
      const i = (y + sheet.y) * width + x + sheet.x;
      const ratio = gray[i] / Math.max(40, paper[i]);
      const t = Math.min(1, Math.max(0, (ratio - 0.3) / 0.58));
      const value = 255 * t ** 1.6;
      const o = (y * sheet.width + x) * 4;
      image.data[o] = value;
      image.data[o + 1] = value;
      image.data[o + 2] = value;
      image.data[o + 3] = 255;
    }
  }
  if (sheet.cropped) clearDesk(gray, width, sheet, image.data);
  outContext.putImageData(image, 0, 0);
  return out;
}

// Desk left inside a tilted crop shows up as dark wedges touching the edge. Flood them white from the border.
// Ink sits inside the sheet, so it never touches the border through dark pixels.
function clearDesk(gray: Uint8ClampedArray, width: number, sheet: Sheet, data: Uint8ClampedArray) {
  const seen = new Uint8Array(sheet.width * sheet.height);
  const stack: number[] = [];
  const isDesk = (x: number, y: number) => gray[(y + sheet.y) * width + x + sheet.x] <= sheet.threshold;
  const push = (x: number, y: number) => {
    const i = y * sheet.width + x;
    if (!seen[i] && isDesk(x, y)) {
      seen[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < sheet.width; x += 1) {
    push(x, 0);
    push(x, sheet.height - 1);
  }
  for (let y = 0; y < sheet.height; y += 1) {
    push(0, y);
    push(sheet.width - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % sheet.width;
    const y = (i - x) / sheet.width;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 255;
    if (x > 0) push(x - 1, y);
    if (x < sheet.width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < sheet.height - 1) push(x, y + 1);
  }
}

// The sheet is the bright region. Split bright from dark with Otsu's threshold, then keep the longest
// run of rows and columns that are mostly bright. Only crop when that leaves a believable sheet.
function findSheet(gray: Uint8ClampedArray, width: number, height: number): Sheet {
  const threshold = otsu(gray);
  const whole = { x: 0, y: 0, width, height, threshold, cropped: false };
  const rows = new Float32Array(height);
  for (let y = 0; y < height; y += 1) {
    let bright = 0;
    for (let x = 0; x < width; x += 1) if (gray[y * width + x] > threshold) bright += 1;
    rows[y] = bright / width;
  }
  const [top, bottom] = longestRun(rows, 0.3);
  if (bottom <= top) return whole;

  const columns = new Float32Array(width);
  for (let x = 0; x < width; x += 1) {
    let bright = 0;
    for (let y = top; y <= bottom; y += 1) if (gray[y * width + x] > threshold) bright += 1;
    columns[x] = bright / (bottom - top + 1);
  }
  const [left, right] = longestRun(columns, 0.5);
  if (right <= left) return whole;

  const margin = Math.round(Math.max(width, height) * 0.012);
  const rect = {
    x: Math.max(0, left - margin),
    y: Math.max(0, top - margin),
    width: Math.min(width, right + margin + 1) - Math.max(0, left - margin),
    height: Math.min(height, bottom + margin + 1) - Math.max(0, top - margin),
  };
  const share = (rect.width * rect.height) / (width * height);
  return share > 0.2 && share < 0.92 ? { ...rect, threshold, cropped: true } : whole;
}

// A long drawn line or a filled button makes a few rows mostly ink, so short gaps do not end a run.
function longestRun(values: Float32Array, minimum: number): [number, number] {
  const gap = Math.max(4, Math.round(values.length * 0.06));
  let best: [number, number] = [0, -1];
  let start = -1;
  let last = -1;
  for (let i = 0; i <= values.length; i += 1) {
    if (i < values.length && values[i] >= minimum) {
      if (start < 0) start = i;
      last = i;
    } else if (start >= 0 && (i === values.length || i - last > gap)) {
      if (last - start > best[1] - best[0]) best = [start, last];
      start = -1;
    }
  }
  return best;
}

function otsu(gray: Uint8ClampedArray): number {
  const histogram = new Float64Array(256);
  for (let i = 0; i < gray.length; i += 1) histogram[gray[i]] += 1;
  let sum = 0;
  for (let v = 0; v < 256; v += 1) sum += v * histogram[v];
  let below = 0;
  let belowSum = 0;
  let best = 0;
  let threshold = 127;
  for (let v = 0; v < 256; v += 1) {
    below += histogram[v];
    if (!below || below === gray.length) continue;
    belowSum += v * histogram[v];
    const above = gray.length - below;
    const gap = belowSum / below - (sum - belowSum) / above;
    const spread = below * above * gap * gap;
    if (spread > best) {
      best = spread;
      threshold = v;
    }
  }
  return threshold;
}

// How bright the paper is around each pixel. Take the brightest value in each cell so ink is ignored,
// spread it to neighbours so solid marker fills keep a paper level, then blend between cells.
function paperLevel(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const cell = Math.max(16, Math.round(Math.max(width, height) / 48));
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const peak = new Float32Array(cols * rows);
  for (let y = 0; y < height; y += 1) {
    const row = Math.floor(y / cell) * cols;
    for (let x = 0; x < width; x += 1) {
      const c = row + Math.floor(x / cell);
      if (gray[y * width + x] > peak[c]) peak[c] = gray[y * width + x];
    }
  }
  const spread = neighbours(peak, cols, rows, Math.max);
  const smooth = neighbours(spread, cols, rows, (...values) => values.reduce((a, b) => a + b) / values.length);

  const level = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    const gy = Math.min(rows - 1, Math.max(0, y / cell - 0.5));
    const y0 = Math.floor(gy);
    const y1 = Math.min(rows - 1, y0 + 1);
    const fy = gy - y0;
    for (let x = 0; x < width; x += 1) {
      const gx = Math.min(cols - 1, Math.max(0, x / cell - 0.5));
      const x0 = Math.floor(gx);
      const x1 = Math.min(cols - 1, x0 + 1);
      const fx = gx - x0;
      const topRow = smooth[y0 * cols + x0] * (1 - fx) + smooth[y0 * cols + x1] * fx;
      const bottomRow = smooth[y1 * cols + x0] * (1 - fx) + smooth[y1 * cols + x1] * fx;
      level[y * width + x] = topRow * (1 - fy) + bottomRow * fy;
    }
  }
  return level;
}

function neighbours(
  grid: Float32Array,
  cols: number,
  rows: number,
  combine: (...values: number[]) => number,
): Float32Array {
  const out = new Float32Array(grid.length);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const values: number[] = [];
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) values.push(grid[ny * cols + nx]);
        }
      }
      out[y * cols + x] = combine(...values);
    }
  }
  return out;
}
