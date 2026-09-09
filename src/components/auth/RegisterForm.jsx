import React, { useState } from "react";
import {
    Mail,
    LockKeyhole,
    Eye,
    EyeOff,
    ArrowRight,
    UserRound,
    User
} from "lucide-react";

export default function RegisterForm({
    navigateTo,
    setCurrentUser,
    showToast
}) {

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ==========================================================
    // CAMBIAR CAMPOS
    // ==========================================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

    };

    // ==========================================================
    // REGISTRO
    // ==========================================================

    const handleSubmit = (e) => {

        e.preventDefault();

        setError("");

        const name = formData.name.trim();
        const email = formData.email.trim().toLowerCase();
        const password = formData.password;
        const confirmPassword = formData.confirmPassword;

        // Validar nombre
        if (!name) {
            setError("Ingresa tu nombre completo.");
            return;
        }

        // Validar correo
        if (!email) {
            setError("Ingresa tu correo electrónico.");
            return;
        }

        // Evitar registrar el correo del administrador
        if (email === "admin@fundaqa.org") {
            setError(
                "Este correo está reservado para el administrador."
            );
            return;
        }

        // Validar contraseña
        if (!password) {
            setError("Ingresa una contraseña.");
            return;
        }

        if (password.length < 6) {
            setError(
                "La contraseña debe tener al menos 6 caracteres."
            );
            return;
        }

        // Confirmar contraseña
        if (password !== confirmPassword) {
            setError(
                "Las contraseñas no coinciden."
            );
            return;
        }

        setLoading(true);

        // ======================================================
        // CREAR USUARIO
        // ======================================================

        const newUser = {
            name: name,
            email: email,
            role: "user",
            initial: name.charAt(0).toUpperCase()
        };

        setCurrentUser(newUser);

        showToast(
            "✓ Cuenta creada correctamente. ¡Bienvenido!"
        );

        setLoading(false);

        // Ir al perfil
        navigateTo("profile");
    };

    return (
        <form
            className="login-form"
            onSubmit={handleSubmit}
        >

            {/* ==================================================
                NOMBRE
            ================================================== */}

            <div className="form-group">

                <div className="input-wrapper">

                    <User
                        size={25}
                        strokeWidth={1.8}
                        className="input-icon"
                    />

                    <input
                        type="text"
                        name="name"
                        placeholder="Nombre completo"
                        value={formData.name}
                        onChange={handleChange}
                        autoComplete="name"
                        required
                    />

                </div>

            </div>


            {/* ==================================================
                CORREO
            ================================================== */}

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
                        autoComplete="email"
                        required
                    />

                </div>

            </div>


            {/* ==================================================
                CONTRASEÑA
            ================================================== */}

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
                        autoComplete="new-password"
                        required
                    />

                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                            setShowPassword(
                                (prev) => !prev
                            )
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


            {/* ==================================================
                CONFIRMAR CONTRASEÑA
            ================================================== */}

            <div className="form-group">

                <div className="input-wrapper">

                    <LockKeyhole
                        size={25}
                        strokeWidth={1.8}
                        className="input-icon"
                    />

                    <input
                        type={
                            showConfirmPassword
                                ? "text"
                                : "password"
                        }
                        name="confirmPassword"
                        placeholder="Confirmar contraseña"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                    />

                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                            setShowConfirmPassword(
                                (prev) => !prev
                            )
                        }
                        aria-label={
                            showConfirmPassword
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                        }
                    >

                        {showConfirmPassword ? (
                            <EyeOff size={23} />
                        ) : (
                            <Eye size={23} />
                        )}

                    </button>

                </div>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
                <div className="auth-error">
                    {error}
                </div>
            )}


            {/* ==================================================
                REGISTRARSE
            ================================================== */}

            <button
                type="submit"
                className="login-button"
                disabled={loading}
            >

                <span>
                    {loading
                        ? "Creando cuenta..."
                        : "Crear cuenta"
                    }
                </span>

                {!loading && (
                    <ArrowRight size={28} />
                )}

            </button>


            {/* ==================================================
                SEPARADOR
            ================================================== */}

            <div className="auth-divider">

                <span></span>

                <strong>o</strong>

                <span></span>

            </div>


            {/* ==================================================
                INICIAR SESIÓN
            ================================================== */}

            <button
                type="button"
                className="register-button"
                onClick={() =>
                    navigateTo("login")
                }
            >

                <UserRound size={25} />

                <span>
                    Ya tengo una cuenta
                </span>

            </button>

        </form>
    );
}