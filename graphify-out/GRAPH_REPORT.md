# Graph Report - /Users/iqbalrizqi/Desktop/app/js/glucofy-be  (2026-07-01)

## Corpus Check
- Corpus is ~5,190 words - fits in a single context window. You may not need a graph.

## Summary
- 210 nodes · 325 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dev & Test Dependencies|Dev & Test Dependencies]]
- [[_COMMUNITY_Nutrition API Module|Nutrition API Module]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Package Metadata & Scripts|Package Metadata & Scripts]]
- [[_COMMUNITY_App Bootstrap & Modules|App Bootstrap & Modules]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Auth Strategy & User Service|Auth Strategy & User Service]]
- [[_COMMUNITY_Auth Controller & Service|Auth Controller & Service]]
- [[_COMMUNITY_NestJS Ecosystem Docs|NestJS Ecosystem Docs]]
- [[_COMMUNITY_Jest Test Config|Jest Test Config]]
- [[_COMMUNITY_Nest CLI Config|Nest CLI Config]]
- [[_COMMUNITY_Prisma Seed|Prisma Seed]]
- [[_COMMUNITY_Build Config|Build Config]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 22 edges
2. `scripts` - 13 edges
3. `PrismaService` - 13 edges
4. `NutritionService` - 10 edges
5. `AuthService` - 9 edges
6. `Glucofy Backend README` - 9 edges
7. `jest` - 8 edges
8. `AuthResponseDto` - 8 edges
9. `CreateNutritionManualDto` - 7 edges
10. `AppService` - 6 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (15 total, 2 thin omitted)

### Community 0 - "Dev & Test Dependencies"
Cohesion: 0.07
Nodes (27): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+19 more)

### Community 1 - "Nutrition API Module"
Cohesion: 0.19
Nodes (9): JwtAuthGuard, RequestUser, User, ErrorResponseDto, CreateNutritionManualDto, LastConsumptionResponseDto, NutritionResponseDto, NutritionController (+1 more)

### Community 2 - "TypeScript Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 3 - "Package Metadata & Scripts"
Cohesion: 0.09
Nodes (21): author, description, license, name, prisma, seed, private, scripts (+13 more)

### Community 4 - "App Bootstrap & Modules"
Cohesion: 0.20
Nodes (7): AppController, AppModule, AppService, AuthModule, NutritionModule, PrismaModule, UsersModule

### Community 5 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, bcrypt, class-transformer, class-validator, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/jwt (+12 more)

### Community 6 - "Auth Strategy & User Service"
Cohesion: 0.14
Nodes (6): JwtPayload, JwtStrategy, PrismaService, UserProfileResponseDto, UsersController, UsersService

### Community 7 - "Auth Controller & Service"
Cohesion: 0.30
Nodes (5): AuthController, AuthService, AuthResponseDto, LoginDto, RegisterDto

### Community 8 - "NestJS Ecosystem Docs"
Cohesion: 0.31
Nodes (10): Glucofy Backend README, CircleCI, Kamil Myśliwiec, NestJS Mau, NestJS, NestJS Devtools, Node.js, npm (+2 more)

### Community 9 - "Jest Test Config"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 10 - "Nest CLI Config"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

## Knowledge Gaps
- **103 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev & Test Dependencies` to `Package Metadata & Scripts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Package Metadata & Scripts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dev & Test Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Package Metadata & Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._