/* eslint-disable @typescript-eslint/no-loop-func */
import 'dotenv/config';
import { getConfig } from './lib/config';
import { getClient } from './lib/connection';
import { reupload } from './lib/store';
import { isUrl } from './lib/utils';
const cfg = getConfig();

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
      let selection = [...table.fields.map((field) => field.name), table.primaryKey].join(', ');

      do {
        try {
          // get some records
          const queryResult = await client.query(
            `select ${selection} from ${table.name} order by ${table.primaryKey} limit ${limit} offset ${offset}`,
          );
          records = queryResult.rows;
          
          // process each record
          let promises: Promise<boolean>[] = [];
          records.forEach((row) => {
            let promise: Promise<boolean> = new Promise(async (resolve, reject) => {
              let fieldValues: any[] = [];

              // check each field
              for (let j in  table.fields) {
                let field = table.fields[j];

                // check if json or text type
                if (field.type && ['json', 'text'].includes(field.type)) {

                } else {
                  let val = row[field.name];

                  // check if array or a text
                  if (Array.isArray(val)) { // array
                    let validArr = val.filter((item) => typeof item === 'string' && isUrl(item));
                    let uploadedArr = [];

                    for (let k in validArr) {
                      // reupload
                      let newUrl = await reupload(validArr[k]);
                      if (newUrl) {
                        uploadedArr.push(newUrl);
                      } else {
                        uploadedArr.push(validArr[k]); // revert to original if fail
                      }
                    }

                    fieldValues.push(uploadedArr);

                  } else if (typeof val === 'string' && isUrl(val)) { // single text
                    // reupload
                    let newUrl = await reupload(val);
                    if (newUrl) {
                      fieldValues.push(newUrl);
                    } else {
                      fieldValues.push(val); // revert to original if fail
                    }
                  } else { // anything else
                    fieldValues.push(val); // keep it
                  }
                }
              }

              // update DB
              const setParam = table.fields.map((f, fidx) => `${f.name} = $${fidx + 1}`).join(', ');
              const updateResult = await client.query(
                `update ${table.name} SET ${setParam} where ${table.primaryKey} = ${row[table.primaryKey]}`,
                fieldValues,
              );
              if (updateResult.rowCount) {
                console.log('success updating a record');
                resolve(true);
              } else {
                console.log('error updating a record');
                resolve(false);
              }
            });

            promises.push(promise);
          });
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