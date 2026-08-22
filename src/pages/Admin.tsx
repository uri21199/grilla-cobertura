import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateLocal, lunesDeLaSemana } from '../lib/dia';
import { DIAS_SEMANA, type CursadaMilitante, type DiaSemana, type Militante, type TrabajoMilitante } from '../types/db';

type NuevaCursada = { materia: string; dia: DiaSemana; hora_inicio: string; hora_fin: string };
type NuevoTrabajo = { dia: DiaSemana; hora_inicio: string; hora_fin: string };

const CURSADA_VACIA: NuevaCursada = { materia: '', dia: 'Lunes', hora_inicio: '', hora_fin: '' };
const TRABAJO_VACIO: NuevoTrabajo = { dia: 'Lunes', hora_inicio: '', hora_fin: '' };

function Mensaje({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p className={`mt-2 rounded-lg p-2 text-sm ${texto.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
      {texto}
    </p>
  );
}

function EjeSemanalCard() {
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const semana = lunesDeLaSemana(formatDateLocal(new Date()));

  useEffect(() => {
    supabase
      .from('ejes_semanales')
      .select('texto')
      .eq('semana', semana)
      .maybeSingle()
      .then(({ data }) => {
        setTexto(data?.texto ?? '');
        setCargando(false);
      });
  }, [semana]);

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase.from('ejes_semanales').upsert({ semana, texto }, { onConflict: 'semana' });
    setGuardando(false);
    setMensaje(error ? `Error: ${error.message}` : 'Eje guardado.');
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-semibold text-slate-700">Eje de la semana (desde {semana})</h2>
      {cargando ? (
        <p className="mt-2 text-sm text-slate-400">Cargando...</p>
      ) : (
        <>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder="Texto que se manda en el mail de esta semana"
            className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            onClick={guardar}
            disabled={guardando}
            className="mt-2 rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
          >
            Guardar eje
          </button>
          <Mensaje texto={mensaje} />
        </>
      )}
    </div>
  );
}

export function Admin() {
  const [militantes, setMilitantes] = useState<Militante[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [creando, setCreando] = useState(false);
  const [mensajeLista, setMensajeLista] = useState<string | null>(null);

  const [seleccionado, setSeleccionado] = useState<Militante | null>(null);
  const [cursada, setCursada] = useState<CursadaMilitante[]>([]);
  const [trabajo, setTrabajo] = useState<TrabajoMilitante[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nuevaCursada, setNuevaCursada] = useState<NuevaCursada>(CURSADA_VACIA);
  const [nuevoTrabajo, setNuevoTrabajo] = useState<NuevoTrabajo>(TRABAJO_VACIO);

  function cargarMilitantes() {
    setCargandoLista(true);
    supabase
      .from('militantes')
      .select('*')
      .order('nombre')
      .then(({ data }) => {
        setMilitantes(data ?? []);
        setCargandoLista(false);
      });
  }

  useEffect(cargarMilitantes, []);

  async function crearMilitante() {
    if (!nuevoNombre.trim() || !nuevoEmail.trim()) return;
    setCreando(true);
    setMensajeLista(null);
    const { error } = await supabase.from('militantes').insert({ nombre: nuevoNombre.trim(), email: nuevoEmail.trim() });
    setCreando(false);
    if (error) {
      setMensajeLista(`Error: ${error.message}`);
      return;
    }
    setNuevoNombre('');
    setNuevoEmail('');
    setMensajeLista('Militante agregado.');
    cargarMilitantes();
  }

  async function seleccionar(m: Militante) {
    setSeleccionado(m);
    setMensaje(null);
    setNuevaCursada(CURSADA_VACIA);
    setNuevoTrabajo(TRABAJO_VACIO);
    setCargandoDetalle(true);
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from('cursada_militante').select('*').eq('militante_id', m.id).order('dia').order('hora_inicio'),
      supabase.from('trabajo_militante').select('*').eq('militante_id', m.id).order('dia').order('hora_inicio'),
    ]);
    setCursada(c ?? []);
    setTrabajo(t ?? []);
    setCargandoDetalle(false);
  }

  function volver() {
    setSeleccionado(null);
    setCursada([]);
    setTrabajo([]);
  }

  async function guardarMilitante() {
    if (!seleccionado) return;
    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase
      .from('militantes')
      .update({ nombre: seleccionado.nombre, email: seleccionado.email, activo: seleccionado.activo })
      .eq('id', seleccionado.id);
    setGuardando(false);
    setMensaje(error ? `Error: ${error.message}` : 'Militante guardado.');
    if (!error) cargarMilitantes();
  }

  function actualizarCursadaLocal<K extends keyof CursadaMilitante>(id: string, campo: K, valor: CursadaMilitante[K]) {
    setCursada((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  }

  async function guardarCursada(c: CursadaMilitante) {
    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase
      .from('cursada_militante')
      .update({ materia: c.materia, dia: c.dia, hora_inicio: c.hora_inicio, hora_fin: c.hora_fin })
      .eq('id', c.id);
    setGuardando(false);
    setMensaje(error ? `Error: ${error.message}` : 'Cursada guardada.');
  }

  async function eliminarCursada(id: string) {
    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase.from('cursada_militante').delete().eq('id', id);
    setGuardando(false);
    if (error) {
      setMensaje(`Error: ${error.message}`);
      return;
    }
    setCursada((prev) => prev.filter((c) => c.id !== id));
    setMensaje('Cursada eliminada.');
  }

  async function agregarCursada() {
    if (!seleccionado || !nuevaCursada.materia.trim() || !nuevaCursada.hora_inicio || !nuevaCursada.hora_fin) return;
    setGuardando(true);
    setMensaje(null);
    const { data, error } = await supabase
      .from('cursada_militante')
      .insert({ militante_id: seleccionado.id, ...nuevaCursada, materia: nuevaCursada.materia.trim() })
      .select('*')
      .single();
    setGuardando(false);
    if (error || !data) {
      setMensaje(`Error: ${error?.message ?? 'no se pudo crear'}`);
      return;
    }
    setCursada((prev) => [...prev, data]);
    setNuevaCursada(CURSADA_VACIA);
    setMensaje('Cursada agregada.');
  }

  function actualizarTrabajoLocal<K extends keyof TrabajoMilitante>(id: string, campo: K, valor: TrabajoMilitante[K]) {
    setTrabajo((prev) => prev.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)));
  }

  async function guardarTrabajo(t: TrabajoMilitante) {
    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase
      .from('trabajo_militante')
      .update({ dia: t.dia, hora_inicio: t.hora_inicio, hora_fin: t.hora_fin })
      .eq('id', t.id);
    setGuardando(false);
    setMensaje(error ? `Error: ${error.message}` : 'Trabajo guardado.');
  }

  async function eliminarTrabajo(id: string) {
    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase.from('trabajo_militante').delete().eq('id', id);
    setGuardando(false);
    if (error) {
      setMensaje(`Error: ${error.message}`);
      return;
    }
    setTrabajo((prev) => prev.filter((t) => t.id !== id));
    setMensaje('Trabajo eliminado.');
  }

  async function agregarTrabajo() {
    if (!seleccionado || !nuevoTrabajo.hora_inicio || !nuevoTrabajo.hora_fin) return;
    setGuardando(true);
    setMensaje(null);
    const { data, error } = await supabase
      .from('trabajo_militante')
      .insert({ militante_id: seleccionado.id, ...nuevoTrabajo })
      .select('*')
      .single();
    setGuardando(false);
    if (error || !data) {
      setMensaje(`Error: ${error?.message ?? 'no se pudo crear'}`);
      return;
    }
    setTrabajo((prev) => [...prev, data]);
    setNuevoTrabajo(TRABAJO_VACIO);
    setMensaje('Trabajo agregado.');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-16">
      <h1 className="text-lg font-semibold text-slate-800">Admin</h1>

      <div className="mt-3">
        <EjeSemanalCard />
      </div>

      {!seleccionado && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-slate-700">Militantes</h2>

          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Agregar militante</p>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Nombre"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <button
                onClick={crearMilitante}
                disabled={creando}
                className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
            <Mensaje texto={mensajeLista} />
          </div>

          <div className="mt-3 space-y-1">
            {cargandoLista && <p className="text-sm text-slate-400">Cargando...</p>}
            {!cargandoLista &&
              militantes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => seleccionar(m)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-left text-sm active:bg-slate-50"
                >
                  <span>
                    <span className="font-medium text-slate-800">{m.nombre}</span>
                    <span className="text-slate-500"> · {m.email}</span>
                  </span>
                  {!m.activo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Inactivo</span>}
                </button>
              ))}
          </div>
        </div>
      )}

      {seleccionado && (
        <div className="mt-4">
          <button onClick={volver} className="text-sm font-medium text-blue-600">
            ← Volver a la lista
          </button>

          {cargandoDetalle && <p className="mt-3 text-sm text-slate-400">Cargando...</p>}

          <Mensaje texto={mensaje} />

          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <label className="block text-xs font-medium text-slate-500">Nombre</label>
            <input
              type="text"
              value={seleccionado.nombre}
              onChange={(e) => setSeleccionado({ ...seleccionado, nombre: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
            <label className="mt-2 block text-xs font-medium text-slate-500">Email</label>
            <input
              type="email"
              value={seleccionado.email}
              onChange={(e) => setSeleccionado({ ...seleccionado, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={seleccionado.activo}
                onChange={(e) => setSeleccionado({ ...seleccionado, activo: e.target.checked })}
              />
              Activo (recibe notificaciones)
            </label>
            <button
              onClick={guardarMilitante}
              disabled={guardando}
              className="mt-2 rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              Guardar militante
            </button>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-slate-700">Cursada</h3>
          {cursada.map((c) => (
            <div key={c.id} className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500">Materia</label>
                  <input
                    type="text"
                    value={c.materia}
                    onChange={(e) => actualizarCursadaLocal(c.id, 'materia', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Día</label>
                  <select
                    value={c.dia}
                    onChange={(e) => actualizarCursadaLocal(c.id, 'dia', e.target.value as DiaSemana)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div />
                <div>
                  <label className="block text-xs font-medium text-slate-500">Hora inicio</label>
                  <input
                    type="time"
                    value={c.hora_inicio.slice(0, 5)}
                    onChange={(e) => actualizarCursadaLocal(c.id, 'hora_inicio', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Hora fin</label>
                  <input
                    type="time"
                    value={c.hora_fin.slice(0, 5)}
                    onChange={(e) => actualizarCursadaLocal(c.id, 'hora_fin', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => guardarCursada(c)}
                  disabled={guardando}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  onClick={() => eliminarCursada(c.id)}
                  disabled={guardando}
                  className="rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Agregar cursada</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Materia"
                value={nuevaCursada.materia}
                onChange={(e) => setNuevaCursada({ ...nuevaCursada, materia: e.target.value })}
                className="col-span-2 rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <select
                value={nuevaCursada.dia}
                onChange={(e) => setNuevaCursada({ ...nuevaCursada, dia: e.target.value as DiaSemana })}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                {DIAS_SEMANA.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div />
              <input
                type="time"
                value={nuevaCursada.hora_inicio}
                onChange={(e) => setNuevaCursada({ ...nuevaCursada, hora_inicio: e.target.value })}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <input
                type="time"
                value={nuevaCursada.hora_fin}
                onChange={(e) => setNuevaCursada({ ...nuevaCursada, hora_fin: e.target.value })}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <button
              onClick={agregarCursada}
              disabled={guardando}
              className="mt-2 rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              Agregar
            </button>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-slate-700">Trabajo</h3>
          {trabajo.map((t) => (
            <div key={t.id} className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Día</label>
                  <select
                    value={t.dia}
                    onChange={(e) => actualizarTrabajoLocal(t.id, 'dia', e.target.value as DiaSemana)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div />
                <div>
                  <label className="block text-xs font-medium text-slate-500">Hora inicio</label>
                  <input
                    type="time"
                    value={t.hora_inicio.slice(0, 5)}
                    onChange={(e) => actualizarTrabajoLocal(t.id, 'hora_inicio', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Hora fin</label>
                  <input
                    type="time"
                    value={t.hora_fin.slice(0, 5)}
                    onChange={(e) => actualizarTrabajoLocal(t.id, 'hora_fin', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => guardarTrabajo(t)}
                  disabled={guardando}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  onClick={() => eliminarTrabajo(t.id)}
                  disabled={guardando}
                  className="rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white p-3">
            <p className="text-xs font-medium text-slate-500">Agregar trabajo</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <select
                value={nuevoTrabajo.dia}
                onChange={(e) => setNuevoTrabajo({ ...nuevoTrabajo, dia: e.target.value as DiaSemana })}
                className="col-span-2 rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                {DIAS_SEMANA.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={nuevoTrabajo.hora_inicio}
                onChange={(e) => setNuevoTrabajo({ ...nuevoTrabajo, hora_inicio: e.target.value })}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
              <input
                type="time"
                value={nuevoTrabajo.hora_fin}
                onChange={(e) => setNuevoTrabajo({ ...nuevoTrabajo, hora_fin: e.target.value })}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <button
              onClick={agregarTrabajo}
              disabled={guardando}
              className="mt-2 rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
