import { useState, useMemo } from "react";
import { Box, Heading, Text, Badge, Button, Table } from "@chakra-ui/react";
import type { FileListSection, FileChange } from "@schema/types";

const statusOrder: Record<FileChange["status"], number> = {
  deleted: 0,
  modified: 1,
  renamed: 2,
  added: 3,
  untracked: 4,
};

const statusColor: Record<FileChange["status"], string> = {
  added: "green",
  modified: "orange",
  deleted: "red",
  renamed: "blue",
  untracked: "purple",
};

interface DirGroup {
  dir: string;
  files: FileChange[];
}

function groupByDirectory(files: FileChange[]): DirGroup[] {
  const sorted = [...files].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const map = new Map<string, FileChange[]>();
  for (const file of sorted) {
    const lastSlash = file.path.lastIndexOf("/");
    const dir = lastSlash >= 0 ? file.path.slice(0, lastSlash) : ".";
    if (!map.has(dir)) map.set(dir, []);
    map.get(dir)!.push(file);
  }

  return Array.from(map.entries())
    .sort(([dirA, filesA], [dirB, filesB]) => {
      const minA = Math.min(...filesA.map((f) => statusOrder[f.status]));
      const minB = Math.min(...filesB.map((f) => statusOrder[f.status]));
      if (minA !== minB) return minA - minB;
      return dirA.localeCompare(dirB);
    })
    .map(([dir, files]) => ({ dir, files }));
}

function fileName(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
}

export function FileList({ title, files }: FileListSection) {
  const [expanded, setExpanded] = useState(false);

  const groups = useMemo(() => groupByDirectory(files), [files]);
  const hasReasons = files.some((f) => f.reason);

  const totalFiles = files.length;
  const hasMore = totalFiles > 20;

  let count = 0;
  const visibleRows: ({ type: "dir"; dir: string } | { type: "file"; file: FileChange })[] = [];

  for (const group of groups) {
    visibleRows.push({ type: "dir", dir: group.dir });
    for (const file of group.files) {
      if (!expanded && count >= 20) break;
      visibleRows.push({ type: "file", file });
      count++;
    }
    if (!expanded && count >= 20) break;
  }

  const colSpan = hasReasons ? 5 : 4;

  return (
    <Box>
      {title && <Heading size="md" mb={4}>{title}</Heading>}
      <Box overflowX="auto">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader>Path</Table.ColumnHeader>
              {hasReasons && <Table.ColumnHeader>Why?</Table.ColumnHeader>}
              <Table.ColumnHeader textAlign="right">Added</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Removed</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {visibleRows.map((row, i) => {
              if (row.type === "dir") {
                return (
                  <Table.Row key={`dir-${i}`}>
                    <Table.Cell colSpan={colSpan} py={1.5}>
                      <Text fontSize="xs" fontWeight="semibold" color="fg.muted" fontFamily="mono">
                        {row.dir}/
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                );
              }
              const file = row.file;
              return (
                <Table.Row key={`file-${i}`}>
                  <Table.Cell pl={6}>
                    <Badge colorPalette={statusColor[file.status]} variant="subtle" textTransform="capitalize">
                      {file.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell pl={6}>
                    <Text fontFamily="mono" fontSize="sm">{fileName(file.path)}</Text>
                  </Table.Cell>
                  {hasReasons && (
                    <Table.Cell>
                      {file.reason && (
                        <Text fontSize="xs" color="fg.muted">{file.reason}</Text>
                      )}
                    </Table.Cell>
                  )}
                  <Table.Cell textAlign="right">
                    {file.linesAdded != null && (
                      <Text as="span" color="green.500" fontFamily="mono" fontSize="sm">
                        +{file.linesAdded}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    {file.linesRemoved != null && (
                      <Text as="span" color="red.500" fontFamily="mono" fontSize="sm">
                        -{file.linesRemoved}
                      </Text>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>
      {hasMore && !expanded && (
        <Button variant="ghost" size="sm" mt={2} onClick={() => setExpanded(true)}>
          Show all {totalFiles} files
        </Button>
      )}
    </Box>
  );
}
