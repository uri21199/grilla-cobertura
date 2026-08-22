import type { Handler } from '@netlify/functions';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { diaSemanaDe } from './lib/dia';
import { crearYNotificar } from './lib/crearNotificacion';

// Argentina no usa horario de verano: offset fijo UTC-3.
const AR_OFFSET_MS = 3 * 60 * 60 * 1000;

function fechaArgentina(offsetDias: number): string {
  const t = new Date(Date.now() - AR_OFFSET_MS + offsetDias * 24 * 60 * 60 * 1000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, '0');
  const d = String(t.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Corre todas las noches (ver schedule en netlify.toml). Notifica a militantes
// activos que: (a) cursan mañana, o (b) no tienen ninguna cursada/trabajo
// cargado todavía (no sabemos si están ocupados, así que se les pregunta
// igual con el mensaje genérico). Nunca duplica una notificación ya creada
// para esa fecha, así que reintentar el cron el mismo día es inofensivo.
export const handler: Handler = async () => {
  const manana = fechaArgentina(1);
  const diaManana = diaSemanaDe(manana);

  // Sábado y domingo no hay mesita: no se notifica a nadie, ni siquiera a
  // quien no tiene horario cargado.
  if (diaManana === 'Sabado' || diaManana === 'Domingo') {
    return { statusCode: 200, body: JSON.stringify({ fecha: manana, dia: diaManana, candidatos: 0, enviados: 0 }) };
  }

  const [{ data: militantes }, { data: cursadas }, { data: trabajos }, { data: yaNotificados }] = await Promise.all([
    supabaseAdmin.from('militantes').select('id, nombre').eq('activo', true),
    supabaseAdmin.from('cursada_militante').select('militante_id, dia'),
    supabaseAdmin.from('trabajo_militante').select('militante_id'),
    supabaseAdmin.from('notificaciones_mesita').select('militante_id').eq('fecha', manana),
  ]);

  const diasPorMilitante = new Map<string, Set<string>>();
  for (const c of cursadas ?? []) {
    if (!diasPorMilitante.has(c.militante_id)) diasPorMilitante.set(c.militante_id, new Set());
    diasPorMilitante.get(c.militante_id)!.add(c.dia);
  }
  const conTrabajo = new Set((trabajos ?? []).map((t) => t.militante_id));
  const yaNotificadosSet = new Set((yaNotificados ?? []).map((n) => n.militante_id));

  const candidatos = (militantes ?? []).filter((m) => {
    if (yaNotificadosSet.has(m.id)) return false;
    const diasCursada = diasPorMilitante.get(m.id);
    const tieneClaseManana = diasCursada?.has(diaManana) ?? false;
    const sinHorarioCargado = (diasCursada?.size ?? 0) === 0 && !conTrabajo.has(m.id);
    return tieneClaseManana || sinHorarioCargado;
  });

  const resultados = await Promise.allSettled(candidatos.map((m) => crearYNotificar(m.id, manana)));
  const enviados = resultados.filter((r) => r.status === 'fulfilled' && r.value.ok).length;

  return {
    statusCode: 200,
    body: JSON.stringify({ fecha: manana, dia: diaManana, candidatos: candidatos.length, enviados }),
  };
};
