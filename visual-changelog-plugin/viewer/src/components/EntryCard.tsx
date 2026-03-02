import { Box, Flex, Text, Badge } from "@chakra-ui/react";
import { navigate } from "../lib/router";
import type { ChangelogEntry, KPIBarSection } from "@schema/types";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function EntryCard({ entry }: { entry: ChangelogEntry }) {
  const kpiSection = entry.sections.find((s): s is KPIBarSection => s.type === "kpi-bar");
  const kpiPreview = kpiSection?.cards.slice(0, 4) ?? [];

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={5}
      cursor="pointer"
      _hover={{ borderColor: "blue.400", shadow: "md" }}
      transition="all 0.15s"
      onClick={() => navigate({ page: "entry", id: entry.id })}
    >
      <Flex justify="space-between" align="start" mb={2}>
        <Text fontSize="lg" fontWeight="bold">{entry.title}</Text>
        <Flex align="center" gap={2}>
          {entry.draft && (
            <Badge colorPalette="orange" variant="subtle">Draft</Badge>
          )}
          <Text fontSize="sm" color="fg.muted">{timeAgo(entry.date)}</Text>
        </Flex>
      </Flex>
      <Flex align="center" gap={2} mb={3}>
        <Text fontFamily="mono" fontSize="sm" color="fg.muted">
          {entry.git.branch} @ {entry.git.commitHash.slice(0, 7)}
        </Text>
        {entry.git.prNumber && (
          <Badge colorPalette="blue" variant="subtle">PR #{entry.git.prNumber}</Badge>
        )}
      </Flex>
      {kpiPreview.length > 0 && (
        <Flex wrap="wrap" gap={2}>
          {kpiPreview.map((card, i) => (
            <Badge key={i} variant="outline" fontSize="xs" fontWeight="normal">
              {card.label}: {card.value}
            </Badge>
          ))}
        </Flex>
      )}
    </Box>
  );
}
