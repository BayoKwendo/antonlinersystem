import { useState } from "react";
import { Badge, Group, Loader, Popover, ScrollArea, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api/endpoints";

interface Row { key: string; title: string; sub: string; badge?: string; to: string }

/**
 * Portal-wide quick search. Debounced LIKE search across requests, providers and
 * customers; clicking a result jumps straight to the relevant screen (a request
 * opens its job detail; a provider/customer opens its list, pre-filtered by ?q).
 */
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [debounced] = useDebouncedValue(q, 200);
  const navigate = useNavigate();
  const term = debounced.trim();
  const enabled = term.length >= 2;

  const res = useQuery({
    queryKey: ["global-search", term],
    queryFn: () => api.search(term),
    enabled,
  });
  const d = res.data;

  const groups: { label: string; rows: Row[] }[] = [
    {
      label: "Requests",
      rows: (d?.requests ?? []).map((r) => ({
        key: `r${r.id}`, title: r.request_no ?? `#${r.id}`,
        sub: `${r.service} · ${r.customer}`, badge: r.status, to: `/bookings/${r.id}`,
      })),
    },
    {
      label: "Service Providers",
      rows: (d?.providers ?? []).map((p) => ({
        key: `p${p.id}`, title: p.name, sub: [p.person, p.phone].filter(Boolean).join(" · "),
        badge: p.status ?? undefined, to: `/providers?q=${encodeURIComponent(p.phone || p.name)}`,
      })),
    },
    {
      label: "Customers",
      rows: (d?.customers ?? []).map((c) => ({
        key: `c${c.id}`, title: c.name, sub: c.phone ?? "",
        to: `/customers?q=${encodeURIComponent(c.phone || c.name)}`,
      })),
    },
  ].filter((g) => g.rows.length);

  const flat = groups.flatMap((g) => g.rows);
  const go = (to: string) => { setQ(""); setFocused(false); navigate(to); };

  return (
    <Popover opened={focused && enabled} width="target" position="bottom-start" shadow="md" radius="md" trapFocus={false}>
      <Popover.Target>
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder="Search requests, providers, customers…"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && flat[0]) go(flat[0].to);
            else if (e.key === "Escape") setFocused(false);
          }}
          style={{ flex: 1, maxWidth: 460 }}
          visibleFrom="sm"
        />
      </Popover.Target>
      <Popover.Dropdown p={4}>
        {res.isLoading ? (
          <Group gap="xs" p="sm"><Loader size="xs" /><Text size="sm" c="dimmed">Searching…</Text></Group>
        ) : !flat.length ? (
          <Text size="sm" c="dimmed" p="sm">No matches for “{term}”.</Text>
        ) : (
          <ScrollArea.Autosize mah={380} type="scroll">
            {groups.map((g) => (
              <div key={g.label}>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" px="xs" pt={8} pb={2}>{g.label}</Text>
                {g.rows.map((row) => (
                  // onMouseDown fires before the input's blur, so navigation isn't cancelled.
                  <UnstyledButton
                    key={row.key}
                    className="sd-search__row"
                    onMouseDown={(e) => { e.preventDefault(); go(row.to); }}
                    style={{ display: "block", width: "100%" }}
                  >
                    <Group justify="space-between" wrap="nowrap" px="xs" py={6} gap="xs">
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>{row.title}</Text>
                        {row.sub && <Text size="xs" c="dimmed" truncate>{row.sub}</Text>}
                      </div>
                      {row.badge && <Badge size="xs" variant="light" tt="none">{row.badge}</Badge>}
                    </Group>
                  </UnstyledButton>
                ))}
              </div>
            ))}
          </ScrollArea.Autosize>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
