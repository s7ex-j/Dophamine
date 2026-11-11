import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, Moon, Sun } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

const APP_URL = `${import.meta.env.BASE_URL}app/`
const REPO_URL = "https://github.com/s7ex-j/Dophamine"
const RELEASE_URL = `${REPO_URL}/releases/latest`

const steps = [
  {
    title: "Configura tu plan",
    description:
      "Edad, altura, peso, actividad y objetivo. Dophamine estima tu gasto con Mifflin-St Jeor y propone calorías y macros de referencia.",
  },
  {
    title: "Registra totales diarios",
    description:
      "Peso, calorías, proteína, carbohidratos y grasas del día. No hace falta catalogar alimento por alimento.",
  },
  {
    title: "Mira la tendencia",
    description: "El peso diario se suaviza para separar la señal del ruido de agua, sal y digestión.",
  },
  {
    title: "Decide en tu revisión semanal",
    description: "La app propone un ajuste y explica por qué. Nunca cambia tu objetivo sin que lo aceptes.",
  },
]

const faqs = [
  {
    q: "¿Necesito crear una cuenta?",
    a: "No. Dophamine no tiene cuentas, servidor, anuncios ni telemetría. Abres la app y empiezas a registrar.",
  },
  {
    q: "¿Dónde se guardan mis datos?",
    a: "En tu dispositivo: SQLite en Android e iOS, y el almacenamiento local del navegador en la versión web. Si borras los datos del navegador o desinstalas la app, se pierden: la versión actual no tiene respaldo ni sincronización.",
  },
  {
    q: "¿La web y el móvil se sincronizan?",
    a: "Todavía no. Son almacenamientos independientes. La sincronización cifrada opcional está en la hoja de ruta.",
  },
  {
    q: "¿Cuándo aparece mi TDEE?",
    a: "Cuando hay suficiente historial: al menos 14 días con peso, 10 de ellos con ingesta, en un periodo de 13 días o más. Antes de eso la app indica que la estimación se está construyendo.",
  },
  {
    q: "¿Reemplaza a un nutricionista o a un médico?",
    a: "No. Dophamine ofrece estimaciones y herramientas de seguimiento personal; no diagnostica, trata ni previene condiciones médicas. Consulta a un profesional ante cambios importantes de dieta, peso o entrenamiento.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Nada. Es open source bajo licencia MIT y el código está en GitHub.",
  },
]

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    try {
      localStorage.setItem("dophamine-theme", dark ? "dark" : "light")
    } catch {
      // Sin almacenamiento (modo privado): el tema dura solo esta visita.
    }
  }, [dark])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark((value) => !value)}
      aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <a href="#top" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-7" />
          Dophamine
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#vistas" className="hover:text-foreground">Las seis vistas</a>
          <a href="#como-funciona" className="hover:text-foreground">Cómo funciona</a>
          <a href="#privacidad" className="hover:text-foreground">Privacidad</a>
          <a href="#faq" className="hover:text-foreground">Preguntas</a>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <a href={REPO_URL} aria-label="Código en GitHub">
              <GitHubIcon className="size-4" />
            </a>
          </Button>
          <Button asChild className="ml-1 rounded-full px-5">
            <a href={APP_URL}>Abrir la app</a>
          </Button>
        </div>
      </div>
    </header>
  )
}

/* ───────── El gráfico de portada: la báscula de cada día contra la tendencia.
   Es la idea central de la app, así que es lo primero que se ve. Los datos son
   de ejemplo y se generan con una semilla fija (siempre salen iguales). */

interface Punto {
  dia: number
  peso: number
  tendencia: number
}

function serieDeEjemplo(): Punto[] {
  let semilla = 7
  const azar = () => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648
    return semilla / 2147483648
  }
  const puntos: Punto[] = []
  let tendencia = 0
  for (let dia = 0; dia < 42; dia++) {
    const real = 78.6 - dia * 0.047
    const ruido = (azar() - 0.5) * 1.5 + (dia % 7 === 5 || dia % 7 === 6 ? 0.45 : 0)
    const peso = Math.round((real + ruido) * 10) / 10
    tendencia = dia === 0 ? peso : tendencia + 0.28 * (peso - tendencia) // el mismo factor que usa la app
    puntos.push({ dia: dia + 1, peso, tendencia: Math.round(tendencia * 100) / 100 })
  }
  return puntos
}

function TrendChart() {
  const puntos = useMemo(serieDeEjemplo, [])
  const [activo, setActivo] = useState<number | null>(null)
  const [soloTendencia, setSoloTendencia] = useState(false)
  const trazo = useRef<SVGPathElement>(null)
  const [largo, setLargo] = useState(1400)

  const W = 1000
  const H = 360
  const M = { izq: 46, der: 16, arr: 18, aba: 34 }
  const min = 75.6
  const max = 79.8
  const x = (i: number) => M.izq + (i / (puntos.length - 1)) * (W - M.izq - M.der)
  const y = (kg: number) => M.arr + ((max - kg) / (max - min)) * (H - M.arr - M.aba)
  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.tendencia).toFixed(1)}`).join(" ")

  useEffect(() => {
    if (trazo.current) setLargo(Math.ceil(trazo.current.getTotalLength()))
  }, [])

  const elegido = activo === null ? puntos[puntos.length - 1] : puntos[activo]
  const inicio = puntos[6].tendencia
  const cambio = elegido.tendencia - inicio

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 px-1 pb-5">
        <dl className="flex flex-wrap gap-x-9 gap-y-3">
          <div>
            <dt className="text-sm text-muted-foreground">Día {elegido.dia}, la báscula dice</dt>
            <dd className="font-display text-3xl font-bold tabular-nums text-noise">{elegido.peso.toFixed(1)} kg</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Tu tendencia dice</dt>
            <dd className="font-display text-3xl font-bold tabular-nums text-primary">{elegido.tendencia.toFixed(1)} kg</dd>
          </div>
          <div className="hidden sm:block">
            <dt className="text-sm text-muted-foreground">Desde la primera semana</dt>
            <dd className="font-display text-3xl font-bold tabular-nums">
              {cambio > 0 ? "+" : "−"}
              {Math.abs(cambio).toFixed(1)} kg
            </dd>
          </div>
        </dl>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={soloTendencia}
            onChange={(e) => setSoloTendencia(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          Ocultar el ruido diario
        </label>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-none select-none"
        role="img"
        aria-label="Gráfico de ejemplo: el peso de cada día sube y baja, mientras la tendencia suavizada desciende de forma constante."
        onPointerMove={(e) => {
          const caja = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - caja.left) / caja.width) * W
          const i = Math.round(((px - M.izq) / (W - M.izq - M.der)) * (puntos.length - 1))
          setActivo(Math.max(0, Math.min(puntos.length - 1, i)))
        }}
        onPointerLeave={() => setActivo(null)}
      >
        {[76, 77, 78, 79].map((kg) => (
          <g key={kg}>
            <line x1={M.izq} x2={W - M.der} y1={y(kg)} y2={y(kg)} className="stroke-border" strokeWidth="1" />
            <text x={M.izq - 10} y={y(kg) + 4} textAnchor="end" className="fill-muted-foreground text-[13px]">
              {kg}
            </text>
          </g>
        ))}
        {[1, 2, 3, 4, 5, 6].map((semana) => (
          <text key={semana} x={x(semana * 7 - 4)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[13px]">
            Semana {semana}
          </text>
        ))}

        {!soloTendencia &&
          puntos.map((p, i) => (
            <g key={p.dia}>
              <line x1={x(i)} x2={x(i)} y1={y(p.peso)} y2={y(p.tendencia)} className="stroke-noise" strokeWidth="1.5" opacity="0.28" />
              <circle cx={x(i)} cy={y(p.peso)} r={activo === i ? 7 : 4.5} className="fill-noise" opacity={activo === null || activo === i ? 0.95 : 0.5} />
            </g>
          ))}

        <path
          ref={trazo}
          d={linea}
          fill="none"
          className="trazo stroke-primary"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ ["--largo" as string]: largo }}
        />

        {activo !== null && (
          <g>
            <line x1={x(activo)} x2={x(activo)} y1={M.arr} y2={H - M.aba} className="stroke-foreground" strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />
            <circle cx={x(activo)} cy={y(puntos[activo].tendencia)} r="8" className="fill-background stroke-primary" strokeWidth="4" />
          </g>
        )}
      </svg>
      <figcaption className="px-1 pt-3 text-sm text-muted-foreground">
        Datos de ejemplo. Pasa el cursor o el dedo por el gráfico: cada punto es un pesaje y la línea es lo que Dophamine usa para decidir.
      </figcaption>
    </figure>
  )
}


/* ───────── El teléfono de la portada: capturas reales de la app, que van pasando solas.
   Es un teléfono genérico dibujado con CSS (ver index.css), sin marca. */

const pantallas = [
  { id: "hoy", nombre: "Hoy", texto: "Cuánta energía te queda y qué falta registrar." },
  { id: "analisis", nombre: "Análisis", texto: "La tendencia de tu peso y tu ingesta de la semana." },
  { id: "entreno", nombre: "Entreno", texto: "Tu rutina y la sesión de hoy, serie por serie." },
  { id: "habitos", nombre: "Hábitos", texto: "Cinco compromisos diarios en una vista mensual." },
]

function PhoneDemo() {
  const [activa, setActiva] = useState(0)
  const [manual, setManual] = useState(false)

  useEffect(() => {
    if (manual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const reloj = window.setInterval(() => setActiva((i) => (i + 1) % pantallas.length), 3600)
    return () => window.clearInterval(reloj)
  }, [manual])

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="telefono">
        <span className="telefono-boton b1" />
        <span className="telefono-boton b2" />
        <span className="telefono-boton b3" />
        <div className="telefono-pantalla">
          <div className="telefono-estado">
            <span>9:41</span>
            <span className="telefono-isla" />
            <span className="telefono-iconos" aria-hidden="true">
              <i className="senal" />
              <i className="bateria" />
            </span>
          </div>
          <div className="telefono-carril" style={{ transform: `translateX(-${activa * 100}%)` }}>
            {pantallas.map((p) => (
              <img
                key={p.id}
                src={`${import.meta.env.BASE_URL}pantallas/${p.id}.webp`}
                alt={`Pantalla ${p.nombre} de Dophamine con datos de ejemplo`}
                width={390}
                height={780}
                draggable={false}
              />
            ))}
          </div>
          <span className="telefono-barra" />
        </div>
      </div>

      <div className="w-full max-w-[21rem]">
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Pantallas de la app">
          {pantallas.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === activa}
              onClick={() => {
                setManual(true)
                setActiva(i)
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                i === activa ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <p className="mt-3 min-h-[2.75rem] text-center text-sm text-muted-foreground text-pretty">
          {pantallas[activa].texto}
        </p>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-x-10 gap-y-14 px-5 pb-16 pt-12 md:pt-20 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <a
            href={RELEASE_URL}
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="size-2 rounded-full bg-primary" />
            Versión 0.4.0, de código abierto
          </a>
          <h1 className="mt-6 text-[clamp(2.9rem,9.6vw,6rem)] font-extrabold leading-[0.93] tracking-[-0.035em] text-balance">
            Un pesaje no dice nada. La tendencia sí.
          </h1>
          <p className="mt-7 max-w-xl text-lg text-muted-foreground text-pretty md:text-xl">
            Dophamine toma los totales de tu día (peso, calorías y macros), separa la señal del ruido y una vez por
            semana te propone un ajuste pequeño, con su porqué. Sin catalogar cada comida, sin hojas de cálculo y sin
            cuentas.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" asChild className="h-13 rounded-full px-7 text-base">
              <a href={APP_URL}>
                Abrir en la web <ArrowRight />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-13 rounded-full px-6 text-base">
              <a href={REPO_URL}>
                <GitHubIcon className="size-4" /> Ver el código
              </a>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Sin cuentas", "Sin telemetría", "Funciona sin conexión"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <PhoneDemo />
      </div>
    </section>
  )
}

function Trend() {
  return (
    <section className="border-t bg-muted/50 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-[17ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.025em] text-balance md:text-6xl">
          La báscula hace ruido. Aquí lo ves.
        </h2>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          El agua, la sal y la digestión mueven tu peso cada día más de lo que cambia en una semana. Por eso Dophamine
          decide con la línea, no con los puntos.
        </p>
        <div className="mt-10 rounded-3xl border bg-card p-5 shadow-[0_30px_80px_-30px_color-mix(in_oklch,var(--primary)_45%,transparent)] md:p-8">
          <TrendChart />
        </div>
      </div>
    </section>
  )
}

/* ───────── Las seis vistas, cada una con una miniatura de lo que muestra. */

function MiniHoy() {
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" className="stroke-forest-foreground/15" strokeWidth="13" />
        <circle cx="50" cy="50" r="40" fill="none" className="stroke-primary" strokeWidth="13" strokeLinecap="round" strokeDasharray="251" strokeDashoffset="113" />
      </svg>
      <div>
        <p className="font-display text-4xl font-bold tabular-nums">1 240</p>
        <p className="text-sm opacity-70">kcal restantes de 2 750</p>
      </div>
    </div>
  )
}

function MiniBarras({ valores, clase }: { valores: number[]; clase: string }) {
  return (
    <div className="flex h-20 items-end gap-1.5">
      {valores.map((v, i) => (
        <div key={i} className={`flex-1 rounded-sm ${clase}`} style={{ height: `${v}%` }} />
      ))}
    </div>
  )
}

function MiniEntreno() {
  const series = [
    ["Sentadilla", "80 kg", "8", "RIR 2"],
    ["Sentadilla", "80 kg", "8", "RIR 1"],
    ["Press banca", "62.5 kg", "6", "RIR 2"],
  ]
  return (
    <table className="w-full text-sm tabular-nums">
      <tbody>
        {series.map((fila, i) => (
          <tr key={i} className="border-t first:border-t-0">
            <td className="py-2 font-medium">{fila[0]}</td>
            <td className="py-2 text-right text-muted-foreground">{fila[1]}</td>
            <td className="py-2 pl-3 text-right text-muted-foreground">× {fila[2]}</td>
            <td className="py-2 pl-3 text-right text-primary">{fila[3]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MiniHabitos() {
  const mes = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1]
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {mes.map((hecho, i) => (
        <span key={i} className={`aspect-square rounded-[5px] ${hecho ? "bg-primary" : "bg-muted"}`} />
      ))}
    </div>
  )
}

function MiniBienestar() {
  const filas: [string, number][] = [
    ["Ánimo", 78],
    ["Energía", 62],
    ["Estrés", 34],
    ["Sueño", 85],
  ]
  return (
    <div className="space-y-2.5">
      {filas.map(([nombre, valor]) => (
        <div key={nombre} className="flex items-center gap-3 text-sm">
          <span className="w-16 text-muted-foreground">{nombre}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-chart-2" style={{ width: `${valor}%` }} />
          </span>
        </div>
      ))}
    </div>
  )
}

function Vista({
  titulo,
  texto,
  className = "",
  children,
}: {
  titulo: string
  texto: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <article className={`flex flex-col justify-between gap-7 rounded-3xl border bg-card p-6 md:p-7 ${className}`}>
      <div>{children}</div>
      <div>
        <h3 className="text-2xl font-bold tracking-tight">{titulo}</h3>
        <p className="mt-1.5 text-[0.95rem] text-muted-foreground text-pretty">{texto}</p>
      </div>
    </article>
  )
}

function Vistas() {
  return (
    <section id="vistas" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-[18ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.025em] text-balance md:text-6xl">
          Seis vistas sobre los mismos registros.
        </h2>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Cada pantalla responde una pregunta concreta. Todas leen los mismos datos, guardados en tu dispositivo.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <article className="flex flex-col justify-between gap-8 rounded-3xl bg-forest p-6 text-forest-foreground md:col-span-3 md:p-8">
            <MiniHoy />
            <div>
              <h3 className="text-3xl font-bold tracking-tight">Hoy</h3>
              <p className="mt-1.5 opacity-75 text-pretty">
                Energía consumida o restante, macros, consistencia de la semana y el siguiente paso que desbloquea
                más información.
              </p>
            </div>
          </article>
          <Vista
            className="md:col-span-3"
            titulo="Progreso"
            texto="Peso, calorías y macros diarios con tendencia suavizada. Puedes corregir días anteriores."
          >
            <MiniBarras valores={[62, 70, 58, 74, 66, 81, 60, 72, 69, 77, 64, 71, 68, 75]} clase="bg-noise/75" />
          </Vista>
          <Vista
            className="md:col-span-2"
            titulo="Entreno"
            texto="Rutinas full body, torso/pierna, empuje/tirón o propias. Registra carga, repeticiones y RIR por serie."
          >
            <MiniEntreno />
          </Vista>
          <Vista
            className="md:col-span-2"
            titulo="Hábitos"
            texto="Cinco hábitos (plan, proteína, movimiento, descanso y chequeo) con una vista mensual de consistencia."
          >
            <MiniHabitos />
          </Vista>
          <Vista
            className="md:col-span-2"
            titulo="Bienestar"
            texto="Ánimo, energía, estrés, horas de sueño y una nota privada, con lectura de la tendencia reciente."
          >
            <MiniBienestar />
          </Vista>
          <Vista
            className="md:col-span-6 md:flex-row md:items-end"
            titulo="Análisis"
            texto="Promedios de macros, adherencia calórica y la evolución de peso frente a ingesta."
          >
            <div className="md:w-[420px]">
              <MiniBarras valores={[92, 100, 88, 97, 100, 46, 79, 95, 100, 90, 84, 100, 72, 96, 100, 91, 88, 97]} clase="bg-primary/80" />
            </div>
          </Vista>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Miniaturas ilustrativas con datos de ejemplo.</p>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 border-t py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-[16ch] text-4xl font-extrabold leading-[1.02] tracking-[-0.025em] text-balance md:text-6xl">
          De un número suelto a una decisión.
        </h2>
        <ol className="mt-14 grid gap-x-8 gap-y-10 md:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="border-t-2 border-foreground pt-5">
              <span className="font-display text-6xl font-extrabold leading-none tracking-tight text-primary">{index + 1}</span>
              <h3 className="mt-4 text-xl font-bold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-[0.95rem] text-muted-foreground text-pretty">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Tdee() {
  return (
    <section className="bg-forest py-20 text-forest-foreground md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-lg opacity-70">La cuenta que hace la revisión semanal</p>
        <p className="mt-5 font-display text-[clamp(1.7rem,5.2vw,4rem)] font-bold leading-[1.08] tracking-[-0.02em]">
          Gasto real <span className="opacity-50">=</span> lo que comiste <span className="opacity-50">−</span>{" "}
          <span className="text-noise">lo que cambió tu tendencia</span> <span className="opacity-50">×</span> 7 700 kcal/kg
        </p>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="text-xl font-bold">Aprende de tus datos</h3>
            <p className="mt-2 opacity-75 text-pretty">
              Con al menos 14 días de registros, 10 de ellos con ingesta, compara lo que comiste en promedio con lo que
              se movió tu peso suavizado. Ya no depende de una fórmula fija.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold">Te dice en qué estado está</h3>
            <p className="mt-2 opacity-75 text-pretty">
              La estimación se está construyendo, se está actualizando o está en pausa por falta de registros. Nunca
              inventa un número que no puede sostener.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold">Ajustes pequeños</h3>
            <p className="mt-2 opacity-75 text-pretty">
              Cada revisión cambia como máximo 100 kcal diarias y solo cuando la diferencia lo justifica. La propuesta
              se aplica si tú la aceptas.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Privacy() {
  const hechos = [
    ["Datos en tu dispositivo", "SQLite en Android e iOS y almacenamiento local en la web."],
    ["Sin rastreo", "Sin cuentas, analítica, anuncios ni telemetría. Esta página tampoco carga nada de terceros."],
    ["Funciona sin conexión", "Registra y consulta tu progreso aunque no tengas internet."],
    ["Sin respaldo automático", "Si borras los datos del navegador o desinstalas la app, se pierden. La sincronización cifrada está en la hoja de ruta."],
  ]
  return (
    <section id="privacidad" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[1.05fr_1fr]">
        <h2 className="text-[clamp(2.4rem,7vw,5rem)] font-extrabold leading-[0.96] tracking-[-0.03em] text-balance">
          Tus datos de salud no salen de tu dispositivo.
        </h2>
        <dl>
          {hechos.map(([titulo, texto]) => (
            <div key={titulo} className="border-t py-5 last:border-b">
              <dt className="text-lg font-semibold">{titulo}</dt>
              <dd className="mt-1 text-muted-foreground text-pretty">{texto}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.025em] md:text-5xl">Preguntas frecuentes</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map(({ q, a }) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="py-5 text-left text-lg font-semibold">{q}</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

function CallToAction() {
  return (
    <section className="px-5 pb-20">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-primary px-6 py-16 text-primary-foreground md:px-14 md:py-20">
        <h2 className="max-w-[16ch] text-4xl font-extrabold leading-[1] tracking-[-0.03em] text-balance md:text-7xl">
          Empieza con lo que ya sabes de tu día.
        </h2>
        <p className="mt-5 max-w-xl text-lg opacity-90">
          Peso y totales diarios. Dophamine se encarga de la tendencia y te avisa cuándo tiene datos suficientes.
        </p>
        <Button size="lg" variant="secondary" asChild className="mt-9 h-13 rounded-full px-7 text-base">
          <a href={APP_URL}>
            Abrir Dophamine <ArrowRight />
          </a>
        </Button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-muted-foreground sm:flex-row">
        <p>
          Creado por{" "}
          <a href="https://github.com/s7ex-j" className="font-medium text-foreground hover:underline">
            Jharol Vilca Ramos
          </a>
          . Licencia MIT.
        </p>
        <div className="flex gap-5">
          <a href={`${REPO_URL}/blob/main/docs/PRIVACY.md`} className="hover:text-foreground">Privacidad</a>
          <a href={`${REPO_URL}/blob/main/CHANGELOG.md`} className="hover:text-foreground">Cambios</a>
          <a href={REPO_URL} className="hover:text-foreground">GitHub</a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Trend />
        <Vistas />
        <HowItWorks />
        <Tdee />
        <Privacy />
        <Faq />
        <CallToAction />
      </main>
      <Footer />
    </>
  )
}
