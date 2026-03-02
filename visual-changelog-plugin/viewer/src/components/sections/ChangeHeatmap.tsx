import { useState, useMemo, useCallback } from "react";
import { Box, Flex, Text, Heading } from "@chakra-ui/react";
import type { HeatmapSection, HeatmapNode } from "@schema/types";

// ── Layout types ──

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PositionedNode {
  node: HeatmapNode;
  rect: Rect;
  path: string;
  children?: PositionedNode[];
}

// ── Squarified treemap algorithm ──

function getAllLeaves(node: HeatmapNode): HeatmapNode[] {
  if (!node.children || node.children.length === 0) return [node];
  return node.children.flatMap(getAllLeaves);
}

function worstAspectRatio(row: number[], side: number): number {
  const sum = row.reduce((a, b) => a + b, 0);
  if (sum === 0 || side === 0) return Infinity;
  let worst = 0;
  for (const area of row) {
    const rowH = sum / side;
    const rowW = area / rowH;
    const ratio = Math.max(rowW / rowH, rowH / rowW);
    if (ratio > worst) worst = ratio;
  }
  return worst;
}

function squarify(
  nodes: { node: HeatmapNode; area: number; path: string }[],
  rect: Rect,
  depth: number,
): PositionedNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    const n = nodes[0];
    const positioned: PositionedNode = { node: n.node, rect, path: n.path };
    if (n.node.children && n.node.children.length > 0) {
      const labelH = 20;
      const childRect = { x: rect.x, y: rect.y + labelH, w: rect.w, h: Math.max(rect.h - labelH, 0) };
      positioned.children = layoutChildren(n.node, childRect, n.path, depth + 1);
    }
    return [positioned];
  }

  const totalArea = nodes.reduce((s, n) => s + n.area, 0);
  if (totalArea === 0) return nodes.map((n) => ({ node: n.node, rect: { x: rect.x, y: rect.y, w: 0, h: 0 }, path: n.path }));

  const sorted = [...nodes].sort((a, b) => b.area - a.area);
  const isWide = rect.w >= rect.h;

  const result: PositionedNode[] = [];
  let remaining = [...sorted];
  let currentRect = { ...rect };

  while (remaining.length > 0) {
    const row: typeof sorted = [remaining[0]];
    let rowArea = remaining[0].area;
    let i = 1;
    const cSide = isWide ? currentRect.h : currentRect.w;

    while (i < remaining.length) {
      const candidate = remaining[i];
      const newRow = [...row.map((r) => r.area), candidate.area];
      const oldRow = row.map((r) => r.area);
      if (worstAspectRatio(newRow, cSide) <= worstAspectRatio(oldRow, cSide)) {
        row.push(candidate);
        rowArea += candidate.area;
        i++;
      } else {
        break;
      }
    }

    remaining = remaining.slice(row.length);
    const remainingArea = remaining.reduce((s, n) => s + n.area, 0);
    const totalCurrent = rowArea + remainingArea;
    const fraction = totalCurrent > 0 ? rowArea / totalCurrent : 1;

    let rowRect: Rect;
    let restRect: Rect;

    if (isWide) {
      const rowW = currentRect.w * fraction;
      rowRect = { x: currentRect.x, y: currentRect.y, w: rowW, h: currentRect.h };
      restRect = { x: currentRect.x + rowW, y: currentRect.y, w: currentRect.w - rowW, h: currentRect.h };
    } else {
      const rowH = currentRect.h * fraction;
      rowRect = { x: currentRect.x, y: currentRect.y, w: currentRect.w, h: rowH };
      restRect = { x: currentRect.x, y: currentRect.y + rowH, w: currentRect.w, h: currentRect.h - rowH };
    }

    let offset = 0;
    for (const item of row) {
      const itemFraction = rowArea > 0 ? item.area / rowArea : 1 / row.length;
      let itemRect: Rect;
      if (isWide) {
        const itemH = rowRect.h * itemFraction;
        itemRect = { x: rowRect.x, y: rowRect.y + offset, w: rowRect.w, h: itemH };
        offset += itemH;
      } else {
        const itemW = rowRect.w * itemFraction;
        itemRect = { x: rowRect.x + offset, y: rowRect.y, w: itemW, h: rowRect.h };
        offset += itemW;
      }

      const positioned: PositionedNode = { node: item.node, rect: itemRect, path: item.path };
      if (item.node.children && item.node.children.length > 0) {
        const labelH = 20;
        const childRect = {
          x: itemRect.x,
          y: itemRect.y + labelH,
          w: itemRect.w,
          h: Math.max(itemRect.h - labelH, 0),
        };
        positioned.children = layoutChildren(item.node, childRect, item.path, depth + 1);
      }
      result.push(positioned);
    }

    currentRect = restRect;
  }

  return result;
}

function layoutChildren(
  parent: HeatmapNode,
  rect: Rect,
  parentPath: string,
  depth: number,
): PositionedNode[] {
  if (!parent.children || parent.children.length === 0) return [];
  const totalChanges = parent.children.reduce((s, c) => s + c.changes, 0) || 1;
  const scale = (rect.w * rect.h) / totalChanges;
  const items = parent.children.map((c) => ({
    node: c,
    area: Math.max(c.changes * scale, 4),
    path: parentPath ? `${parentPath}/${c.name}` : c.name,
  }));
  return squarify(items, rect, depth);
}

// ── Color ──

function getHeatColor(changes: number, maxChanges: number): string {
  const ratio = maxChanges > 0 ? changes / maxChanges : 0;
  if (ratio < 0.33) {
    const t = ratio / 0.33;
    return `rgb(${Math.round(59 + t * 178)},${Math.round(130 + t * 7)},${Math.round(246 - t * 192)})`;
  } else if (ratio < 0.66) {
    const t = (ratio - 0.33) / 0.33;
    return `rgb(${Math.round(237 + t * 2)},${Math.round(137 - t * 69)},${Math.round(54 + t * 14)})`;
  } else {
    const t = (ratio - 0.66) / 0.34;
    return `rgb(${Math.round(239 - t * 19)},${Math.round(68 - t * 30)},${Math.round(68 - t * 30)})`;
  }
}

// ── Tooltip state (shared across tree via parent) ──

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

// ── Render ──

function LeafNode({
  positioned,
  maxChanges,
  containerRect,
  onTooltip,
}: {
  positioned: PositionedNode;
  maxChanges: number;
  containerRect: Rect;
  onTooltip: (tip: TooltipState | null) => void;
}) {
  const { node, rect, path } = positioned;
  const fullPath = path || node.name;
  const color = getHeatColor(node.changes, maxChanges);
  const showLabel = rect.w > 60 && rect.h > 20;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    onTooltip({ text: `${fullPath}: ${node.changes} lines`, x: e.clientX, y: e.clientY });
  }, [fullPath, node.changes, onTooltip]);

  const handleMouseLeave = useCallback(() => onTooltip(null), [onTooltip]);

  return (
    <Box
      position="absolute"
      left={`${rect.x - containerRect.x}px`}
      top={`${rect.y - containerRect.y}px`}
      w={`${rect.w}px`}
      h={`${rect.h}px`}
      bg={color}
      borderRadius="2px"
      cursor="pointer"
      _hover={{ opacity: 0.85 }}
      transition="opacity 0.1s"
      overflow="hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      boxShadow="inset 0 0 0 0.5px rgba(0,0,0,0.15)"
    >
      {showLabel && (
        <Text
          fontSize="12px"
          lineHeight="16px"
          px="4px"
          py="2px"
          color="white"
          textShadow="0 1px 2px rgba(0,0,0,0.6)"
          truncate
        >
          {node.name}
        </Text>
      )}
    </Box>
  );
}

function DirectoryNode({
  positioned,
  maxChanges,
  containerRect,
  onTooltip,
}: {
  positioned: PositionedNode;
  maxChanges: number;
  containerRect: Rect;
  onTooltip: (tip: TooltipState | null) => void;
}) {
  const { node, rect } = positioned;
  const showLabel = rect.w > 50 && rect.h > 28;

  return (
    <>
      <Box
        position="absolute"
        left={`${rect.x - containerRect.x}px`}
        top={`${rect.y - containerRect.y}px`}
        w={`${rect.w}px`}
        h={`${rect.h}px`}
        borderWidth="1px"
        borderColor={{ _light: "gray.300", _dark: "gray.600" }}
        borderRadius="3px"
        overflow="hidden"
        pointerEvents="none"
      >
        {showLabel && (
          <Text
            fontSize="11px"
            lineHeight="18px"
            fontWeight="bold"
            px="4px"
            bg={{ _light: "rgba(0,0,0,0.04)", _dark: "rgba(255,255,255,0.06)" }}
            color="fg.muted"
            truncate
          >
            {node.name}
          </Text>
        )}
      </Box>
      {positioned.children?.map((child, i) =>
        child.node.children && child.node.children.length > 0 ? (
          <DirectoryNode key={i} positioned={child} maxChanges={maxChanges} containerRect={containerRect} onTooltip={onTooltip} />
        ) : (
          <LeafNode key={i} positioned={child} maxChanges={maxChanges} containerRect={containerRect} onTooltip={onTooltip} />
        )
      )}
    </>
  );
}

export function ChangeHeatmap({ title, root }: HeatmapSection) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const maxChanges = useMemo(() => {
    const leaves = getAllLeaves(root);
    return Math.max(...leaves.map((l) => l.changes), 1);
  }, [root]);

  const containerW = 800;
  const containerH = 400;
  const containerRect: Rect = { x: 0, y: 0, w: containerW, h: containerH };

  const positioned = useMemo(() => {
    const children = root.children ?? [root];
    const totalChanges = children.reduce((s, c) => s + c.changes, 0) || 1;
    const scale = (containerW * containerH) / totalChanges;
    const items = children.map((c) => ({
      node: c,
      area: Math.max(c.changes * scale, 4),
      path: root.name === "." ? c.name : `${root.name}/${c.name}`,
    }));
    return squarify(items, containerRect, 0);
  }, [root, containerW, containerH]);

  // Compute tooltip position: flip when near viewport edges
  const tooltipStyle = useMemo((): React.CSSProperties | undefined => {
    if (!tooltip) return undefined;
    const pad = 12;
    const approxW = tooltip.text.length * 7 + 16;
    const approxH = 28;
    let left = tooltip.x + pad;
    let top = tooltip.y - approxH - pad;

    // Flip horizontally if near right edge
    if (left + approxW > window.innerWidth - 8) {
      left = tooltip.x - approxW - pad;
    }
    // Flip vertically if near top edge
    if (top < 8) {
      top = tooltip.y + pad;
    }
    return { left, top };
  }, [tooltip]);

  return (
    <Box>
      {title && <Heading size="md" mb={4}>{title}</Heading>}
      <Box
        position="relative"
        w="100%"
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        css={{
          aspectRatio: "2 / 1",
          "@media (max-width: 768px)": { aspectRatio: "4 / 3" },
        }}
      >
        <TreemapScaler baseWidth={containerW} baseHeight={containerH}>
          {positioned.map((p, i) =>
            p.node.children && p.node.children.length > 0 ? (
              <DirectoryNode key={i} positioned={p} maxChanges={maxChanges} containerRect={containerRect} onTooltip={setTooltip} />
            ) : (
              <LeafNode key={i} positioned={p} maxChanges={maxChanges} containerRect={containerRect} onTooltip={setTooltip} />
            )
          )}
        </TreemapScaler>
      </Box>
      {/* Viewport-anchored tooltip */}
      {tooltip && tooltipStyle && (
        <Box
          position="fixed"
          zIndex={9999}
          bg="gray.900"
          color="white"
          px={2}
          py={1}
          borderRadius="md"
          fontSize="xs"
          fontFamily="mono"
          whiteSpace="nowrap"
          pointerEvents="none"
          style={tooltipStyle}
        >
          {tooltip.text}
        </Box>
      )}
      {/* Legend */}
      <Flex align="center" gap={2} mt={2}>
        <Text fontSize="xs" color="fg.muted">fewer changes</Text>
        <Box
          flex="1"
          h="10px"
          borderRadius="full"
          background="linear-gradient(to right, rgb(59,130,246), rgb(237,137,54), rgb(239,68,68))"
        />
        <Text fontSize="xs" color="fg.muted">more changes</Text>
      </Flex>
    </Box>
  );
}

// Scales the fixed-size layout to fill the actual container
function TreemapScaler({
  baseWidth,
  baseHeight,
  children,
}: {
  baseWidth: number;
  baseHeight: number;
  children: React.ReactNode;
}) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useMemo(() => {
    if (!ref) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(ref);
    return () => obs.disconnect();
  }, [ref]);

  const scaleX = dims ? dims.w / baseWidth : 1;
  const scaleY = dims ? dims.h / baseHeight : 1;

  return (
    <Box
      ref={setRef}
      position="absolute"
      inset={0}
      overflow="hidden"
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        w={`${baseWidth}px`}
        h={`${baseHeight}px`}
        style={{ transform: `scale(${scaleX}, ${scaleY})`, transformOrigin: "top left" }}
      >
        {children}
      </Box>
    </Box>
  );
}
