export type DiaSemana =
  | 'Lunes'
  | 'Martes'
  | 'Miercoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sabado'
  | 'Domingo';

export const DIAS_SEMANA: DiaSemana[] = [
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
  'Domingo',
];

export interface Militante {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
}

export interface CursadaMilitante {
  id: string;
  militante_id: string;
  materia: string;
  dia: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
}

export interface EjeSemanal {
  id: string;
  semana: string; // lunes de la semana, formato date (YYYY-MM-DD)
  texto: string;
}

export interface NotificacionMesita {
  id: string;
  militante_id: string;
  fecha: string;
  token: string;
  enviado_en: string;
  respondido_en: string | null;
  disponible: boolean | null;
  hora_desde: string | null;
  hora_hasta: string | null;
}

export interface VistaCoberturaDia {
  notificacion_id: string;
  fecha: string;
  militante_id: string;
  nombre: string;
  email: string;
  materia: string | null;
  hora_clase_inicio: string | null;
  hora_clase_fin: string | null;
  enviado_en: string;
  respondido_en: string | null;
  disponible: boolean | null;
  hora_desde: string | null;
  hora_hasta: string | null;
}
