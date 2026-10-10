
import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileText,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
  Bell,
  Bookmark,
  ClipboardCheck,
} from "lucide-react";

import "../styles/users/help.css";
import ayudaDesktop from "../components/imagenes/img/ayuda.png";
import ayudaMobile from "../components/imagenes/img/ayuda-responsiv.png";

interface HelpProps {
  navigateTo?: (page: string) => void;
}

const steps = [
  {
    number: "01",
    title: "Crea tu cuenta",
    icon: UserRoundPlus,
    description:
      "Selecciona “Registrarse” y completa los datos solicitados, como tu nombre, correo electrónico, contraseña e información de contacto.",
    details: [
      "Revisa que tu nombre y correo estén escritos correctamente.",
      "Utiliza una contraseña segura y que puedas recordar.",
      "No compartas tu contraseña con otras personas.",
    ],
  },
  {
    number: "02",
    title: "Inicia sesión",
    icon: UserRound,
    description:
      "Entra en “Ingresar” y escribe el correo electrónico y la contraseña que utilizaste al crear tu cuenta.",
    details: [
      "Verifica que el correo y la contraseña sean correctos.",
      "Comprueba que el bloqueo de mayúsculas no esté activado.",
      "Si olvidaste tu contraseña, utiliza la opción de recuperación y revisa también la carpeta de spam.",
    ],
  },
  {
    number: "03",
    title: "Completa tu perfil",
    icon: ClipboardCheck,
    description:
      "Presenta tu experiencia y tus conocimientos con información clara, honesta y actualizada.",
    details: [
      "Completa tus datos personales y de contacto.",
      "Agrega formación académica, experiencia, habilidades, cursos o certificaciones cuando corresponda.",
      "Actualiza tus datos si cambian tu teléfono, correo o trayectoria profesional.",
    ],
  },
  {
    number: "04",
    title: "Sube tu hoja de vida",
    icon: FileText,
    description:
      "En “Mis documentos” carga una hoja de vida reciente para tenerla disponible al realizar tus postulaciones.",
    details: [
      "Verifica que tus datos de contacto sean correctos.",
      "Incluye formación, experiencia y habilidades relevantes.",
      "Asegúrate de que el archivo se abra y se pueda leer correctamente.",
      "Actualízala cuando completes estudios, cursos o adquieras experiencia nueva.",
    ],
  },
  {
    number: "05",
    title: "Busca oportunidades",
    icon: Search,
    description:
      "Explora las ofertas disponibles y utiliza los filtros para encontrar puestos relacionados con tus intereses.",
    details: [
      "Prueba búsquedas por área, categoría, ubicación, tipo de puesto o palabras clave, si esos filtros están disponibles.",
      "Busca también puestos relacionados con tus habilidades, no solo por el nombre exacto del trabajo.",
      "Revisa periódicamente las nuevas oportunidades.",
    ],
  },
  {
    number: "06",
    title: "Lee los detalles de la oferta",
    icon: BookOpen,
    description:
      "Antes de postularte, revisa las funciones, requisitos, experiencia, formación solicitada, ubicación y demás condiciones publicadas.",
    details: [
      "Valora si el puesto se relaciona con tus intereses y experiencia.",
      "Comprueba si puedes trasladarte a la ubicación indicada.",
      "Lee toda la información antes de continuar.",
    ],
  },
  {
    number: "07",
    title: "Guarda o envía tu postulación",
    icon: Bookmark,
    description:
      "Guarda una oferta si deseas revisarla más tarde o selecciona “Postularme” cuando estés listo para participar.",
    details: [
      "Guardar una oferta no significa que ya te hayas postulado.",
      "Antes de enviar, revisa tus datos y que tu hoja de vida esté actualizada.",
      "Completa todos los campos solicitados y espera la confirmación del sistema.",
    ],
  },
  {
    number: "08",
    title: "Da seguimiento a tus postulaciones",
    icon: Bell,
    description:
      "Consulta “Mis postulaciones” para revisar las oportunidades a las que aplicaste y el estado que muestre cada proceso.",
    details: [
      "Si una postulación no aparece y no recibiste confirmación, verifica si el proceso terminó correctamente.",
      "Revisa las notificaciones de la plataforma y tu correo, incluida la carpeta de spam.",
      "Cada organización gestiona su selección y toma sus propias decisiones.",
    ],
  },
];

const faqs = [
  {
    question: "¿Necesito una cuenta para buscar oportunidades?",
    answer:
      "Puedes consultar las oportunidades que estén disponibles para visitantes. Para realizar determinadas acciones, como postularte, necesitarás una cuenta.",
  },
  {
    question: "¿Necesito experiencia laboral para registrarme?",
    answer:
      "No necesariamente. Si estás comenzando tu vida laboral, puedes incluir tu formación académica, cursos, habilidades, prácticas, voluntariados u otra experiencia relevante que corresponda a tu perfil.",
  },
  {
    question: "¿Puedo postularme a varias oportunidades?",
    answer:
      "Sí, siempre que cumplas con las condiciones de cada oferta. Lee los requisitos y la información de cada oportunidad antes de enviar tu postulación.",
  },
  {
    question: "¿Guardar una oferta significa que ya me postulé?",
    answer:
      "No. Guardar permite conservar una oferta para revisarla después. Para participar en el proceso debes completar la acción de postularte y recibir la confirmación correspondiente.",
  },
  {
    question: "¿Puedo cambiar mi hoja de vida después de subirla?",
    answer:
      "Sí, cuando la plataforma permita actualizar documentos desde “Mis documentos”, puedes reemplazarla por una versión más reciente.",
  },
  {
    question: "¿Qué pasa después de postularme?",
    answer:
      "La organización responsable revisa las candidaturas y administra su proceso de selección. Según la oportunidad, podría contactarte para solicitar información adicional, realizar una entrevista o avanzar a otra etapa.",
  },
  {
    question: "¿Quién decide si soy seleccionado?",
    answer:
      "La organización que publicó la oportunidad evalúa a las personas candidatas y toma las decisiones del proceso. FQA Empleos facilita el acceso a oportunidades, pero no garantiza una contratación.",
  },
  {
    question: "¿Qué hago si una oferta ya no está disponible?",
    answer:
      "Una oportunidad puede dejar de aceptar postulaciones cuando termina el periodo de recepción o la organización deja de necesitar candidatos. Puedes continuar revisando otras ofertas disponibles.",
  },
];

const tips = [
  "Mantén tu perfil y tus datos de contacto actualizados.",
  "Utiliza una hoja de vida clara, reciente y fácil de leer.",
  "Lee los requisitos antes de enviar una postulación.",
  "Revisa periódicamente “Mis postulaciones” y tus notificaciones.",
  "Proporciona información verdadera y pertinente.",
  "No te desanimes si una postulación no termina en contratación.",
];

export default function Help({ navigateTo }: HelpProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return faqs;

    return faqs.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query),
    );
  }, [searchTerm]);

  return (
    <div className="help-page">
      <main className="help-main" id="inicio">
        <section className="help-hero" aria-labelledby="help-hero-title">
          <picture className="help-hero-picture">
            <source
              media="(max-width: 700px)"
              srcSet={ayudaMobile}
            />
            <img
              src={ayudaDesktop}
              alt=""
              aria-hidden="true"
              className="help-hero-image"
            />
          </picture>

          <div className="help-hero-copy">
            <span className="help-kicker">
              <BookOpen size={15} aria-hidden="true" />
              GUÍA PARA CANDIDATOS
            </span>

            <h1 id="help-hero-title">
              Bienvenido a <span>FQA Empleos</span>
            </h1>

            <p>
              Aprende a utilizar la plataforma, preparar tu perfil y dar
              seguimiento a tus postulaciones. Encuentra aquí respuestas y
              recomendaciones para avanzar con confianza.
            </p>

            <a className="help-hero-link" href="#guia">
              Explorar la guía
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        </section>

        <section
          className="help-overview"
          aria-label="Qué puedes hacer en FQA Empleos"
        >
          <div className="help-overview-heading">
            <span className="help-section-label">
              TU BÚSQUEDA, MÁS SENCILLA
            </span>
            <h2>Todo lo que necesitas para empezar</h2>
            <p>
              Desde una sola cuenta puedes preparar tu perfil y gestionar tu
              búsqueda de empleo.
            </p>
          </div>

          <div className="help-overview-grid">
            <article className="help-overview-card">
              <span className="help-overview-icon">
                <UserRound size={22} />
              </span>
              <h3>Prepara tu perfil</h3>
              <p>
                Administra tus datos, formación, experiencia y hoja de vida.
              </p>
            </article>

            <article className="help-overview-card">
              <span className="help-overview-icon">
                <BriefcaseBusiness size={22} />
              </span>
              <h3>Encuentra oportunidades</h3>
              <p>
                Explora ofertas y revisa los requisitos antes de aplicar.
              </p>
            </article>

            <article className="help-overview-card">
              <span className="help-overview-icon">
                <ClipboardCheck size={22} />
              </span>
              <h3>Da seguimiento</h3>
              <p>
                Consulta tus postulaciones y mantente atento a las
                notificaciones.
              </p>
            </article>
          </div>
        </section>

        <section className="help-section" id="guia">
          <div className="help-section-heading">
            <span className="help-section-label">GUÍA PASO A PASO</span>
            <h2>¿Cómo utilizar FQA Empleos?</h2>
            <p>
              Selecciona cada etapa para consultar recomendaciones prácticas.
              No necesitas conocimientos técnicos: sigue las instrucciones de
              cada sección de la plataforma.
            </p>
          </div>

          <div className="help-steps">
            {steps.map((step) => {
              const Icon = step.icon;
              const isExpanded = expandedStep === step.number;

              return (
                <article
                  className={`help-step ${
                    isExpanded ? "help-step-expanded" : ""
                  }`}
                  key={step.number}
                >
                  <div className="help-step-topline">
                    <span className="help-step-number">{step.number}</span>
                    <span className="help-step-icon">
                      <Icon size={22} />
                    </span>
                  </div>

                  <h3>{step.title}</h3>
                  <p>{step.description}</p>

                  <button
                    type="button"
                    className="help-step-toggle"
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedStep(
                        isExpanded ? null : step.number,
                      )
                    }
                  >
                    {isExpanded
                      ? "Mostrar menos"
                      : "Ver recomendaciones"}
                    <ChevronDown size={17} aria-hidden="true" />
                  </button>

                  {isExpanded && (
                    <ul className="help-step-details">
                      {step.details.map((detail) => (
                        <li key={detail}>
                          <CheckCircle2
                            size={16}
                            aria-hidden="true"
                          />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="help-tips-section">
          <div className="help-tips-heading">
            <span className="help-section-label">RECOMENDACIONES</span>
            <h2>Mejora tu búsqueda de empleo</h2>
            <p>
              Pequeños hábitos pueden ayudarte a presentar mejor tu perfil.
            </p>
          </div>

          <div className="help-tips-grid">
            {tips.map((tip, index) => (
              <div className="help-tip-card" key={tip}>
                <span className="help-tip-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <CheckCircle2 size={19} aria-hidden="true" />
                <p>{tip}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="help-security">
          <span className="help-security-icon">
            <ShieldCheck size={25} />
          </span>

          <div>
            <span className="help-section-label">
              SEGURIDAD DE TU CUENTA
            </span>
            <h2>Protege tu información personal</h2>
            <p>
              No compartas tu contraseña ni códigos de acceso. Si utilizas un
              equipo compartido, cierra sesión al terminar. Actualiza tus datos
              únicamente desde los canales oficiales y desconfía de mensajes
              que te soliciten contraseñas.
            </p>
            <p className="help-security-note">
              El equipo de soporte no necesita que le compartas tu contraseña
              para ayudarte con un problema.
            </p>
          </div>
        </section>

        <section
          className="help-section help-faq-section"
          id="preguntas"
        >
          <div className="help-section-heading">
            <span className="help-section-label">
              CENTRO DE RESPUESTAS
            </span>
            <h2>Preguntas frecuentes</h2>
            <p>
              Busca una consulta o abre una pregunta para leer su respuesta.
            </p>
          </div>

          <label className="help-faq-search">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setOpenFaq(null);
              }}
              placeholder="Buscar una pregunta..."
              aria-label="Buscar en preguntas frecuentes"
            />
          </label>

          <div className="help-faq-list">
            {filteredFaqs.length ? (
              filteredFaqs.map((item) => {
                const index = faqs.indexOf(item);
                const isOpen = openFaq === index;

                return (
                  <article
                    className={`help-faq-item ${
                      isOpen ? "help-faq-item-open" : ""
                    }`}
                    key={item.question}
                  >
                    <button
                      type="button"
                      className="help-faq-question"
                      onClick={() =>
                        setOpenFaq(isOpen ? null : index)
                      }
                      aria-expanded={isOpen}
                    >
                      <span>{item.question}</span>
                      <span className="help-faq-chevron">
                        <ChevronDown
                          size={19}
                          aria-hidden="true"
                        />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="help-faq-answer">
                        <p>{item.answer}</p>
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="help-faq-empty">
                <CircleHelp size={24} aria-hidden="true" />
                <p>
                  No encontramos preguntas relacionadas con “{searchTerm}”.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                >
                  Ver todas las preguntas
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="help-contact-section" id="contacto">
          <div className="help-contact-heading">
            <span className="help-section-label help-section-label-light">
              ¿NECESITAS MÁS AYUDA?
            </span>
            <h2>Estamos para ayudarte</h2>
            <p>
              Si después de consultar esta guía continúas teniendo
              dificultades, comunícate con el equipo de soporte de FQA Empleos.
            </p>
          </div>

          <div className="help-contact-grid">
            <a
              href="mailto:soporte@fundacionqa.org"
              className="help-contact-card"
            >
              <span className="help-contact-icon">
                <Mail size={21} />
              </span>
              <span className="help-contact-copy">
                <span>Correo electrónico</span>
                <strong>soporte@fundacionqa.org</strong>
                <small>Escríbenos tu consulta</small>
              </span>
              <ArrowRight
                className="help-contact-arrow"
                size={17}
              />
            </a>

            <a
              href="tel:+50376234832"
              className="help-contact-card"
            >
              <span className="help-contact-icon">
                <Phone size={21} />
              </span>
              <span className="help-contact-copy">
                <span>Teléfono</span>
                <strong>+503 7623-4832</strong>
                <small>Llámanos para solicitar ayuda</small>
              </span>
              <ArrowRight
                className="help-contact-arrow"
                size={17}
              />
            </a>

            <div className="help-contact-card help-contact-location">
              <span className="help-contact-icon">
                <MapPin size={21} />
              </span>
              <span className="help-contact-copy">
                <span>Ubicación</span>
                <strong>San Salvador, El Salvador</strong>
                <small>
                  Atención: lunes a viernes, 8:00 a. m. – 4:00 p. m.
                </small>
              </span>
            </div>
          </div>

          <div className="help-contact-footnote">
            <LockKeyhole size={17} aria-hidden="true" />
            <span>
              Para agilizar la atención, indica qué intentabas hacer, en qué
              sección ocurrió el problema y qué mensaje apareció. No incluyas
              contraseñas ni códigos de acceso.
            </span>
          </div>
        </section>
      </main>

      <footer className="help-footer">
        <div className="help-footer-inner">
          <div className="help-footer-brand">
            <span className="help-footer-mark">
              <CircleHelp size={18} />
            </span>
            <strong>FQA Empleos</strong>
          </div>

          <span>Conectando personas con oportunidades.</span>

          <a href="#inicio">
            Volver arriba
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  );
}
