import { Box, Heading } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ProseSection } from "@schema/types";

export function ProseBlock({ title, content }: ProseSection) {
  return (
    <Box>
      {title && <Heading size="md" mb={4}>{title}</Heading>}
      <Box
        css={{
          "& h1, & h2, & h3, & h4": { fontWeight: "bold", marginTop: "1em", marginBottom: "0.5em" },
          "& h1": { fontSize: "1.5em" },
          "& h2": { fontSize: "1.25em" },
          "& h3": { fontSize: "1.1em" },
          "& p": { marginBottom: "0.75em", lineHeight: 1.7 },
          "& ul, & ol": { paddingLeft: "1.5em", marginBottom: "0.75em" },
          "& li": { marginBottom: "0.25em" },
          "& code": {
            fontFamily: "var(--chakra-fonts-mono)",
            fontSize: "0.9em",
            padding: "0.1em 0.4em",
            borderRadius: "4px",
            backgroundColor: "var(--chakra-colors-gray-100)",
            color: "var(--chakra-colors-gray-800)",
          },
          ".dark & code": {
            backgroundColor: "var(--chakra-colors-gray-800)",
            color: "var(--chakra-colors-gray-100)",
          },
          "& pre": {
            fontFamily: "var(--chakra-fonts-mono)",
            padding: "1em",
            borderRadius: "8px",
            backgroundColor: "var(--chakra-colors-gray-100)",
            color: "var(--chakra-colors-gray-800)",
            overflowX: "auto",
            marginBottom: "0.75em",
          },
          ".dark & pre": {
            backgroundColor: "var(--chakra-colors-gray-800)",
            color: "var(--chakra-colors-gray-100)",
          },
          "& pre code": { padding: 0, backgroundColor: "transparent", color: "inherit" },
          "& a": { color: "var(--chakra-colors-blue-500)", textDecoration: "underline" },
          "& blockquote": {
            borderLeft: "3px solid var(--chakra-colors-gray-300)",
            paddingLeft: "1em",
            fontStyle: "italic",
            marginBottom: "0.75em",
          },
          ".dark & blockquote": {
            borderLeftColor: "var(--chakra-colors-gray-600)",
          },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </Box>
    </Box>
  );
}
