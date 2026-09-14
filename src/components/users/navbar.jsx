import { useState } from "react";
import logo from "../imagenes/logo/logo 1.png";

import "../../styles/users/navbar.css";

function Navbar({
    screen,
    currentUser,
    userMenuOpen,
    setUserMenuOpen,
    navigateTo,
    setScreen,
    handleLogout,
}) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleNavigation = (target) => {
        setMenuOpen(false);
        navigateTo(target);
    };

    const handleLogin = () => {
        setMenuOpen(false);
        setScreen("login");
    };

    return (
        <nav className="nav">

            {/* LOGO */}
            <div
                className="nav-brand"
                onClick={() => handleNavigation("home")}
            >
                <img
                    src={logo}
                    alt="Fundación Quintanilla Amaya"
                    className="nav-logo"
                />
            </div>

            {/* MENÚ DESKTOP */}
            <div className="nav-links">

                <button
                    className={`nav-link ${
                        screen === "jobs" ? "active" : ""
                    }`}
                    onClick={() => handleNavigation("jobs")}
                >
                    Empleos
                </button>

                <button
                    className={`nav-link ${
                        screen === "volunteers" ? "active" : ""
                    }`}
                    onClick={() =>
                        handleNavigation("volunteers")
                    }
                >
                    Voluntariado
                </button>

                <button
                    className={`nav-link ${
                        screen === "students" ? "active" : ""
                    }`}
                    onClick={() =>
                        handleNavigation("students")
                    }
                >
                    Estudiantes
                </button>

                <button
                    className={`nav-link ${
                        screen === "nosotros" ? "active" : ""
                    }`}
                    onClick={() =>
                        handleNavigation("nosotros")
                    }
                >
                    Nosotros
                </button>

            </div>

            {/* DERECHA */}
            <div className="nav-right">

                {currentUser ? (
                    currentUser.role === "admin" ? (

                        <div
                            className="nav-avatar"
                            onClick={() =>
                                handleNavigation("admin")
                            }
                        >
                            {currentUser.initial}
                        </div>

                    ) : (

                        <div
                            className="nav-user-menu"
                            onClick={(e) =>
                                e.stopPropagation()
                            }
                        >
                            <div
                                className="nav-avatar"
                                onClick={() =>
                                    setUserMenuOpen(
                                        (prev) => !prev
                                    )
                                }
                                title="Menú de usuario"
                            >
                                {currentUser.initial}
                            </div>

                            {userMenuOpen && (
                                <div className="nav-user-dropdown">

                                    <button
                                        className="nav-user-dropdown-item"
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            navigateTo("profile");
                                        }}
                                    >
                                        Ir al perfil
                                    </button>

                                    <button
                                        className="nav-user-dropdown-item danger"
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            handleLogout();
                                        }}
                                    >
                                        Cerrar sesión
                                    </button>

                                </div>
                            )}

                        </div>
                    )

                ) : (

                    <button
                        className="btn-ghost"
                        onClick={handleLogin}
                    >
                        Ingresar
                    </button>

                )}

                {/* HAMBURGUESA */}
                <button
                    className={`nav-menu-button ${
                        menuOpen ? "open" : ""
                    }`}
                    onClick={() =>
                        setMenuOpen((prev) => !prev)
                    }
                    aria-label="Abrir menú"
                    aria-expanded={menuOpen}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

            </div>

            {/* MENÚ MÓVIL */}
            <div
                className={`nav-mobile-menu ${
                    menuOpen ? "show" : ""
                }`}
            >

                <button
                    className={`mobile-nav-link ${
                        screen === "jobs" ? "active" : ""
                    }`}
                    onClick={() =>
                        handleNavigation("jobs")
                    }
                >
                    Empleos
                </button>

                <button
                    className={`mobile-nav-link ${
                        screen === "volunteers" ? "active" : ""
                    }`}
                    onClick={() =>
                        handleNavigation("volunteers")
                    }
                >
                    Voluntariado
                </button>

                <button
                    className={`mobile-nav-link ${
                        screen === "students" ? "active" : ""
                    }`}
                    onClick={() =>
                        handleNavigation("students")
                    }
                >
                    Estudiantes
                </button>

                <button
                    className={`mobile-nav-link ${
                        screen === "nosotros" ? "active" : ""
                    }`}
                    onClick={() =>
                        handleNavigation("nosotros")
                    }
                >
                    Nosotros
                </button>

                {!currentUser && (
                    <button
                        className="mobile-login-button"
                        onClick={handleLogin}
                    >
                        Ingresar
                    </button>
                )}

            </div>

        </nav>
    );
}

export default Navbar;