import { Badge, Button, Center, Group, Loader, Table, Text, TextInput } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/endpoints";
import { PageHeader } from "../components/PageHeader";
import { PAGE_SIZE, Pager } from "../components/Pager";
import { downloadCsv } from "../lib/csv";
import { date, statusColor } from "../lib/format";
import type { Customer } from "../lib/types";

export default function Customers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const customers = useQuery({
    queryKey: ["customers", q, page],
    queryFn: () => api.customers({ q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const items = customers.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="People who book services"
        action={<Button variant="default" leftSection={<IconDownload size={16} />} onClick={() => downloadCsv("customers.csv", items)}>Export</Button>}
      />
      <TextInput
        placeholder="Search name, phone or ID number"
        mb="md"
        w={320}
        value={q}
        onChange={(e) => { setQ(e.currentTarget.value); setPage(1); }}
      />
      {customers.isLoading ? <Center h={200}><Loader /></Center> : (
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>ID number</Table.Th>
                <Table.Th>Bookings</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Joined</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((c: Customer) => (
                <Table.Tr key={c.id}>
                  <Table.Td><Text fw={600}>{c.display_name}</Text></Table.Td>
                  <Table.Td>{c.phone}</Table.Td>
                  <Table.Td>{c.id_number ?? "—"}</Table.Td>
                  <Table.Td>{c.bookings}</Table.Td>
                  <Table.Td><Badge color={statusColor(c.status)} variant="light">{c.status}</Badge></Table.Td>
                  <Table.Td>{date(c.created_at)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {!customers.isLoading && items.length === 0 && (
        <Group justify="center" mt="xl"><Text c="dimmed">No customers</Text></Group>
      )}
      <Pager page={page} total={customers.data?.total ?? 0} onChange={setPage} />
    </>
  );
}
