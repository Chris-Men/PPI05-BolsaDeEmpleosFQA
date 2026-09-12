# AGENTS.md — FQA Empleos

## 1. Pila de proyectos

- **Frontend:** React 19, TypeScript 5, HTML5, CSS3.
- **Backend:** Node.js (LTS), Express.js, TypeScript 5, arquitectura API REST.
- **Base de datos:** PostgreSQL + Prisma ORM (`schema.prisma` como fuente única de verdad).
- **Autenticación:** JWT (stateless) + bcrypt para hashing de contraseñas.
- **Infraestructura:** Docker + Docker Compose (local), despliegue en DigitalOcean.
- **Gestor de paquetes:** npm (frontend y backend por separado, `package.json` independiente en cada uno).
- **Entorno:** Desarrollo vía Docker Compose; producción contenerizada (frontend, backend y PostgreSQL en contenedores separados).

## 2. Comandos de compilación y prueba

> Ajustar si difieren de los scripts reales definidos en `package.json`.

- **Backend — instalar:** `npm install` (dentro de `/backend`)
- **Backend — desarrollo:** `npm run dev`
- **Backend — compilación TS:** `npm run build` (equivalente a `tsc`)
- **Backend — migraciones Prisma:** `npx prisma migrate dev`
- **Backend — generar cliente Prisma:** `npx prisma generate`
- **Frontend — instalar:** `npm install` (dentro de `/frontend`)
- **Frontend — desarrollo:** `npm run dev`
- **Frontend — compilación:** `npm run build`
- **Chequeo de tipos:** `npm run typecheck` (equivalente a `tsc --noEmit`)
- **Lint (ambos):** `npm run lint`
- **Pruebas (ambos):** `npm test`
- **Entorno completo:** `docker compose up --build`

## 3. Convenciones de estilo de código

**Backend — Controller delgado, tipado, lógica en Service:**
```ts
// controllers/opportunity.controller.ts
export const createOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await opportunityService.create(req.body, req.user.id);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};
```

**Backend — Consultas Prisma en el service, nunca en el controller:**
```ts
// services/opportunity.service.ts
import { Opportunity, Prisma } from '@prisma/client';

export const create = (
  payload: Prisma.OpportunityCreateInput,
  organizationId: string
): Promise<Opportunity> => {
  return prisma.opportunity.create({
    data: { ...payload, organizationId },
  });
};
```

**Backend — Validación de entrada explícita con tipos inferidos:**
```ts
// validation/opportunity.schema.ts
import { z } from 'zod';

export const createOpportunitySchema = z.object({
  title: z.string().min(3),
  type: z.enum(['EMPLEO', 'VOLUNTARIADO', 'PRACTICA', 'HORAS_SOCIALES']),
});

export type CreateOpportunityDTO = z.infer<typeof createOpportunitySchema>;
```

**Frontend — Llamadas a la API centralizadas en `/services`, tipadas, nunca `fetch` disperso en componentes:**
```ts
// services/opportunities.service.ts
export interface OpportunityFilters {
  modality?: string;
  location?: string;
}

export const getOpportunities = (filters: OpportunityFilters) =>
  api.get<Opportunity[]>('/opportunities', { params: filters });
```

**Frontend — Componentes funcionales tipados con `interface` de props (React 19, sin `React.FC`):**
```tsx
// components/OpportunityCard.tsx
interface OpportunityCardProps {
  title: string;
  modality: string;
  location: string;
}

export function OpportunityCard({ title, modality, location }: OpportunityCardProps) {
  return (
    <div className="opportunity-card">
      <h3>{title}</h3>
      <span>{modality} · {location}</span>
    </div>
  );
}
```

**Nombres:** variables/funciones/tipos en inglés (`camelCase` para variables, `PascalCase` para tipos/interfaces/componentes), contenido visible al usuario (UI, mensajes, errores) siempre en **español**. Evitar `any`; usar tipos explícitos o `unknown` con narrowing. Siempre agregar Documentacion utilizando JSDoc.

## 4. Restricciones de arquitectura

- Tres capas estrictas: **React (TS) → API REST (Express + TS) → PostgreSQL (Prisma)**. El frontend nunca accede a la base de datos directamente.
- Backend estructurado en: `routes → controllers → services → middleware → validation → prisma`.
- Los controllers no contienen lógica de negocio compleja; esta vive en `services`.
- Frontend estructurado en: `components` (UI reutilizable) / `pages` (vistas) / `services` (API) / `hooks|state` / `types` (interfaces compartidas) / `utils`.
- Tipos/DTOs compartidos entre capas deben mantenerse consistentes; evitar duplicar interfaces ya definidas.
- No duplicar lógica entre páginas ni entre services; extraer utilidades compartidas.
- Toda relación de datos se modela explícitamente en `schema.prisma`; no usar SQL directo salvo necesidad justificada y documentada en el código.
- Roles del sistema (`Candidato`, `Organización`, `Administrador`) determinan permisos; toda autorización se valida en el backend, nunca solo en el frontend.

## 5. Límites

- **Nunca** commitear `.env` ni secretos (JWT_SECRET, credenciales DB, API keys, SMTP).
- **Nunca** loguear ni exponer contraseñas, tokens o variables sensibles.
- **Nunca** almacenar contraseñas en texto plano; siempre `bcrypt`.
- **No modificar** `schema.prisma` sin revisar antes las relaciones y migraciones existentes; evitar cambios destructivos.
- **No tocar** `docker-compose.yml` ni configuración de infraestructura sin revisar impacto en los tres contenedores (frontend/backend/DB).
- **No reescribir** módulos completos existentes sin razón documentada; preferir el cambio mínimo necesario.
- **No introducir** ORMs, frameworks o dependencias fuera del stack definido sin justificación explícita.
- **No usar** `any` ni desactivar `strict` mode de TypeScript para evitar errores de compilación.
- Carpeta `/migrations` (histórico de Prisma) es de solo lectura salvo generación automática vía `prisma migrate`.

## 6. Flujo de trabajo de Git

- Ramas por funcionalidad: `feature/<nombre>`, `fix/<nombre>`, `hotfix/<nombre>`.
- Nunca commitear directamente a `main`.
- Fusión mediante **squash merge** hacia `main`.
- Commits convencionales: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Un PR = un cambio coherente y acotado; incluir descripción breve del propósito en español.
