import { useCallback, useEffect, useMemo, useState } from 'react';

interface StatisticsJob {
    createdAt?: string;
    fecha?: string;
    type?: string;
    tipo?: string;
    modality?: string;
    status?: string;
    estado?: string;
}

interface StatisticsApplication {
    createdAt?: string;
    fecha?: string;
    status?: string;
    estado?: string;
}

interface StatisticsProps {
    jobs?: StatisticsJob[];
    applications?: StatisticsApplication[];
}

import "../../styles/admin/estadisticas.css";

/** Preserved statistics dashboard using local data. */
function Estadisticas({
    jobs = [],
    applications = [],
}: StatisticsProps) {
    // =====================================================
    // ESTADOS
    // =====================================================

    const [periodo, setPeriodo] =
        useState("Últimos 30 días");

    const [actualizando, setActualizando] =
        useState(false);

    const [animatedStats, setAnimatedStats] =
        useState({
            oportunidades: 0,
            postulaciones: 0,
            organizaciones: 0,
            postulantes: 0,
        });

    // =====================================================
    // DATOS BASE DEL PROTOTIPO
    // =====================================================

    const organizacionesBase = 18;

    const postulantesBase = 96;

    // =====================================================
    // FECHA
    // =====================================================

    const getDaysForPeriod = useCallback(() => {
        switch (periodo) {
            case "Últimos 90 días":
                return 90;

            case "Este año":
                return 365;

            default:
                return 30;
        }
    }, [periodo]);

    // =====================================================
    // FILTRAR DATOS POR PERÍODO
    // =====================================================

    const datosPeriodo = useMemo(() => {
        const dias = getDaysForPeriod();

        const fechaLimite = new Date();

        fechaLimite.setDate(
            fechaLimite.getDate() - dias
        );

        const jobsFiltrados = jobs.filter((job) => {
            if (!job.createdAt && !job.fecha) {
                return true;
            }

            const fecha = new Date(job.createdAt ?? job.fecha ?? '');

            if (Number.isNaN(fecha.getTime())) {
                return true;
            }

            return fecha >= fechaLimite;
        });

        const applicationsFiltradas =
            applications.filter((application) => {
                if (
                    !application.createdAt &&
                    !application.fecha
                ) {
                    return true;
                }

                const fecha = new Date(application.createdAt ?? application.fecha ?? '');

                if (Number.isNaN(fecha.getTime())) {
                    return true;
                }

                return fecha >= fechaLimite;
            });

        return {
            jobs: jobsFiltrados,
            applications:
                applicationsFiltradas,
        };
    }, [jobs, applications, getDaysForPeriod]);

    // =====================================================
    // ESTADÍSTICAS PRINCIPALES
    // =====================================================

    const estadisticas = useMemo(() => {
        const oportunidades =
            datosPeriodo.jobs.length;

        const postulaciones =
            datosPeriodo.applications.length;

        const organizaciones =
            organizacionesBase;

        const postulantes =
            postulantesBase;

        return {
            oportunidades,
            postulaciones,
            organizaciones,
            postulantes,
        };
    }, [datosPeriodo]);

    // =====================================================
    // MODALIDADES
    // =====================================================

    const modalidades = useMemo(() => {
        const total =
            datosPeriodo.jobs.length;

        if (total === 0) {
            return [
                {
                    nombre: "Empleo",
                    cantidad: 0,
                    porcentaje: 0,
                },
                {
                    nombre: "Práctica Profesional",
                    cantidad: 0,
                    porcentaje: 0,
                },
                {
                    nombre: "Horas Sociales",
                    cantidad: 0,
                    porcentaje: 0,
                },
                {
                    nombre: "Voluntariado",
                    cantidad: 0,
                    porcentaje: 0,
                },
            ];
        }

        const contar = (tipos: string[]) => {
            return datosPeriodo.jobs.filter(
                (job) =>
                    tipos.includes(
                        job.type ?? job.tipo ?? job.modality ?? ''
                    )
            ).length;
        };

        const empleo = contar([
            "Empleo",
            "Tiempo completo",
            "Medio tiempo",
            "Contrato",
        ]);

        const practica = contar([
            "Práctica Profesional",
            "Prácticas profesionales",
        ]);

        const horas = contar([
            "Horas Sociales",
            "Horas sociales",
        ]);

        const voluntariado = contar([
            "Voluntariado",
        ]);

        const calcularPorcentaje =
            (cantidad: number) =>
                Math.round(
                    (cantidad / total) * 100
                );

        return [
            {
                nombre: "Empleo",
                cantidad: empleo,
                porcentaje:
                    calcularPorcentaje(empleo),
            },
            {
                nombre: "Práctica Profesional",
                cantidad: practica,
                porcentaje:
                    calcularPorcentaje(practica),
            },
            {
                nombre: "Horas Sociales",
                cantidad: horas,
                porcentaje:
                    calcularPorcentaje(horas),
            },
            {
                nombre: "Voluntariado",
                cantidad: voluntariado,
                porcentaje:
                    calcularPorcentaje(
                        voluntariado
                    ),
            },
        ];
    }, [datosPeriodo]);

    // =====================================================
    // ESTADOS DE POSTULACIONES
    // =====================================================

    const estadosPostulaciones = useMemo(() => {
        const aplicaciones =
            datosPeriodo.applications;

        const contarEstado = (estados: string[]) => {
            return aplicaciones.filter(
                (application) =>
                    estados.includes(
                        application.status ?? application.estado ?? ''
                    )
            ).length;
        };

        const recibidas = contarEstado([
            "Recibida",
            "Recibido",
            "Pendiente",
        ]);

        const revision = contarEstado([
            "En revisión",
            "En revision",
            "Revisión",
            "revision",
        ]);

        const seleccionadas = contarEstado([
            "Seleccionada",
            "Seleccionado",
            "Aceptada",
            "Aceptado",
        ]);

        const descartadas = contarEstado([
            "Descartada",
            "Descartado",
            "Rechazada",
            "Rechazado",
        ]);

        if (aplicaciones.length === 0) {
            return [
                {
                    nombre: "Recibidas",
                    cantidad: 72,
                },
                {
                    nombre: "En revisión",
                    cantidad: 38,
                },
                {
                    nombre: "Seleccionadas",
                    cantidad: 17,
                },
                {
                    nombre: "Descartadas",
                    cantidad: 8,
                },
            ];
        }

        return [
            {
                nombre: "Recibidas",
                cantidad: recibidas,
            },
            {
                nombre: "En revisión",
                cantidad: revision,
            },
            {
                nombre: "Seleccionadas",
                cantidad: seleccionadas,
            },
            {
                nombre: "Descartadas",
                cantidad: descartadas,
            },
        ];
    }, [datosPeriodo]);

    // =====================================================
    // ANIMACIÓN DE ESTADÍSTICAS
    // =====================================================

    useEffect(() => {
        const objetivo = estadisticas;

        const inicio = Date.now();

        const duracion = 700;

        let frame: number | undefined;

        const animate = () => {
            const progreso = Math.min(
                (Date.now() - inicio) /
                    duracion,
                1
            );

            setAnimatedStats({
                oportunidades:
                    Math.floor(
                        objetivo.oportunidades *
                            progreso
                    ),

                postulaciones:
                    Math.floor(
                        objetivo.postulaciones *
                            progreso
                    ),

                organizaciones:
                    Math.floor(
                        objetivo.organizaciones *
                            progreso
                    ),

                postulantes:
                    Math.floor(
                        objetivo.postulantes *
                            progreso
                    ),
            });

            if (progreso < 1) {
                frame =
                    requestAnimationFrame(
                        animate
                    );
            }
        };

        animate();

        return () => {
            if (frame) {
                cancelAnimationFrame(frame);
            }
        };
    }, [estadisticas]);

    // =====================================================
    // ACTUALIZAR
    // =====================================================

    const actualizarEstadisticas = () => {
        setActualizando(true);

        setTimeout(() => {
            setActualizando(false);
        }, 700);
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <section className="admin-screen estadisticas-screen">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="screen-header">

                <div className="statistics-header-actions">

                    <select
                        className="period-select"
                        value={periodo}
                        onChange={(e) =>
                            setPeriodo(
                                e.target.value
                            )
                        }
                    >
                        <option>
                            Últimos 30 días
                        </option>

                        <option>
                            Últimos 90 días
                        </option>

                        <option>
                            Este año
                        </option>
                    </select>

                    <button
                        type="button"
                        className="statistics-refresh-button"
                        onClick={
                            actualizarEstadisticas
                        }
                    >
                        {actualizando
                            ? "Actualizando..."
                            : "Actualizar"}
                    </button>

                </div>

            </div>

            {/* =================================================
                TARJETAS PRINCIPALES
            ================================================= */}

            <div className="statistics-grid">

                <div className="stat-card">

                    <span>
                        Oportunidades publicadas
                    </span>

                    <strong>
                        {animatedStats.oportunidades}
                    </strong>

                    <small>
                        Período seleccionado
                    </small>

                </div>

                <div className="stat-card">

                    <span>
                        Postulaciones
                    </span>

                    <strong>
                        {animatedStats.postulaciones}
                    </strong>

                    <small>
                        Postulaciones registradas
                    </small>

                </div>

                <div className="stat-card">

                    <span>
                        Organizaciones
                    </span>

                    <strong>
                        {animatedStats.organizaciones}
                    </strong>

                    <small>
                        Instituciones registradas
                    </small>

                </div>

                <div className="stat-card">

                    <span>
                        Postulantes
                    </span>

                    <strong>
                        {animatedStats.postulantes}
                    </strong>

                    <small>
                        Usuarios con perfil registrado
                    </small>

                </div>

            </div>

            {/* =================================================
                COLUMNAS
            ================================================= */}

            <div className="statistics-columns">

                {/* =================================================
                    MODALIDADES
                ================================================= */}

                <div className="statistics-box">

                    <div className="statistics-box-header">

                        <div>
                            <h3>
                                Oportunidades por modalidad
                            </h3>

                            <span>
                                Distribución de oportunidades
                                publicadas.
                            </span>
                        </div>

                    </div>

                    <div className="progress-list">

                        {modalidades.map(
                            (modalidad) => (

                                <div
                                    className="progress-item"
                                    key={
                                        modalidad.nombre
                                    }
                                >

                                    <div>

                                        <span>
                                            {
                                                modalidad.nombre
                                            }
                                        </span>

                                        <strong>
                                            {
                                                modalidad.porcentaje
                                            }%
                                        </strong>

                                    </div>

                                    <div className="progress">

                                        <span
                                            style={{
                                                width:
                                                    `${modalidad.porcentaje}%`,
                                            }}
                                        />

                                    </div>

                                    <small>
                                        {
                                            modalidad.cantidad
                                        }{" "}
                                        {
                                            modalidad.cantidad ===
                                            1
                                                ? "oportunidad"
                                                : "oportunidades"
                                        }
                                    </small>

                                </div>
                            )
                        )}

                    </div>

                </div>

                {/* =================================================
                    ESTADO POSTULACIONES
                ================================================= */}

                <div className="statistics-box">

                    <div className="statistics-box-header">

                        <div>
                            <h3>
                                Estado de postulaciones
                            </h3>

                            <span>
                                Distribución de postulaciones
                                recibidas.
                            </span>
                        </div>

                    </div>

                    <div className="simple-stat-list">

                        {estadosPostulaciones.map(
                            (estado) => (

                                <div
                                    key={
                                        estado.nombre
                                    }
                                >

                                    <span>
                                        {
                                            estado.nombre
                                        }
                                    </span>

                                    <strong>
                                        {
                                            estado.cantidad
                                        }
                                    </strong>

                                </div>

                            )
                        )}

                    </div>

                </div>

            </div>

            {/* =================================================
                RESUMEN OPERATIVO
            ================================================= */}

            <div className="statistics-box statistics-summary">

                <div className="statistics-box-header">

                    <div>

                        <h3>
                            Resumen operativo
                        </h3>

                        <span>
                            Indicadores derivados de la
                            actividad actual.
                        </span>

                    </div>

                </div>

                <div className="summary-grid">

                    {/* PROMEDIO */}

                    <div className="summary-item">

                        <span>
                            Promedio de postulaciones
                            por oportunidad
                        </span>

                        <strong>
                            {
                                estadisticas.oportunidades >
                                0
                                    ? (
                                          estadisticas.postulaciones /
                                          estadisticas.oportunidades
                                      ).toFixed(1)
                                    : "0.0"
                            }
                        </strong>

                    </div>

                    {/* TASA SELECCIÓN */}

                    <div className="summary-item">

                        <span>
                            Tasa de selección
                        </span>

                        <strong>
                            {
                                estadisticas.postulaciones >
                                0
                                    ? (
                                          (
                                              estadosPostulaciones.find(
                                                  (
                                                      item
                                                  ) =>
                                                      item.nombre ===
                                                      "Seleccionadas"
                                              )?.cantidad ||
                                              0
                                          ) /
                                          estadisticas.postulaciones *
                                          100
                                      ).toFixed(1)
                                    : "0.0"
                            }
                            %
                        </strong>

                    </div>

                    {/* OPORTUNIDADES ACTIVAS */}

                    <div className="summary-item">

                        <span>
                            Oportunidades activas
                        </span>

                        <strong>
                            {
                                datosPeriodo.jobs.filter(
                                    (job) =>
                                        (
                                            job.status ||
                                            job.estado
                                        ) !==
                                        "Cerrada"
                                ).length
                            }
                        </strong>

                    </div>

                    {/* PERÍODO */}

                    <div className="summary-item">

                        <span>
                            Período consultado
                        </span>

                        <strong>
                            {periodo}
                        </strong>

                    </div>

                </div>

            </div>

        </section>
    );
}

export default Estadisticas;