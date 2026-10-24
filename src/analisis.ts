// Cálculos estadísticos y económicos hechos en código (la IA se equivoca en aritmética).
// La IA solo recibe estos resultados ya calculados y los interpreta.

export type Mov = { fecha: string; tipo: string; cantidad: number; producto_id: string };
export type PuntoPrecio = { producto_id: string; precio: number; cambiado_en: string };

const MS_DIA = 86400000;
const MIN_DIAS_VENTANA = 7; // días mínimos antes y después de un cambio de precio
const PLAZO_REPOSICION = 7; // SUPUESTO: días que tarda en llegar una reposición
const Z_SERVICIO = 1.65; // ~95% de nivel de servicio
const MAX_FILAS = 30;

const n2 = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");
const media = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const suma = (x: number[]) => x.reduce((a, b) => a + b, 0);

// Varianza muestral (n-1).
function varianza(x: number[]) {
  if (x.length < 2) return 0;
  const m = media(x);
  return x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1);
}

// Unidades por día durante `dias` días contados hacia atrás desde `ahora`.
function serieDiaria(movs: Mov[], tipo: string, dias: number, ahora: number) {
  const inicio = ahora - dias * MS_DIA;
  const serie = new Array<number>(dias).fill(0);
  for (const m of movs) {
    if (m.tipo !== tipo) continue;
    const i = Math.floor((new Date(m.fecha).getTime() - inicio) / MS_DIA);
    serie[Math.min(dias - 1, Math.max(0, i))] += Number(m.cantidad);
  }
  return serie;
}

export function analisisEstadistico(
  movs: Mov[],
  nombres: Map<string, string>,
  precios: Map<string, number>,
  stock: Map<string, number>,
  dias: number,
  fmt: (n: number) => string,
  ahora = Date.now()
): string[] {
  const inicio = ahora - dias * MS_DIA;
  const lineas: string[] = [
    `ANÁLISIS ESTADÍSTICO (calculado por la aplicación sobre ${dias} días; la demanda se mide con las SALIDAS):`,
    "Notas: varianza muestral de las unidades que salen por día; CV = desviación/media (mayor a 1 = demanda muy errática); " +
      `punto de reorden = media×${PLAZO_REPOSICION} + ${Z_SERVICIO}×desv×√${PLAZO_REPOSICION} (supuesto: reposición en ${PLAZO_REPOSICION} días, servicio ~95%); ` +
      "rotación = salidas del periodo / existencia actual; el valor usa el precio actual.",
  ];

  // Totales de todos los productos
  for (const [tipo, titulo] of [["salida", "Salidas"], ["entrada", "Entradas"]] as const) {
    const s = serieDiaria(movs, tipo, dias, ahora);
    const m = media(s);
    const v = varianza(s);
    const max = Math.max(...s);
    const diaMax = new Date(inicio + s.indexOf(max) * MS_DIA).toISOString().slice(0, 10);
    lineas.push(
      `${titulo} diarias (unidades, todos los productos): total ${n2(suma(s), 0)}, media ${n2(m)}/día, ` +
        `varianza ${n2(v)}, desviación ${n2(Math.sqrt(v))}, CV ${m > 0 ? n2(Math.sqrt(v) / m) : "—"}, ` +
        `día más alto ${diaMax} (${n2(max, 0)} u), días sin movimiento ${s.filter((x) => x === 0).length}`
    );
  }

  // Por producto
  const porProducto = new Map<string, Mov[]>();
  for (const m of movs) {
    if (m.tipo !== "salida" && m.tipo !== "entrada") continue;
    const l = porProducto.get(m.producto_id) ?? [];
    l.push(m);
    porProducto.set(m.producto_id, l);
  }

  const filas = [...porProducto.entries()].map(([id, ms]) => {
    const s = serieDiaria(ms, "salida", dias, ahora);
    const salidas = suma(s);
    const entradas = suma(serieDiaria(ms, "entrada", dias, ahora));
    const mediaDia = media(s);
    const desv = Math.sqrt(varianza(s));
    const existencia = stock.get(id);
    const precio = precios.get(id);

    let tendencia: number | null = null;
    if (dias >= 4) {
      const mitad = Math.floor(dias / 2);
      const a = suma(s.slice(0, mitad)) / mitad;
      const b = suma(s.slice(mitad)) / (dias - mitad);
      if (a > 0) tendencia = ((b - a) / a) * 100;
    }

    return {
      nombre: nombres.get(id) ?? id,
      salidas,
      entradas,
      mediaDia,
      varianza: desv ** 2,
      desv,
      cv: mediaDia > 0 ? desv / mediaDia : null,
      valor: precio !== undefined ? salidas * precio : 0,
      existencia,
      cobertura: existencia !== undefined && mediaDia > 0 ? existencia / mediaDia : null,
      rotacion: existencia !== undefined && existencia > 0 ? salidas / existencia : null,
      reorden: mediaDia > 0 ? Math.ceil(mediaDia * PLAZO_REPOSICION + Z_SERVICIO * desv * Math.sqrt(PLAZO_REPOSICION)) : null,
      tendencia,
      clase: "-" as string,
    };
  });

  // Clasificación ABC (A = primeros 80% acumulado, B = hasta 95%, C = resto)
  const porValor = filas.some((f) => f.valor > 0);
  const metrica = (f: (typeof filas)[number]) => (porValor ? f.valor : f.salidas);
  filas.sort((a, b) => metrica(b) - metrica(a));
  const total = suma(filas.map(metrica));
  let acumulado = 0;
  for (const f of filas) {
    if (metrica(f) <= 0 || total <= 0) continue;
    const antes = acumulado / total;
    acumulado += metrica(f);
    f.clase = antes < 0.8 ? "A" : antes < 0.95 ? "B" : "C";
  }

  lineas.push(
    `Productos con movimiento: ${filas.length}. Clasificación ABC según ${porValor ? "el valor de las salidas" : "las unidades de salida"} ` +
      `(A = productos que juntos suman ~80% del total). Se muestran los ${Math.min(filas.length, MAX_FILAS)} principales:`
  );
  for (const f of filas.slice(0, MAX_FILAS)) {
    lineas.push(
      [
        `- ${f.nombre}`,
        `clase ${f.clase}`,
        `salidas ${n2(f.salidas, 0)} u${porValor ? ` (${fmt(f.valor)})` : ""}`,
        `entradas ${n2(f.entradas, 0)} u`,
        `media ${n2(f.mediaDia)}/día`,
        `varianza ${n2(f.varianza)}`,
        `desv ${n2(f.desv)}`,
        `CV ${f.cv === null ? "—" : n2(f.cv)}`,
        `existencia ${f.existencia === undefined ? "—" : n2(f.existencia, 0)}`,
        `cobertura ${f.cobertura === null ? "—" : n2(f.cobertura, 0) + " días"}`,
        `rotación ${f.rotacion === null ? "—" : n2(f.rotacion)}`,
        `punto de reorden ${f.reorden === null ? "—" : f.reorden}`,
        `tendencia ${f.tendencia === null ? "—" : (f.tendencia >= 0 ? "+" : "") + n2(f.tendencia, 0) + "%"}`,
      ].join(" | ")
    );
  }
  return lineas;
}

// Elasticidad precio-demanda (de arco) e ingreso marginal, usando el historial de precios.
// Compara la demanda diaria antes y después del último cambio de precio de cada producto.
export function elasticidades(
  movs: Mov[],
  historial: PuntoPrecio[] | null,
  nombres: Map<string, string>,
  dias: number,
  fmt: (n: number) => string,
  ahora = Date.now()
): string[] {
  const titulo =
    "ELASTICIDAD PRECIO-DEMANDA E INGRESO MARGINAL (calculado por la aplicación; demanda = salidas por día antes y después del último cambio de precio):";
  if (historial === null) {
    return [titulo, "No disponible: no existe la tabla historial_precios, por lo que no se puede calcular la elasticidad."];
  }

  const inicio = ahora - dias * MS_DIA;
  const t = (p: PuntoPrecio) => new Date(p.cambiado_en).getTime();
  const salidas = movs.filter((m) => m.tipo === "salida");

  const porProducto = new Map<string, PuntoPrecio[]>();
  for (const p of historial) {
    const l = porProducto.get(p.producto_id) ?? [];
    l.push({ ...p, precio: Number(p.precio) });
    porProducto.set(p.producto_id, l);
  }

  const demanda = (id: string, desde: number, hasta: number) =>
    suma(
      salidas
        .filter((m) => m.producto_id === id && new Date(m.fecha).getTime() >= desde && new Date(m.fecha).getTime() < hasta)
        .map((m) => Number(m.cantidad))
    );

  const lineas: string[] = [];
  for (const [id, puntos] of porProducto) {
    puntos.sort((a, b) => t(a) - t(b));

    // Último cambio de precio dentro del periodo
    let k = -1;
    for (let i = puntos.length - 1; i >= 1; i--) {
      if (t(puntos[i]) >= inicio && puntos[i].precio !== puntos[i - 1].precio) {
        k = i;
        break;
      }
    }
    if (k === -1) continue;

    const tc = t(puntos[k]);
    const ini1 = Math.max(inicio, t(puntos[k - 1]));
    const d1 = (tc - ini1) / MS_DIA;
    const d2 = (ahora - tc) / MS_DIA;
    if (d1 < MIN_DIAS_VENTANA || d2 < MIN_DIAS_VENTANA) continue;

    const q1 = demanda(id, ini1, tc) / d1;
    const q2 = demanda(id, tc, ahora + 1) / d2;
    const p1 = puntos[k - 1].precio;
    const p2 = puntos[k].precio;
    if (q1 + q2 === 0 || p1 + p2 === 0) continue;

    const variacionQ = (q2 - q1) / ((q1 + q2) / 2);
    const variacionP = (p2 - p1) / ((p1 + p2) / 2);
    const e = variacionQ / variacionP;
    const ingresoMarginal = q2 !== q1 ? (p2 * q2 - p1 * q1) / (q2 - q1) : null;

    const tipo =
      e > 0 ? "positiva (la demanda subió con el precio: probablemente influyeron otros factores)"
      : Math.abs(e) > 1 ? "elástica"
      : Math.abs(e) < 1 ? "inelástica"
      : "unitaria";

    lineas.push(
      `- ${nombres.get(id) ?? id}: precio ${fmt(p1)} → ${fmt(p2)} (${new Date(tc).toISOString().slice(0, 10)}), ` +
        `demanda ${n2(q1)} → ${n2(q2)} u/día, elasticidad ${n2(e)} (${tipo}), ` +
        `ingreso diario ${fmt(p1 * q1)} → ${fmt(p2 * q2)}, ` +
        `ingreso marginal ${ingresoMarginal === null ? "no calculable (la demanda no cambió)" : fmt(ingresoMarginal) + " por unidad adicional"}`
    );
  }

  if (lineas.length === 0) {
    lineas.push(
      `No hubo cambios de precio con datos suficientes en el periodo (se necesitan al menos ${MIN_DIAS_VENTANA} días antes y después del cambio): no se puede calcular la elasticidad.`
    );
  }
  return [titulo, ...lineas];
}
