Reupload files in existing database to another S3-compatible storage then update the related records in the database.

## How it works
1. Read your database (PostgreSQL)
2. List all the files
3. Reupload to S3-compatible storage
4. Update the database

## How to run
- Clone the repository
- Create `.env` file based on `.env.sample` then configure it
```bash
cp ./.env.sample ./.env
```
-  Create `config.json` file based on `config.sample.json` then configure it
```
cp ./config.sample.json ./config.json
```
- It has been tested on Node 16, Typescript 4.5, and PostgreSQL 13
- Build and run the program
```
yarn build
yarn start
```

## Note
1. Backup exisiting database and restore it on the local computer first
1. Verify all columns and its types in the database that contain file URLs
1. Test reuploading process for the database on your local computer first
1. Verify the result before change the configuration for production
1. Make sure you have enough memory and fine internet connection. Or, deploy this program on a cloud server that close to the destination storage. 

## Configuration
There are two files that can be used for storing configuration.
- `.env` stores database & S3 storage connection options.
- `config.json` stores database connection, S3 storage connection, and tables options. If database & S3 options are set here, the values stored in `.env` will be ignored. 

### Properties of `.env`
- `DB_HOST` the database host. eg. `localhost`
- `DB_PORT` eg. `5432`
- `DB_USER` the username for the DB access. eg. `postgres`
- `DB_PASSWORD` password for the specified username. eg. `mypassword`
- `DB_NAME` name of the DB. eg. `mydatabase`
- `BUCKET_ENDPOINT` endpoint address of S3-compatible storage. eg. `mystorage.us-sjo1.upcloudobjects.com`
- `BUCKET_KEY`
- `BUCKET_SECRET`
- `BUCKET_NAME` name of the bucket in the S3-compatible storage. eg. `mybucket`

### Properties of `config.json`
- `connection` (*optional*)
  - `host`
  - `port`
  - `user`
  - `password`
  - `database` name of the database

- `bucket` (*optional*)
  - `endpoint` endpoint address of S3-compatible storage
  - `key`
  - `secret`
  - `name` name of the bucket

- `tables` **array** of table configurations. Each configuration is represented as a JSON object with the following properties.
  - `name` name of a table. eg. `users`,
  - `primaryKey` primary key of the table. eg. `_id`
  - `filterQuery` (*optional*) an SQL statement as the search filter. It must be presented as **SQL-safe string** that may contain quote, double quotes, or backslah. For example:
    - `"WHERE \"profilePicture"\ LIKE 'https://bucket%'"` 
    - `"WHERE \"image\" IS NOT NULL"`
    - `"WHERE \"category\" = 'rare'"`
    - `"WHERE \"_id\" = 69"`
  - `fields` **array** of field configurations. Each configuration is represented as a JSON object with the following properties.
      - `name` name of the column
      - `type` (*optional*) type of the column value. Current possible values are `json` and `array-json`. String URL or array of string URLs are auto-detected by default.
      - `props` (*optional*) **array** of object properties for `json` and `array-json` column that contain file URL. A child property is combined with its predecessors properties using `.` (dot). 
        For example, if the object in a column has the following value:
        ```json
        {
          "_id": 1,
          "image": "https://mybucket.com/image.jpg",
          "user": {
            "uuid": 69,
            "profilePicture": {
              "large": "https://mybucket.com/profileLg.jpg",
              "small": "https://mybucket.com/profileSm.jpg"
            }
          }
        }
        ```
        The `props` can be set into:
        - `["image"]` 
        - `["image", "user.profilePicture.large"]`
        - etc.

## Sample of a `config.json` file
```json
{
  "tables": [
    {
      "name": "promotions",
      "primaryKey": "_id",
      "fields": [
        {
          "name": "productImage",
          "type": "array-json",
          "props": ["image"]
        }
      ]
    },
    {
      "name": "companyCategories",
      "primaryKey": "_id",
      "fields": [
        {
          "name": "image"
        }
      ]
    },
    {
      "name": "articles",
      "primaryKey": "uuid",
      "filterQuery": "where \"image\" LIKE 'https://%'",
      "fields": [
        {
          "name": "image"
        },
        {
          "name": "images"
        },
        {
          "name": "gallery",
          "type": "json",
          "props": ["detail.image"]
        }
      ]
    }
  ]
}
```

## Future Works
[ ] Support for JSON of array of URL (`json-array`)
[ ] Support for JSON of array of JSON (`json-array-json`)
[ ] Support for MySQL
        