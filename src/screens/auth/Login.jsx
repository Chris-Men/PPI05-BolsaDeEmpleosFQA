import React from "react";
import LoginForm from "../../components/auth/LoginForm";
import "../../styles/auth/auth.css";

import fondoDesktop from "../../components/imagenes/img/FLogin 1.png";
import fondoMobile from "../../components/imagenes/img/FLogin 2.png";
import logoFQA from "../../components/imagenes/img/FLogin 3.png";
import portafolio from "../../components/imagenes/img/FLogin 4.png";

export default function Login({
    navigateTo,
    setCurrentUser,
    showToast
}) {
    return (
        <main
            className="auth-page"
            style={{
                "--login-bg-desktop": `url("${fondoDesktop}")`,
                "--login-bg-mobile": `url("${fondoMobile}")`
            }}
        >

            {/* =====================================================
                FONDO / DECORACIONES
            ===================================================== */}

            <div className="auth-background"></div>

            <div className="auth-overlay"></div>


            {/* =====================================================
                CONTENIDO PRINCIPAL
            ===================================================== */}

            <div className="auth-container">


                {/* =================================================
                    LADO IZQUIERDO
                ================================================= */}

                <section className="auth-brand">

                    {/* Portafolio / ilustración */}

                    <img
                        src={portafolio}
                        alt="FQA Empleos"
                        className="auth-portfolio"
                    />


                    {/* Contenido de marca */}

                    <div className="auth-brand-content">

                        {/* LOGO */}

                        <img
                            src={logoFQA}
                            alt="FQA Empleos"
                            className="fqa-logo-image"
                        />


                        {/* FRASE */}

                        <p className="auth-brand-description">
                            Conectando talento con oportunidades.
                        </p>

                    </div>

                </section>


                {/* =================================================
                    LADO DERECHO
                ================================================= */}

                <section className="auth-card">

                    <div className="auth-card-content">


                        {/* =================================================
                            ENCABEZADO
                        ================================================= */}

                        <div className="auth-heading">

                            <h1>
                                Iniciar sesión
                            </h1>

                            <p>
                                Accede a tu cuenta para gestionar
                                <br />
                                tus postulaciones, guardar vacantes
                                <br />
                                y más.
                            </p>

                        </div>


                        {/* =================================================
                            FORMULARIO
                        ================================================= */}

                        <LoginForm
                            navigateTo={navigateTo}
                            setCurrentUser={setCurrentUser}
                            showToast={showToast}
                        />

                    </div>

                </section>

            </div>


            {/* =====================================================
                BOTÓN VOLVER
            ===================================================== */}

            <button
                type="button"
                className="auth-back-button"
                onClick={() => navigateTo("home")}
                aria-label="Volver al inicio"
            >
                <span className="back-arrow">
                    ←
                </span>

                <span>
                    Volver
                </span>
            </button>

        </main>
    );
}