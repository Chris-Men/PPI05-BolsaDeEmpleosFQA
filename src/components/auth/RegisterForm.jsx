import React, { useState } from "react";
import {
    Mail,
    LockKeyhole,
    Eye,
    EyeOff,
    ArrowRight,
    UserRound,
    User,
    Check,
    X
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

    const passwordRequirements = {
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        special: /[^A-Za-z0-9]/.test(formData.password)
    };

    const passwordScore = Object.values(passwordRequirements).filter(
        Boolean
    ).length;

    const getPasswordStrength = () => {
        if (!formData.password) {
            return {
                text: "",
                className: "",
                width: "0%"
            };
        }

        if (passwordScore <= 2) {
            return {
                text: "Débil",
                className: "weak",
                width: "30%"
            };
        }

        if (passwordScore <= 4) {
            return {
                text: "Media",
                className: "medium",
                width: "65%"
            };
        }

        return {
            text: "Fuerte",
            className: "strong",
            width: "100%"
        };
    };

    const passwordStrength = getPasswordStrength();

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

        if (error) {
            setError("");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        setError("");

        const name = formData.name.trim();
        const email = formData.email.trim().toLowerCase();
        const password = formData.password;
        const confirmPassword = formData.confirmPassword;

        if (!name) {
            setError("Ingresa tu nombre completo.");
            return;
        }

        if (!email) {
            setError("Ingresa tu correo electrónico.");
            return;
        }

        if (email === "admin@fundaqa.org") {
            setError(
                "Este correo está reservado para el administrador."
            );
            return;
        }

        if (!password) {
            setError("Ingresa una contraseña.");
            return;
        }

        if (!passwordRequirements.length) {
            setError(
                "La contraseña debe tener al menos 8 caracteres."
            );
            return;
        }

        if (!passwordRequirements.uppercase) {
            setError(
                "La contraseña debe contener al menos una letra mayúscula."
            );
            return;
        }

        if (!passwordRequirements.lowercase) {
            setError(
                "La contraseña debe contener al menos una letra minúscula."
            );
            return;
        }

        if (!passwordRequirements.number) {
            setError(
                "La contraseña debe contener al menos un número."
            );
            return;
        }

        if (!passwordRequirements.special) {
            setError(
                "La contraseña debe contener al menos un carácter especial."
            );
            return;
        }

        if (password !== confirmPassword) {
            setError(
                "Las contraseñas no coinciden."
            );
            return;
        }

        setLoading(true);

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

        navigateTo("home");
    };

    return (
        <form
            className="login-form register-form"
            onSubmit={handleSubmit}
        >

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


            <div className="form-group password-form-group">

                <div className="input-wrapper">

                    <LockKeyhole
                        size={25}
                        strokeWidth={1.8}
                        className="input-icon"
                    />

                    <input
                        type={showPassword ? "text" : "password"}
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


                {formData.password && (
                    <div className="password-security">

                        <div className="password-strength-header">

                            <span>
                                Seguridad de la contraseña
                            </span>

                            <strong
                                className={passwordStrength.className}
                            >
                                {passwordStrength.text}
                            </strong>

                        </div>

                        <div className="password-strength-bar">

                            <div
                                className={`password-strength-fill ${passwordStrength.className}`}
                                style={{
                                    width: passwordStrength.width
                                }}
                            />

                        </div>

                        <div className="password-requirements">

                            <PasswordRequirement
                                valid={passwordRequirements.length}
                                text="Mínimo 8 caracteres"
                            />

                            <PasswordRequirement
                                valid={passwordRequirements.uppercase}
                                text="Una letra mayúscula"
                            />

                            <PasswordRequirement
                                valid={passwordRequirements.lowercase}
                                text="Una letra minúscula"
                            />

                            <PasswordRequirement
                                valid={passwordRequirements.number}
                                text="Un número"
                            />

                            <PasswordRequirement
                                valid={passwordRequirements.special}
                                text="Un carácter especial"
                            />

                        </div>

                    </div>
                )}

            </div>


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

                {formData.confirmPassword && (
                    <div
                        className={`password-match ${
                            formData.password === formData.confirmPassword
                                ? "match-success"
                                : "match-error"
                        }`}
                    >

                        {formData.password === formData.confirmPassword ? (
                            <>
                                <Check size={15} />
                                Las contraseñas coinciden
                            </>
                        ) : (
                            <>
                                <X size={15} />
                                Las contraseñas no coinciden
                            </>
                        )}

                    </div>
                )}

            </div>


            {error && (
                <div className="auth-error">
                    {error}
                </div>
            )}


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


            <div className="auth-divider">

                <span></span>

                <strong>o</strong>

                <span></span>

            </div>


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


function PasswordRequirement({ valid, text }) {

    return (
        <div
            className={`password-requirement ${
                valid ? "valid" : "invalid"
            }`}
        >

            {valid ? (
                <Check size={14} />
            ) : (
                <X size={14} />
            )}

            <span>
                {text}
            </span>

        </div>
    );
}