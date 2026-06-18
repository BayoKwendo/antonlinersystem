import { Badge, Center, Code, Group, Loader, Table, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/endpoints";
import { PageHeader } from "../components/PageHeader";
import { PAGE_SIZE, Pager } from "../components/Pager";
import { date } from "../lib/format";
import type { AuditEntry } from "../lib/types";

export default function Audit() {
  const [page, setPage] = useState(1);
  const audit = useQuery({
    queryKey: ["audit", page],
    queryFn: () => api.audit({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const items = audit.data?.items ?? [];

  return (
    <>
      <PageHeader title="Audit log" subtitle="Who changed what, and when" />
      {audit.isLoading ? <Center h={200}><Loader /></Center> : (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>When</Table.Th>
                <Table.Th>Actor</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Entity</Table.Th>
                <Table.Th>Detail</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((a: AuditEntry) => (
                <Table.Tr key={a.id}>
                  <Table.Td>{date(a.created_at)}</Table.Td>
                  <Table.Td>{a.actor_name ?? "system"}</Table.Td>
                  <Table.Td><Badge variant="light">{a.action}</Badge></Table.Td>
                  <Table.Td>{a.entity ? `${a.entity}#${a.entity_id}` : "—"}</Table.Td>
                  <Table.Td>
                    {a.meta ? <Code>{JSON.stringify(a.meta)}</Code> : <Text c="dimmed" size="sm">—</Text>}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {!audit.isLoading && items.length === 0 && (
        <Group justify="center" mt="xl"><Text c="dimmed">No audit entries yet</Text></Group>
      )}
      <Pager page={page} total={audit.data?.total ?? 0} onChange={setPage} />
    </>
  );
}
