
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CircleHelp,
  Coins,
  Eye,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Laptop,
  Landmark,
  Leaf,
  Music,
  PawPrint,
  PiggyBank,
  Recycle,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Store,
  Target,
  TrendingUp,
  TreePine,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";

import nosotrosDesktop from "../components/imagenes/img/nosotros.png";
import nosotrosResponsive from "../components/imagenes/img/nosotros renponsiv.png";
import "../styles/users/nosotros.css";

export default function Nosotros() {
  const ejes = [
    {
      number: "01",
      title: "Salud y Bienestar",
      icon: HeartPulse,
      className: "health",
      description:
        "Se garantiza acceso equitativo a la salud para poblaciones vulnerables con seguimiento personalizado, gestión de insumos 24/7 y un enfoque integral. Además, se realizan brigadas médicas gratuitas y atención especializada para adultos mayores.",
      programs: [
        { icon: Stethoscope, text: "Brigadas médicas." },
        { icon: HandHeart, text: "Acompañamiento personalizado." },
        { icon: ShieldCheck, text: "Atención de emergencias 24/7." },
        { icon: Brain, text: "Atención psicológica." },
        { icon: UserRound, text: "Atención al adulto mayor." },
        { icon: HeartPulse, text: "Acompañamiento a pacientes con enfermedades crónicas." },
        { icon: Home, text: "Espacios habitacionales a pacientes en tratamientos especializados." },
      ],
    },
    {
      number: "02",
      title: "Educación",
      icon: GraduationCap,
      className: "education",
      description:
        "Se promueve la educación como herramienta clave para superar la pobreza, mediante programas de alfabetización, formación profesional, becas y asesoría. La formación incluye educación básica, orientación para la vida y vocacional, facilitando el desarrollo integral de los beneficiarios.",
      programs: [
        { icon: GraduationCap, text: "Becas desde educación inicial hasta educación superior." },
        { icon: BookOpen, text: "Becas de Inglés." },
        { icon: Laptop, text: "Becas de Ofimática." },
        { icon: Target, text: "Orientación Vocacional." },
        { icon: BookOpen, text: "Refuerzos Académicos." },
        { icon: UsersRound, text: "Club de tareas." },
        { icon: Laptop, text: "Inducción a las herramientas tecnológicas." },
      ],
    },
    {
      number: "03",
      title: "Desarrollo y Bienestar Social",
      icon: UsersRound,
      className: "social",
      description:
        "Se promueve la cohesión social reduciendo la discriminación y la exclusión. A través de nuestros albergues y programas de empoderamiento, se brinda acceso a educación, empleo, asesoría financiera, alimentación y vestimenta, impulsando la autonomía y el emprendimiento de las familias.",
      programs: [
        { icon: Home, text: "Albergues “Espacios de Esperanza”." },
        { icon: Music, text: "Intervención psicosocial a través de las artes: danza y música." },
        { icon: HandHeart, text: "Empoderamiento y dignificación de la mujer." },
        { icon: UsersRound, text: "Programa de habilidades blandas y competencias de liderazgo." },
        { icon: UserRound, text: "Acompañamiento para actores comunitarios." },
        { icon: Landmark, text: "Alianzas interinstitucionales a favor del desarrollo local." },
      ],
    },
    {
      number: "04",
      title: "Medioambiente y Sostenibilidad",
      icon: Leaf,
      className: "environment",
      description:
        "Se protege el medio ambiente mediante iniciativas sostenibles y de concientización. A través del reciclaje creativo, se transforman residuos en arte y objetos útiles, promoviendo la sostenibilidad de manera innovadora. Los proyectos desarrollados son económicamente, socialmente y ambientalmente sostenibles.",
      programs: [
        { icon: Sprout, text: "Finca autosostenible." },
        { icon: Recycle, text: "Reciclaje creativo." },
        { icon: TreePine, text: "Iniciativas de resiliencia climática." },
        { icon: PawPrint, text: "Albergue de animales rescatados." },
        { icon: Leaf, text: "Iniciativas de cuidado medioambiental en zonas urbanas." },
        { icon: BookOpen, text: "Charlas educativas sobre conciencia verde." },
      ],
    },
    {
      number: "05",
      title: "Autonomía Económica",
      icon: Coins,
      className: "economic",
      description:
        "Impulsamos el crecimiento sostenible de personas y comunidades a través de formación financiera, acompañamiento empresarial y capital semilla. Desde la reactivación de negocios hasta el nacimiento de nuevos emprendimientos, este eje fortalece capacidades para que cada persona pueda avanzar con independencia y propósito.",
      programs: [
        { icon: TrendingUp, text: "Formación en capacidades de emprendimiento." },
        { icon: PiggyBank, text: "Educación y asesoría financiera." },
        { icon: BriefcaseBusiness, text: "Acompañamiento empresarial." },
        { icon: Wrench, text: "Formación de oficios con potencial de ingresos." },
        { icon: Store, text: "Enlace con microempresas o mercados locales." },
        { icon: ShieldCheck, text: "Acompañamiento técnico en el uso adecuado de recursos." },
        { icon: BadgeCheck, text: "Capacitación en competencias laborales." },
      ],
    },
  ];

  const pilares = [
    {
      number: "01",
      title: "Desarrollo de capacidades",
      icon: GraduationCap,
      text: "Reconocemos la importancia de fortalecer los conocimientos, las habilidades y las competencias que favorecen el crecimiento personal y profesional.",
    },
    {
      number: "02",
      title: "Acceso a oportunidades",
      icon: BriefcaseBusiness,
      text: "Facilitamos el acceso a información sobre oportunidades laborales que permitan a las personas explorar nuevas posibilidades de desarrollo.",
    },
    {
      number: "03",
      title: "Inclusión económica",
      icon: UsersRound,
      text: "Promovemos una visión de desarrollo que reconoce el potencial de las personas y la importancia de ampliar sus posibilidades de participación económica.",
    },
    {
      number: "04",
      title: "Autonomía y crecimiento",
      icon: TrendingUp,
      text: "Contribuimos a generar condiciones que favorezcan la independencia económica, el bienestar familiar y el desarrollo de proyectos de vida.",
    },
  ];

  return (
    <div className="fqa-page">
      <section className="fqa-hero">
        <picture className="hero-image">
          <source
            media="(max-width: 800px)"
            srcSet={nosotrosResponsive}
          />
          <img
            src={nosotrosDesktop}
            alt="Fundación Quintanilla Amaya: talento, oportunidades y desarrollo"
            fetchPriority="high"
          />
        </picture>

        <div className="hero-overlay" aria-hidden="true" />

        {/* Contenedor nuevo e independiente para el texto sobre la imagen */}
        <div className="hero-text-container">
          <div className="hero-content">
            <span className="hero-badge">
              FUNDACIÓN QUINTANILLA AMAYA
            </span>

            <p className="hero-axis">
              Talento · Oportunidades · Desarrollo
            </p>

            <h1>
              Oportunidades que
              <span> impulsan tu futuro.</span>
            </h1>

            <p className="hero-description">
              Creemos en el potencial de las personas y en el poder de las
              oportunidades para transformar vidas. A través de nuestra bolsa
              de empleo, buscamos facilitar el acceso a información sobre
              oportunidades laborales que contribuyan al crecimiento
              profesional, la independencia económica y el bienestar de las
              comunidades.
            </p>

            <div className="hero-actions">
              <a href="/empleos" className="hero-button">
                Explorar oportunidades <ArrowRight size={18} />
              </a>

              <a
                href="#ejes"
                className="hero-button hero-button-secondary"
              >
                Conoce nuestra labor <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <main className="fqa-main">
        <section className="intro-section section-container">
          <div className="section-heading">
            <span className="section-kicker">
              <HandHeart size={16} /> ¿QUIÉNES SOMOS?
            </span>
            <h2>
              Fundación Quintanilla <span>Amaya.</span>
            </h2>
          </div>

          <div className="intro-grid">
            <div className="intro-text">
              <p>
                Somos una organización comprometida con el desarrollo integral
                de las personas, las familias y las comunidades.
              </p>
              <p>
                A través de iniciativas en educación, salud, desarrollo y
                bienestar social, medioambiente y sostenibilidad, y autonomía
                económica, trabajamos para generar oportunidades que
                contribuyan a mejorar la calidad de vida y promover un
                desarrollo sostenible.
              </p>
              <p>
                Nuestra labor se fundamenta en la promoción de valores,
                principios y acciones que favorecen la inclusión, la
                solidaridad y la transformación social.
              </p>
            </div>

            <div className="intro-highlight">
              <div className="intro-highlight-icon">
                <UsersRound size={25} />
              </div>
              <div>
                <strong>Desarrollo integral</strong>
                <p>
                  Trabajamos desde una visión que conecta diferentes áreas
                  para generar oportunidades y fortalecer a las personas,
                  las familias y las comunidades.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mission-vision-section">
          <div className="section-container">
            <div className="mission-vision-wrapper">
              <article className="mv-card mv-mission">
                <div className="mv-icon">
                  <Target size={25} />
                </div>
                <div>
                  <span className="mv-label">MISIÓN</span>
                  <p>
                    Diseñar, gestionar y ejecutar proyectos de desarrollo
                    que promuevan el crecimiento integral de las personas,
                    a través de la promoción de valores y principios
                    bíblicos que fomenten una cultura de paz e inclusión.
                  </p>
                </div>
              </article>

              <article className="mv-card mv-vision">
                <div className="mv-icon">
                  <Eye size={25} />
                </div>
                <div>
                  <span className="mv-label">VISIÓN</span>
                  <p>
                    Ser una organización que empodere a las personas,
                    familias y comunidades en condición de vulnerabilidad
                    y en las cuales tenemos presencia, promoviendo un
                    impacto transformador y sostenible en sus vidas.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="initiative-section">
          <div className="section-container initiative-grid">
            <div className="initiative-visual">
              <div className="initiative-circle">
                <BriefcaseBusiness size={45} />
              </div>
              <div className="initiative-mini-card">
                <TrendingUp size={18} />
                <span>Autonomía económica</span>
              </div>
              <div className="initiative-mini-card second">
                <UsersRound size={18} />
                <span>Conexión de talento</span>
              </div>
            </div>

            <div className="initiative-content">
              <span className="section-kicker">
                <BriefcaseBusiness size={16} /> NUESTRA INICIATIVA
              </span>
              <h2>
                Bolsa de <span>Empleo</span>
              </h2>

              <div className="initiative-slogan">
                “Conectamos talento con oportunidades”.
              </div>

              <p>
                La bolsa de empleo de Fundación Quintanilla Amaya nace como
                una iniciativa vinculada al eje de{" "}
                <strong>Autonomía Económica</strong>, con el propósito de
                facilitar el acceso a información sobre oportunidades
                laborales y acercar a las personas a nuevas posibilidades
                de desarrollo profesional.
              </p>
              <p>
                Creemos que cada persona posee capacidades, talentos y
                aspiraciones que pueden convertirse en herramientas para
                construir su proyecto de vida.
              </p>
              <p>
                Por ello, ponemos a disposición este espacio de consulta
                que busca contribuir a la conexión entre personas que desean
                incorporarse al mundo laboral o continuar su crecimiento
                profesional y las organizaciones que buscan talento humano.
              </p>

              <a href="/empleos" className="text-button">
                Ver oportunidades laborales <ArrowRight size={17} />
              </a>
            </div>
          </div>
        </section>

        <section className="why-section">
          <div className="section-container why-grid">
            <div className="why-content">
              <span className="section-kicker">
                <CircleHelp size={16} /> ¿POR QUÉ LO HACEMOS?
              </span>
              <h2>
                La autonomía económica también{" "}
                <span>comienza con una oportunidad.</span>
              </h2>
              <p>
                El acceso a oportunidades laborales puede representar un
                paso importante hacia la independencia económica, la
                estabilidad familiar y el desarrollo personal.
              </p>
              <p>
                Desde nuestra perspectiva de desarrollo comunitario,
                reconocemos que fortalecer las capacidades de las personas
                y ampliar sus posibilidades de participación económica
                contribuye a construir comunidades con mayores oportunidades
                y mejores condiciones de vida.
              </p>
              <p>
                Por ello, promovemos iniciativas que faciliten el acceso a
                información, el fortalecimiento de habilidades y la
                construcción de proyectos de vida con independencia y propósito.
              </p>
            </div>

            <div className="opportunity-box">
              <div className="opportunity-icon">
                <HandHeart size={28} />
              </div>
              <span>UNA OPORTUNIDAD PUEDE</span>
              <strong>
                abrir nuevos caminos
                <br />
                hacia el futuro.
              </strong>
            </div>
          </div>
        </section>

        <section className="ejes-section" id="ejes">
          <div className="section-container">
            <div className="ejes-heading">
              <div>
                <span className="section-kicker">
                  <Leaf size={16} /> NUESTROS EJES DE ACCIÓN
                </span>
                <h2>
                  Una visión integral para{" "}
                  <span>generar oportunidades.</span>
                </h2>
              </div>
              <p>
                Nuestro trabajo se desarrolla a través de cinco áreas de
                acción que responden a distintas necesidades de las personas,
                familias y comunidades.
              </p>
            </div>

            <div className="ejes-list">
              {ejes.map((eje) => {
                const MainIcon = eje.icon;

                return (
                  <article
                    className={`eje-card eje-${eje.className}`}
                    key={eje.number}
                  >
                    <div className="eje-top">
                      <div className="eje-number">{eje.number}</div>
                      <div className="eje-main-icon">
                        <MainIcon size={28} />
                      </div>
                      <div className="eje-title-wrapper">
                        <span>EJE DE ACCIÓN</span>
                        <h3>{eje.title}</h3>
                      </div>
                    </div>

                    <div className="eje-content">
                      <div className="eje-description">
                        <p>{eje.description}</p>
                      </div>

                      <div className="programs-wrapper">
                        <h4>Actividades, proyectos y programas</h4>
                        <ul className="programs-list">
                          {eje.programs.map((program, index) => {
                            const ProgramIcon = program.icon;

                            return (
                              <li key={`${eje.number}-${index}`}>
                                <span className="program-icon">
                                  <ProgramIcon size={16} />
                                </span>
                                <span>{program.text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="pillars-section">
          <div className="section-container">
            <div className="pillars-heading">
              <div>
                <span className="section-kicker">
                  <BadgeCheck size={16} /> NUESTROS PILARES
                </span>
                <h2>
                  Principios que orientan <span>FQA Empleos.</span>
                </h2>
              </div>
              <p>
                La bolsa de empleo se desarrolla desde una perspectiva
                centrada en las personas, sus capacidades y las oportunidades
                para construir proyectos de vida.
              </p>
            </div>

            <div className="pillars-grid">
              {pilares.map((pilar) => {
                const PilarIcon = pilar.icon;

                return (
                  <article className="pillar-card" key={pilar.number}>
                    <div className="pillar-top">
                      <span>{pilar.number}</span>
                      <div className="pillar-icon">
                        <PilarIcon size={23} />
                      </div>
                    </div>
                    <h3>{pilar.title}</h3>
                    <p>{pilar.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="commitment-section">
          <div className="commitment-overlay" />
          <div className="section-container commitment-content">
            <div className="commitment-icon">
              <HandHeart size={28} />
            </div>
            <span className="section-kicker light">
              NUESTRO COMPROMISO
            </span>
            <h2>
              Creemos en el talento,{" "}
              <span>el esfuerzo y el potencial humano.</span>
            </h2>
            <p className="commitment-text">
              Trabajamos para facilitar el acceso a información sobre
              oportunidades laborales y contribuir a la inclusión económica
              mediante iniciativas que favorezcan el desarrollo de
              capacidades y el crecimiento de las personas.
            </p>
            <p className="commitment-text">
              Creemos en el talento, el esfuerzo y el potencial humano como
              elementos fundamentales para construir un futuro con mayores
              oportunidades.
            </p>

            <div className="commitment-quote">
              <span>“</span>
              <p>
                Esta plataforma constituye un espacio de consulta y
                vinculación informativa. Cada oportunidad representa una
                posibilidad para explorar nuevos caminos y avanzar hacia
                metas personales y profesionales.
              </p>
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="section-container final-cta-content">
            <div>
              <span className="section-kicker">
                <BriefcaseBusiness size={16} /> FQA EMPLEOS
              </span>
              <h2>
                Creemos que cada oportunidad{" "}
                <span>puede abrir nuevos caminos.</span>
              </h2>
              <p>
                Sigamos construyendo juntos un futuro con más posibilidades.
              </p>
            </div>

            <a href="/empleos" className="final-cta-button">
              Explorar oportunidades <ArrowRight size={19} />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
