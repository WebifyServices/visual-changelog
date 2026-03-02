import { useMemo } from "react";
import { Box, Flex, Text, Heading, Badge } from "@chakra-ui/react";
import type { KPIBarSection, KPICard } from "@schema/types";

const labelColorMap: Record<string, string> = {
  "lines added": "green.500",
  "lines removed": "red.500",
  "files changed": "orange.500",
};

function getValueColor(card: KPICard): string | undefined {
  const key = card.label.toLowerCase();
  if (labelColorMap[key]) return labelColorMap[key];
  // Net Lines: contextual color based on trend
  if (key === "net lines") {
    if (card.trend === "up") return "green.500";
    if (card.trend === "down") return "red.500";
    return "gray.500";
  }
  return undefined;
}

function getBorderColor(card: KPICard): Record<string, string> | undefined {
  const key = card.label.toLowerCase();
  if (key.includes("added")) return { _light: "green.200", _dark: "green.700" };
  if (key.includes("removed") || key.includes("deleted")) return { _light: "red.200", _dark: "red.700" };
  if (key.includes("file")) return { _light: "orange.200", _dark: "orange.700" };
  if (key === "net lines") {
    if (card.trend === "up") return { _light: "green.200", _dark: "green.700" };
    if (card.trend === "down") return { _light: "red.200", _dark: "red.700" };
    return { _light: "gray.200", _dark: "gray.700" };
  }
  return undefined;
}

export function KPIBar({ title, cards }: KPIBarSection) {
  const allCards = useMemo(() => {
    const hasNetLines = cards.some((c) => c.label.toLowerCase() === "net lines");
    if (hasNetLines) return cards;

    const added = cards.find((c) => c.label.toLowerCase().includes("added"));
    const removed = cards.find((c) => c.label.toLowerCase().includes("removed"));
    if (!added || !removed) return cards;

    const addedVal = typeof added.value === "number" ? added.value : parseInt(String(added.value), 10) || 0;
    const removedVal = typeof removed.value === "number" ? removed.value : parseInt(String(removed.value), 10) || 0;
    const net = addedVal - removedVal;
    const netCard: KPICard = {
      label: "Net Lines",
      value: net >= 0 ? `+${net}` : `${net}`,
      trend: net > 0 ? "up" : net < 0 ? "down" : "neutral",
    };
    return [...cards, netCard];
  }, [cards]);

  return (
    <Box>
      {title && <Heading size="md" mb={3}>{title}</Heading>}
      <Flex wrap="wrap" gap={3}>
        {allCards.map((card, i) => {
          const valueColor = getValueColor(card);
          const borderColor = getBorderColor(card);
          return (
            <Box
              key={i}
              flex="1 1 0"
              minW="120px"
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="lg"
              px={4}
              py={3}
            >
              <Text fontSize="xs" color="fg.muted" lineHeight="1.2">{card.label}</Text>
              <Flex align="baseline" gap={1.5} mt={0.5}>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  fontVariantNumeric="tabular-nums"
                  color={valueColor}
                >
                  {card.value}
                </Text>
                {card.delta != null && (
                  <Badge
                    colorPalette={card.trend === "up" ? "green" : card.trend === "down" ? "red" : "gray"}
                    variant="subtle"
                    fontSize="2xs"
                  >
                    {card.trend === "up" ? "▲" : card.trend === "down" ? "▼" : ""}
                    {card.delta}
                  </Badge>
                )}
              </Flex>
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}
