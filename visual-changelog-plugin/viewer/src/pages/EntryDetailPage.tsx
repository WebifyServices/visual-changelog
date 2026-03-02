import { useState, useEffect } from "react";
import { Box, Container, Heading, Flex, Text, Badge, Skeleton, VStack } from "@chakra-ui/react";
import { loadEntry } from "../lib/loadEntries";
import { SectionRenderer } from "../components/SectionRenderer";
import type { ChangelogEntry } from "@schema/types";

export function EntryDetailPage({ id }: { id: string }) {
  const [entry, setEntry] = useState<ChangelogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    loadEntry(id + ".json").then((data) => {
      if (!data) setError(true);
      setEntry(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <Container maxW="4xl" py={6}>
        <Skeleton height="40px" mb={4} />
        <Skeleton height="20px" mb={2} width="60%" />
        <VStack gap={6} mt={8}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="200px" width="100%" borderRadius="lg" />
          ))}
        </VStack>
      </Container>
    );
  }

  if (error || !entry) {
    return (
      <Container maxW="4xl" py={6}>
        <Box textAlign="center" py={12}>
          <Heading size="lg" mb={2}>Entry not found</Heading>
          <Text color="fg.muted">Could not load changelog entry "{id}".</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="4xl" py={6}>
      <Box mb={8}>
        {entry.draft && (
          <Box
            bg="orange.subtle"
            borderWidth="1px"
            borderColor="orange.muted"
            borderRadius="md"
            px={4}
            py={2}
            mb={4}
          >
            <Text fontSize="sm" fontWeight="medium" color="orange.fg">
              Draft — generated from uncommitted changes
            </Text>
          </Box>
        )}
        <Heading size="xl" mb={2}>{entry.title}</Heading>
        <Flex align="center" gap={3} wrap="wrap">
          <Text fontFamily="mono" fontSize="sm" color="fg.muted">
            {entry.git.branch} @ {entry.git.commitHash.slice(0, 7)}
          </Text>
          <Text fontSize="sm" color="fg.muted">base: {entry.git.baseRef}</Text>
          <Text fontSize="sm" color="fg.muted">
            {new Date(entry.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
          {entry.git.prNumber && (
            <Badge colorPalette="blue" variant="subtle">PR #{entry.git.prNumber}</Badge>
          )}
        </Flex>
      </Box>

      <VStack gap={8} align="stretch">
        {entry.sections.map((section, i) => (
          <SectionRenderer key={i} section={section} />
        ))}
      </VStack>
    </Container>
  );
}
