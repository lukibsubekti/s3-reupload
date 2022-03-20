import 'dotenv/config';
import { PoolClient } from 'pg';
import { getConfig, TableConfig } from './lib/config';
import { getClient } from './lib/connection';
import { reupload } from './lib/store';
import { getAppendedObject, getChanges, getExistProps, getObjectFromJson, getValuesFromObject, isUrl } from './lib/utils';
const cfg = getConfig();

async function getUpdatedFieldValue(val: any): Promise<string | string[]> {
  if (Array.isArray(val)) { // array
    let uploadedArr = [];

    for (let k in val) {
      if (!isUrl(val[k])) {
        uploadedArr.push(val[k]); // keep origin value if not url

      } else {
        // try to reupload
        let newUrl = await reupload(val[k]);
        if (newUrl) {
          uploadedArr.push(newUrl);
        } else {
          uploadedArr.push(val[k]); // keep origina value if fail
        }
      }
    }

    return uploadedArr;
  } else if (isUrl(val)) { // single URL string
    // reupload
    let newUrl = await reupload(val);
    if (newUrl) {
      return newUrl;
    }

    // revert to origin value if fail
    return val;
  }

  // keep origina value if anything else
  return val;
}

async function getUpdatedJsonFieldValue(json: string, props: string[]): Promise<string> {
  const obj = getObjectFromJson(json);

  if (!(obj && props && props.length)) {
    return json;
  }

  // update only if any property
  const existProps = getExistProps(obj, props);
  if (!existProps.length) {
    return json;
  }

  const files = getValuesFromObject(obj, existProps);
  const updatedFiles = await getUpdatedFieldValue(files) as string[];

  // check if any changes
  const changes = getChanges(updatedFiles, files);
  if (!(changes.length > 0)) {
    return json;
  }

  let updatedObj = getAppendedObject(obj, existProps, updatedFiles);
  return JSON.stringify(updatedObj);
}

function getRecordUpdatingPromise(row: any, table: TableConfig, client: PoolClient) {
  let promise: Promise<boolean> = new Promise(async (resolve, reject) => {
    let fieldValues: any[] = [];
    let isChanged: boolean = false;

    // check each field
    for (let j in  table.fields) {
      let field = table.fields[j];

      // check explicit declaration of field type
      if (field.type && ['json', 'array-json', 'text'].includes(field.type)) {
        if (field.type === 'array-json') { // Array of JSON
          const jsonArr: any = row[field.name];

          if (Array.isArray(jsonArr) && Array.isArray(field.props)) {
            let updatedJsonArr: string[] = [];

            for (let k in jsonArr) {
              const json = jsonArr[k];
              const updatedJson: string = await getUpdatedJsonFieldValue(json, field.props);
              updatedJsonArr.push(updatedJson);

              // mark if any change
              if ( json !== updatedJson ) {
                isChanged = true;
              }
            }

            fieldValues.push(updatedJsonArr);
          } else {
            fieldValues.push(jsonArr);
          }

        } else if (field.type === 'json') { // JSON
          const json = row[field.name];
          let updatedJson: string;

          // verify props
          if (Array.isArray(field.props)) {
            updatedJson = await getUpdatedJsonFieldValue(json, field.props);
          } else {
            updatedJson = json;
          }

          fieldValues.push(updatedJson);

          // mark if any change
          if ( json !== updatedJson ) {
            isChanged = true;
          }
        }
      } else {
        const val = row[field.name];
        const updatedVal = await getUpdatedFieldValue(val);
        fieldValues.push(updatedVal);

        // mark if any change
        if (
          ( typeof updatedVal === 'string' && val !== updatedVal )
          || ( Array.isArray(updatedVal) && getChanges(updatedVal, val).length )
        ) {
          isChanged = true;
        }
      }
    }

    // update DB if necessary
    if (isChanged) {
      const setParam = table.fields.map((f, fidx) => `"${f.name}" = $${fidx + 1}`).join(', ');
      const updateResult = await client.query(
        `update "${table.name}" SET ${setParam} where "${table.primaryKey}" = ${row[table.primaryKey]}`,
        fieldValues,
      );
      if (updateResult.rowCount) {
        console.log('success updating a record');
        resolve(true);
      } else {
        console.log('error updating a record');
        resolve(false);
      }
    } else {
      console.log('a record is not updated, no changes');
      resolve(true);
    }
  });

  return promise;
}

(async () => {
  try {
    // connect to DB
    const client = await getClient();
    console.log('connection to DB success');

    // get records
    const limit = 10;
    for (let tidx in cfg.tables) {
      const table = cfg.tables[tidx];

      let records: any[] = [];
      let offset = 0;
      let selection = [...table.fields.map((field) => '"' + field.name + '"'), '"' + table.primaryKey + '"'].join(', ');

      do {
        try {
          // get some records
          const queryResult = await client.query(
            `select ${selection} from "${table.name}" ${table.filterQuery || ''} order by "${table.primaryKey}" limit ${limit} offset ${offset}`,
          );
          records = queryResult.rows;
          
          // process each record
          let promises: Promise<boolean>[];
          promises = records.map((row) => getRecordUpdatingPromise(row, table, client));
          const allResult = await Promise.allSettled(promises);
          console.log(`Result of ${records.length} records:`, allResult);

        } catch (error) {
          console.error(error);
          // do nothing
        }

        offset += limit;
      } while (records && records.length >= limit);
    }

    client.release();
    console.log('DB connection is released');

  } catch (error) {
    console.error(error);
  }
})();