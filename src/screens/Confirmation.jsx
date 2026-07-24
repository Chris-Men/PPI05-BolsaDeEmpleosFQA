import React from 'react';

export default function Confirmation({ 
  applications, 
  currentUser, 
  setCurrentUser, 
  navigateTo, 
  formPersonal 
}) {
  return (
    <div className="screen">
      <div className="confirm-body">
        <div className="confirm-icon-wrap">
          <div className="confirm-icon">
            <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
              <path d="M11 24l10 10L37 15" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h2>¡Aplicación enviada con éxito!</h2>
        <p>Tu historia ya está en manos del equipo técnico.<br />Recibirás respuesta en 5–7 días hábiles a <strong>{formPersonal.email}</strong></p>
        
        <div className="confirm-card">
          <div className="cc-item">
            <span>Número de referencia</span>
            <strong>{applications[0]?.id || "FQA-2025-04812"}</strong>
          </div>
          <div className="cc-div"></div>
          <div className="cc-item">
            <span>Posición</span>
            <p>{applications[0]?.jobTitle}</p>
          </div>
          <div className="cc-div"></div>
          <div className="cc-item">
            <span>Organización</span>
            <p>{applications[0]?.orgName}</p>
          </div>
        </div>

        <div className="process-steps">
          <div className="ps-item">
            <div className="ps-circle done tt-wrap">✅<div className="ps-tt">Recibida ahora mismo</div></div>
            <span className="ps-lbl">Aplicación recibida</span>
          </div>
          <div className="ps-conn done"></div>
          <div className="ps-item">
            <div className="ps-circle tt-wrap">🔍<div className="ps-tt">1–2 días hábiles</div></div>
            <span className="ps-lbl">Revisión de perfil</span>
          </div>
          <div className="ps-conn"></div>
          <div className="ps-item">
            <div className="ps-circle tt-wrap">📞<div className="ps-tt">3–5 días hábiles</div></div>
            <span className="ps-lbl">Contacto inicial</span>
          </div>
        </div>

        <div className="confirm-btns">
          <button className="btn-c-pri" onClick={() => navigateTo('jobs')}>Ver más vacantes</button>
          <button className="btn-c-sec" onClick={() => {
            if (!currentUser) {
              setCurrentUser({ 
                email: formPersonal.email, 
                role: 'user', 
                name: formPersonal.name, 
                initial: formPersonal.name.charAt(0).toUpperCase() 
              });
            }
            navigateTo('profile');
          }}>Ir a mi perfil</button>
        </div>
        <p className="confirm-hash">#ConectamosConHistorias</p>
      </div>
    </div>
  );
}
