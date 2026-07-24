import React from 'react';

export default function Nosotros() {
  return (
    <div className="screen">
      <div className="about-hero">
        <h1>Quiénes Somos</h1>
        <p>Fundación Quintanilla Amaya — "Transformando su manera de pensar para cambiar su manera de vivir."</p>
      </div>

      <div className="about-body">
        <div className="about-card">
          <h2>Nuestra Misión</h2>
          <p>Cambiamos mentes y generamos capacidades para transformar contextos desde múltiples dimensiones de desarrollo comunitario en El Salvador.</p>
        </div>

        <div className="founder-box">
          <div className="founder-info">
            <span>Fundador</span>
            <h3>Lic. Joel Quintanilla Amaya</h3>
            <p>"Creemos que la educación, el acceso a la salud básica y la seguridad alimentaria son pilares fundamentales para romper los ciclos de pobreza extrema en las áreas más necesitadas de nuestro país."</p>
          </div>
        </div>

        <div className="about-card">
          <h2>Nuestros Albergues</h2>
          <p>Contamos con siete albergues comunitarios activos en El Salvador: seis ubicados estratégicamente en la región central y uno en la zona rural. Estos albergues están destinados a proporcionar refugio seguro, apoyo nutricional, proyectos de salud preventivos y programas educativos de refuerzo constante.</p>
        </div>

        <div className="about-card">
          <h2>Ejes de Desarrollo</h2>
          <p>Nuestra labor se enfoca principalmente en proyectos de educación comunitaria, cuidado de la salud primaria, integración social comunitaria, protección del medio ambiente y fomento de la autonomía económica.</p>
        </div>
      </div>
    </div>
  );
}
