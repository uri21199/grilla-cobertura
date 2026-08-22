import { supabaseAdmin } from './supabaseAdmin';
import { diaSemanaDe, lunesDeLaSemana } from './dia';
import { enviarMail } from './mailer';

interface ResultadoNotificacion {
  ok: boolean;
  token?: string;
  motivo?: string;
}

function siteUrl(): string {
  return process.env.URL || process.env.SITE_URL || 'http://localhost:8888';
}

// Reusa una notificación existente para (militante, fecha) si ya existe —
// nunca se notifica dos veces el mismo día a la misma persona (constraint del schema).
export async function crearYNotificar(militanteId: string, fecha: string): Promise<ResultadoNotificacion> {
  const { data: militante, error: militanteError } = await supabaseAdmin
    .from('militantes')
    .select('nombre, email')
    .eq('id', militanteId)
    .single();

  if (militanteError || !militante) return { ok: false, motivo: 'Militante no encontrado' };

  let token: string;
  const { data: existente } = await supabaseAdmin
    .from('notificaciones_mesita')
    .select('token')
    .eq('militante_id', militanteId)
    .eq('fecha', fecha)
    .maybeSingle();

  if (existente) {
    token = existente.token;
  } else {
    const { data: creada, error: crearError } = await supabaseAdmin
      .from('notificaciones_mesita')
      .insert({ militante_id: militanteId, fecha })
      .select('token')
      .single();
    if (crearError || !creada) return { ok: false, motivo: crearError?.message ?? 'No se pudo crear la notificación' };
    token = creada.token;
  }

  const dia = diaSemanaDe(fecha);
  const { data: clases } = await supabaseAdmin
    .from('cursada_militante')
    .select('materia, hora_inicio, hora_fin')
    .eq('militante_id', militanteId)
    .eq('dia', dia)
    .order('hora_inicio');

  const { data: eje } = await supabaseAdmin
    .from('ejes_semanales')
    .select('texto')
    .eq('semana', lunesDeLaSemana(fecha))
    .maybeSingle();

  const base = siteUrl();
  const linkSi = `${base}/confirmar/${token}?r=si`;
  const linkNo = `${base}/confirmar/${token}?r=no`;

  const claseTexto =
    clases && clases.length > 0
      ? clases.map((c) => `${c.materia} de ${c.hora_inicio.slice(0, 5)} a ${c.hora_fin.slice(0, 5)}`).join(' y ')
      : null;

  const ejeTexto = eje?.texto ?? null;

  const subject = '¿Podés cubrir la mesita mañana?';
  const intro = claseTexto
    ? `Mañana cursás ${claseTexto}. ¿Podés pasar un rato antes o después de tu clase a cubrir la mesita?`
    : '¿Podés pasar a cubrir la mesita mañana?';

  const text = [
    `Hola ${militante.nombre}!`,
    intro,
    ejeTexto ? `Eje de la semana: ${ejeTexto}` : null,
    '',
    `Sí, puedo: ${linkSi}`,
    `No puedo: ${linkNo}`,
  ]
    .filter((linea): linea is string => linea !== null)
    .join('\n');

  const html = `
    <p>Hola ${militante.nombre}!</p>
    <p>${intro}</p>
    ${ejeTexto ? `<p><strong>Eje de la semana:</strong> ${ejeTexto}</p>` : ''}
    <p>
      <a href="${linkSi}">Sí, puedo</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${linkNo}">No puedo</a>
    </p>
  `;

  await enviarMail(militante.email, subject, text, html);

  return { ok: true, token };
}
