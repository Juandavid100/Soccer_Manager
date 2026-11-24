# Soccer Manager

Sistema para administrar una escuela de fútbol: estudiantes, acudientes, entrenadores, grupos, categorías, entrenamientos, campeonatos, mensualidades y notificaciones.

Proyecto final de Diseño de Software, Universidad Cooperativa de Colombia, sede Pasto.

## Roles

- **Gerente**: administra la escuela, los usuarios, los cobros y los reportes.
- **Entrenador**: maneja sus grupos, la asistencia, las evaluaciones y las convocatorias.
- **Acudiente**: consulta las actividades y paga las mensualidades de sus estudiantes.
- **Estudiante**: consulta su perfil, sus actividades y su progreso.

## API REST (código)

El código está en [`soccer-manager/`](soccer-manager/). Es una API en Spring Boot con MongoDB, organizada por capas: controller, service, repository y modelo. Allí están las instrucciones para ejecutarla y la colección de Postman para probarla.

## Backlog

Las 20 historias de usuario están en [Issues](../../issues), con criterios de aceptación en Gherkin.

## Prototipos

Hay una pantalla por historia de usuario en la carpeta [`prototipos/`](prototipos/). Se pueden ver en línea en https://juandavid100.github.io/Escuela-de-futbol/prototipos/


## Diagramas

Las 5 vistas de la arquitectura están en [`diagramas/`](diagramas/): contexto, funcional, lógica, desarrollo y despliegue. El modelo editable es `SoccerManager.vpp` (Visual Paradigm).

## Interfaz web

La plataforma incluye una interfaz web hecha con HTML, CSS y JavaScript sin dependencias externas. Está en `soccer-manager/src/main/resources/static/` y la sirve el mismo Spring Boot, así que funciona en la misma dirección que la API (local: http://localhost:8080).

- **Gerente:** panel con indicadores, estudiantes, acudientes, entrenadores, categorías, grupos, entrenamientos con asistencia, campeonatos con partidos y convocatorias, evaluaciones, mensualidades con pagos, notificaciones y usuarios.
- **Entrenador:** sus grupos, próximas sesiones, asistencia, convocatorias y evaluaciones.
- **Acudiente:** sus estudiantes, actividades, progreso publicado, respuesta a convocatorias y pago de mensualidades.
- **Estudiante:** su perfil, actividades, asistencia y evaluaciones.

La primera vez que se abre sin usuarios, pide crear la cuenta del gerente. Desde el panel se pueden cargar datos de ejemplo, que crean también cuentas de prueba para cada rol (contraseña `demo12345`).

## Despliegue

La API está desplegada en Render con base de datos en MongoDB Atlas:
https://soccer-manager-gfqo.onrender.com/api/categorias

El plan gratuito se suspende cuando no se usa, así que la primera petición puede tardar cerca de un minuto.