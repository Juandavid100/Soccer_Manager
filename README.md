<p align="center"><img src="soccer-manager/src/main/resources/static/img/emblema.png" width="360" alt="Soccer Manager"></p>

# Soccer Manager

Sistema para administrar una escuela de fútbol: estudiantes, acudientes, entrenadores, grupos, categorías, entrenamientos, asistencia, campeonatos, evaluaciones, mensualidades y notificaciones.

Proyecto final de Diseño de Software, Universidad Cooperativa de Colombia, sede Pasto. Hecho con **Java 17 + Spring Boot 3 + MongoDB**.

## Ver el proyecto en línea

| Qué | Enlace |
|---|---|
| Plataforma web | https://soccer-manager-gfqo.onrender.com |
| API REST (ejemplo) | https://soccer-manager-gfqo.onrender.com/api/categorias |
| Prototipos de las 20 historias | https://github.com/Juandavid100/Soccer_Manager/tree/main/prototipos |

Está desplegado en **Render**, con la base de datos en **MongoDB Atlas**. Como el plan es gratuito, el servidor se apaga cuando nadie lo usa, así que la primera visita puede tardar cerca de un minuto en cargar.

## Qué hay en este repositorio

| Carpeta o archivo | Contenido |
|---|---|
| [`diagramas/`](diagramas/) | Las 5 vistas de la arquitectura en PNG y el modelo editable `SoccerManager.vpp` (Visual Paradigm) |
| [`soccer-manager/`](soccer-manager/) | El código: API REST en Spring Boot y la interfaz web |
| [`soccer-manager/postman/`](soccer-manager/postman/) | La colección de Postman (52 peticiones) y los entornos Local y Render |
| [`docs/mapa-del-codigo.md`](docs/mapa-del-codigo.md) | Dónde está cada funcionalidad en el código: archivo, método y línea |
| [`prototipos/`](prototipos/) | Una pantalla HTML por historia de usuario |
| [Issues](../../issues) | El backlog: 20 historias de usuario con criterios de aceptación en Gherkin |

## Roles

- **Gerente**: administra la escuela, los usuarios, los cobros y los reportes.
- **Entrenador**: maneja sus grupos, la asistencia, las evaluaciones y las convocatorias.
- **Acudiente**: consulta las actividades de sus estudiantes y paga las mensualidades.
- **Estudiante**: consulta su perfil, sus actividades y su progreso.

## Arquitectura

El código está organizado por capas. Cada capa solo llama a la de abajo:

```
controller  →  service  →  repository  →  MongoDB
 (recibe)      (reglas)     (guarda)
```

| Vista | Diagrama |
|---|---|
| Contexto | ![Vista de contexto](diagramas/0.1%20Vista%20de%20contexto.png) |
| Funcional | ![Vista funcional](diagramas/0.2%20Vista%20funcional.png) |
| Lógica | ![Vista lógica](diagramas/0.3%20Vista%20logica.png) |
| Desarrollo | ![Vista de desarrollo](diagramas/0.4%20Vista%20de%20desarrollo.png) |
| Despliegue | ![Vista de despliegue](diagramas/0.5%20Vista%20de%20despliegue.png) |

La explicación de cada paquete, los patrones GRASP, los endpoints y los códigos HTTP está en [`soccer-manager/README.md`](soccer-manager/README.md).

## Probar con Postman

1. En Postman haga clic en **Import** y arrastre los tres archivos de [`soccer-manager/postman/`](soccer-manager/postman/): la colección y los dos entornos.
2. Arriba a la derecha elija el entorno: **Soccer Manager - Local** o **Soccer Manager - Render (nube)**.
3. Abra la colección **Soccer Manager API** y haga clic en **Run**. Las 52 peticiones se ejecutan en orden y cada una verifica su código HTTP, incluidos los errores 400, 401, 403, 404 y 409.

Con el entorno Render, abra primero la plataforma web en el navegador para despertar el servidor.

## Ejecutar en el computador

```bash
cd soccer-manager
mvn spring-boot:run
```

Necesita Java 17 o superior, Maven y MongoDB en `localhost:27017`. La plataforma web queda en http://localhost:8080 y la API en http://localhost:8080/api. Las pruebas unitarias se corren con `mvn test` (7 pruebas JUnit).

## Interfaz web

La interfaz está hecha con HTML, CSS y JavaScript, sin librerías. Está en `soccer-manager/src/main/resources/static/` y la sirve el mismo Spring Boot. Cada rol ve su propio menú:

- **Gerente:** panel con indicadores, estudiantes, acudientes, entrenadores, categorías, grupos, entrenamientos con asistencia, campeonatos con partidos y convocatorias, evaluaciones, mensualidades con pagos, notificaciones y usuarios.
- **Entrenador:** sus grupos, próximas sesiones, asistencia, convocatorias y evaluaciones.
- **Acudiente:** sus estudiantes, actividades, progreso publicado, respuesta a convocatorias y pago de mensualidades.
- **Estudiante:** su perfil, actividades, asistencia y evaluaciones.

La primera vez que se abre sin usuarios, pide crear la cuenta del gerente. Desde el panel se pueden cargar datos de ejemplo, que también crean cuentas de prueba para los demás roles: `entrenador@demo.com`, `acudiente@demo.com` y `estudiante@demo.com`, todas con la contraseña `demo12345`.
