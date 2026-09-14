import React from "react";

import logo from "./imagenes/logo/logo 1.png";

import "../styles/nabvar.css";

function Navbar({
    navigateTo,
    setLoginOpen,
}) {
    return (
        <nav className="navbar">

            {/* LOGO */}
            <button
                type="button"
                className="navbar-logo"
                onClick={() => navigateTo("home")}
            >
                <img
                    src={logo}
                    alt="Fundación Quintanilla Amaya"
                />
            </button>

            {/* MENÚ */}
            <div className="navbar-menu">

                <button
                    type="button"
                    onClick={() => navigateTo("home")}
                >
                    Inicio
                </button>

                <button
                    type="button"
                    onClick={() => navigateTo("jobs")}
                >
                    Vacantes
                </button>

                <button
                    type="button"
                    onClick={() => navigateTo("volunteers")}
                >
                    Voluntariado
                </button>

                <button
                    type="button"
                    onClick={() => navigateTo("nosotros")}
                >
                    Quiénes Somos
                </button>

            </div>

            {/* INGRESAR */}
            <div className="navbar-actions">
                <button
                    type="button"
                    className="navbar-login"
                    onClick={() => setLoginOpen(true)}
                >
                    Ingresar
                </button>
            </div>

        </nav>
    );
}

export default Navbar;