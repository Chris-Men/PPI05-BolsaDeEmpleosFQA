
import React from "react";
import "../styles/users/collaborators.css";

import CristoferImg from "../components/imagenes/collaborators/Cristofer.png";
import DavidImg from "../components/imagenes/collaborators/David.png";
import JavierImg from "../components/imagenes/collaborators/Javier.png";
import JuanImg from "../components/imagenes/collaborators/Juan.png";

import {
  Users,
  HeartHandshake,
  Code2,
  Lightbulb,
  Target,
} from "lucide-react";

interface Collaborator {
  name: string;
  image: string;
  phrase: string;
  icon: React.ReactNode;
}

const collaborators: Collaborator[] = [
  {
    name: "Cristofer Mendoza",
    image: CristoferImg,
    phrase:
      "Aportando ideas y conocimientos para desarrollar una plataforma que conecte a las personas con oportunidades laborales.",
    icon: <Code2 size={20} />,
  },
  {
    name: "David Martínez",
    image: DavidImg,
    phrase:
      "Convirtiendo los conocimientos adquiridos en la universidad en soluciones tecnológicas útiles para la sociedad.",
    icon: <Lightbulb size={20} />,
  },
  {
    name: "Javier Rivera",
    image: JavierImg,
    phrase:
      "Contribuyendo al desarrollo de una experiencia digital accesible, práctica y pensada para los usuarios.",
    icon: <Target size={20} />,
  },
  {
    name: "Juan Rauda",
    image: JuanImg,
    phrase:
      "Sumando esfuerzos y trabajando en equipo para hacer realidad una propuesta que genere oportunidades.",
    icon: <HeartHandshake size={20} />,
  },
];

const Collaborators: React.FC = () => {
  return (
    <section className="collaborators-section" id="colaboradores">
      <div className="collaborators-container">

        {/* Encabezado */}
        <header className="collaborators-header">
          <span className="collaborators-eyebrow">
            <Users size={17} />
            LOS CREADORES DEL PROYECTO
          </span>

          <h2>
            Conoce al equipo detrás de{" "}
            <span>FQA Empleos</span>
          </h2>

          <p>
            Somos estudiantes de la Universidad Luterana Salvadoreña
            y desarrollamos FQA Empleos como parte de nuestras
            prácticas profesionales. Un proyecto que integra los
            conocimientos adquiridos durante nuestra formación
            académica para crear una solución tecnológica orientada
            a conectar el talento con oportunidades laborales.
          </p>
        </header>

        {/* Creadores del proyecto */}
        <div className="collaborators-grid">
          {collaborators.map((person, index) => (
            <article
              className="collaborator-card"
              key={person.name}
            >
              <div className="collaborator-image-wrapper">
                <img
                  src={person.image}
                  alt={`Fotografía de ${person.name}, creador de FQA Empleos`}
                  className="collaborator-image"
                  loading="lazy"
                />

                <span className="collaborator-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="collaborator-content">
                <div className="collaborator-role">
                  {person.icon}
                  <span>CREADOR DEL PROYECTO</span>
                </div>

                <h3>{person.name}</h3>

                <p className="collaborator-phrase">
                  “{person.phrase}”
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Información institucional */}
        <div className="collaborators-footer">
          <div className="collaborators-footer-icon">
            <HeartHandshake size={28} />
          </div>

          <div className="collaborators-footer-text">
            <h3>Aprender, crear y aportar a la sociedad</h3>

            <p>
              FQA Empleos representa el esfuerzo, la creatividad y
              el trabajo colaborativo de nuestro equipo durante las
              prácticas profesionales en la Universidad Luterana
              Salvadoreña. A través de este proyecto, buscamos
              aplicar nuestros conocimientos y contribuir al
              desarrollo de una herramienta que facilite el acceso
              a oportunidades de empleo.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Collaborators;
