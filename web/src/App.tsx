import { useEffect, useState } from "react"
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  ChartLine,
  Check,
  Dumbbell,
  EyeOff,
  Heart,
  LayoutGrid,
  Lock,
  Moon,
  Smartphone,
  Sun,
  WifiOff,
  type LucideIcon,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const APP_URL = `${import.meta.env.BASE_URL}app/`
const REPO_URL = "https://github.com/s7ex-j/Dophamine"
const RELEASE_URL = `${REPO_URL}/releases/tag/v0.3.0`

const modules: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: LayoutGrid,
    title: "Hoy",
    description:
      "Energía consumida o restante, macros, consistencia de la semana y el siguiente paso que desbloquea más información.",
  },
  {
    icon: Activity,
    title: "Progreso",
    description:
      "Peso, calorías y macros diarios con tendencia suavizada. Puedes corregir días anteriores.",
  },
  {
    icon: Dumbbell,
    title: "Entreno",
    description:
      "Rutinas full body, torso/pierna, empuje/tirón o propias. Registra carga, repeticiones y RIR por serie.",
  },
  {
    icon: ChartLine,
    title: "Análisis",
    description:
      "Promedios de macros, adherencia calórica y la evolución de peso frente a ingesta.",
  },
  {
    icon: CalendarCheck,
    title: "Hábitos",
    description:
      "Cinco hábitos (plan, proteína, movimiento, descanso y chequeo) con una vista mensual de consistencia.",
  },
  {
    icon: Heart,
    title: "Bienestar",
    description:
      "Ánimo, energía, estrés, horas de sueño y una nota privada, con lectura de la tendencia reciente.",
  },
]

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
    description:
      "El peso diario se suaviza para separar la señal del ruido de agua, sal y digestión.",
  },
  {
    title: "Decide en tu revisión semanal",
    description:
      "La app propone un ajuste y explica por qué. Nunca cambia tu objetivo sin que lo aceptes.",
  },
]

const principles = [
  "Menos fricción, mejores datos: los totales diarios bastan para empezar.",
  "Cada recomendación muestra qué datos tiene y cuáles le faltan.",
  "Tú tienes la última palabra: una revisión propone, nunca modifica sola el plan.",
  "Offline no es una limitación: funciona sin cuenta y sin conexión.",
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
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <a href="#top" className="flex items-center gap-2 font-semibold">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-6" />
          Dophamine
        </a>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <a href="#funciones" className="hover:text-foreground">Funciones</a>
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
          <Button size="sm" asChild className="ml-1">
            <a href={APP_URL}>Abrir la app</a>
          </Button>
        </div>
      </div>
    </header>
  )
}

function MacroRow({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.round((value / target) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value} / {target} g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

function AppPreview() {
  const week = [
    { day: "L", value: 92 },
    { day: "M", value: 101 },
    { day: "X", value: 88 },
    { day: "J", value: 97 },
    { day: "V", value: 114 },
    { day: "S", value: 0 },
    { day: "D", value: 79 },
  ]
  return (
    <Card className="relative w-full max-w-sm gap-5 shadow-xl">
      <CardHeader>
        <CardDescription className="text-xs font-semibold uppercase tracking-wide text-primary">
          Hoy · energía disponible
        </CardDescription>
        <CardTitle className="flex items-baseline gap-2 text-4xl font-bold">
          1 240 <span className="text-sm font-normal text-muted-foreground">kcal restantes de 2 750</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <MacroRow label="Proteína" value={128} target={165} color="bg-chart-3" />
          <MacroRow label="Carbohidratos" value={190} target={340} color="bg-chart-4" />
          <MacroRow label="Grasas" value={52} target={80} color="bg-chart-1" />
        </div>
        <Separator />
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Semana en una mirada</p>
          <div className="flex h-20 items-end gap-2">
            {week.map(({ day, value }) => (
              <div key={day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end overflow-hidden rounded bg-muted">
                  {value > 0 ? (
                    <div
                      className={`w-full rounded ${value > 110 ? "bg-chart-3" : "bg-chart-2"}`}
                      style={{ height: `${Math.min(value, 100)}%` }}
                    />
                  ) : null}
                </div>
                <span className="text-[10px] text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm dark:border-amber-400/30 dark:bg-amber-400/10">
          <p className="font-semibold text-amber-900 dark:text-amber-200">Siguiente paso</p>
          <p className="text-amber-800 dark:text-amber-200/80">
            Registra tu peso de hoy: faltan 3 días para estimar tu TDEE.
          </p>
        </div>
      </CardContent>
      <p className="absolute -bottom-7 left-0 right-0 text-center text-xs text-muted-foreground">
        Vista ilustrativa con datos de ejemplo
      </p>
    </Card>
  )
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-7">
          <Badge variant="secondary" asChild>
            <a href={RELEASE_URL}>v0.3.0 · open source · offline-first</a>
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Tus registros de nutrición y entreno, convertidos en{" "}
            <span className="text-primary">decisiones claras</span>.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            Registra los totales que importan y recibe una revisión semanal pequeña, explicable y bajo tu
            control. Sin catalogar cada comida, sin hojas de cálculo y sin cuentas.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href={APP_URL}>
                Abrir en la web <ArrowRight />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href={REPO_URL}>
                <GitHubIcon className="size-4" /> Ver el código
              </a>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Sin cuentas", "Sin telemetría", "Funciona sin conexión"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center pb-8 lg:justify-end">
          <AppPreview />
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {description ? <p className="text-muted-foreground text-pretty">{description}</p> : null}
    </div>
  )
}

function Features() {
  return (
    <section id="funciones" className="scroll-mt-16 border-t bg-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Funciones"
          title="Seis vistas, un mismo contexto"
          description="Cada pantalla responde una pregunta concreta y comparte los mismos registros locales."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="gap-3 transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow="Cómo funciona" title="Un flujo corto que mantiene el contexto" />
        <ol className="grid gap-6 md:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="space-y-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>

        <Tabs defaultValue="tdee" className="mx-auto mt-16 max-w-3xl">
          <TabsList className="mx-auto">
            <TabsTrigger value="tdee">TDEE</TabsTrigger>
            <TabsTrigger value="training">Progresión</TabsTrigger>
            <TabsTrigger value="principles">Principios</TabsTrigger>
          </TabsList>
          <TabsContent value="tdee">
            <Card>
              <CardHeader>
                <CardTitle>Gasto energético que aprende de tus datos</CardTitle>
                <CardDescription>Sin fórmulas fijas una vez que hay historial.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  El peso diario se suaviza con una media móvil exponencial. Con al menos 14 días de registros
                  (10 con ingesta) se compara la tendencia de peso con lo que comiste: si consumiste en promedio{" "}
                  <em>X</em> kcal y la tendencia cambió <em>Δ</em> kg por semana, el TDEE observado es la ingesta
                  media corregida por ese cambio (≈ 7 700 kcal por kg).
                </p>
                <p>
                  La revisión semanal indica si la estimación se está <strong>construyendo</strong>,{" "}
                  <strong>actualizando</strong> o está <strong>en pausa</strong> por falta de registros, y solo
                  sugiere un ajuste cuando la diferencia lo justifica.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle>Rutinas que se adaptan a tu sesión anterior</CardTitle>
                <CardDescription>Generación y progresión locales.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Elige una división (full body, torso/pierna, empuje/tirón, cadena posterior o propia), los días y
                  los ejercicios. La rutina puede generarse según tu objetivo, duración y equipo disponible.
                </p>
                <p>
                  Cada serie guarda carga, repeticiones y RIR. La siguiente sugerencia parte de lo que hiciste, no de
                  una plantilla genérica.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="principles">
            <Card>
              <CardHeader>
                <CardTitle>Filosofía del producto</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {principles.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

function Privacy() {
  const items: { icon: LucideIcon; title: string; description: string }[] = [
    { icon: Lock, title: "Datos en tu dispositivo", description: "SQLite en Android/iOS y almacenamiento local en la web." },
    { icon: EyeOff, title: "Sin rastreo", description: "Sin cuentas, analítica, anuncios ni telemetría." },
    { icon: WifiOff, title: "Offline-first", description: "Registra y consulta tu progreso sin conexión." },
    { icon: Smartphone, title: "Web y móvil", description: "La misma app en el navegador, Android e iOS." },
  ]
  return (
    <section id="privacidad" className="scroll-mt-16 border-y bg-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Privacidad"
          title="Tus datos de salud no salen de tu dispositivo"
          description="No hay servidor al que enviarlos. Eso también significa que no hay respaldo automático: si borras los datos del navegador, se pierden."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, description }) => (
            <div key={title} className="space-y-2 rounded-xl border bg-card p-5">
              <Icon className="size-5 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-3xl px-4">
        <SectionHeading eyebrow="Preguntas" title="Preguntas frecuentes" />
        <Accordion type="single" collapsible className="w-full">
          {faqs.map(({ q, a }) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-base">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

function CallToAction() {
  return (
    <section className="px-4 pb-20">
      <div className="mx-auto max-w-6xl rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground">
        <h2 className="text-3xl font-bold tracking-tight">Empieza con lo que ya sabes de tu día</h2>
        <p className="mx-auto mt-3 max-w-xl opacity-90">
          Peso y totales diarios. Dophamine se encarga de la tendencia y te avisa cuándo tiene datos suficientes.
        </p>
        <Button size="lg" variant="secondary" asChild className="mt-8">
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
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
        <p>
          Creado por{" "}
          <a href="https://github.com/s7ex-j" className="font-medium text-foreground hover:underline">
            Jharol Vilca Ramos
          </a>{" "}
          · Licencia MIT
        </p>
        <div className="flex gap-4">
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
        <Features />
        <HowItWorks />
        <Privacy />
        <Faq />
        <CallToAction />
      </main>
      <Footer />
    </>
  )
}
