/** Editable content used by the preserved administrative settings prototype. */
export interface SiteConfiguration {
  plataforma: {
    nombre: string;
    fundacion: string;
    descripcion: string;
    lema: string;
  };
  contacto: {
    correo: string;
    telefono: string;
    whatsapp: string;
    direccion: string;
  };
  inicio: {
    titulo: string;
    subtitulo: string;
    descripcion: string;
  };
  institucional: {
    mision: string;
    vision: string;
    descripcion: string;
  };
  redes: {
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  publicaciones: {
    revisionAdministrativa: boolean;
    notificaciones: boolean;
    permitirPostulaciones: boolean;
  };
}

/** Default values for the local settings prototype. */
export const initialSiteConfiguration: SiteConfiguration = {
  plataforma: {
    nombre: 'FQA Empleos',
    fundacion: 'Fundación Quintanilla Amaya',
    descripcion:
      'Portal de oportunidades laborales, horas sociales y prácticas profesionales.',
    lema: '',
  },
  contacto: {
    correo: 'admin@fundaqa.org',
    telefono: '',
    whatsapp: '',
    direccion: 'San Salvador, El Salvador',
  },
  inicio: {
    titulo: 'Encuentra oportunidades que transforman vidas',
    subtitulo: '',
    descripcion: '',
  },
  institucional: {
    mision: '',
    vision: '',
    descripcion: '',
  },
  redes: {
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: '',
  },
  publicaciones: {
    revisionAdministrativa: true,
    notificaciones: true,
    permitirPostulaciones: true,
  },
};
