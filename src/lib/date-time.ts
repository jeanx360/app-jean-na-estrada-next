export const JNE_TIME_ZONE = "America/Sao_Paulo";

type DateTimeValue = string | number | Date | null | undefined;
type DateTimeOptions = {
  fallback?: string;
  includeSeconds?: boolean;
};

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_ONLY_PATTERN = /^(\d{2}):(\d{2})(?::\d{2})?$/;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: JNE_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: JNE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const timeWithSecondsFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: JNE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function toValidDate(value: Exclude<DateTimeValue, null | undefined>) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBrazilDate(value: DateTimeValue, fallback = "Data não informada") {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "string") {
    const match = DATE_ONLY_PATTERN.exec(value);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = toValidDate(value);
  return date ? dateFormatter.format(date) : fallback;
}

export function formatBrazilTime(value: DateTimeValue, fallback = "Horário não informado") {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "string") {
    const match = TIME_ONLY_PATTERN.exec(value);
    if (match) {
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return `${match[1]}:${match[2]}`;
    }
  }

  const date = toValidDate(value);
  return date ? timeFormatter.format(date) : fallback;
}

export function formatBrazilDateTime(value: DateTimeValue, options: DateTimeOptions = {}) {
  const { fallback = "Data não informada", includeSeconds = false } = options;
  if (value === null || value === undefined || value === "") return fallback;

  const date = toValidDate(value);
  if (!date) return fallback;

  const time = includeSeconds ? timeWithSecondsFormatter.format(date) : timeFormatter.format(date);
  return `${dateFormatter.format(date)} às ${time}`;
}
