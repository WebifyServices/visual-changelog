import { useState, useEffect, useRef, useCallback, useId } from "react";
import { Box, Heading, Text, Flex, IconButton } from "@chakra-ui/react";
import mermaid from "mermaid";

let mermaidInitialized = false;

function svgToBlob(svgStr: string): Blob {
  return new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
}

async function svgToPngBlob(svgStr: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = svgToBlob(svgStr);
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        blob ? resolve(blob) : reject(new Error("Failed to create PNG"));
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load SVG")); };
    img.src = url;
  });
}

// ── Reusable Mermaid Diagram Component ──

export interface MermaidDiagramProps {
  definition: string;
  caption?: string;
  title?: string;
  height?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export function MermaidDiagram({
  definition,
  caption,
  title,
  height,
  style,
  className,
}: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const dragStart = useRef({ x: 0, y: 0 });
  const uniqueId = useId().replace(/:/g, "_");

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({ startOnLoad: false, theme: "default" });
      mermaidInitialized = true;
    }

    // Prepend init directive for better spacing if not already present
    const initDirective = `%%{init: {'flowchart': {'nodeSpacing': 30, 'rankSpacing': 50}}}%%\n`;
    const fullDef = definition.trimStart().startsWith("%%{") ? definition : initDirective + definition;

    let cancelled = false;
    (async () => {
      try {
        const { svg: rendered } = await mermaid.render(`mermaid_${uniqueId}`, fullDef);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render diagram");
      }
    })();
    return () => { cancelled = true; };
  }, [definition, uniqueId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setTranslate({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const reset = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  const flashCopied = (label: string) => {
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(definition);
    flashCopied("code");
  };

  const copyImage = async () => {
    if (!svg) return;
    try {
      const blob = await svgToPngBlob(svg);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flashCopied("image");
    } catch {
      await navigator.clipboard.writeText(svg);
      flashCopied("svg");
    }
  };

  const saveImage = async () => {
    if (!svg) return;
    try {
      const blob = await svgToPngBlob(svg);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title?.replace(/\s+/g, "-").toLowerCase() || "diagram"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const blob = svgToBlob(svg);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title?.replace(/\s+/g, "-").toLowerCase() || "diagram"}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (error) {
    return (
      <Box className={className} style={style}>
        {title && <Heading size="md" mb={4}>{title}</Heading>}
        <Box p={4} borderWidth="1px" borderRadius="lg" borderColor="red.300" bg={{ _light: "red.50", _dark: "red.900" }}>
          <Text color="red.500">Diagram error: {error}</Text>
          <Box as="pre" mt={2} fontSize="sm" fontFamily="mono" overflow="auto">{definition}</Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box className={className} style={style}>
      {title && <Heading size="md" mb={4}>{title}</Heading>}
      <Box
        position="relative"
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        cursor={dragging ? "grabbing" : "grab"}
        userSelect="none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        css={{
          "& svg text": { userSelect: "none", pointerEvents: "none" },
          resize: "vertical",
          minHeight: "200px",
          maxHeight: "80vh",
        }}
      >
        <Flex position="absolute" top={2} right={2} gap={2} zIndex={5}>
          {copied && (
            <Text fontSize="xs" color="green.500" lineHeight="24px" mr={1}>
              Copied {copied}!
            </Text>
          )}
          <IconButton
            aria-label="Copy Mermaid code"
            size="xs"
            variant="surface"
            title="Copy code"
            onClick={(e) => { e.stopPropagation(); copyCode(); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </IconButton>
          <IconButton
            aria-label="Copy image to clipboard"
            size="xs"
            variant="surface"
            title="Copy image"
            onClick={(e) => { e.stopPropagation(); copyImage(); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </IconButton>
          <IconButton
            aria-label="Save image"
            size="xs"
            variant="surface"
            title="Save as PNG"
            onClick={(e) => { e.stopPropagation(); saveImage(); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </IconButton>
          <Box w="1px" bg="gray.300" mx={0.5} />
          <IconButton
            aria-label="Zoom in"
            size="xs"
            variant="surface"
            onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(s + 0.25, 3)); }}
          >
            +
          </IconButton>
          <IconButton
            aria-label="Zoom out"
            size="xs"
            variant="surface"
            onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(s - 0.25, 0.25)); }}
          >
            -
          </IconButton>
          <IconButton
            aria-label="Reset zoom"
            size="xs"
            variant="surface"
            onClick={(e) => { e.stopPropagation(); reset(); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </IconButton>
        </Flex>
        <Box
          p={4}
          pt={10}
          minH={height ?? "200px"}
          display="flex"
          justifyContent="center"
          alignItems="center"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
          dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        />
      </Box>
      {caption && (
        <Text mt={2} fontSize="sm" color="fg.muted" textAlign="center">{caption}</Text>
      )}
    </Box>
  );
}
