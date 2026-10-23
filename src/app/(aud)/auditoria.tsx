import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ES_MOVIMIENTO, FiltroFechas, Registro, leerFecha, lineasDeDetalle, obtenerAuditoria } from "@/auditoria";
import { obtenerSesion } from "@/auth";
import { Chips } from "@/components/Chips";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedCard } from "@/components/ThemedCard";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { formatearFechaHora } from "@/movimientos";
import { Perfil, obtenerPerfil, puedeVer } from "@/permisos";
import { useTheme } from "@/theme";

const PERIODOS = [
  { valor: "todo", etiqueta: "Todo" },
  { valor: "hoy", etiqueta: "Hoy" },
  { valor: "7", etiqueta: "7 días" },
  { valor: "30", etiqueta: "30 días" },
  { valor: "rango", etiqueta: "Rango" },
];

function inicioDelDia(f: Date) {
  return new Date(f.getFullYear(), f.getMonth(), f.getDate());
}

export default function Auditoria() {
  const router = useRouter();
  const colors = useTheme();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [registros, setRegistros] = useState<Registro[] | null>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);

  const [periodo, setPeriodo] = useState("todo");
  const [textoDesde, setTextoDesde] = useState("");
  const [textoHasta, setTextoHasta] = useState("");
  const [errorFecha, setErrorFecha] = useState("");

  const puedeAuditar = puedeVer(perfil, ["auditoria.ver"]);

  // Convierte el periodo elegido en un rango de fechas. Devuelve null si el rango escrito no es válido.
  function calcularFiltro(): FiltroFechas | null {
    const ahora = new Date();
    if (periodo === "hoy") return { desde: inicioDelDia(ahora) };
    if (periodo === "7" || periodo === "30") {
      const desde = inicioDelDia(ahora);
      desde.setDate(desde.getDate() - Number(periodo));
      return { desde };
    }
    if (periodo === "rango") {
      const desde = textoDesde.trim() === "" ? undefined : leerFecha(textoDesde);
      const hasta = textoHasta.trim() === "" ? undefined : leerFecha(textoHasta, true);
      if (desde === null || hasta === null) return null;
      if (desde && hasta && desde > hasta) return null;
      return { desde, hasta };
    }
    return {};
  }

  async function cargar() {
    const filtro = calcularFiltro();
    if (filtro === null) {
      setErrorFecha("Usa el formato AAAA-MM-DD (ej. 2026-10-23) y que \"desde\" no sea posterior a \"hasta\".");
      return;
    }
    setErrorFecha("");
    setCargando(true);
    setAbierto(null);
    setRegistros(await obtenerAuditoria(filtro));
    setCargando(false);
  }

  useEffect(() => {
    async function iniciar() {
      const sesion = await obtenerSesion();
      if (!sesion) return router.replace("/login");
      setPerfil(await obtenerPerfil(sesion.user.id));
    }
    iniciar();
  }, []);

  // Carga los registros al entrar y cada vez que cambia el periodo (el rango se aplica con su botón).
  useEffect(() => {
    if (periodo !== "rango") cargar();
  }, [periodo]);

  const texto = busqueda.trim().toLowerCase();
  const lista = useMemo(
    () =>
      (registros ?? []).filter((r) =>
        `${r.accion} ${r.entidad ?? ""} ${r.usuario ?? ""}`.toLowerCase().includes(texto)
      ),
    [registros, texto]
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.primario, fontWeight: "bold" }}>← Volver</ThemedText>
          </TouchableOpacity>
          <ThemedText type="titulo">Auditoría</ThemedText>

          {perfil && !puedeAuditar && (
            <ThemedText type="error">No tienes permiso para ver la auditoría.</ThemedText>
          )}
          {registros === null && <ThemedText type="error">No se pudo cargar la auditoría.</ThemedText>}

          {perfil && puedeAuditar && (
            <>
              <Chips opciones={PERIODOS} valor={periodo} onCambio={setPeriodo} />

              {periodo === "rango" && (
                <View style={{ gap: 8 }}>
                  <ThemedInput placeholder="Desde (AAAA-MM-DD)" value={textoDesde} onChangeText={setTextoDesde} />
                  <ThemedInput placeholder="Hasta (AAAA-MM-DD)" value={textoHasta} onChangeText={setTextoHasta} />
                  <ThemedButton titulo="Aplicar rango" onPress={cargar} cargando={cargando} />
                </View>
              )}
              {errorFecha !== "" && <ThemedText type="error">{errorFecha}</ThemedText>}

              <ThemedInput
                placeholder="Buscar por acción, entidad o usuario..."
                value={busqueda}
                onChangeText={setBusqueda}
              />

              {cargando && <ThemedText type="suave">Cargando...</ThemedText>}
              {!cargando && registros !== null && (
                <ThemedText type="suave">
                  {lista.length} registro(s){registros.length === 200 ? " (se muestran los 200 más recientes)" : ""}
                </ThemedText>
              )}
              {!cargando && lista.length === 0 && registros !== null && (
                <ThemedText type="suave">No hay registros.</ThemedText>
              )}

              {lista.map((r) => {
                const expandido = abierto === r.id;
                const lineas = lineasDeDetalle(r.detalle);
                return (
                  <TouchableOpacity key={r.id} onPress={() => setAbierto(expandido ? null : r.id)}>
                    <ThemedCard style={{ gap: 4 }}>
                      <ThemedText style={{ fontWeight: "bold" }}>{r.accion}</ThemedText>
                      <ThemedText type="suave">
                        {[r.entidad, r.entidad_id && `#${r.entidad_id}`].filter(Boolean).join(" ")} ·{" "}
                        {formatearFechaHora(r.fecha)}
                      </ThemedText>

                      {expandido && (
                        <View style={{ gap: 8, marginTop: 8 }}>
                          <Dato titulo="Fecha y hora" valor={formatearFechaHora(r.fecha)} />
                          <Dato titulo="Usuario" valor={r.usuario ?? (r.usuario_id ? "Usuario sin ficha de persona" : "Sistema")} />
                          <Dato titulo="Acción" valor={r.accion} />
                          <Dato
                            titulo="Entidad afectada"
                            valor={[r.entidad, r.entidad_id && `#${r.entidad_id}`].filter(Boolean).join(" ") || "—"}
                          />

                          {lineas.length > 0 ? (
                            <View style={{ gap: 6 }}>
                              <ThemedText style={{ fontWeight: "bold" }}>Detalle</ThemedText>
                              {lineas.map(([clave, valor]) => (
                                <Dato key={clave} titulo={clave} valor={valor} />
                              ))}
                            </View>
                          ) : (
                            <ThemedText type="suave">Este registro no tiene más detalle.</ThemedText>
                          )}

                          {ES_MOVIMIENTO(r.entidad) && r.entidad_id && (
                            <ThemedButton
                              titulo="Ver movimiento"
                              onPress={() =>
                                router.push({ pathname: "/movimiento-detalle", params: { id: r.entidad_id! } })
                              }
                            />
                          )}
                        </View>
                      )}

                      {!expandido && (
                        <ThemedText style={{ color: colors.primario, fontWeight: "bold" }}>Ver detalle →</ThemedText>
                      )}
                    </ThemedCard>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View>
      <ThemedText type="suave">{titulo}</ThemedText>
      <ThemedText>{valor}</ThemedText>
    </View>
  );
}
