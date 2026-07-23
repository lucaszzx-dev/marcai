export function periodsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export function validateAvailability(start, end, hours, blocks) {
  if (!hours.length) return "";
  const workingDay = hours.find(
    (item) => item.weekday === start.getDay() && item.enabled,
  );
  if (!workingDay) return "Este dia está marcado como fechado.";
  const minutes = (date) => date.getHours() * 60 + date.getMinutes();
  const [startHour, startMinute] = String(workingDay.start_time)
    .split(":")
    .map(Number);
  const [endHour, endMinute] = String(workingDay.end_time)
    .split(":")
    .map(Number);
  if (
    minutes(start) < startHour * 60 + startMinute ||
    minutes(end) > endHour * 60 + endMinute
  )
    return "O atendimento está fora do horário de trabalho configurado.";
  if (workingDay.break_start && workingDay.break_end) {
    const [breakStartHour, breakStartMinute] = String(workingDay.break_start)
      .split(":")
      .map(Number);
    const [breakEndHour, breakEndMinute] = String(workingDay.break_end)
      .split(":")
      .map(Number);
    const breakStart = new Date(start);
    breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);
    const breakEnd = new Date(start);
    breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);
    if (periodsOverlap(start, end, breakStart, breakEnd))
      return "Este atendimento ocupa o intervalo configurado para este dia.";
  }
  if (
    blocks.some((item) =>
      periodsOverlap(
        start,
        end,
        new Date(item.starts_at),
        new Date(item.ends_at),
      ),
    )
  )
    return "Este período está bloqueado nas configurações da agenda.";
  return "";
}
