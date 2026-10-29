/** Only publicly editable content remains in the site configuration contract. */
export interface SiteConfiguration {
  contacto: { correo: string; correoSoporte: string; telefono: string; whatsapp: string; direccion: string };
  inicio: { titulo: string; subtitulo: string; descripcion: string };
  institucional: { mision: string; vision: string };
  redes: { facebook: string; instagram: string; linkedin: string; youtube: string };
}

/** Safe initial copy matches the backend seed; refresh failures never blank the public website. */
export const initialSiteConfiguration: SiteConfiguration = {
  contacto: { correo: 'proyectos@fundaqa.org', correoSoporte: 'proyectos@fundaqa.org', telefono: '+503 7623-4832', whatsapp: '', direccion: 'San Salvador, El Salvador' },
  inicio: {
    titulo: 'Trabaja donde tu historia importa.',
    subtitulo: 'Conectamos profesionales comprometidos con organizaciones que generan impacto real en comunidades de El Salvador y Centroamérica.',
    descripcion: '',
  },
  institucional: {
    mision: 'Diseñar, gestionar y ejecutar proyectos de desarrollo que promuevan el crecimiento integral de las personas, a través de la promoción de valores y principios bíblicos que fomenten una cultura de paz e inclusión.',
    vision: 'Ser una organización que empodere a las personas, familias y comunidades en condición de vulnerabilidad y en las cuales tenemos presencia, promoviendo un impacto transformador y sostenible en sus vidas.',
  },
  redes: { facebook: '', instagram: '', linkedin: '', youtube: '' },
};
