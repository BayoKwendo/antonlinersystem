import { Group, Pagination, Text } from "@mantine/core";

export const PAGE_SIZE = 25;

export function Pager({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total === 0) return null;
  return (
    <Group justify="space-between" mt="md">
      <Text size="sm" c="dimmed">{total} total</Text>
      <Pagination value={page} onChange={onChange} total={pages} size="sm" />
    </Group>
  );
}
