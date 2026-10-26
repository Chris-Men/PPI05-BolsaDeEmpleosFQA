/** Departamentos y municipios de El Salvador (división vigente de 44 municipios), agrupados por zona. */
export interface Department { name: string; municipalities: string[] }
export interface Zone { name: string; departments: Department[] }

export const LOCATION_ZONES: Zone[] = [
    {
        name: 'Zona Occidental', departments: [
            { name: 'Ahuachapán', municipalities: ['Ahuachapán Norte', 'Ahuachapán Centro', 'Ahuachapán Sur'] },
            { name: 'Santa Ana', municipalities: ['Santa Ana Norte', 'Santa Ana Centro', 'Santa Ana Este', 'Santa Ana Oeste'] },
            { name: 'Sonsonate', municipalities: ['Sonsonate Norte', 'Sonsonate Centro', 'Sonsonate Este', 'Sonsonate Oeste'] },
        ]
    },
    {
        name: 'Zona Central y Paracentral', departments: [
            { name: 'Chalatenango', municipalities: ['Chalatenango Norte', 'Chalatenango Centro', 'Chalatenango Sur'] },
            { name: 'La Libertad', municipalities: ['La Libertad Norte', 'La Libertad Centro', 'La Libertad Oeste', 'La Libertad Este', 'La Libertad Costa', 'La Libertad Sur'] },
            { name: 'San Salvador', municipalities: ['San Salvador Norte', 'San Salvador Oeste', 'San Salvador Centro', 'San Salvador Este', 'San Salvador Sur'] },
            { name: 'Cuscatlán', municipalities: ['Cuscatlán Norte', 'Cuscatlán Sur'] },
            { name: 'La Paz', municipalities: ['La Paz Norte', 'La Paz Centro', 'La Paz Este'] },
            { name: 'Cabañas', municipalities: ['Cabañas Este', 'Cabañas Oeste'] },
            { name: 'San Vicente', municipalities: ['San Vicente Norte', 'San Vicente Sur'] },
        ]
    },
    {
        name: 'Zona Oriental', departments: [
            { name: 'Usulután', municipalities: ['Usulután Norte', 'Usulután Centro', 'Usulután Sur'] },
            { name: 'San Miguel', municipalities: ['San Miguel Norte', 'San Miguel Centro', 'San Miguel Oeste'] },
            { name: 'Morazán', municipalities: ['Morazán Norte', 'Morazán Sur'] },
            { name: 'La Unión', municipalities: ['La Unión Norte', 'La Unión Sur'] },
        ]
    },
];

/** Municipios de un departamento; vacío si no existe. */
export const municipalitiesOf = (department: string): string[] =>
    LOCATION_ZONES.flatMap((zone) => zone.departments).find((item) => item.name === department)?.municipalities ?? [];

/** Stable choices shared by profile, applications and their server validators. */
export const EDUCATION_LEVELS = ['Sin estudios', 'Educación básica', 'Bachillerato', 'Técnico', 'Universitario', 'Posgrado'] as const;
export const SEX_VALUES = ['FEMALE', 'MALE', 'UNDISCLOSED'] as const;
export const CANDIDATE_CATALOGS = {
    locationZones: LOCATION_ZONES,
    educationLevels: EDUCATION_LEVELS,
    sexes: [
        { value: 'FEMALE', label: 'Femenino' },
        { value: 'MALE', label: 'Masculino' },
        { value: 'UNDISCLOSED', label: 'Prefiero no indicar' },
    ],
};
