import { useSiteSettings } from '../../hooks/useSiteSettings';

/** Administrative help shares the configured support destination with candidate help. */
function Ayuda() {
    const { configuration } = useSiteSettings();
    const email = configuration.contacto.correoSoporte;
    return (
        <div className="table-box">
            <div className="table-header">
                <div>
                    <h3>Ayuda</h3>
                    <span className="section-description">
                        Guías y preguntas frecuentes para administradores.
                    </span>
                </div>
            </div>

            <div className="empty">
                {email ? <p>Para recibir ayuda, escríbenos a <a href={'mailto:' + email}>{email}</a>.</p> : <p>Consulta con el equipo administrador para recibir ayuda.</p>}
            </div>
        </div>
    );
}

export default Ayuda;
