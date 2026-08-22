import type { Handler } from '@netlify/functions';
import { crearYNotificar } from './lib/crearNotificacion';

const jsonHeaders = { 'Content-Type': 'application/json' };

function jsonResponse(statusCode: number, body: unknown) {
  return { statusCode, headers: jsonHeaders, body: JSON.stringify(body) };
}

// Endpoint manual para mandar (o reenviar) una notificación puntual, protegido
// con la misma clave de admin de la app. Sirve para probar el flujo de mail
// de punta a punta; el job nocturno del paso 5 va a reusar crearYNotificar.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Método no permitido' });

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { militanteId, fecha, adminPassword } = body;

    if (adminPassword !== process.env.VITE_ADMIN_PASSWORD) {
      return jsonResponse(401, { error: 'No autorizado' });
    }
    if (!militanteId || !fecha) {
      return jsonResponse(400, { error: 'Faltan militanteId / fecha' });
    }

    const resultado = await crearYNotificar(militanteId, fecha);
    if (!resultado.ok) return jsonResponse(400, { error: resultado.motivo });

    return jsonResponse(200, { ok: true, token: resultado.token });
  } catch {
    return jsonResponse(500, { error: 'Error interno' });
  }
};
