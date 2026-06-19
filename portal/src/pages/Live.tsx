import { Anchor, Badge, Button, Center, Group, Loader, Table, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/endpoints";
import { PageHeader } from "../components/PageHeader";
import { date, statusColor, titleCase } from "../lib/format";
import type { ProviderLocation } from "../lib/types";

export default function Live() {
  const locations = useQuery({
    queryKey: ["provider-locations"],
    queryFn: api.providerLocations,
    refetchInterval: 15_000, // live-ish
  });
  const items = locations.data ?? [];
  const online = items.filter((p) => p.availability !== "offline").length;

  return (
    <>
      <PageHeader
        title="Live providers"
        subtitle={`${online} online of ${items.length}`}
        action={<Button variant="default" leftSection={<IconRefresh size={16} />} onClick={() => locations.refetch()}>Refresh</Button>}
      />
      {locations.isLoading ? <Center h={200}><Loader /></Center> : items.length === 0 ? (
        <Group justify="center" mt="xl"><Text c="dimmed">No providers with a known location yet</Text></Group>
      ) : (
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Provider</Table.Th><Table.Th>Category</Table.Th><Table.Th>Availability</Table.Th>
                <Table.Th>Last update</Table.Th><Table.Th>Location</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((p: ProviderLocation) => (
                <Table.Tr key={p.id}>
                  <Table.Td><Text fw={600}>{p.display_name}</Text><Text size="xs" c="dimmed">{p.phone}</Text></Table.Td>
                  <Table.Td>{titleCase(p.category)}</Table.Td>
                  <Table.Td><Badge color={statusColor(p.availability)} variant="light">{p.availability}</Badge></Table.Td>
                  <Table.Td>{date(p.location_updated_at)}</Table.Td>
                  <Table.Td>
                    <Anchor href={`https://maps.google.com/?q=${p.lat},${p.lng}`} target="_blank" size="sm">
                      View on map
                    </Anchor>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </>
  );
}
