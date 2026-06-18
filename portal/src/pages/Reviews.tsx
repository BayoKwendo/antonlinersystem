import { Badge, Button, Center, Group, Loader, Rating, Table, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/endpoints";
import { apiError } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PAGE_SIZE, Pager } from "../components/Pager";
import { date } from "../lib/format";
import type { Review } from "../lib/types";

export default function Reviews() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const reviews = useQuery({
    queryKey: ["reviews", page],
    queryFn: () => api.reviews({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  });
  const items = reviews.data?.items ?? [];

  const hide = useMutation({
    mutationFn: ({ id, hidden }: { id: number; hidden: boolean }) => api.setReviewHidden(id, hidden),
    onSuccess: () => {
      notifications.show({ color: "teal", message: "Review updated" });
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (e) => notifications.show({ color: "red", message: apiError(e) }),
  });

  return (
    <>
      <PageHeader title="Reviews" subtitle="Moderate customer ratings" />
      {reviews.isLoading ? <Center h={200}><Loader /></Center> : (
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Provider</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Rating</Table.Th>
                <Table.Th>Comment</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((r: Review) => (
                <Table.Tr key={r.id} opacity={r.hidden ? 0.5 : 1}>
                  <Table.Td fw={600}>{r.provider_name}</Table.Td>
                  <Table.Td>{r.customer_name}</Table.Td>
                  <Table.Td><Rating value={r.rating} readOnly size="xs" /></Table.Td>
                  <Table.Td><Text size="sm" lineClamp={2} maw={320}>{r.comment ?? "—"}</Text></Table.Td>
                  <Table.Td>{date(r.created_at)}</Table.Td>
                  <Table.Td>
                    {r.hidden ? <Badge color="red" variant="light" mr="xs">Hidden</Badge> : null}
                    <Button size="xs" variant="light" color={r.hidden ? "teal" : "red"} onClick={() => hide.mutate({ id: r.id, hidden: !r.hidden })}>
                      {r.hidden ? "Unhide" : "Hide"}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {!reviews.isLoading && items.length === 0 && (
        <Group justify="center" mt="xl"><Text c="dimmed">No reviews yet</Text></Group>
      )}
      <Pager page={page} total={reviews.data?.total ?? 0} onChange={setPage} />
    </>
  );
}
