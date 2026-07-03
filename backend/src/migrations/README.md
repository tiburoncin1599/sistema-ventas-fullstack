# Migraciones

Para generar migraciones desde TypeORM:

```bash
npx typeorm migration:generate src/migrations/InitialSchema -d src/data-source.ts
```

Para correr migraciones:

```bash
npx typeorm migration:run -d src/data-source.ts
```

Para revertir:

```bash
npx typeorm migration:revert -d src/data-source.ts
```
