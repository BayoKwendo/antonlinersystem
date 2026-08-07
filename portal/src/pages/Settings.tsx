import { Anchor, Card, Group, List, SimpleGrid, Text, ThemeIcon } from "@mantine/core";
import { IconCategory, IconUsersGroup, IconPercentage, IconShieldCheck } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";

function Info({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card withBorder radius="md" padding="md">
      <Group gap="sm" mb="xs"><ThemeIcon variant="light" size={34} radius="md">{icon}</ThemeIcon><Text fw={700}>{title}</Text></Group>
      {children}
    </Card>
  );
}

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Platform configuration and administration." />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Info icon={<IconCategory size={18} />} title="Service catalogue">
          <Text size="sm" c="dimmed" mb="xs">Manage the borehole services, pricing mode, and rate card shown to customers.</Text>
          <Anchor component={Link} to="/services" size="sm">Open Services →</Anchor>
        </Info>

        <Info icon={<IconUsersGroup size={18} />} title="Admin users">
          <Text size="sm" c="dimmed" mb="xs">Add operations, finance, and owner accounts and manage their roles.</Text>
          <Anchor component={Link} to="/team" size="sm">Open Admin Users →</Anchor>
        </Info>

        <Info icon={<IconPercentage size={18} />} title="Commission &amp; payouts">
          <List size="sm" spacing={4} c="dimmed">
            <List.Item>SMART Drill commission: <b>10%</b> of the service fee</List.Item>
            <List.Item>Provider payout: <b>90%</b> — split into a down payment (on arrival) and the balance (after QA)</List.Item>
            <List.Item>Customer invoice: <b>100%</b> of the service fee</List.Item>
          </List>
        </Info>

        <Info icon={<IconShieldCheck size={18} />} title="Provider onboarding">
          <Text size="sm" c="dimmed">Providers self-register in the Android app and are verified here after Operations reviews their statutory documents. Customers self-register on the web app.</Text>
        </Info>
      </SimpleGrid>
    </>
  );
}
