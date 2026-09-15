import React from "react";
import RegisterForm from "../../components/auth/RegisterForm";
import "../../styles/auth/auth.css";

import fondoDesktop from "../../components/imagenes/img/FLogin 1.png";
import fondoMobile from "../../components/imagenes/img/FLogin 2.png";
import logoFQA from "../../components/imagenes/img/FLogin 3.png";
import portafolio from "../../components/imagenes/img/FLogin 4.png";

export default function Register({
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
                FONDO
            ===================================================== */}

            <div className="auth-background"></div>

            <div className="auth-overlay"></div>


            {/* =====================================================
                CONTENEDOR PRINCIPAL
            ===================================================== */}

            <div className="auth-container">


                {/* =================================================
                    LADO IZQUIERDO
                ================================================= */}

                <section className="auth-brand">

                    <img
                        src={portafolio}
                        alt="FQA Empleos"
                        className="auth-portfolio"
                    />


                    <div className="auth-brand-content">

                        <img
                            src={logoFQA}
                            alt="FQA Empleos"
                            className="fqa-logo-image"
                        />


                        <p className="auth-brand-description">

                            Conectando talento
                            <br />
                            con oportunidades.

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
                                Crear cuenta
                            </h1>

                            <p>
                                Regístrate para encontrar nuevas
                                <br />
                                oportunidades y gestionar tus
                                <br />
                                postulaciones.
                            </p>

                        </div>


                        {/* =================================================
                            FORMULARIO
                        ================================================= */}

                        <RegisterForm
                            navigateTo={navigateTo}
                            setCurrentUser={setCurrentUser}
                            showToast={showToast}
                        />

                    </div>

                </section>

            </div>

        </main>
    );
}