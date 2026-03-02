import { Box, Flex, Text, Heading, Badge } from "@chakra-ui/react";
import type { TestSuiteSection } from "@schema/types";

export function TestSuiteCard({
  title,
  runner,
  passed,
  failed,
  skipped,
  total,
  duration,
  delta,
}: TestSuiteSection) {
  const displayTitle = runner ? `${title} — ${runner}` : title;

  return (
    <Box borderWidth="1px" borderRadius="lg" p={5}>
      <Heading size="md" mb={4}>{displayTitle}</Heading>

      {/* Stacked bar */}
      <Flex h="14px" borderRadius="full" overflow="hidden" mb={3}>
        {passed > 0 && (
          <Box flexGrow={passed} bg="green.500" />
        )}
        {failed > 0 && (
          <Box flexGrow={failed} bg="red.500" />
        )}
        {skipped > 0 && (
          <Box flexGrow={skipped} bg="gray.400" />
        )}
      </Flex>

      {/* Stats */}
      <Text fontSize="sm" color="fg.muted">
        <Text as="span" color="green.500" fontWeight="medium">{passed} passed</Text>
        {" · "}
        <Text as="span" color="red.500" fontWeight="medium">{failed} failed</Text>
        {" · "}
        <Text as="span" color="gray.500" fontWeight="medium">{skipped} skipped</Text>
        {" · "}
        {total} total
      </Text>

      {duration != null && (
        <Text fontSize="sm" color="fg.muted" mt={1}>ran in {duration}s</Text>
      )}

      {/* Deltas or first-run note */}
      {delta ? (
        <Flex wrap="wrap" gap={2} mt={3}>
          {delta.passed != null && delta.passed !== 0 && (
            <Badge colorPalette="green" variant="subtle">
              {delta.passed > 0 ? "+" : ""}{delta.passed} passing
            </Badge>
          )}
          {delta.failed != null && delta.failed !== 0 && (
            <Badge colorPalette={delta.failed < 0 ? "green" : "red"} variant="subtle">
              {delta.failed > 0 ? "+" : ""}{delta.failed} failing
            </Badge>
          )}
          {delta.skipped != null && delta.skipped !== 0 && (
            <Badge colorPalette="gray" variant="subtle">
              {delta.skipped > 0 ? "+" : ""}{delta.skipped} skipped
            </Badge>
          )}
          {delta.newTests != null && delta.newTests > 0 && (
            <Badge colorPalette="blue" variant="subtle">
              +{delta.newTests} new tests
            </Badge>
          )}
        </Flex>
      ) : (
        <Text fontSize="xs" color="fg.muted" fontStyle="italic" mt={3}>
          First run — no baseline for comparison
        </Text>
      )}
    </Box>
  );
}
