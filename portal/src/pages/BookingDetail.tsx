import {
  Anchor,
  Badge,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Timeline,
} from "@mantine/core";
import { IconArrowLeft, IconMapPin } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import { PageHeader } from "../components/PageHeader";
import { date, money, statusColor, titleCase } from "../lib/format";
import { useBookingTrack } from "../lib/useBookingTrack";
import type { Payment } from "../lib/types";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
      <Text>{value}</Text>
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const bookingId = Number(id);
  const { data, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => api.booking(bookingId),
  });
  const track = useBookingTrack(bookingId);

  if (isLoading || !data) return <Center h={300}><Loader /></Center>;

  // Live position if streaming, else the provider's last known location.
  const lat = track.pos?.lat ?? (data.provider_lat ? Number(data.provider_lat) : null);
  const lng = track.pos?.lng ?? (data.provider_lng ? Number(data.provider_lng) : null);
  const mapSrc = lat && lng ? `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed` : null;

  return (
    <>
      <Anchor component={Link} to="/bookings" mb="sm" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <IconArrowLeft size={16} /> Back to bookings
      </Anchor>
      <PageHeader
        title={`Booking #${data.id}`}
        subtitle={titleCase(data.category)}
        action={<Badge size="lg" color={statusColor(data.status)} variant="light">{titleCase(data.status)}</Badge>}
      />

      <Grid>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="md" padding="lg" mb="md">
            <Group justify="space-between">
              <Group gap="xs">
                <IconMapPin size={18} />
                <Text fw={700}>Live location</Text>
              </Group>
              <Badge color={track.online ? "teal" : "gray"} variant={track.online ? "filled" : "light"}>
                {track.online ? "Live" : "Offline"}
              </Badge>
            </Group>
            {mapSrc ? (
              <iframe
                title="map"
                src={mapSrc}
                style={{ border: 0, width: "100%", height: 320, borderRadius: 8, marginTop: 12 }}
                loading="lazy"
              />
            ) : (
              <Text c="dimmed" size="sm" mt="md">No location available for this provider yet.</Text>
            )}
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Text fw={700} mb="md">Status timeline</Text>
            <Timeline active={data.events.length - 1} bulletSize={18} lineWidth={2}>
              {data.events.map((e, i) => (
                <Timeline.Item key={i} title={titleCase(e.status)}>
                  {e.note && <Text size="sm" c="dimmed">{e.note}</Text>}
                  <Text size="xs" c="dimmed">{date(e.created_at)}</Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder radius="md" padding="lg" mb="md">
            <Text fw={700} mb="sm">Parties</Text>
            <Stack gap="sm">
              <Field label="Customer" value={`${data.customer_name} · ${data.customer_phone}`} />
              <Field label="Provider" value={`${data.provider_name} · ${data.provider_phone}`} />
              <Field label="Site address" value={data.address ?? "—"} />
            </Stack>
          </Card>

          <Card withBorder radius="md" padding="lg" mb="md">
            <Text fw={700} mb="sm">Amounts</Text>
            <Group justify="space-between"><Text c="dimmed">Deposit</Text><Text>{money(data.deposit_amount)}</Text></Group>
            <Group justify="space-between"><Text c="dimmed">Total</Text><Text>{money(data.total_amount)}</Text></Group>
            <Group justify="space-between"><Text c="dimmed">Paid</Text><Text fw={700} c="teal">{money(data.amount_paid)}</Text></Group>
            <Group justify="space-between">
              <Text c="dimmed">Balance</Text>
              <Text fw={700}>{money(Number(data.total_amount) - Number(data.amount_paid))}</Text>
            </Group>
          </Card>

          <Card withBorder radius="md" padding="lg">
            <Text fw={700} mb="sm">Payments</Text>
            {data.payments.length === 0 ? (
              <Text c="dimmed" size="sm">No payments yet</Text>
            ) : (
              <Table>
                <Table.Tbody>
                  {(data.payments as Payment[]).map((p) => (
                    <Table.Tr key={p.id}>
                      <Table.Td><Text ff="monospace" size="sm">{p.mpesa_receipt}</Text></Table.Td>
                      <Table.Td><Badge variant="light" size="sm">{p.kind}</Badge></Table.Td>
                      <Table.Td ta="right">{money(p.amount)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}
