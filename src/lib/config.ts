import { join as joinPath } from 'path';
import { readFileSync } from 'fs';

export interface ConnConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  ssl: boolean;
}

interface BucketConfig {
  endpoint: string;
  key: string;
  secret: string;
  name: string;
  resultForceHttps?: boolean;
  resultBaseUrl?: string | false;
}

export interface TableFieldConfig {
  name: string,
  type?: string,
  props?: string[],
  searchRegex?: string
}

export interface TableConfig {
  name: string;
  primaryKey: string;
  fields: TableFieldConfig[];
  filterQuery?: string;
}

interface Config {
  connection: ConnConfig;
  bucket: BucketConfig;
  tables: TableConfig[];
}

const userConfig = JSON.parse(readFileSync(joinPath(process.cwd(), 'config.json')).toString('utf8'));

export function getConfig() {
  // init config
  const config: Config = {
    tables: userConfig.tables,
  } as Config;

  // setup connection config
  if (typeof userConfig.connection === 'object') {
    const opt: ConnConfig = userConfig.connection;

    config.connection = {
      host: opt.host || process.env.DB_HOST || 'localhost',
      port: opt.port || (process.env.DB_PORT && parseInt(process.env.DB_PORT)) || 5432,
      user: opt.user || process.env.DB_USER || 'postgres',
      password: opt.password || process.env.DB_PASSWORD || 'postgres',
      database: opt.database || process.env.DB_NAME || 'postgres',
      ssl: typeof opt.ssl === 'boolean' ? opt.ssl : (process.env.DB_SSL && process.env.DB_SSL === 'true' ? true : false),
    };
  } else {
    config.connection = {
      host: process.env.DB_HOST || 'localhost',
      port: (process.env.DB_PORT && parseInt(process.env.DB_PORT)) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'mydatabase',
      ssl: (process.env.DB_SSL && process.env.DB_SSL === 'true' ? true : false),
    };
  }

  // setup bucket config
  if (typeof userConfig.bucket === 'object') {
    const opt: BucketConfig = userConfig.bucket;

    config.bucket = {
      endpoint: opt.endpoint || process.env.BUCKET_ENDPOINT || 'xxx.yyy.zzz.com',
      key: opt.key || process.env.BUCKET_KEY || 'aaa',
      secret: opt.secret || process.env.BUCKET_SECRET || 'bbb',
      name: opt.name || process.env.BUCKET_NAME || 'mybucket',
      resultForceHttps: opt.resultForceHttps || false,
      resultBaseUrl: opt.resultBaseUrl || false,
    };
  } else {
    config.bucket = {
      endpoint: process.env.BUCKET_ENDPOINT || 'xxx.yyy.zzz.com',
      key: process.env.BUCKET_KEY || 'aaa',
      secret: process.env.BUCKET_SECRET || 'bbb',
      name: process.env.BUCKET_NAME || 'mybucket',
      resultForceHttps: false,
      resultBaseUrl: false,
    };
  }

  return config;
}