export class InvalidSqliteFileError extends Error {
  constructor() {
    super('Ce fichier ne semble pas être une base SQLite.');
    this.name = 'InvalidSqliteFileError';
  }
}

export class UnknownDatabaseError extends Error {
  constructor(dbId: string) {
    super(`Base introuvable (id : ${dbId}). Téléversez à nouveau le fichier.`);
    this.name = 'UnknownDatabaseError';
  }
}

export class UnknownTableError extends Error {
  constructor(table: string) {
    super(`Table « ${table} » inconnue dans cette base.`);
    this.name = 'UnknownTableError';
  }
}

export class ForbiddenSqlError extends Error {
  constructor() {
    super('Requête refusée : seules les lectures sont autorisées.');
    this.name = 'ForbiddenSqlError';
  }
}
