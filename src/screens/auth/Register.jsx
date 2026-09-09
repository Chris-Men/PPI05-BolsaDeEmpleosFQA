import React from "react";
import RegisterForm from "../../components/auth/RegisterForm";
import "../../styles/auth/auth.css";

export default function Register({
    navigateTo,
    setCurrentUser,
    showToast
}) {

    return (
        <main className="auth-page">

            {/* =====================================================
                DECORACIONES
            ===================================================== */}

            <div className="auth-decoration auth-decoration-top"></div>

            <div className="auth-decoration auth-decoration-bottom"></div>


            <div className="auth-container">

                {/* =================================================
                    LADO IZQUIERDO
                ================================================= */}

                <section className="auth-brand">

                    <div className="auth-brand-content">

                        {/* LOGO FQA */}

                        <div className="fqa-logo">

                            <span className="fqa-logo-main">
                                FQA
                            </span>

                            <div className="fqa-logo-person">
                                <span></span>
                            </div>

                            <div className="fqa-logo-sub">

                                <span>—</span>

                                <strong>
                                    Empleos
                                </strong>

                                <span>—</span>

                            </div>

                        </div>


                        {/* DESCRIPCIÓN */}

                        <p className="auth-brand-description">

                            Conectamos talento
                            <br />
                            con nuevas oportunidades.

                        </p>


                        {/* ILUSTRACIÓN */}

                        <div className="job-illustration">

                            {/* DOCUMENTO */}

                            <div className="illustration-paper">

                                <div className="paper-person"></div>

                                <div className="paper-line"></div>

                                <div className="paper-line short"></div>

                                <div className="paper-line"></div>

                            </div>


                            {/* MALETÍN */}

                            <div className="briefcase">

                                <div className="briefcase-handle"></div>

                                <div className="briefcase-body">

                                    <div className="briefcase-lock"></div>

                                </div>

                            </div>


                            {/* HOJAS DECORATIVAS */}

                            <div className="illustration-leaf leaf-one"></div>

                            <div className="illustration-leaf leaf-two"></div>

                            <div className="illustration-leaf leaf-three"></div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    LADO DERECHO
                ================================================= */}

                <section className="auth-card">

                    <div className="auth-card-content">

                        {/* ENCABEZADO */}

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