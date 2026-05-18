import { config } from '../config.js';
import { createId } from '../http.js';
import { getCatalystApp } from './catalyst.js';

const localRows = new Map();

function tableRows(tableName) {
  if (!localRows.has(tableName)) localRows.set(tableName, []);
  return localRows.get(tableName);
}

function unwrapZcqlRows(rows, tableName) {
  return (rows || []).map((row) => row?.[tableName] || row);
}

export function sqlString(value) {
  return `'${String(value ?? '').replaceAll("'", "''")}'`;
}

export function createDataStore(req) {
  async function app() {
    return getCatalystApp(req);
  }

  async function query(sql, tableName = null) {
    if (config.mockCatalyst) return [];
    const catalystApp = await app();
    const result = await catalystApp.zcql().executeZCQLQuery(sql);
    return tableName ? unwrapZcqlRows(result?.content || result, tableName) : (result?.content || result || []);
  }

  async function insert(tableName, row) {
    const data = { id: row.id || createId(tableName.slice(0, 4)), ...row };
    if (config.mockCatalyst) {
      tableRows(tableName).push({ ...data, ROWID: data.id });
      return data;
    }
    const catalystApp = await app();
    return catalystApp.datastore().table(tableName).insertRow(data);
  }

  async function updateByRowId(tableName, rowId, patch) {
    if (config.mockCatalyst) {
      const rows = tableRows(tableName);
      const existing = rows.find((row) => row.ROWID === rowId || row.id === rowId);
      if (!existing) return null;
      Object.assign(existing, patch);
      return existing;
    }
    const catalystApp = await app();
    return catalystApp.datastore().table(tableName).updateRow({ ...patch, ROWID: rowId });
  }

  async function findById(tableName, id) {
    if (config.mockCatalyst) return tableRows(tableName).find((row) => row.id === id || row.ROWID === id) || null;
    const rows = await query(`SELECT * FROM ${tableName} WHERE id = ${sqlString(id)} LIMIT 1`, tableName);
    return rows[0] || null;
  }

  async function findOne(tableName, column, value) {
    if (config.mockCatalyst) return tableRows(tableName).find((row) => String(row[column]) === String(value)) || null;
    const rows = await query(`SELECT * FROM ${tableName} WHERE ${column} = ${sqlString(value)} LIMIT 1`, tableName);
    return rows[0] || null;
  }

  async function list(tableName, whereSql = '', limit = 50) {
    if (config.mockCatalyst) return tableRows(tableName).slice(0, limit);
    const where = whereSql ? ` WHERE ${whereSql}` : '';
    return query(`SELECT * FROM ${tableName}${where} LIMIT ${Number(limit) || 50}`, tableName);
  }

  async function listPublishedGames({ limit = 24 } = {}) {
    return list(config.tables.games, "status = 'PUBLISHED'", limit);
  }

  async function gameManifest(gameId) {
    const game = await findOne(config.tables.games, 'id', gameId);
    if (!game) return null;
    const version = game.latestVersionId
      ? await findById(config.tables.versions, game.latestVersionId)
      : null;
    const manifest = version
      ? await findOne(config.tables.manifests, 'versionId', version.id)
      : await findOne(config.tables.manifests, 'gameId', gameId);
    return manifest ? { game, version, manifest } : null;
  }

  async function userOwnsGame(userId, gameId) {
    const purchase = await findOne(config.tables.purchases, 'userGameKey', `${userId}:${gameId}`);
    if (purchase?.status === 'ACTIVE' || purchase?.status === 'PAID') return true;
    const game = await findById(config.tables.games, gameId);
    return game?.priceType === 'FREE';
  }

  return {
    query,
    insert,
    updateByRowId,
    findById,
    findOne,
    list,
    listPublishedGames,
    gameManifest,
    userOwnsGame
  };
}
