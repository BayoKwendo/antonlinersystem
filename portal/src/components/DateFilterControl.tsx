import { useState } from "react";
import { Button, Group, Popover, Text, UnstyledButton } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconCalendarEvent, IconChevronDown } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useDateFilter, isTodayRange, type DateRange } from "../lib/dateFilter";

function label(range: DateRange): string {
  const [a, b] = range;
  if (!a) return "Pick a date";
  if (isTodayRange(range)) return `Today, ${dayjs(a).format("DD MMM YYYY")}`;
  if (!b || a.toDateString() === b.toDateString()) return dayjs(a).format("DD MMM YYYY");
  return `${dayjs(a).format("DD MMM")} – ${dayjs(b).format("DD MMM YYYY")}`;
}

/** Top-bar date filter: a pill that opens a range calendar with quick presets.
 *  Feeds the shared date-filter context that the dashboard reads. */
export function DateFilterControl() {
  const { range, setRange } = useDateFilter();
  const [open, setOpen] = useState(false);

  const today = () => { const t = new Date(); setRange([t, t]); };
  const last7 = () => { const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 6); setRange([s, t]); };
  const thisMonth = () => { const t = new Date(); setRange([new Date(t.getFullYear(), t.getMonth(), 1), t]); };

  return (
    <Popover opened={open} onChange={setOpen} position="bottom-end" shadow="md" radius="md" withinPortal>
      <Popover.Target>
        <UnstyledButton className="sd-datepill" onClick={() => setOpen((o) => !o)} aria-label="Filter by date">
          <Group gap={7} wrap="nowrap">
            <IconCalendarEvent size={15} stroke={1.8} />
            <Text size="sm" fw={500}>{label(range)}</Text>
            <IconChevronDown size={14} stroke={1.8} />
          </Group>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <Group gap="xs" mb="sm">
          <Button size="xs" variant="light" onClick={today}>Today</Button>
          <Button size="xs" variant="light" onClick={last7}>Last 7 days</Button>
          <Button size="xs" variant="light" onClick={thisMonth}>This month</Button>
        </Group>
        <DatePicker
          type="range"
          value={range}
          onChange={setRange}
          allowSingleDateInRange
          maxDate={new Date()}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
