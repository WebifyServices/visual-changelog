import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'Outfit', system-ui, sans-serif" },
        body: { value: "'Outfit', system-ui, sans-serif" },
        mono: { value: "'JetBrains Mono', monospace" },
      },
    },
    semanticTokens: {
      colors: {
        "status.added": { value: { _light: "{colors.green.600}", _dark: "{colors.green.400}" } },
        "status.modified": { value: { _light: "{colors.orange.500}", _dark: "{colors.orange.300}" } },
        "status.deleted": { value: { _light: "{colors.red.600}", _dark: "{colors.red.400}" } },
        "status.renamed": { value: { _light: "{colors.blue.600}", _dark: "{colors.blue.400}" } },
        "test.passed": { value: { _light: "{colors.green.600}", _dark: "{colors.green.400}" } },
        "test.failed": { value: { _light: "{colors.red.600}", _dark: "{colors.red.400}" } },
        "test.skipped": { value: { _light: "{colors.gray.500}", _dark: "{colors.gray.400}" } },
        "heatmap.cold": { value: { _light: "{colors.blue.100}", _dark: "{colors.blue.900}" } },
        "heatmap.warm": { value: { _light: "{colors.orange.200}", _dark: "{colors.orange.700}" } },
        "heatmap.hot": { value: { _light: "{colors.red.400}", _dark: "{colors.red.500}" } },
        "delta.positive": { value: { _light: "{colors.green.600}", _dark: "{colors.green.400}" } },
        "delta.negative": { value: { _light: "{colors.red.600}", _dark: "{colors.red.400}" } },
        "delta.neutral": { value: { _light: "{colors.gray.500}", _dark: "{colors.gray.400}" } },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
