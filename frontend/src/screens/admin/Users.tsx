import { useMemo, useState, type FormEvent } from 'react';

interface AdminUserRow {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
}

type AdminUserForm = Omit<AdminUserRow, 'id'>;
type UserPermissions = Record<number, Record<string, boolean>>;

import "../../styles/admin/users.css";

/** Preserved local user administration prototype. */
function Usuarios() {

    // =====================================================
    // DATOS INICIALES
    // =====================================================

    const [usuarios, setUsuarios] = useState<AdminUserRow[]>([
        {
            id: 1,
            nombre: "Administrador",
            email: "admin@fqa.org",
            rol: "Super Admin",
            estado: "Activo",
        },
        {
            id: 2,
            nombre: "Gestor FQA",
            email: "gestor@fqa.org",
            rol: "Administrador",
            estado: "Activo",
        },
        {
            id: 3,
            nombre: "Coordinación",
            email: "coordinacion@fqa.org",
            rol: "Editor",
            estado: "Activo",
        },
    ]);

    // =====================================================
    // ESTADOS
    // =====================================================

    const [search, setSearch] = useState("");

    const [rolFiltro, setRolFiltro] = useState(
        "Todos los roles"
    );

    const [estadoFiltro, setEstadoFiltro] = useState(
        "Todos los estados"
    );

    const [modalUsuario, setModalUsuario] = useState(false);

    const [modalPermisos, setModalPermisos] = useState(false);

    const [usuarioSeleccionado, setUsuarioSeleccionado] =
        useState<AdminUserRow | null>(null);

    const [modoEdicion, setModoEdicion] = useState(false);

    const [formulario, setFormulario] = useState<AdminUserForm>({
        nombre: "",
        email: "",
        rol: "Editor",
        estado: "Activo",
    });

    // =====================================================
    // PERMISOS DISPONIBLES
    // =====================================================

    const permisosDisponibles = [
        "Dashboard",
        "Nueva Postulación",
        "Administrar Postulaciones",
        "CV Recibidos",
        "Organizaciones",
        "Categorías",
        "Estadísticas",
        "Usuarios",
        "Configuración",
    ];

    const [permisos, setPermisos] = useState<UserPermissions>({});

    // =====================================================
    // FILTRADO
    // =====================================================

    const usuariosFiltrados = useMemo(() => {

        return usuarios.filter((usuario) => {

            const texto = `
                ${usuario.nombre}
                ${usuario.email}
                ${usuario.rol}
                ${usuario.estado}
            `.toLowerCase();

            const coincideBusqueda =
                texto.includes(search.toLowerCase());

            const coincideRol =
                rolFiltro === "Todos los roles" ||
                usuario.rol === rolFiltro;

            const coincideEstado =
                estadoFiltro === "Todos los estados" ||
                usuario.estado === estadoFiltro;

            return (
                coincideBusqueda &&
                coincideRol &&
                coincideEstado
            );
        });

    }, [
        usuarios,
        search,
        rolFiltro,
        estadoFiltro,
    ]);

    // =====================================================
    // ACTUALIZAR FORMULARIO
    // =====================================================

    const actualizarFormulario = (campo: keyof AdminUserForm, valor: string) => {

        setFormulario((prev) => ({
            ...prev,
            [campo]: valor,
        }));
    };

    // =====================================================
    // NUEVO USUARIO
    // =====================================================

    const abrirNuevoUsuario = () => {

        setModoEdicion(false);

        setUsuarioSeleccionado(null);

        setFormulario({
            nombre: "",
            email: "",
            rol: "Editor",
            estado: "Activo",
        });

        setModalUsuario(true);
    };

    // =====================================================
    // EDITAR USUARIO
    // =====================================================

    const abrirEditarUsuario = (usuario: AdminUserRow) => {

        setModoEdicion(true);

        setUsuarioSeleccionado(usuario);

        setFormulario({
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol,
            estado: usuario.estado,
        });

        setModalUsuario(true);
    };

    // =====================================================
    // CERRAR MODAL USUARIO
    // =====================================================

    const cerrarModalUsuario = () => {

        setModalUsuario(false);

        setUsuarioSeleccionado(null);
    };

    // =====================================================
    // GUARDAR USUARIO
    // =====================================================

    const guardarUsuario = (e: FormEvent<HTMLFormElement>) => {

        e.preventDefault();

        const nombre = formulario.nombre.trim();
        const email = formulario.email.trim();

        if (!nombre || !email) {
            return;
        }

        // -------------------------------------------------
        // EDITAR
        // -------------------------------------------------

        if (modoEdicion && usuarioSeleccionado) {

            setUsuarios((prev) =>
                prev.map((usuario) => {

                    if (
                        usuario.id !==
                        usuarioSeleccionado.id
                    ) {
                        return usuario;
                    }

                    return {
                        ...usuario,
                        nombre,
                        email,
                        rol: formulario.rol,
                        estado: formulario.estado,
                    };
                })
            );

        }

        // -------------------------------------------------
        // CREAR
        // -------------------------------------------------

        else {

            const nuevoUsuario = {
                id: Date.now(),
                nombre,
                email,
                rol: formulario.rol,
                estado: formulario.estado,
            };

            setUsuarios((prev) => [
                ...prev,
                nuevoUsuario,
            ]);
        }

        cerrarModalUsuario();
    };

    // =====================================================
    // CAMBIAR ESTADO
    // =====================================================

    const cambiarEstadoUsuario = (usuario: AdminUserRow) => {

        // El Super Admin no se puede desactivar
        if (usuario.rol === "Super Admin") {
            return;
        }

        setUsuarios((prev) =>
            prev.map((item) => {

                if (item.id !== usuario.id) {
                    return item;
                }

                return {
                    ...item,
                    estado:
                        item.estado === "Activo"
                            ? "Inactivo"
                            : "Activo",
                };
            })
        );
    };

    // =====================================================
    // ELIMINAR USUARIO
    // =====================================================

    const eliminarUsuario = (usuario: AdminUserRow) => {

        // Protección del Super Admin
        if (usuario.rol === "Super Admin") {
            return;
        }

        const confirmar = window.confirm(
            `¿Desea eliminar al usuario "${usuario.nombre}"?`
        );

        if (!confirmar) {
            return;
        }

        setUsuarios((prev) =>
            prev.filter(
                (item) => item.id !== usuario.id
            )
        );

        // Si estaba seleccionado, limpiarlo
        if (
            usuarioSeleccionado &&
            usuarioSeleccionado.id === usuario.id
        ) {
            setUsuarioSeleccionado(null);
        }
    };

    // =====================================================
    // ABRIR PERMISOS
    // =====================================================

    const abrirPermisos = (usuario: AdminUserRow) => {

        setUsuarioSeleccionado(usuario);

        setModalPermisos(true);

        // Crear permisos iniciales si todavía no existen
        setPermisos((prev) => {

            if (prev[usuario.id]) {
                return prev;
            }

            const permisosIniciales: Record<string, boolean> = {};

            permisosDisponibles.forEach((permiso) => {

                permisosIniciales[permiso] =
                    usuario.rol === "Super Admin";
            });

            return {
                ...prev,
                [usuario.id]: permisosIniciales,
            };
        });
    };

    // =====================================================
    // CERRAR PERMISOS
    // =====================================================

    const cerrarPermisos = () => {

        setModalPermisos(false);

        setUsuarioSeleccionado(null);
    };

    // =====================================================
    // TOGGLE PERMISO
    // =====================================================

    const togglePermiso = (permiso: string) => {

        if (!usuarioSeleccionado) {
            return;
        }

        // El Super Admin tiene todos los permisos
        if (
            usuarioSeleccionado.rol ===
            "Super Admin"
        ) {
            return;
        }

        setPermisos((prev) => {

            const permisosUsuario =
                prev[usuarioSeleccionado.id] || {};

            return {
                ...prev,

                [usuarioSeleccionado.id]: {
                    ...permisosUsuario,

                    [permiso]:
                        !permisosUsuario[permiso],
                },
            };
        });
    };

    // =====================================================
    // GUARDAR PERMISOS
    // =====================================================

    const guardarPermisos = () => {

        cerrarPermisos();
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (

        <section className="admin-screen usuarios-screen">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="screen-header">

                <button
                    type="button"
                    className="primary-button"
                    onClick={abrirNuevoUsuario}
                >
                    + Nuevo usuario
                </button>

            </div>

            {/* =================================================
                TOOLBAR
            ================================================= */}

            <div className="usuarios-toolbar">

                <input
                    type="text"
                    placeholder="Buscar usuario..."
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                />

                <select
                    value={rolFiltro}
                    onChange={(e) =>
                        setRolFiltro(e.target.value)
                    }
                >

                    <option>
                        Todos los roles
                    </option>

                    <option>
                        Super Admin
                    </option>

                    <option>
                        Administrador
                    </option>

                    <option>
                        Editor
                    </option>

                </select>

                <select
                    value={estadoFiltro}
                    onChange={(e) =>
                        setEstadoFiltro(e.target.value)
                    }
                >

                    <option>
                        Todos los estados
                    </option>

                    <option>
                        Activo
                    </option>

                    <option>
                        Inactivo
                    </option>

                </select>

            </div>

            {/* =================================================
                TABLA
            ================================================= */}

            <div className="admin-table-box">

                <table>

                    <thead>

                        <tr>

                            <th>
                                Usuario
                            </th>

                            <th>
                                Correo
                            </th>

                            <th>
                                Rol
                            </th>

                            <th>
                                Estado
                            </th>

                            <th>
                                Acciones
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {usuariosFiltrados.length > 0 ? (

                            usuariosFiltrados.map(
                                (usuario) => (

                                    <tr
                                        key={usuario.id}
                                    >

                                        <td>

                                            <div className="user-table-info">

                                                <div className="mini-avatar">

                                                    {usuario.nombre
                                                        .charAt(0)
                                                        .toUpperCase()}

                                                </div>

                                                <strong>
                                                    {usuario.nombre}
                                                </strong>

                                            </div>

                                        </td>

                                        <td>
                                            {usuario.email}
                                        </td>

                                        <td>

                                            <span className="type-badge">
                                                {usuario.rol}
                                            </span>

                                        </td>

                                        <td>

                                            <span
                                                className={
                                                    usuario.estado ===
                                                    "Activo"
                                                        ? "status status-active"
                                                        : "status status-inactive"
                                                }
                                            >
                                                {usuario.estado}
                                            </span>

                                        </td>

                                        <td>

                                            <div className="table-actions">

                                                {/* EDITAR */}

                                                <button
                                                    type="button"
                                                    className="edit-button"
                                                    onClick={() =>
                                                        abrirEditarUsuario(
                                                            usuario
                                                        )
                                                    }
                                                >
                                                    Editar
                                                </button>

                                                {/* PERMISOS */}

                                                <button
                                                    type="button"
                                                    className="edit-button"
                                                    onClick={() =>
                                                        abrirPermisos(
                                                            usuario
                                                        )
                                                    }
                                                >
                                                    Permisos
                                                </button>

                                                {/* ACTIVAR / DESACTIVAR */}

                                                {usuario.rol !==
                                                    "Super Admin" && (

                                                    <button
                                                        type="button"
                                                        className="edit-button"
                                                        onClick={() =>
                                                            cambiarEstadoUsuario(
                                                                usuario
                                                            )
                                                        }
                                                    >
                                                        {
                                                            usuario.estado ===
                                                            "Activo"
                                                                ? "Desactivar"
                                                                : "Activar"
                                                        }
                                                    </button>

                                                )}

                                                {/* ELIMINAR */}

                                                {usuario.rol !==
                                                    "Super Admin" && (

                                                    <button
                                                        type="button"
                                                        className="edit-button"
                                                        onClick={() =>
                                                            eliminarUsuario(
                                                                usuario
                                                            )
                                                        }
                                                    >
                                                        Eliminar
                                                    </button>

                                                )}

                                            </div>

                                        </td>

                                    </tr>

                                )
                            )

                        ) : (

                            <tr>

                                <td
                                    colSpan={5}
                                    style={{
                                        textAlign: "center",
                                        padding: "30px",
                                    }}
                                >
                                    No se encontraron
                                    usuarios.
                                </td>

                            </tr>

                        )}

                    </tbody>

                </table>

            </div>

            {/* =================================================
                MODAL NUEVO / EDITAR USUARIO
            ================================================= */}

            {modalUsuario && (

                <div
                    className="usuarios-modal-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.currentTarget.classList.contains(
                                "usuarios-modal-overlay"
                            )
                        ) {
                            cerrarModalUsuario();
                        }

                    }}
                >

                    <div className="usuarios-modal">

                        {/* HEADER */}

                        <div className="usuarios-modal-header">

                            <div>

                                <span>
                                    ADMINISTRACIÓN DE USUARIOS
                                </span>

                                <h3>
                                    {
                                        modoEdicion
                                            ? "Editar usuario"
                                            : "Nuevo usuario"
                                    }
                                </h3>

                            </div>

                            <button
                                type="button"
                                className="usuarios-modal-close"
                                onClick={
                                    cerrarModalUsuario
                                }
                            >
                                ×
                            </button>

                        </div>

                        {/* FORMULARIO */}

                        <form
                            className="usuarios-form"
                            onSubmit={guardarUsuario}
                        >

                            <div className="usuarios-form-field">

                                <label>
                                    Nombre completo
                                </label>

                                <input
                                    type="text"
                                    value={
                                        formulario.nombre
                                    }
                                    onChange={(e) =>
                                        actualizarFormulario(
                                            "nombre",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Ej. Juan Pérez"
                                    required
                                />

                            </div>

                            <div className="usuarios-form-field">

                                <label>
                                    Correo electrónico
                                </label>

                                <input
                                    type="email"
                                    value={
                                        formulario.email
                                    }
                                    onChange={(e) =>
                                        actualizarFormulario(
                                            "email",
                                            e.target.value
                                        )
                                    }
                                    placeholder="usuario@fqa.org"
                                    required
                                />

                            </div>

                            <div className="usuarios-form-row">

                                <div className="usuarios-form-field">

                                    <label>
                                        Rol
                                    </label>

                                    <select
                                        value={
                                            formulario.rol
                                        }
                                        onChange={(e) =>
                                            actualizarFormulario(
                                                "rol",
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option>
                                            Administrador
                                        </option>

                                        <option>
                                            Editor
                                        </option>

                                    </select>

                                </div>

                                <div className="usuarios-form-field">

                                    <label>
                                        Estado
                                    </label>

                                    <select
                                        value={
                                            formulario.estado
                                        }
                                        onChange={(e) =>
                                            actualizarFormulario(
                                                "estado",
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option>
                                            Activo
                                        </option>

                                        <option>
                                            Inactivo
                                        </option>

                                    </select>

                                </div>

                            </div>

                            <div className="usuarios-modal-footer">

                                <button
                                    type="button"
                                    className="usuarios-secondary-button"
                                    onClick={
                                        cerrarModalUsuario
                                    }
                                >
                                    Cancelar
                                </button>

                                <div className="usuarios-footer-right">

                                    {modoEdicion &&
                                        usuarioSeleccionado &&
                                        usuarioSeleccionado.rol !==
                                            "Super Admin" && (

                                            <button
                                                type="button"
                                                className="usuarios-delete-button"
                                                onClick={() => {

                                                    eliminarUsuario(
                                                        usuarioSeleccionado
                                                    );

                                                    cerrarModalUsuario();

                                                }}
                                            >
                                                Eliminar
                                            </button>

                                        )}

                                    <button
                                        type="submit"
                                        className="usuarios-primary-button"
                                    >
                                        {
                                            modoEdicion
                                                ? "Guardar cambios"
                                                : "Crear usuario"
                                        }
                                    </button>

                                </div>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {/* =================================================
                MODAL DE PERMISOS
            ================================================= */}

            {modalPermisos &&
                usuarioSeleccionado && (

                    <div
                        className="usuarios-modal-overlay"
                        onMouseDown={(e) => {

                            if (
                                e.currentTarget.classList.contains(
                                    "usuarios-modal-overlay"
                                )
                            ) {
                                cerrarPermisos();
                            }

                        }}
                    >

                        <div className="usuarios-modal permisos-modal">

                            {/* HEADER */}

                            <div className="usuarios-modal-header">

                                <div>

                                    <span>
                                        CONTROL DE ACCESO
                                    </span>

                                    <h3>
                                        Permisos
                                    </h3>

                                </div>

                                <button
                                    type="button"
                                    className="usuarios-modal-close"
                                    onClick={
                                        cerrarPermisos
                                    }
                                >
                                    ×
                                </button>

                            </div>

                            {/* INFORMACIÓN */}

                            <div className="permisos-info">

                                <span>
                                    Usuario
                                </span>

                                <strong>
                                    {
                                        usuarioSeleccionado.nombre
                                    }
                                </strong>

                            </div>

                            {/* LISTA DE PERMISOS */}

                            <div className="permisos-list">

                                {permisosDisponibles.map(
                                    (permiso) => {

                                        const activo =
                                            permisos[
                                                usuarioSeleccionado.id
                                            ]?.[
                                                permiso
                                            ] || false;

                                        const esSuperAdmin =
                                            usuarioSeleccionado.rol ===
                                            "Super Admin";

                                        return (

                                            <button
                                                key={permiso}
                                                type="button"
                                                className={
                                                    `permiso-item ${
                                                        activo
                                                            ? "active"
                                                            : ""
                                                    }`
                                                }
                                                disabled={
                                                    esSuperAdmin
                                                }
                                                onClick={() =>
                                                    togglePermiso(
                                                        permiso
                                                    )
                                                }
                                            >

                                                <span>
                                                    {permiso}
                                                </span>

                                                <span className="permiso-toggle">

                                                    {activo
                                                        ? "✓"
                                                        : "—"}

                                                </span>

                                            </button>

                                        );
                                    }
                                )}

                            </div>

                            {/* WARNING */}

                            <div className="permisos-warning">

                                {usuarioSeleccionado.rol ===
                                "Super Admin"

                                    ? "El Super Admin tiene acceso completo al panel administrativo y sus permisos no pueden modificarse."

                                    : "Los permisos modificados se aplican al usuario dentro del prototipo. En una versión con backend deberán persistirse en la base de datos."}

                            </div>

                            {/* FOOTER */}

                            <div className="usuarios-form">

                                <div className="usuarios-modal-footer">

                                    <button
                                        type="button"
                                        className="usuarios-secondary-button"
                                        onClick={
                                            cerrarPermisos
                                        }
                                    >
                                        Cancelar
                                    </button>

                                    <div className="usuarios-footer-right">

                                        <button
                                            type="button"
                                            className="usuarios-primary-button"
                                            onClick={
                                                guardarPermisos
                                            }
                                        >
                                            Guardar permisos
                                        </button>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                )}

        </section>
    );
}

export default Usuarios;