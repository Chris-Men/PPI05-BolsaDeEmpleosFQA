import type {
  ApplicationTarget, ExperienceFormData, PersonalFormData, StateSetter,
} from '../types/models';

interface FormFlowProps {
  applyingTo: ApplicationTarget | null;
  formStep: number;
  setFormStep: StateSetter<number>;
  formPersonal: PersonalFormData;
  setFormPersonal: StateSetter<PersonalFormData>;
  formExp: ExperienceFormData;
  setFormExp: StateSetter<ExperienceFormData>;
  uploadedCVName: string;
  setUploadedCVName: StateSetter<string>;
  onSubmitApplication: () => void;
  showToast: (message: string) => void;
}

/** Multi-step demonstration application form. */
export default function FormFlow({
  applyingTo, formStep, setFormStep, formPersonal, setFormPersonal, formExp,
  setFormExp, uploadedCVName, setUploadedCVName, onSubmitApplication, showToast,
}: FormFlowProps) {
  const handleNextFormStep = () => {
    if (formStep < 4) {
      setFormStep(prev => prev + 1);
    } else {
      onSubmitApplication();
    }
  };

  const handlePrevFormStep = () => {
    if (formStep > 1) {
      setFormStep(prev => prev - 1);
    }
  };

  return (
    <div className="screen">
      <div className="form-prog-bar">
        <div className="form-prog-fill" style={{ width: `${formStep * 25}%` }}></div>
      </div>
      <div className="form-shell">
        <div className="form-aside">
          <p className="fa-hd">Tu aplicación</p>
          <div className="step-item">
            <div className={`step-n ${formStep > 1 ? 'done' : 'cur'}`}>{formStep > 1 ? '✓' : '1'}</div>
            <div className="step-info">
              <div className={`step-lbl ${formStep > 1 ? 'done' : 'cur'}`}>Datos personales</div>
              <div className="step-sub">Información básica</div>
            </div>
          </div>
          <div className="step-item">
            <div className={`step-n ${formStep > 2 ? 'done' : formStep === 2 ? 'cur' : 'pend'}`}>{formStep > 2 ? '✓' : '2'}</div>
            <div className="step-info">
              <div className={`step-lbl ${formStep > 2 ? 'done' : formStep === 2 ? 'cur' : 'pend'}`}>Experiencia</div>
              <div className="step-sub">Trayectoria laboral</div>
            </div>
          </div>
          <div className="step-item">
            <div className={`step-n ${formStep > 3 ? 'done' : formStep === 3 ? 'cur' : 'pend'}`}>{formStep > 3 ? '✓' : '3'}</div>
            <div className="step-info">
              <div className={`step-lbl ${formStep > 3 ? 'done' : formStep === 3 ? 'cur' : 'pend'}`}>Documentos</div>
              <div className="step-sub">CV y carta</div>
            </div>
          </div>
          <div className="step-item">
            <div className={`step-n ${formStep === 4 ? 'cur' : 'pend'}`}>4</div>
            <div className="step-info">
              <div className={`step-lbl ${formStep === 4 ? 'cur' : 'pend'}`}>Confirmar</div>
              <div className="step-sub">Revisar y enviar</div>
            </div>
          </div>

          <div className="fa-vac">
            <div className="fa-vac-lbl">Aplicando a</div>
            <div className="fa-vac-title">{applyingTo?.title}</div>
            <div className="fa-vac-org">{applyingTo?.org}</div>
          </div>
        </div>

        <div className="form-content-wrap">
          <div className="form-pages">
            {/* STEP 1 */}
            {formStep === 1 && (
              <div className="form-page">
                <div className="fp-hd">
                  <h3>Información personal</h3>
                  <p>Completa tus datos de contacto para que la organización pueda ubicarte.</p>
                </div>
                <div className="fg2">
                  <div className="ff">
                    <label>Nombres *</label>
                    <input 
                      type="text" 
                      value={formPersonal.name} 
                      onChange={(e) => setFormPersonal({ ...formPersonal, name: e.target.value })}
                    />
                  </div>
                  <div className="ff">
                    <label>Apellidos *</label>
                    <input 
                      type="text" 
                      value={formPersonal.lastname}
                      onChange={(e) => setFormPersonal({ ...formPersonal, lastname: e.target.value })}
                    />
                  </div>
                  <div className="ff">
                    <label>Correo electrónico *</label>
                    <input 
                      type="email" 
                      value={formPersonal.email}
                      onChange={(e) => setFormPersonal({ ...formPersonal, email: e.target.value })}
                    />
                  </div>
                  <div className="ff">
                    <label>Teléfono celular *</label>
                    <input 
                      type="tel" 
                      value={formPersonal.phone}
                      onChange={(e) => setFormPersonal({ ...formPersonal, phone: e.target.value })}
                    />
                  </div>
                  <div className="ff">
                    <label>Municipio</label>
                    <input 
                      type="text" 
                      value={formPersonal.municipio}
                      onChange={(e) => setFormPersonal({ ...formPersonal, municipio: e.target.value })}
                    />
                  </div>
                  <div className="ff">
                    <label>Carrera / Profesión</label>
                    <input 
                      type="text" 
                      value={formPersonal.profession}
                      onChange={(e) => setFormPersonal({ ...formPersonal, profession: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {formStep === 2 && (
              <div className="form-page">
                <div className="fp-hd">
                  <h3>Experiencia &amp; Motivación</h3>
                  <p>Cuéntanos sobre tu trayectoria relevante para esta posición.</p>
                </div>
                <div className="fg2">
                  <div className="ff">
                    <label>Último cargo ocupado</label>
                    <input 
                      type="text" 
                      value={formExp.lastRole}
                      onChange={(e) => setFormExp({ ...formExp, lastRole: e.target.value })}
                    />
                  </div>
                  <div className="ff">
                    <label>Organización anterior</label>
                    <input 
                      type="text" 
                      value={formExp.lastOrg}
                      onChange={(e) => setFormExp({ ...formExp, lastOrg: e.target.value })}
                    />
                  </div>
                  <div className="ff full">
                    <label>¿Por qué deseas ser parte de {applyingTo?.org}? *</label>
                    <textarea 
                      value={formExp.motivation}
                      onChange={(e) => setFormExp({ ...formExp, motivation: e.target.value })}
                      placeholder="Comparte tu motivación e identificación con nuestra misión social…"
                    />
                  </div>
                  <div className="ff full">
                    <label>Habilidades clave (separadas por coma)</label>
                    <input 
                      type="text" 
                      value={formExp.skills}
                      onChange={(e) => setFormExp({ ...formExp, skills: e.target.value })}
                    />
                  </div>
                </div>
                <div className="autosave-row">
                  <span className="autosave-dot"></span> Guardado automáticamente en caché
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {formStep === 3 && (
              <div className="form-page">
                <div className="fp-hd">
                  <h3>Documentos de aplicación</h3>
                  <p>Adjunta tu Currículum Vitae (CV) para finalizar la postulación.</p>
                </div>
                <div className="fg2">
                  <div className="ff full">
                    <label>Curriculum Vitae (PDF o Word) *</label>
                    <div 
                      className={`upload-zone ${uploadedCVName ? 'has-file' : ''}`}
                      onClick={() => { setUploadedCVName('Curriculum_Bolsa_FQA.pdf'); showToast('✓ CV simulado cargado correctamente'); }}
                    >
                      <div className="uz-icon">📄</div>
                      <div className="uz-text">
                        <p>Arrastra tu CV aquí o <strong>haz clic para simular subida</strong></p>
                        <small>PDF o Word · máx. 5 MB</small>
                      </div>
                      {uploadedCVName && (
                        <div className="uz-file">
                          <span>✅</span>
                          <span className="uz-fname">{uploadedCVName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW */}
            {formStep === 4 && (
              <div className="form-page">
                <div className="fp-hd">
                  <h3>Revisa tu aplicación</h3>
                  <p>Verifica que todo esté correcto antes de enviar.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="review-block">
                    <div className="rb-hd">
                      <span>Datos personales</span>
                      <button onClick={() => setFormStep(1)}>Editar</button>
                    </div>
                    <div className="rb-grid">
                      <div>
                        <span className="rb-l">Nombre</span>
                        <p className="rb-v">{formPersonal.name} {formPersonal.lastname}</p>
                      </div>
                      <div>
                        <span className="rb-l">Correo</span>
                        <p className="rb-v">{formPersonal.email}</p>
                      </div>
                      <div>
                        <span className="rb-l">Teléfono</span>
                        <p className="rb-v">{formPersonal.phone}</p>
                      </div>
                      <div>
                        <span className="rb-l">Municipio</span>
                        <p className="rb-v">{formPersonal.municipio}</p>
                      </div>
                    </div>
                  </div>

                  <div className="review-block">
                    <div className="rb-hd">
                      <span>Experiencia</span>
                      <button onClick={() => setFormStep(2)}>Editar</button>
                    </div>
                    <div className="rb-grid">
                      <div>
                        <span className="rb-l">Último cargo</span>
                        <p className="rb-v">{formExp.lastRole || "No especificado"}</p>
                      </div>
                      <div>
                        <span className="rb-l">Habilidades</span>
                        <p className="rb-v">{formExp.skills || "Ninguna"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="review-block">
                    <div className="rb-hd">
                      <span>Documentos</span>
                      <button onClick={() => setFormStep(3)}>Editar</button>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--g2)', fontWeight: '600', marginTop: '8px' }}>
                      ✅ {uploadedCVName} adjunto correctamente
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-footer">
            <button 
              className="btn-back-f" 
              onClick={handlePrevFormStep}
              style={{ visibility: formStep === 1 ? 'hidden' : 'visible' }}
            >
              ← Anterior
            </button>
            <span className="prog-txt">Paso {formStep} de 4</span>
            <button className="btn-next-f" onClick={handleNextFormStep}>
              {formStep === 4 ? 'Enviar aplicación ✓' : 'Continuar →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
