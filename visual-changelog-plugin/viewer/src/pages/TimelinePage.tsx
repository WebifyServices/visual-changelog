import { useState, useEffect } from "react";
import { Box, Container, Input, VStack, Text, Skeleton } from "@chakra-ui/react";
import { loadAllEntries } from "../lib/loadEntries";
import { EntryCard } from "../components/EntryCard";
import type { ChangelogEntry } from "@schema/types";

export function TimelinePage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAllEntries().then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.git.branch.toLowerCase().includes(q);
  });

  return (
    <Container maxW="4xl" py={6}>
      <Input
        placeholder="Search by title or branch..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        mb={6}
      />
      {loading ? (
        <VStack gap={4}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="120px" width="100%" borderRadius="lg" />
          ))}
        </VStack>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text color="fg.muted" fontSize="lg">
            {entries.length === 0
              ? "No changelog entries yet. Run /changelog to generate your first."
              : "No entries match your search."}
          </Text>
        </Box>
      ) : (
        <VStack gap={4} align="stretch">
          {filtered.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </VStack>
      )}
    </Container>
  );
}
