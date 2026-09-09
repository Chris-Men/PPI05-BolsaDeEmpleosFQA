import React, { useState } from "react";
import {
    Mail,
    LockKeyhole,
    Eye,
    EyeOff,
    ArrowRight,
    UserRound
} from "lucide-react";

export default function LoginForm({
    navigateTo,
    setCurrentUser,
    showToast
}) {

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        setError("");

        const email = formData.email.trim().toLowerCase();
        const password = formData.password;

        if (!email || !password) {
            setError("Ingresa tu correo y contraseña.");
            return;
        }

        setLoading(true);

        // =====================================================
        // LOGIN ADMINISTRADOR
        // =====================================================

        if (
            email === "admin@fundaqa.org" &&
            password === "12345678"
        ) {

            const adminUser = {
                email: email,
                role: "admin",
                name: "Administrador FQA",
                initial: "A"
            };

            setCurrentUser(adminUser);

            showToast(
                "🔑 Sesión de administrador iniciada"
            );

            // Ir al panel administrativo
            navigateTo("admin");

            setLoading(false);

            return;
        }

        // =====================================================
        // LOGIN CANDIDATO
        // =====================================================

        const normalUser = {
            email: email,
            role: "user",
            name: email.split("@")[0],
            initial: email.charAt(0).toUpperCase()
        };

        setCurrentUser(normalUser);

        showToast(
            "✓ Bienvenido candidato " + normalUser.name
        );

        // Ir al perfil
        navigateTo("profile");

        setLoading(false);
    };

    return (
        <form
            className="login-form"
            onSubmit={handleSubmit}
        >

            {/* =================================================
                CORREO
            ================================================= */}

            <div className="form-group">

                <div className="input-wrapper">

                    <Mail
                        size={25}
                        strokeWidth={1.8}
                        className="input-icon"
                    />

                    <input
                        type="email"
                        name="email"
                        placeholder="Correo electrónico"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                </div>

            </div>


            {/* =================================================
                CONTRASEÑA
            ================================================= */}

            <div className="form-group">

                <div className="input-wrapper">

                    <LockKeyhole
                        size={25}
                        strokeWidth={1.8}
                        className="input-icon"
                    />

                    <input
                        type={
                            showPassword
                                ? "text"
                                : "password"
                        }
                        name="password"
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                            setShowPassword((prev) => !prev)
                        }
                        aria-label={
                            showPassword
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                        }
                    >

                        {showPassword ? (
                            <EyeOff size={23} />
                        ) : (
                            <Eye size={23} />
                        )}

                    </button>

                </div>

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <div className="auth-error">
                    {error}
                </div>
            )}


            {/* =================================================
                OLVIDASTE CONTRASEÑA
            ================================================= */}

            <div className="forgot-password">

                <button
                    type="button"
                    onClick={() =>
                        navigateTo("recuperar-contrasena")
                    }
                >
                    ¿Olvidaste tu contraseña?
                </button>

            </div>


            {/* =================================================
                INICIAR SESIÓN
            ================================================= */}

            <button
                type="submit"
                className="login-button"
                disabled={loading}
            >

                <span>
                    {loading
                        ? "Iniciando..."
                        : "Iniciar sesión"
                    }
                </span>

                {!loading && (
                    <ArrowRight size={28} />
                )}

            </button>


            {/* =================================================
                SEPARADOR
            ================================================= */}

            <div className="auth-divider">

                <span></span>

                <strong>o</strong>

                <span></span>

            </div>


            {/* =================================================
                REGISTRARSE
            ================================================= */}

            <button
                type="button"
                className="register-button"
                onClick={() =>
                    navigateTo("register")
                }
            >

                <UserRound size={25} />

                <span>Crear cuenta</span>

            </button>

        </form>
    );
}