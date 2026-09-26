import type { Block } from "../contract";

type InkBoxesProps = {
  width: number;
  height: number;
  blocks: Block[];
  active: number | null;
  onHover: (index: number | null) => void;
};

// Outlines where each block was drawn on the paper. The viewBox is the photo's own size and the SVG
// letterboxes the same way the <img> does (object-fit: contain), so the boxes land on the ink.
export function InkBoxes({ width, height, blocks, active, onHover }: InkBoxesProps) {
  const drawn = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.box.length === 4)
    // Largest first, so a small block inside a bigger one stays on top and can be hovered.
    .sort((a, b) => area(b.block.box) - area(a.block.box));
  if (!drawn.length) return null;

  const pad = Math.max(width, height) * 0.008;
  const font = Math.max(width, height) * 0.022;

  return (
    <svg className="ink-boxes" viewBox={`0 0 ${width} ${height}`} onMouseLeave={() => onHover(null)} aria-hidden="true">
      {drawn.map(({ block, index }) => {
        const [ymin, xmin, ymax, xmax] = block.box;
        const x = (xmin / 1000) * width - pad;
        const y = (ymin / 1000) * height - pad;
        const w = ((xmax - xmin) / 1000) * width + pad * 2;
        const h = ((ymax - ymin) / 1000) * height + pad * 2;
        const on = index === active;
        return (
          <g key={index} className={on ? "ink-box on" : "ink-box"} onMouseEnter={() => onHover(index)}>
            <rect x={x} y={y} width={w} height={h} rx={pad} />
            {on && (
              <text x={x} y={y > font * 1.6 ? y - font * 0.5 : y + h + font * 1.2} fontSize={font}>
                {label(block)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function area(box: number[]) {
  return (box[2] - box[0]) * (box[3] - box[1]);
}

function label(block: Block) {
  const title = block.title.length > 28 ? `${block.title.slice(0, 27)}…` : block.title;
  return title ? `${block.kind} · ${title}` : block.kind;
}
