const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

const typeMapping = {
  String: (field) => {
    if (field.isId) return 'VARCHAR(191)';
    // check dbName or nativeType
    return 'LONGTEXT'; // safe for all strings in MySQL
  },
  Int: () => 'INT',
  Float: () => 'DOUBLE',
  Boolean: () => 'TINYINT(1) DEFAULT 0',
  DateTime: () => 'DATETIME(3) NULL',
  Json: () => 'JSON',
};

async function sync() {
  try {
    const models = Prisma.dmmf.datamodel.models;
    console.log(`Checking ${models.length} Prisma models against MySQL database...`);

    for (const model of models) {
      const tableName = model.dbName || model.name;
      let existingCols;
      try {
        existingCols = await prisma.$queryRawUnsafe(`DESCRIBE \`${tableName}\``);
      } catch (err) {
        // Table may not exist yet or have different naming, skip
        continue;
      }

      const existingColNames = new Set(existingCols.map((c) => c.Field.toLowerCase()));

      for (const field of model.fields) {
        // Only inspect scalar fields (not relation fields)
        if (field.kind !== 'scalar' && field.kind !== 'enum') continue;

        const colName = field.dbName || field.name;
        if (!existingColNames.has(colName.toLowerCase())) {
          console.log(`[${tableName}] Missing column: ${colName} (type: ${field.type})`);

          let sqlType = 'VARCHAR(191) NULL';
          if (field.kind === 'enum') {
            sqlType = 'VARCHAR(191) NULL';
          } else if (typeMapping[field.type]) {
            sqlType = typeMapping[field.type](field);
          }

          const alterSql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${sqlType}`;
          console.log(`Executing: ${alterSql}`);
          try {
            await prisma.$executeRawUnsafe(alterSql);
            console.log(`Successfully added \`${colName}\` to \`${tableName}\``);
          } catch (e) {
            console.error(`Failed to alter table \`${tableName}\`: ${e.message}`);
          }
        }
      }
    }

    console.log('Database column synchronization finished!');
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

sync();
