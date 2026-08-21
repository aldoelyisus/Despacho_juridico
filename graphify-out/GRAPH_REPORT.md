# Graph Report - .  (2026-08-21)

## Corpus Check
- 190 files · ~62,264 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1432 nodes · 2902 edges · 106 communities (64 shown, 42 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.53)
- Token cost: 200,100 input · 0 output

## Community Hubs (Navigation)
- Catalogos Entities (Áreas/Servicios)
- Catalogos Controller Endpoints
- Clientes Controller + Auditoría
- Auth Controller (2FA/Login)
- Root Panel Controller
- Backend ESLint Config
- Auditoría + Auth Services
- Descuentos Module
- Pagos/Servicio Entities
- Backend package.json Metadata
- CreateAbonoDto Validation
- NestJS App Module Wiring
- Agenda Controller
- Catalogos Service Tests
- Despachos Controller
- Planes Controller
- Root Auditoría Frontend Page
- Expedientes Controller
- Frontend App Shell/Routing
- Dashboard/Agenda/Auditoría APIs
- Usuarios Controller Endpoints
- Backend tsconfig
- Frontend ESLint (React)
- Frontend tsconfig (app)
- Auditoría Log Entity + Interceptor
- Frontend Runtime Deps (axios/date-fns/calendar)
- Dashboard Controller (KPIs)
- Frontend tsconfig (node)
- Cliente Entity
- Descuentos Controller
- Facturación Controller
- Auth/Usuarios Frontend Pages
- Expediente Detalle Page
- Planes/Facturación Entities
- Pagos/Abono Frontend
- Password + Auth DTO Utilities
- Catálogos Frontend Modals
- Agenda Module (backend)
- CreateDocumentoDto (Expedientes)
- Facturación Módulo + Util
- Clientes Frontend + Pagination
- ExpedientesService
- Descuentos/Pagos Frontend Pages
- NestJS App Root Controller
- Auth Guards/Decorators
- CreateExpedienteDto Validation
- UsuariosService
- Expedientes Frontend Modal
- Frontend package.json Scripts
- Backend Runtime Dependencies
- Auditoría Controller
- CreateEventoDto (Agenda de expediente)
- CreateUsuarioDto Validation
- Update Usuario DTO Validation
- Backend tsconfig (build)
- Auth/Perfil Frontend Pages
- RegisterDto Validation
- Frontend Entry Point (main.tsx)
- NestJS CLI Config
- JWT Auth Guard
- CambiarEstadoExpedienteDto
- CreateObservacionDto (Expediente)
- Planes Frontend (Root)
- JWT Strategy
- ConfirmModal + useConfirmDialog
- Frontend tsconfig root
- Dependency: class-transformer
- Dependency: multer
- Dependency: @nestjs/common
- Dependency: @nestjs/config
- Dependency: @nestjs/core
- Dependency: @nestjs/jwt
- Dependency: @nestjs/passport
- Dependency: @nestjs/platform-express
- Dependency: @nestjs/schedule
- Dependency: @nestjs/swagger
- Dependency: @nestjs/typeorm
- Dependency: passport
- Dependency: passport-jwt
- Dependency: pdfmake
- Dependency: reflect-metadata
- Dependency: rxjs
- Dependency: speakeasy
- Dependency: swagger-ui-express
- Dependency: typeorm
- Dependency: @types/bcryptjs
- Dependency: @types/multer
- Dependency: @types/passport-jwt
- Dependency: @types/qrcode
- Dependency: @types/speakeasy
- Dependency: uuid
- Backend README (NestJS boilerplate)
- Dependency: @fullcalendar/daygrid
- Dependency: @fullcalendar/interaction
- Dependency: react
- Dependency: react-router-dom
- Dependency: @tanstack/react-query
- Dependency: @vitejs/plugin-react
- App Favicon Icon
- Icon Sprite Sheet
- Hero Image Asset
- React Logo Asset
- Vite Logo Asset

## God Nodes (most connected - your core abstractions)
1. `CurrentUser` - 72 edges
2. `Usuario` - 46 edges
3. `Expediente` - 39 edges
4. `BaseEntity` - 38 edges
5. `Despacho` - 31 edges
6. `AuthService` - 28 edges
7. `Cliente` - 27 edges
8. `getErrorMessage()` - 27 edges
9. `CatalogosService` - 26 edges
10. `Pago` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Frontend index.html` --references--> `Frontend favicon.svg`  [AMBIGUOUS]
  frontend/index.html → frontend/public/favicon.svg
- `RegisterPage()` --calls--> `useAuthStore`  [EXTRACTED]
  frontend/src/pages/auth/RegisterPage.tsx → frontend/src/stores/authStore.ts
- `EventoAgenda` --inherits--> `BaseEntity`  [EXTRACTED]
  backend/src/agenda/entities/evento-agenda.entity.ts → backend/src/common/entities/base.entity.ts
- `EventoAgenda` --references--> `Usuario`  [EXTRACTED]
  backend/src/agenda/entities/evento-agenda.entity.ts → backend/src/usuarios/entities/usuario.entity.ts
- `Servicio` --inherits--> `BaseEntity`  [EXTRACTED]
  backend/src/catalogos/entities/servicio.entity.ts → backend/src/common/entities/base.entity.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Project Starter Template Scaffolding (NestJS backend + Vite/React frontend)** — backend_readme, frontend_readme, frontend_index [INFERRED 0.60]

## Communities (106 total, 42 thin omitted)

### Community 0 - "Catalogos Entities (Áreas/Servicios)"
Cohesion: 0.06
Nodes (49): InjectRepository, AreaDerecho, ApiProperty, Column, Entity, Index, OneToMany, Subarea (+41 more)

### Community 1 - "Catalogos Controller Endpoints"
Cohesion: 0.08
Nodes (29): CatalogosController, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, Body, Controller (+21 more)

### Community 2 - "Clientes Controller + Auditoría"
Cohesion: 0.07
Nodes (30): ClientesController, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, Body, Controller (+22 more)

### Community 3 - "Auth Controller (2FA/Login)"
Cohesion: 0.08
Nodes (21): qrcode, AuthController, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, Body, Controller (+13 more)

### Community 4 - "Root Panel Controller"
Cohesion: 0.09
Nodes (15): RootController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Delete, Get (+7 more)

### Community 5 - "Backend ESLint Config"
Cohesion: 0.04
Nodes (47): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+39 more)

### Community 6 - "Auditoría + Auth Services"
Cohesion: 0.11
Nodes (26): AuditoriaService, Injectable, CONFIG_VALUES, InjectRepository, Despacho, ApiProperty, Column, Entity (+18 more)

### Community 7 - "Descuentos Module"
Cohesion: 0.09
Nodes (23): DescuentosService, Injectable, InjectRepository, CreateDescuentoDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsEnum (+15 more)

### Community 8 - "Pagos/Servicio Entities"
Cohesion: 0.11
Nodes (23): Servicio, ApiProperty, Column, Entity, CreatePagoDto, ApiProperty, ApiPropertyOptional, IsDateString (+15 more)

### Community 9 - "Backend package.json Metadata"
Cohesion: 0.06
Nodes (32): author, description, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment (+24 more)

### Community 10 - "CreateAbonoDto Validation"
Cohesion: 0.09
Nodes (23): CreateAbonoDto, ApiProperty, ApiPropertyOptional, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString (+15 more)

### Community 11 - "NestJS App Module Wiring"
Cohesion: 0.09
Nodes (22): AppModule, Module, AuditoriaModule, Module, AuthModule, Module, CatalogosModule, Module (+14 more)

### Community 12 - "Agenda Controller"
Cohesion: 0.13
Nodes (14): AgendaController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Delete, Get (+6 more)

### Community 13 - "Catalogos Service Tests"
Cohesion: 0.14
Nodes (18): Usuario, CreateAreaDto, ApiProperty, ApiPropertyOptional, IsNotEmpty, IsOptional, IsString, Length (+10 more)

### Community 14 - "Despachos Controller"
Cohesion: 0.11
Nodes (17): DespachosController, ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags, Body, Controller, Get (+9 more)

### Community 15 - "Planes Controller"
Cohesion: 0.12
Nodes (15): PlanesController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Delete, Get (+7 more)

### Community 16 - "Root Auditoría Frontend Page"
Cohesion: 0.10
Nodes (14): facturacionApi, rootApi, ACCION_COLORS, RootAuditoriaPage(), RootDashboardPage(), RootDespachosPage(), ESTADO_STYLE, ESTADOS (+6 more)

### Community 17 - "Expedientes Controller"
Cohesion: 0.17
Nodes (16): ExpedientesController, ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags, Body (+8 more)

### Community 18 - "Frontend App Shell/Routing"
Cohesion: 0.15
Nodes (18): despachoApi, NormalRoute(), PrivateRoute(), RootRoute(), Header(), Props, Layout(), normalNavItems (+10 more)

### Community 19 - "Dashboard/Agenda/Auditoría APIs"
Cohesion: 0.12
Nodes (14): agendaApi, auditoriaApi, api, CODIGOS_DESPACHO_BLOQUEADO, dashboardApi, usuariosApi, AgendaPage(), FORM_INIT (+6 more)

### Community 20 - "Usuarios Controller Endpoints"
Cohesion: 0.17
Nodes (11): ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, Body, Controller, Get, Param (+3 more)

### Community 21 - "Backend tsconfig"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+14 more)

### Community 22 - "Frontend ESLint (React)"
Cohesion: 0.09
Nodes (23): eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+15 more)

### Community 23 - "Frontend tsconfig (app)"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+14 more)

### Community 24 - "Auditoría Log Entity + Interceptor"
Cohesion: 0.14
Nodes (11): InjectRepository, LogAuditoria, ApiProperty, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn (+3 more)

### Community 25 - "Frontend Runtime Deps (axios/date-fns/calendar)"
Cohesion: 0.10
Nodes (21): axios, date-fns, dependencies, axios, date-fns, @fullcalendar/list, @fullcalendar/react, @fullcalendar/timegrid (+13 more)

### Community 26 - "Dashboard Controller (KPIs)"
Cohesion: 0.15
Nodes (9): DashboardController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Get, Query, DashboardService (+1 more)

### Community 27 - "Frontend tsconfig (node)"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+12 more)

### Community 28 - "Cliente Entity"
Cohesion: 0.13
Nodes (15): Cliente, ApiProperty, Column, Entity, Index, ManyToMany, InjectRepository, Pago (+7 more)

### Community 29 - "Descuentos Controller"
Cohesion: 0.14
Nodes (14): DescuentosController, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, Body, Controller (+6 more)

### Community 30 - "Facturación Controller"
Cohesion: 0.15
Nodes (11): FacturacionController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Post, UseGuards, FacturacionService (+3 more)

### Community 31 - "Auth/Usuarios Frontend Pages"
Cohesion: 0.22
Nodes (12): PasswordChecklist(), CredencialesModal(), UsuariosPage(), csvEscape(), downloadCsv(), evaluatePasswordPolicy(), generateStrongPassword(), PASSWORD_RULES (+4 more)

### Community 32 - "Expediente Detalle Page"
Cohesion: 0.14
Nodes (13): ESTADO_COLORS, ESTADO_LABELS, ExpedienteDetallePage(), formatBytes(), money(), PAGO_ESTADO_COLORS, PAGO_ESTADO_LABELS, SidebarInfo() (+5 more)

### Community 33 - "Planes/Facturación Entities"
Cohesion: 0.17
Nodes (9): Plan, ApiProperty, Column, Entity, PlanesModule, Module, RootGuard, Injectable (+1 more)

### Community 34 - "Pagos/Abono Frontend"
Cohesion: 0.18
Nodes (13): pagosApi, AbonoModal(), AbonoRegistrado, fmt(), METODOS_PAGO, Props, ExpedienteContext, FORM_INIT (+5 more)

### Community 35 - "Password + Auth DTO Utilities"
Cohesion: 0.25
Nodes (9): ChangePasswordRequiredDto, ApiProperty, IsString, generateStrongPassword(), pickRandom(), shuffle(), IsStrongPassword(), evaluatePasswordPolicy() (+1 more)

### Community 36 - "Catálogos Frontend Modals"
Cohesion: 0.28
Nodes (8): catalogosApi, ModalErrorBanner(), AreaModal(), Props, Props, ServicioModal(), Props, SubareaModal()

### Community 37 - "Agenda Module (backend)"
Cohesion: 0.17
Nodes (10): AgendaModule, Module, InjectRepository, EventoAgenda, TipoEvento, ApiProperty, Column, Entity (+2 more)

### Community 38 - "CreateDocumentoDto (Expedientes)"
Cohesion: 0.22
Nodes (9): CreateDocumentoDto, ApiPropertyOptional, IsOptional, IsString, Length, UpdateExpedienteDto, ESTADO_LABELS, ESTADOS_DE_CIERRE (+1 more)

### Community 39 - "Facturación Módulo + Util"
Cohesion: 0.24
Nodes (10): FacturacionModule, Module, calcularFechaLimiteMensualidad(), EstadoMensualidad, Mensualidad, TipoMensualidad, ApiProperty, Column (+2 more)

### Community 40 - "Clientes Frontend + Pagination"
Cohesion: 0.20
Nodes (10): clientesApi, Pagination(), PaginationProps, ClienteDetallePage(), EXPEDIENTE_ESTADO_COLOR, EXPEDIENTE_ESTADO_LABEL, ClienteModal(), Props (+2 more)

### Community 42 - "Descuentos/Pagos Frontend Pages"
Cohesion: 0.27
Nodes (11): descuentosApi, useConfirmDialog(), AreasPanel(), ServiciosTab(), SubareasPanel(), DescuentoModal(), Props, TIPO_OPTS (+3 more)

### Community 43 - "NestJS App Root Controller"
Cohesion: 0.29
Nodes (5): AppController, Controller, Get, AppService, Injectable

### Community 44 - "Auth Guards/Decorators"
Cohesion: 0.29
Nodes (4): RolEnum, Roles(), RolesGuard, Injectable

### Community 45 - "CreateExpedienteDto Validation"
Cohesion: 0.18
Nodes (11): CreateExpedienteDto, ApiProperty, ApiPropertyOptional, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString (+3 more)

### Community 47 - "Expedientes Frontend Modal"
Cohesion: 0.25
Nodes (5): expedientesApi, ExpedienteModal(), ESTADO_COLORS, ESTADO_LABELS, ExpedientesPage()

### Community 48 - "Frontend package.json Scripts"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 49 - "Backend Runtime Dependencies"
Cohesion: 0.22
Nodes (9): dependencies, bcryptjs, class-validator, mysql2, @types/uuid, bcryptjs, class-validator, mysql2 (+1 more)

### Community 50 - "Auditoría Controller"
Cohesion: 0.22
Nodes (7): AuditoriaController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Get, Query

### Community 51 - "CreateEventoDto (Agenda de expediente)"
Cohesion: 0.22
Nodes (9): CreateEventoDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString (+1 more)

### Community 52 - "CreateUsuarioDto Validation"
Cohesion: 0.25
Nodes (8): CreateUsuarioDto, ApiProperty, ApiPropertyOptional, IsEmail, IsInt, IsOptional, IsString, MinLength

### Community 53 - "Update Usuario DTO Validation"
Cohesion: 0.25
Nodes (8): ApiPropertyOptional, IsBoolean, IsEmail, IsInt, IsOptional, IsString, MinLength, UpdateUsuarioDto

### Community 54 - "Backend tsconfig (build)"
Cohesion: 0.25
Nodes (7): exclude, extends, dist, node_modules, **/*spec.ts, test, ./tsconfig.json

### Community 56 - "RegisterDto Validation"
Cohesion: 0.29
Nodes (6): RegisterDto, ApiProperty, IsEmail, IsOptional, IsString, MinLength

### Community 57 - "Frontend Entry Point (main.tsx)"
Cohesion: 0.33
Nodes (6): Frontend favicon.svg, Frontend index.html, Frontend README, App(), queryClient, Vite + React + TypeScript Template

### Community 58 - "NestJS CLI Config"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 60 - "CambiarEstadoExpedienteDto"
Cohesion: 0.40
Nodes (5): CambiarEstadoExpedienteDto, ApiProperty, IsEnum, IsNotEmpty, EstadoExpediente

### Community 61 - "CreateObservacionDto (Expediente)"
Cohesion: 0.33
Nodes (5): CreateObservacionDto, ApiProperty, IsNotEmpty, IsString, Length

### Community 62 - "Planes Frontend (Root)"
Cohesion: 0.40
Nodes (3): planesApi, emptyForm, RootPlanesPage()

### Community 63 - "JWT Strategy"
Cohesion: 0.40
Nodes (3): JwtStrategy, Injectable, InjectRepository

### Community 64 - "ConfirmModal + useConfirmDialog"
Cohesion: 0.50
Nodes (3): ConfirmModal(), ConfirmModalProps, ConfirmOptions

## Ambiguous Edges - Review These
- `Frontend index.html` → `Frontend favicon.svg`  [AMBIGUOUS]
  frontend/index.html · relation: references

## Knowledge Gaps
- **246 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+241 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Frontend index.html` and `Frontend favicon.svg`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `CurrentUser` connect `Catalogos Controller Endpoints` to `Clientes Controller + Auditoría`, `Auth Controller (2FA/Login)`, `Agenda Module (backend)`, `CreateDocumentoDto (Expedientes)`, `Descuentos Module`, `Pagos/Servicio Entities`, `CreateAbonoDto Validation`, `Agenda Controller`, `Auth Guards/Decorators`, `Catalogos Service Tests`, `Despachos Controller`, `Expedientes Controller`, `Auditoría Controller`, `Usuarios Controller Endpoints`, `Dashboard Controller (KPIs)`, `Cliente Entity`, `Descuentos Controller`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Backend Runtime Dependencies` to `Auth Controller (2FA/Login)`, `Backend package.json Metadata`, `Dependency: class-transformer`, `Dependency: multer`, `Dependency: @nestjs/common`, `Dependency: @nestjs/config`, `Dependency: @nestjs/core`, `Dependency: @nestjs/jwt`, `Dependency: @nestjs/passport`, `Dependency: @nestjs/platform-express`, `Dependency: @nestjs/schedule`, `Dependency: @nestjs/swagger`, `Dependency: @nestjs/typeorm`, `Dependency: passport`, `Dependency: passport-jwt`, `Dependency: pdfmake`, `Dependency: reflect-metadata`, `Dependency: rxjs`, `Dependency: speakeasy`, `Dependency: swagger-ui-express`, `Dependency: typeorm`, `Dependency: @types/bcryptjs`, `Dependency: @types/multer`, `Dependency: @types/passport-jwt`, `Dependency: @types/qrcode`, `Dependency: @types/speakeasy`, `Dependency: uuid`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Why does `qrcode` connect `Auth Controller (2FA/Login)` to `Backend Runtime Dependencies`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _246 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Catalogos Entities (Áreas/Servicios)` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Catalogos Controller Endpoints` be split into smaller, more focused modules?**
  _Cohesion score 0.07650273224043716 - nodes in this community are weakly interconnected._