import React, { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  Search,
  UserPlus,
} from "lucide-react";

import "../styles/users/help.css";

interface HelpProps {
  navigateTo?: (page: string) => void;
}

interface HelpStep {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const helpSteps: HelpStep[] = [
  {
    number: 1,
    title: "Crea tu cuenta",
    description:
      "Haz clic en “Registrarse” y completa tus datos personales, correo electrónico y contraseña. Verifica que toda la información sea correcta antes de continuar.",
    icon: UserPlus,
  },
  {
    number: 2,
    title: "Inicia sesión",
    description:
      "Una vez creada tu cuenta, selecciona “Ingresar” e introduce tu correo electrónico y contraseña para acceder a tu perfil.",
    icon: CheckCircle2,
  },
  {
    number: 3,
    title: "Completa tu perfil",
    description:
      "Agrega y mantén actualizada tu información personal y profesional. Un perfil completo permite presentar mejor tu experiencia y habilidades.",
    icon: FileText,
  },
  {
    number: 4,
    title: "Carga tu hoja de vida",
    description:
      "Dirígete a la sección “Mis documentos” y carga tu CV. Procura utilizar una versión actualizada que incluya tu formación, experiencia y habilidades.",
    icon: FileText,
  },
  {
    number: 5,
    title: "Busca oportunidades",
    description:
      "Explora las ofertas de empleo disponibles. Utiliza los filtros para encontrar oportunidades relacionadas con tu área de interés.",
    icon: Search,
  },
  {
    number: 6,
    title: "Revisa una oferta",
    description:
      "Selecciona una vacante para conocer el puesto, organización, descripción, requisitos, experiencia solicitada, ubicación y demás información.",
    icon: BookOpen,
  },
  {
    number: 7,
    title: "Guarda una oportunidad",
    description:
      "Si una oferta te interesa pero todavía no quieres postularte, puedes guardarla para consultarla posteriormente.",
    icon: CheckCircle2,
  },
  {
    number: 8,
    title: "Postúlate",
    description:
      "Cuando encuentres una oportunidad adecuada para tu perfil, selecciona “Postularme” y completa los pasos solicitados.",
    icon: ArrowRight,
  },
  {
    number: 9,
    title: "Consulta tus postulaciones",
    description:
      "Desde “Mis postulaciones” puedes consultar las oportunidades a las que has aplicado y revisar el estado de cada proceso.",
    icon: FileText,
  },
  {
    number: 10,
    title: "Revisa tus notificaciones",
    description:
      "Mantente atento a las notificaciones y al correo electrónico registrado. Las organizaciones pueden utilizar estos medios para comunicarse contigo.",
    icon: CheckCircle2,
  },
];

const faqItems = [
  {
    question: "¿Necesito una cuenta para postularme?",
    answer:
      "Sí. Para realizar una postulación necesitas tener una cuenta registrada en FQA Empleos y contar con tu información actualizada.",
  },
  {
    question: "¿Puedo guardar una oferta sin postularme?",
    answer:
      "Sí. Puedes guardar las oportunidades que sean de tu interés y consultarlas posteriormente desde tu perfil.",
  },
  {
    question: "¿Puedo actualizar mi hoja de vida?",
    answer:
      "Sí. Puedes actualizar el documento que tienes registrado desde la sección “Mis documentos” de tu perfil.",
  },
  {
    question: "¿Cómo puedo saber si mi postulación fue enviada?",
    answer:
      "Después de completar correctamente el proceso, puedes consultar la oportunidad desde la sección “Mis postulaciones”.",
  },
  {
    question: "¿Quién se comunica conmigo después de postularme?",
    answer:
      "La organización responsable de la oportunidad es quien gestiona el proceso de selección y puede comunicarse contigo utilizando los datos registrados en tu perfil.",
  },
  {
    question: "¿Qué hago si tengo problemas con mi cuenta?",
    answer:
      "Si tienes dificultades para acceder, actualizar tu información, cargar tu CV o realizar una postulación, puedes comunicarte con el equipo de soporte.",
  },
];

const tips = [
  "Mantén actualizado tu perfil profesional.",
  "Utiliza una hoja de vida reciente y bien estructurada.",
  "Lee cuidadosamente los requisitos de cada oportunidad.",
  "Verifica tus datos de contacto antes de postularte.",
  "Revisa periódicamente las nuevas oportunidades.",
  "Postúlate únicamente a ofertas que correspondan con tu perfil.",
];

export default function Help({ navigateTo }: HelpProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleFaq = (index: number) => {
    setOpenFaq((current) => (current === index ? null : index));
  };

  return (
    <div className="help-page">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="help-header">
        <div className="help-header-inner">
          <div className="help-header-brand">
            <div className="help-brand-icon">
              <HelpCircle size={22} strokeWidth={2.2} />
            </div>

            <div>
              <span className="help-brand-eyebrow">FQA EMPLEOS</span>
              <h1>Centro de Ayuda</h1>
            </div>
          </div>

          {navigateTo && (
            <button
              type="button"
              className="help-back-button"
              onClick={() => navigateTo("home")}
            >
              Volver al inicio
              <ArrowRight size={17} />
            </button>
          )}
        </div>
      </header>

      <main className="help-main">
        {/* =====================================================
            INTRO
        ===================================================== */}
        <section className="help-intro">
          <div className="help-intro-content">
            <span className="help-section-label">
              GUÍA PARA CANDIDATOS
            </span>

            <h2>
              Aprende a utilizar
              <br />
              <strong>FQA Empleos</strong>
            </h2>

            <p>
              Encuentra oportunidades, completa tu perfil y realiza tus
              postulaciones de manera sencilla. Sigue esta guía paso a paso
              para aprovechar todas las herramientas disponibles.
            </p>
          </div>

          <div className="help-intro-decoration">
            <HelpCircle size={110} strokeWidth={1.1} />
          </div>
        </section>

        {/* =====================================================
            QUICK SUMMARY
        ===================================================== */}
        <section className="help-summary">
          <div className="help-summary-item">
            <div className="help-summary-icon">
              <UserPlus size={20} />
            </div>
            <div>
              <strong>Crea tu perfil</strong>
              <span>Regístrate y completa tus datos.</span>
            </div>
          </div>

          <div className="help-summary-line" />

          <div className="help-summary-item">
            <div className="help-summary-icon">
              <Search size={20} />
            </div>
            <div>
              <strong>Encuentra oportunidades</strong>
              <span>Busca ofertas según tu perfil.</span>
            </div>
          </div>

          <div className="help-summary-line" />

          <div className="help-summary-item">
            <div className="help-summary-icon">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <strong>Realiza tu postulación</strong>
              <span>Completa el proceso y da seguimiento.</span>
            </div>
          </div>
        </section>

        {/* =====================================================
            STEP BY STEP
        ===================================================== */}
        <section className="help-section">
          <div className="help-section-heading">
            <span className="help-section-label">PASO A PASO</span>
            <h2>¿Cómo utilizar FQA Empleos?</h2>
            <p>
              Sigue estos pasos para comenzar tu búsqueda de oportunidades
              laborales.
            </p>
          </div>

          <div className="help-steps">
            {helpSteps.map((step) => {
              const Icon = step.icon;

              return (
                <article className="help-step" key={step.number}>
                  <div className="help-step-number">
                    {String(step.number).padStart(2, "0")}
                  </div>

                  <div className="help-step-icon">
                    <Icon size={22} strokeWidth={2} />
                  </div>

                  <div className="help-step-content">
                    <span className="help-step-label">
                      PASO {step.number}
                    </span>

                    <h3>{step.title}</h3>

                    <p>{step.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* =====================================================
            TIPS
        ===================================================== */}
        <section className="help-tips-section">
          <div className="help-tips-heading">
            <span className="help-section-label">RECOMENDACIONES</span>
            <h2>Consejos para mejorar tu búsqueda</h2>
            <p>
              Pequeños detalles pueden ayudarte a presentar mejor tu perfil
              profesional.
            </p>
          </div>

          <div className="help-tips-grid">
            {tips.map((tip, index) => (
              <div className="help-tip-card" key={tip}>
                <div className="help-tip-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="help-tip-check">
                  <CheckCircle2 size={17} />
                </div>

                <p>{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================
            FAQ
        ===================================================== */}
        <section className="help-section help-faq-section">
          <div className="help-section-heading">
            <span className="help-section-label">PREGUNTAS FRECUENTES</span>
            <h2>Preguntas frecuentes</h2>
            <p>
              Encuentra respuestas rápidas a algunas de las consultas más
              comunes.
            </p>
          </div>

          <div className="help-faq-list">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  className={`help-faq-item ${
                    isOpen ? "help-faq-item-open" : ""
                  }`}
                  key={item.question}
                >
                  <button
                    type="button"
                    className="help-faq-question"
                    onClick={() => handleFaq(index)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>

                    <span className="help-faq-chevron">
                      <ChevronDown size={19} />
                    </span>
                  </button>

                  <div
                    className={`help-faq-answer ${
                      isOpen ? "help-faq-answer-open" : ""
                    }`}
                  >
                    <p>{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================
            CONTACT
        ===================================================== */}
        <section className="help-contact-section">
          <div className="help-contact-content">
            <span className="help-section-label help-section-label-light">
              ¿NECESITAS MÁS AYUDA?
            </span>

            <h2>Estamos para ayudarte</h2>

            <p>
              Si tienes dificultades con tu cuenta, perfil, hoja de vida o
              proceso de postulación, puedes comunicarte con el equipo de
              soporte de FQA Empleos.
            </p>
          </div>

          <div className="help-contact-grid">
            <a
              href="mailto:soporte@fundacionqa.org"
              className="help-contact-card"
            >
              <div className="help-contact-icon">
                <Mail size={21} />
              </div>

              <div>
                <span>Correo electrónico</span>
                <strong>soporte@fundacionqa.org</strong>
              </div>
            </a>

            <a href="tel:+50376234832" className="help-contact-card">
              <div className="help-contact-icon">
                <Phone size={21} />
              </div>

              <div>
                <span>Teléfono</span>
                <strong>+503 7623-4832</strong>
              </div>
            </a>

            <div className="help-contact-card">
              <div className="help-contact-icon">
                <MapPin size={21} />
              </div>

              <div>
                <span>Ubicación</span>
                <strong>San Salvador, El Salvador</strong>
              </div>
            </div>
          </div>

          <div className="help-contact-hours">
            <span>Horario de atención</span>
            <strong>Lunes a viernes · 8:00 a. m. – 4:00 p. m.</strong>
          </div>
        </section>

        {/* =====================================================
            SECURITY NOTICE
        ===================================================== */}
        <section className="help-security">
          <div className="help-security-icon">
            <HelpCircle size={21} />
          </div>

          <div>
            <h3>Protege tu información</h3>
            <p>
              Nunca compartas tu contraseña ni códigos de acceso. Mantén tus
              datos personales protegidos y utiliza únicamente los canales
              oficiales para solicitar asistencia.
            </p>
          </div>
        </section>
      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="help-footer">
        <div className="help-footer-inner">
          <span>FQA Empleos</span>
          <span>Conectando personas con oportunidades.</span>
        </div>
      </footer>
    </div>
  );
}
