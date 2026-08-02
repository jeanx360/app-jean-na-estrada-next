"use client";

import { useState } from "react";
import { CalendarOff, Clock3, LoaderCircle, Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import { createDriverScheduleBlockAction } from "@/app/motorista/agenda/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button button--primary" type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="auth-spinner" size={17} /> : <Save size={17} />}
      {pending ? "Salvando..." : "Bloquear horario"}
    </button>
  );
}

export function DriverScheduleBlockForm({ defaultDate }: { defaultDate: string }) {
  const [allDay, setAllDay] = useState(false);

  return (
    <form action={createDriverScheduleBlockAction} className="driver-schedule-block-form">
      <div className="driver-schedule-block-form__heading">
        <CalendarOff size={22} />
        <div><span className="eyebrow">INDISPONIBILIDADE</span><h2>Bloquear agenda</h2><p>Use para compromissos pessoais, folgas ou periodos em que voce nao recebera corridas.</p></div>
      </div>
      <div className="driver-schedule-block-form__grid">
        <label><span>Data</span><input type="date" name="blockDate" defaultValue={defaultDate} required /></label>
        <label><span>Titulo</span><input name="title" defaultValue="Indisponivel" minLength={2} maxLength={80} required /></label>
        <label className="driver-schedule-block-form__toggle"><input type="checkbox" name="isAllDay" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} /><span>Bloquear o dia inteiro</span></label>
        {!allDay ? (
          <>
            <label><span>Inicio</span><input type="time" name="startTime" defaultValue="08:00" required /></label>
            <label><span>Fim</span><input type="time" name="endTime" defaultValue="12:00" required /></label>
          </>
        ) : null}
        <label className="driver-schedule-block-form__notes"><span>Observacoes</span><textarea name="notes" rows={2} maxLength={300} placeholder="Opcional" /></label>
      </div>
      <div className="driver-schedule-block-form__footer"><Clock3 size={16} /><span>Reservas confirmadas ou em andamento impedem bloqueios sobrepostos.</span><SubmitButton /></div>
    </form>
  );
}
